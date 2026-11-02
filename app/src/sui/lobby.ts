import { GrpcTypes, RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, toBase64 } from '@mysten/sui/utils';
import { gameEventType, parseGameCreated, type RawGameEvent } from './events';
import { parseGameObject, type Game } from './game';
import { fetchNodeInfo } from './nodeInfo';
import { HistoryPrunedError, PaginationStalledError, ReadDataError } from './readErrors';
import { withReadTimeout } from './readPolicy';

// Constantes calibradas en #10 TASK-1 (sondas P5/P7, tablas en documents/REPORTES_LOBBY.md): en testnet, un pedido crudo
// de 50 eventos de un tipo escaso cubrió ≈ 14 épocas (5,46 M de checkpoints) y terminó en CHECKPOINT_BOUND; el tope de
// `limit` del servidor es ≥ 1000; la red avanza ≈ 4,36 checkpoints/s.
/** Eventos por pedido de `ListEvents`: mín(50, tope del servidor ≥ 1000). */
export const LOBBY_EVENTS_PER_REQUEST = 50;
/** Pedidos por página ("cargar más"): 1 cubre una época de testnet con un tipo escaso, + 1 de margen (tope 4, DL-3). */
export const LOBBY_MAX_REQUESTS_PER_PAGE = 2;
/** Candidatas (abiertas) que cortan el bucle de una página. */
export const LOBBY_PAGE_TARGET = 20;
/** Margen sobre el piso de historial del nodo (M-4): ≈ 1 h a 4,36 checkpoints/s, para no chocar con un piso que avanza. */
export const LOBBY_FLOOR_MARGIN_CHECKPOINTS = 16_000n;

/** Fila del lobby: una partida abierta leída del objeto, o una fila ilegible que no vacía la lista (DL-2). */
export type LobbyItem =
  | { kind: 'game'; game: Game; createdTxDigest: string }
  | { kind: 'unreadable'; gameId: string | null; txDigest: string };

/** Cota inferior del escaneo (`startCheckpoint`) y de dónde salió: la publicación, el piso del nodo o ninguna. */
export type LobbyLowerBound = { checkpoint: bigint; kind: 'publish' | 'node_floor' | 'none' };

/** Cliente que usa el lobby (ARQ-3): el `ListEvents`/`GetServiceInfo` crudos y la lectura de objetos en lote. */
export type LobbyClient = Pick<SuiGrpcClient, 'ledgerService' | 'getObjects'>;

/** Resultado de una página del lobby. `endCursor` en base64 (serializable como `pageParam`). */
export type LobbyPage = {
  items: LobbyItem[];
  endCursor: string | null;
  hasNextPage: boolean;
  lowerBound: LobbyLowerBound;
  end: 'more' | 'bound' | 'history_pruned';
};

/** Campos del evento que pide el lobby: sin `sender` (no se usa y no se trae). */
const LOBBY_READ_MASK = ['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index'];
const { Ordering, QueryEndReason } = GrpcTypes;

/**
 * Cota inferior efectiva del escaneo (M-1, M-4). Pura. Con piso > 0, `piso + LOBBY_FLOOR_MARGIN_CHECKPOINTS`; la cota es
 * la mayor entre esa y el checkpoint de la publicación (empate ⇒ publicación). Un nodo sin poda (piso 0 o ausente) deja
 * solo la publicación, sin margen; sin ninguna de las dos ⇒ `0n`, `'none'`.
 */
export function lobbyLowerBound({
  publishCheckpoint,
  nodeFloor,
}: {
  publishCheckpoint: bigint | null;
  nodeFloor: bigint | null;
}): LobbyLowerBound {
  const floorBound = nodeFloor !== null && nodeFloor > 0n ? nodeFloor + LOBBY_FLOOR_MARGIN_CHECKPOINTS : null;
  if (floorBound === null) {
    return publishCheckpoint === null ? { checkpoint: 0n, kind: 'none' } : { checkpoint: publishCheckpoint, kind: 'publish' };
  }
  if (publishCheckpoint === null || floorBound > publishCheckpoint) return { checkpoint: floorBound, kind: 'node_floor' };
  return { checkpoint: publishCheckpoint, kind: 'publish' };
}

type EventsPage = { events: RawGameEvent[]; cursor: string | null; hasNextPage: boolean };

/**
 * Un pedido crudo de `ListEvents` (H-1): `GameCreated`, descendente, desde `before` hasta la cota `startCheckpoint`.
 * Devuelve el **último** `watermark.cursor` (punto seguro de reanudación). Sin `QueryEnd`, o con un `reason` no listado
 * (incluido `UNKNOWN`), es un dato que la app no reconoce (NIT-1).
 */
