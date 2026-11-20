import type { Duel } from './duel';
import type { DuelCreatedEvent, GameCreatedEvent } from './events';
import {
  eventTypesFilter,
  historyLowerBound,
  requestOrPruned,
  type EventScanClient,
  type EventsPage,
  type HistoryLowerBound,
} from './eventScan';
import type { Game } from './game';
import {
  controlLabel,
  eventLiterals,
  matchEvent,
  type DuelSource,
  type GameKey,
  type GameRegistry,
  type GameSelection,
  type LegacySource,
} from './gameRegistry';
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

/** Control de tiempo de una fila nueva, como lo trae `DuelCreated`: el id, el plazo por jugada y su etiqueta. */
export type LobbyControl = { id: number; turnMs: bigint; label: string };

/**
 * Fila del lobby: una partida abierta leída del objeto (de la fuente anterior `game::Game`, `kind: 'game'`, o de la nueva
 * `Duel<G>`, `kind: 'duel'`, con el control de tiempo que trae su `DuelCreated` y la etiqueta con la regla "la cadena
 * manda" de `controlLabel`), o una fila ilegible que no vacía la lista (DL-2). Una fila de un `G` que el registro no conoce
 * no existe: se ignora (S-1).
 */
export type LobbyItem =
  | { kind: 'game'; game: Game; createdTxDigest: string }
  | { kind: 'duel'; duel: Duel; gameKey: GameKey; control: LobbyControl; createdTxDigest: string }
  | { kind: 'unreadable'; gameId: string | null; txDigest: string };

/** Resultado de una página del lobby. `endCursor` serializable como `pageParam` (el del nodo, o la lista de los de cada trozo). */
export type LobbyPage = {
  items: LobbyItem[];
  endCursor: string | null;
  hasNextPage: boolean;
  lowerBound: HistoryLowerBound;
  end: 'more' | 'bound' | 'history_pruned';
};

/** Una candidata: el evento de creación de una partida abierta, ya parseado con el parser de **su** fuente. */
type Row =
  | { kind: 'legacy'; source: LegacySource; created: GameCreatedEvent; gameId: string; txDigest: string }
  | { kind: 'duel'; source: DuelSource; gameKey: GameKey; created: DuelCreatedEvent; gameId: string; txDigest: string }
  | { kind: 'unreadable'; txDigest: string };

/**
 * Una página del lobby (DL-2, DL-3, M-1, M-2, M-4): relee el piso del nodo, fija la cota y hace hasta
 * `LOBBY_MAX_REQUESTS_PER_PAGE` pedidos crudos descendentes del **OR** de los `*Created` de los juegos elegidos (un
 * término de un literal por fuente: el tag exacto de la anterior y, de la nueva, el literal prefijo con "Todos" o el tag
 * completo con un juego, `eventLiterals`; corta antes al juntar `LOBBY_PAGE_TARGET` candidatas o cuando no hay más), y lee
 * en lote los objetos de las candidatas. El parser despacha por el tipo del evento; un evento de un `G` fuera del registro
 * se ignora (S-1). Solo quedan las abiertas (`opponent` nulo) en `Pending`; un evento u objeto ilegible da una fila
 * `unreadable` sin ocultar las sanas. Si el escaneo choca con el piso, la página termina con lo ya reunido
 * (`end: 'history_pruned'`).
 */
export async function fetchLobbyPage(
  client: EventScanClient,
  {
    registry,
    games = 'all',
    publishCheckpoint,
    before,
    signal,
  }: { registry: GameRegistry; games?: GameSelection; publishCheckpoint: bigint | null; before: string | null; signal?: AbortSignal },
): Promise<LobbyPage> {
  const nodeInfo = await fetchNodeInfo(client, signal);
  let lowerBound = historyLowerBound({ publishCheckpoint, nodeFloor: nodeInfo.lowestAvailableCheckpoint });
  const filter = eventTypesFilter(eventLiterals(registry, games, 'created'));

  const rows: Row[] = [];
  let candidates = 0;
  let cursor = before;
  let hasNextPage = true;
  let end: LobbyPage['end'] = 'more';

  for (let requests = 0; hasNextPage && requests < LOBBY_MAX_REQUESTS_PER_PAGE && candidates < LOBBY_PAGE_TARGET; requests++) {
    let page: EventsPage;
    try {
      page = await requestOrPruned(client, {
        filter,
        startCheckpoint: lowerBound.checkpoint,
        before: cursor,
        limit: LOBBY_EVENTS_PER_REQUEST,
        signal,
      });
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
      const match = matchEvent(registry, raw.eventType);
      if (match.kind === 'foreign') continue;
      if (match.kind === 'unknown' || match.event !== 'created') {
        rows.push({ kind: 'unreadable', txDigest: raw.transactionDigest });
        continue;
      }
      try {
        if (match.source.kind === 'legacy') {
          const created = match.source.parseCreated(raw);
          if (created.opponent !== null) continue;
          rows.push({ kind: 'legacy', source: match.source, created, gameId: created.gameId, txDigest: created.transactionDigest });
        } else {
          const created = match.source.parseCreated(raw);
          if (created.opponent !== null) continue;
          rows.push({ kind: 'duel', source: match.source, gameKey: match.game.key, created, gameId: created.duelId, txDigest: created.transactionDigest });
        }
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

  const objectIds = rows.flatMap((row) => (row.kind === 'unreadable' ? [] : [row.gameId]));
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
    try {
      if (row.kind === 'legacy') {
        const game = row.source.parseObject(object);
        if (game.state.kind === 'pending' && game.opponent === null) items.push({ kind: 'game', game, createdTxDigest: row.txDigest });
      } else {
        const duel = row.source.parseObject(object);
        const { control, turnMs } = row.created;
        if (duel.state.kind === 'pending' && duel.opponent === null) {
          items.push({ kind: 'duel', duel, gameKey: row.gameKey, control: { id: control, turnMs, label: controlLabel(turnMs) }, createdTxDigest: row.txDigest });
        }
      }
    } catch (error) {
      if (!(error instanceof ReadDataError)) throw error;
      items.push({ kind: 'unreadable', gameId: row.gameId, txDigest: row.txDigest });
    }
  }

  return { items, endCursor: cursor, hasNextPage, lowerBound, end };
}
