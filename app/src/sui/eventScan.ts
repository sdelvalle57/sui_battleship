import { GrpcTypes, RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type { RawGameEvent } from './events';
import { fetchNodeInfo } from './nodeInfo';
import { HistoryPrunedError, PaginationStalledError, ReadDataError } from './readErrors';
import { withReadTimeout } from './readPolicy';

// Escaneo crudo de eventos común al lobby y a "Mis partidas" (DL-2 de #13), extraído de `lobby.ts` (#10) sin cambiar la
// lógica: la cota del escaneo, un pedido de `ListEvents` con cualquier `EventFilter` y el cruce del piso de historial.

/** Margen sobre el piso de historial del nodo (M-4 de #10): ≈ 1 h a 4,36 checkpoints/s, para no chocar con un piso que avanza. */
export const HISTORY_FLOOR_MARGIN_CHECKPOINTS = 16_000n;

/** Cota inferior del escaneo (`startCheckpoint`) y de dónde salió: la publicación, el piso del nodo o ninguna. */
export type HistoryLowerBound = { checkpoint: bigint; kind: 'publish' | 'node_floor' | 'none' };

/** Cliente que usa el escaneo (ARQ-3): el `ListEvents`/`GetServiceInfo` crudos y la lectura de objetos en lote. */
export type EventScanClient = Pick<SuiGrpcClient, 'ledgerService' | 'getObjects'>;

/** Un pedido crudo: los eventos en el orden del nodo, el último `watermark.cursor` (base64) y si hay más. */
export type EventsPage = { events: RawGameEvent[]; cursor: string | null; hasNextPage: boolean };

/** Argumentos de un pedido: filtro, cota, cursor de reanudación (base64, `null` = desde el tope) y tamaño. */
export type EventsRequest = {
  filter: GrpcTypes.EventFilter;
  startCheckpoint: bigint;
  before: string | null;
  limit: number;
  signal?: AbortSignal;
};

/**
 * Campos del evento que se piden: sin `sender` (no se usa y no se trae, MINOR-1 del plan de #13). El remitente de "Mis
 * partidas" se verifica en el contenido del evento (`creator`/`acceptor` = `ctx.sender()`, DL-3).
 */
const EVENT_READ_MASK = ['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index'];
const { Ordering, QueryEndReason } = GrpcTypes;

/**
 * Cota inferior efectiva del escaneo (M-1, M-4 de #10). Pura. Con piso > 0, `piso + HISTORY_FLOOR_MARGIN_CHECKPOINTS`;
 * la cota es la mayor entre esa y el checkpoint de la publicación (empate ⇒ publicación). Un nodo sin poda (piso 0 o
 * ausente) deja solo la publicación, sin margen; sin ninguna de las dos ⇒ `0n`, `'none'`.
 */
export function historyLowerBound({
  publishCheckpoint,
  nodeFloor,
}: {
  publishCheckpoint: bigint | null;
  nodeFloor: bigint | null;
}): HistoryLowerBound {
  const floorBound = nodeFloor !== null && nodeFloor > 0n ? nodeFloor + HISTORY_FLOOR_MARGIN_CHECKPOINTS : null;
  if (floorBound === null) {
    return publishCheckpoint === null ? { checkpoint: 0n, kind: 'none' } : { checkpoint: publishCheckpoint, kind: 'publish' };
  }
  if (publishCheckpoint === null || floorBound > publishCheckpoint) return { checkpoint: floorBound, kind: 'node_floor' };
  return { checkpoint: publishCheckpoint, kind: 'publish' };
}

/** Filtro de un solo literal por tipo de evento: el mismo que arma el SDK (`toGrpcEventFilter`, dist/grpc/filters.mjs). */
export function eventTypeFilter(eventType: string): GrpcTypes.EventFilter {
  return { terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType } } }] }] };
}

/**
 * Filtro de varios tipos de evento (#73, TASK-7b): un término de un literal por tipo, sin repetidos (DNF: el OR de los
 * tipos). Con un solo tipo es el mismo filtro que `eventTypeFilter`. Sin tipos no hay filtro válido: lanza (error de
 * programación, un listado sin juegos).
 */