async function requestCreatedEvents(
  client: LobbyClient,
  { eventType, startCheckpoint, before, signal }: { eventType: string; startCheckpoint: bigint; before: string | null; signal?: AbortSignal },
): Promise<EventsPage> {
  return withReadTimeout(signal, async (abort) => {
    const call = client.ledgerService.listEvents(
      {
        readMask: { paths: LOBBY_READ_MASK },
        startCheckpoint,
        // Mismo filtro que arma el SDK (`toGrpcEventFilter`, dist/grpc/filters.mjs) para un `eventType`.
        filter: { terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType } } }] }] },
        options: {
          limit: LOBBY_EVENTS_PER_REQUEST,
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
 * Decide si el error de un pedido es el cruce del piso de historial (M-4). `OUT_OF_RANGE` lo es siempre: es lo que
 * devuelve el `ListEvents` crudo con `startCheckpoint` por debajo del piso, sin frames ("requested data below earliest
 * available", medido en la sonda P7 de #10; H-5). Otro `RpcError` que no sea `CANCELLED` relee el piso: si superó la
 * cota usada, también. Si la relectura falla, cuenta como "no explicado" y quien llama relanza el error **original**
 * del pedido, no el de la relectura (NIT-1).
 */
async function isHistoryPruned(client: LobbyClient, error: unknown, startCheckpoint: bigint, signal?: AbortSignal): Promise<boolean> {
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

/** Un pedido del lobby; si el error es el cruce del piso (M-4, H-5), lo convierte en `HistoryPrunedError` (con `cause`). */
async function requestOrPruned(
  client: LobbyClient,
  request: { eventType: string; startCheckpoint: bigint; before: string | null; signal?: AbortSignal },
): Promise<EventsPage> {
  try {
    return await requestCreatedEvents(client, request);
  } catch (error) {
    if (await isHistoryPruned(client, error, request.startCheckpoint, request.signal)) {
      throw new HistoryPrunedError('el escaneo cruzó el piso de historial del nodo', { cause: error });
    }
    throw error;
  }
}

/**
 * Una página del lobby (DL-2, DL-3, M-1, M-2, M-4): relee el piso del nodo, fija la cota y hace hasta
 * `LOBBY_MAX_REQUESTS_PER_PAGE` pedidos crudos descendentes de `GameCreated` (corta antes al juntar
 * `LOBBY_PAGE_TARGET` candidatas o cuando no hay más), y lee en lote los objetos de las candidatas. Solo quedan las
 * abiertas (`opponent` nulo) en `Pending`; un evento u objeto ilegible da una fila `unreadable` sin ocultar las sanas. Si
 * el escaneo choca con el piso, la página termina con lo ya reunido (`end: 'history_pruned'`).
 */
export async function fetchLobbyPage(
  client: LobbyClient,
  {
    originalPackageId,
    publishCheckpoint,
    before,
    signal,
  }: { originalPackageId: string; publishCheckpoint: bigint | null; before: string | null; signal?: AbortSignal },
): Promise<LobbyPage> {
  const nodeInfo = await fetchNodeInfo(client, signal);
  let lowerBound = lobbyLowerBound({ publishCheckpoint, nodeFloor: nodeInfo.lowestAvailableCheckpoint });
  const eventType = gameEventType(originalPackageId, 'GameCreated');

  type Row = { kind: 'candidate'; gameId: string; txDigest: string } | { kind: 'unreadable'; txDigest: string };
  const rows: Row[] = [];
  let candidates = 0;
  let cursor = before;
  let hasNextPage = true;
  let end: LobbyPage['end'] = 'more';

  for (let requests = 0; hasNextPage && requests < LOBBY_MAX_REQUESTS_PER_PAGE && candidates < LOBBY_PAGE_TARGET; requests++) {
    let page: EventsPage;
    try {
      page = await requestOrPruned(client, { eventType, startCheckpoint: lowerBound.checkpoint, before: cursor, signal });
    } catch (error) {
      if (!(error instanceof HistoryPrunedError)) throw error;
      // Fin del historial disponible: se descarta lo del pedido fallido y se devuelve lo reunido antes.
      hasNextPage = false;
      end = 'history_pruned';
      lowerBound = { ...lowerBound, kind: 'node_floor' };
      break;
    }
    // M-2: un cursor que no avanza (o que falta) con más páginas es un error visible y no reintentable.
    if (page.hasNextPage && (page.cursor === null || page.cursor === cursor)) throw new PaginationStalledError();
    for (const raw of page.events) {
      try {
        const created = parseGameCreated(raw, originalPackageId);
        if (created.opponent !== null) continue;
        rows.push({ kind: 'candidate', gameId: created.gameId, txDigest: created.transactionDigest });
        candidates++;
      } catch (error) {
        if (!(error instanceof ReadDataError)) throw error;
        rows.push({ kind: 'unreadable', txDigest: raw.transactionDigest });
      }
    }
    hasNextPage = page.hasNextPage;
    end = hasNextPage ? 'more' : 'bound';
    cursor = page.cursor;
  }

  const objectIds = rows.flatMap((row) => (row.kind === 'candidate' ? [row.gameId] : []));
  const objects =
    objectIds.length === 0
      ? []
      : (
          await withReadTimeout(signal, (abort) => client.getObjects({ objectIds, include: { content: true }, signal: abort }))
        ).objects;
  const objectById = new Map(objectIds.map((id, i) => [id, objects[i]]));

  const items: LobbyItem[] = [];
  for (const row of rows) {
    if (row.kind === 'unreadable') {
      items.push({ kind: 'unreadable', gameId: null, txDigest: row.txDigest });
      continue;
    }
    const object = objectById.get(row.gameId);
    // `ObjectError` (no existe o borrado): se omite, no es una partida que mostrar.
    if (object === undefined || object instanceof Error) continue;
    let game: Game;
    try {
      game = parseGameObject(object, originalPackageId);
    } catch (error) {
      if (!(error instanceof ReadDataError)) throw error;
      items.push({ kind: 'unreadable', gameId: row.gameId, txDigest: row.txDigest });
      continue;
    }
    if (game.state.kind === 'pending' && game.opponent === null) items.push({ kind: 'game', game, createdTxDigest: row.txDigest });
  }

  return { items, endCursor: cursor, hasNextPage, lowerBound, end };
}
