import { GrpcTypes, RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import type { RawGameEvent } from './events';
import { fetchNodeInfo } from './nodeInfo';
import { HistoryPrunedError, ReadDataError } from './readErrors';
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
 * Un pedido crudo de `ListEvents` (H-1 de #10): descendente, desde `before` hasta la cota `startCheckpoint`. Devuelve
 * el **último** `watermark.cursor` (punto seguro de reanudación; tras un `CHECKPOINT_BOUND` es el de la cota, V-9 de
 * #13). Sin `QueryEnd`, o con un `reason` no listado (incluido `UNKNOWN`), es un dato que la app no reconoce (NIT-1).
 */
export async function requestEvents(
  client: EventScanClient,
  { filter, startCheckpoint, before, limit, signal }: EventsRequest,
): Promise<EventsPage> {
  return withReadTimeout(signal, async (abort) => {
    const call = client.ledgerService.listEvents(
      {
        readMask: { paths: EVENT_READ_MASK },
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
    return { events, cursor: cursor === undefined ? null : toBase64(cursor), hasNextPage };
  });
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

/** Un pedido; si el error es el cruce del piso (M-4, H-5 de #10), lo convierte en `HistoryPrunedError` (con `cause`). */
export async function requestOrPruned(client: EventScanClient, request: EventsRequest): Promise<EventsPage> {
  try {
    return await requestEvents(client, request);
  } catch (error) {
    if (await isHistoryPruned(client, error, request.startCheckpoint, request.signal)) {
      throw new HistoryPrunedError('el escaneo cruzó el piso de historial del nodo', { cause: error });
    }
    throw error;
  }
}