export function eventTypesFilter(eventTypes: readonly string[]): GrpcTypes.EventFilter {
  const unique = [...new Set(eventTypes)];
  if (unique.length === 0) throw new Error('eventTypesFilter necesita al menos un tipo de evento');
  return { terms: unique.flatMap((eventType) => eventTypeFilter(eventType).terms) };
}

/**
 * Máximo de **literales** por filtro de `ListEvents` (V-4 de TASK-1b, medido en la PV 142): se cuentan literales, no
 * términos (un `sender ∧ eventType` cuenta 2); con 11 el nodo responde `INVALID_ARGUMENT`.
 */
export const MAX_FILTER_LITERALS = 10;

/** Cantidad de literales de un filtro (la cota de `MAX_FILTER_LITERALS`). */
export function countFilterLiterals(filter: GrpcTypes.EventFilter): number {
  return filter.terms.reduce((total, term) => total + term.literals.length, 0);
}

/**
 * Parte un filtro en trozos de a lo sumo `maxLiterals` literales (M-5): los términos van en orden, sin partir ninguno (un
 * término es un AND: partirlo cambiaría qué eventos casan), y el OR de los trozos es el filtro original. Con ≤ `maxLiterals`
 * devuelve el mismo filtro, un solo trozo. Un término con más literales que la cota no se puede pedir: lanza (error de
 * programación).
 */
export function splitFilter(filter: GrpcTypes.EventFilter, maxLiterals: number = MAX_FILTER_LITERALS): GrpcTypes.EventFilter[] {
  if (countFilterLiterals(filter) <= maxLiterals) return [filter];
  const chunks: GrpcTypes.EventTerm[][] = [];
  let used = 0;
  for (const term of filter.terms) {
    const size = term.literals.length;
    if (size > maxLiterals) throw new Error(`un término de ${String(size)} literales no cabe en un filtro de ${String(maxLiterals)}`);
    const current = chunks.at(-1);
    if (current === undefined || used + size > maxLiterals) {
      chunks.push([term]);
      used = size;
    } else {
      current.push(term);
      used += size;
    }
  }
  return chunks.map((terms) => ({ terms }));
}

/** Posición de un evento dentro de su checkpoint: la transacción y el evento (lo que ordena y deduplica la fusión). */
type EventPosition = { transactionIndex: bigint | null; eventIndex: number | null };

/** Un pedido con sus posiciones (una por evento, en el mismo orden que `page.events`). */
type PositionedPage = { page: EventsPage; positions: EventPosition[] };

/**
 * Un pedido crudo de `ListEvents` (H-1 de #10): descendente, desde `before` hasta la cota `startCheckpoint`. Devuelve
 * el **último** `watermark.cursor` (punto seguro de reanudación; tras un `CHECKPOINT_BOUND` es el de la cota, V-9 de
 * #13). Sin `QueryEnd`, o con un `reason` no listado (incluido `UNKNOWN`), es un dato que la app no reconoce (NIT-1).
 */
export async function requestEvents(client: EventScanClient, request: EventsRequest): Promise<EventsPage> {
  return (await requestPositioned(client, request, EVENT_READ_MASK)).page;
}

async function requestPositioned(
  client: EventScanClient,
  { filter, startCheckpoint, before, limit, signal }: EventsRequest,
  readMask: readonly string[],
): Promise<PositionedPage> {
  return withReadTimeout(signal, async (abort) => {
    const call = client.ledgerService.listEvents(
      {
        readMask: { paths: [...readMask] },
        startCheckpoint,
        filter,
        options: {
          limit,
          ordering: Ordering.DESCENDING,
          before: before === null ? undefined : fromBase64(before),
        },
      },
      { abort },
    );
    const events: RawGameEvent[] = [];
    const positions: EventPosition[] = [];
    let cursor: Uint8Array | undefined;
    let reason: GrpcTypes.QueryEndReason | undefined;
    for await (const frame of call.responses) {
      if (frame.watermark?.cursor) cursor = frame.watermark.cursor;
      if (frame.event) {
        // El tipo se pasa tal cual: el parser lo normaliza y, si no se puede, la fila queda ilegible en vez de tumbar la
        // página.
        events.push({
          eventType: frame.event.eventType ?? '',
          bcs: frame.event.contents?.value ?? new Uint8Array(),
          transactionDigest: frame.event.transactionDigest ?? '',
          checkpoint: frame.event.checkpoint ?? null,
        });
        positions.push({ transactionIndex: frame.event.transactionIndex ?? null, eventIndex: frame.event.eventIndex ?? null });
      }
      if (frame.end) reason = frame.end.reason;
    }
    if (reason === undefined) throw new ReadDataError('malformed', 'ListEvents terminó sin QueryEnd');
    let hasNextPage: boolean;
    switch (reason) {
      case QueryEndReason.ITEM_LIMIT:
      case QueryEndReason.SCAN_LIMIT:
        hasNextPage = true;
        break;
      case QueryEndReason.CHECKPOINT_BOUND:
      case QueryEndReason.LEDGER_TIP:
      case QueryEndReason.CURSOR_BOUND:
        hasNextPage = false;
        break;
      default:
        throw new ReadDataError('malformed', `ListEvents terminó con un reason no reconocido (${String(reason)})`);
    }
    return { page: { events, cursor: cursor === undefined ? null : toBase64(cursor), hasNextPage }, positions };
  });
}

// Un filtro de más de `MAX_FILTER_LITERALS` literales se pide en trozos (M-5). Cada trozo lleva **su** cursor con la misma
// cota y el mismo tamaño de pedido; el cursor que ve el que llama es la lista de los de todos los trozos serializada
// (`before`/`cursor` siguen siendo un `string`, serializable como `pageParam`). Los trozos terminados no se vuelven a pedir.

/** Estado de un trozo entre dos páginas: su cursor (`null` = desde el tope) y si ya terminó. */
type ChunkState = { cursor: string | null; done: boolean };

/** `transaction_index` además de lo de `EVENT_READ_MASK`: lo que ordena la fusión entre dos transacciones de un checkpoint. */
const PARTITIONED_READ_MASK = [...EVENT_READ_MASK, 'transaction_index'];

function decodeChunkStates(before: string | null, count: number): ChunkState[] {
  if (before === null) return Array.from({ length: count }, () => ({ cursor: null, done: false }));
  let parsed: unknown;
  try {
    parsed = JSON.parse(before);
  } catch {
    throw new ReadDataError('malformed', 'el cursor de un pedido en trozos no es válido');
  }
  const valid =
    Array.isArray(parsed) &&
    parsed.length === count &&
    parsed.every(
      (state: unknown) =>
        typeof state === 'object' &&
        state !== null &&
        'done' in state &&
        typeof state.done === 'boolean' &&
        'cursor' in state &&
        (state.cursor === null || typeof state.cursor === 'string'),
    );
  if (!valid) throw new ReadDataError('malformed', 'el cursor de un pedido en trozos no es válido');
  return parsed as ChunkState[];
}

/** Clave de un evento (checkpoint, transacción, índice del evento); `null` si no se sabe su índice: no se deduplica. */
function eventKey(event: RawGameEvent, position: EventPosition): string | null {
  if (position.eventIndex === null) return null;
  return `${String(event.checkpoint)}:${event.transactionDigest}:${String(position.eventIndex)}`;
}

/** Orden descendente por (checkpoint, índice de la transacción, índice del evento); lo que falte va al final. */
function compareDescending(a: { event: RawGameEvent; position: EventPosition }, b: { event: RawGameEvent; position: EventPosition }): number {
  const compare = <T extends bigint | number>(x: T | null, y: T | null): number => {
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x > y ? -1 : 1;
  };
  return (
    compare(a.event.checkpoint, b.event.checkpoint) ||
    compare(a.position.transactionIndex, b.position.transactionIndex) ||
    compare(a.position.eventIndex, b.position.eventIndex)
  );
}

/**
 * Un pedido por trozo (en paralelo), fusionados: los eventos de todos los trozos, ordenados de más nuevo a más viejo por
 * (checkpoint, transacción, índice del evento) y sin duplicados (un evento que casa con dos trozos se cuenta una vez); el
 * cursor es el de todos los trozos y hay más páginas mientras algún trozo no haya terminado. Un trozo que dice tener más
 * páginas sin cursor es un cursor que no avanza (`PaginationStalledError`). **Alcance de la fusión:** ordena y deduplica
 * **dentro de cada página**, no entre páginas (la página 2 de un trozo puede traer eventos más nuevos que la 1 de otro);
 * alcanza porque los términos de los trozos son disjuntos y quien consume las páginas ordena el resultado completo. Hoy un
 * filtro del lobby o de "Mis partidas" no supera 10 literales (un solo trozo): este camino no se recorre en uso real.
 */
async function requestPartitioned(
  client: EventScanClient,
  request: EventsRequest,
  chunks: readonly GrpcTypes.EventFilter[],
): Promise<EventsPage> {
  const states = decodeChunkStates(request.before, chunks.length);
  const results = await Promise.all(
    chunks.map((filter, i) => {
      const state = states[i];
      return state === undefined || state.done
        ? Promise.resolve(null)
        : requestPositioned(client, { ...request, filter, before: state.cursor }, PARTITIONED_READ_MASK);
    }),
  );
  const next: ChunkState[] = [];
  const merged: { event: RawGameEvent; position: EventPosition }[] = [];
  const seen = new Set<string>();
  for (const [i, result] of results.entries()) {
    if (result === null) {
      next.push({ cursor: states[i]?.cursor ?? null, done: true });
      continue;
    }
    if (result.page.hasNextPage && result.page.cursor === null) throw new PaginationStalledError();
    next.push({ cursor: result.page.cursor, done: !result.page.hasNextPage });
    for (const [j, event] of result.page.events.entries()) {
      const position = result.positions[j] ?? { transactionIndex: null, eventIndex: null };
      const key = eventKey(event, position);
      if (key !== null) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      merged.push({ event, position });
    }
  }
  merged.sort(compareDescending);
  const hasNextPage = next.some((state) => !state.done);
  return { events: merged.map((entry) => entry.event), cursor: JSON.stringify(next), hasNextPage };
}

/**
 * Decide si el error de un pedido es el cruce del piso de historial (M-4 de #10). `OUT_OF_RANGE` lo es siempre: es lo
 * que devuelve el `ListEvents` crudo con `startCheckpoint` por debajo del piso, sin frames ("requested data below
 * earliest available", sonda P7 de #10; H-5). Otro `RpcError` que no sea `CANCELLED` relee el piso: si superó la cota
 * usada, también. Si la relectura falla, cuenta como "no explicado" y quien llama relanza el error **original** del
 * pedido, no el de la relectura (NIT-1).
 */
async function isHistoryPruned(client: EventScanClient, error: unknown, startCheckpoint: bigint, signal?: AbortSignal): Promise<boolean> {
  if (!(error instanceof RpcError) || error.code === 'CANCELLED') return false;
  if (error.code === 'OUT_OF_RANGE') return true;
  let floor: bigint | null;
  try {
    floor = (await fetchNodeInfo(client, signal)).lowestAvailableCheckpoint;
  } catch {
    return false;
  }
  return floor !== null && floor > startCheckpoint;
}

/**
 * Un pedido; si el error es el cruce del piso (M-4, H-5 de #10), lo convierte en `HistoryPrunedError` (con `cause`). Un
 * filtro de más de `MAX_FILTER_LITERALS` literales se pide en trozos y se fusiona (#73, TASK-7b, M-5); con ≤ 10 es un solo
 * pedido, como siempre.
 */
export async function requestOrPruned(client: EventScanClient, request: EventsRequest): Promise<EventsPage> {
  const chunks = splitFilter(request.filter);
  try {
    return chunks.length === 1 ? await requestEvents(client, request) : await requestPartitioned(client, request, chunks);
  } catch (error) {
    if (await isHistoryPruned(client, error, request.startCheckpoint, request.signal)) {
      throw new HistoryPrunedError('el escaneo cruzó el piso de historial del nodo', { cause: error });
    }
    throw error;
  }
}
