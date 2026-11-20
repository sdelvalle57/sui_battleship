import type { GrpcTypes } from '@mysten/sui/grpc';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { Duel } from './duel';
import type { RawGameEvent } from './events';
import {
  eventTypesFilter,
  historyLowerBound,
  requestOrPruned,
  type EventScanClient,
  type EventsPage,
  type HistoryLowerBound,
} from './eventScan';
import type { Game } from './game';
import { eventLiterals, matchEvent, type GameKey, type GameRegistry, type GameSelection, type GameSource } from './gameRegistry';
import { sameAddress } from './ids';
import { LOBBY_EVENTS_PER_REQUEST, LOBBY_MAX_REQUESTS_PER_PAGE, LOBBY_PAGE_TARGET } from './lobby';
import { fetchNodeInfo } from './nodeInfo';
import { HistoryPrunedError, PaginationStalledError, ReadDataError } from './readErrors';
import { withReadTimeout } from './readPolicy';

// "Mis partidas" (#13): dos fuentes de eventos (DL-1), el estado vigente de cada objeto (DL-3), las tres secciones con
// su fijado (DL-4, DL-5) y el pie de cada sección (H-1). Todo puro o con el cliente por parámetro (ARQ-3).

/** Eventos por pedido de la actividad propia (DL-8): con la cuenta como filtro, todos los eventos son propios. */
export const MY_ACTIVITY_EVENTS_PER_REQUEST = 50;
/** Pedidos por página de la actividad ("Cargar más actividad", DL-8). */
export const MY_ACTIVITY_MAX_REQUESTS_PER_PAGE = 1;

/** Por qué la partida es de la cuenta: la creó, la aceptó (resolvió) o la invitaron. */
export type MyGameRole = 'creator' | 'acceptor' | 'invitee';

/**
 * Fila de "Mis partidas": la partida leída del objeto, con su versión (Lamport: solo comparable entre dos lecturas del
 * mismo objeto, V-10) y el evento que la trajo, o una fila ilegible que no oculta las sanas (DL-3).
 */
export type MyGameItem =
  | { kind: 'game'; game: Game; objectVersion: bigint; role: MyGameRole; txDigest: string; checkpoint: bigint | null }
  | { kind: 'unreadable'; gameId: string | null; role: MyGameRole | null; txDigest: string; checkpoint: bigint | null };

/**
 * Fila de un duelo de la fuente nueva (`Duel<G>`, #73 TASK-7b): el objeto con su versión (Lamport, como en `MyGameItem`), el
 * juego al que pertenece y el evento que lo trajo. Un duelo conserva su estado completo (`Active`, `TimedOut`, `Expired`
 * incluidos): no se proyecta a `Game`, que no los tiene.
 */
export type MyDuelItem = {
  kind: 'duel';
  duel: Duel;
  gameKey: GameKey;
  objectVersion: bigint;
  role: MyGameRole;
  txDigest: string;
  checkpoint: bigint | null;
};

/** Una fila de "Mis partidas" de cualquiera de las dos fuentes del coinflip (o la ilegible). */
export type MyGameEntry = MyGameItem | MyDuelItem;

/**
 * Una página de una fuente. `endCursor` serializable como `pageParam` (el del nodo, o la lista de los de cada trozo si el
 * filtro se partió). `unreadableEvents` cuenta los eventos ilegibles que no dan fila: solo los de las invitaciones
 * (MINOR-4); en la actividad son filas y vale 0.
 */
export type MyGamesPage = {
  items: MyGameEntry[];
  endCursor: string | null;
  hasNextPage: boolean;
  lowerBound: HistoryLowerBound;
  end: 'more' | 'bound' | 'history_pruned';
  unreadableEvents: number;
};

/**
 * Argumentos de una página de cualquiera de las dos fuentes: el registro de juegos (los tipos de todas sus fuentes) y los
 * juegos que se listan ("Todos" por defecto).
 */
type SourcePageArgs = {
  registry: GameRegistry;
  games?: GameSelection;
  address: string;
  publishCheckpoint: bigint | null;
  before: string | null;
  signal?: AbortSignal;
};

/** Lo que una fuente saca de un evento: una candidata (se lee el objeto), una fila ilegible, nada, o un ilegible contado. */
type Classified =
  | { kind: 'candidate'; gameId: string; role: MyGameRole; txDigest: string; checkpoint: bigint | null; source: GameSource; gameKey: GameKey }
  | { kind: 'unreadable'; gameId: string | null; role: MyGameRole | null; txDigest: string; checkpoint: bigint | null }
  | { kind: 'skip' }
  | { kind: 'unreadable_event' };

type Source = {
  filter: GrpcTypes.EventFilter;
  limit: number;
  maxRequests: number;
  /** Candidatas que cortan el bucle de una página (`Infinity` = sin objetivo). */
  target: number;
  classify: (raw: RawGameEvent) => Classified;
};

const literal = (predicate: GrpcTypes.EventLiteral['predicate']): GrpcTypes.EventLiteral => ({ negated: false, predicate });

/**
 * Filtro de la actividad propia (DL-1 (A)): un término `[sender = cuenta ∧ tipo = <creación>]` y otro `[sender = cuenta ∧
 * tipo = <resolución>]` por cada literal de evento de los juegos elegidos (`eventLiterals`: el tag exacto de la fuente
 * anterior y, de la nueva, el literal prefijo con "Todos" o el tag completo con un juego), con IDs de definición (DL-9 de
 * #10, V-4). El nodo lo resuelve por índice (V-2, V-9). Cada término cuenta 2 literales: con las dos fuentes del coinflip
 * son 8 (≤ 10); con más juegos supera `MAX_FILTER_LITERALS` y `requestOrPruned` lo parte en trozos (M-5).
 */
export function myActivityFilter(registry: GameRegistry, address: string, games: GameSelection = 'all'): GrpcTypes.EventFilter {
  const sender = literal({ oneofKind: 'sender', sender: { address: normalizeSuiAddress(address) } });
  const terms = (['created', 'resolved'] as const).flatMap((name) =>
    eventLiterals(registry, games, name).map(
      (eventType): GrpcTypes.EventTerm => ({ literals: [sender, literal({ oneofKind: 'eventType', eventType: { eventType } })] }),
    ),
  );
  return { terms };
}

/**
 * Bucle común de una página (el de `fetchLobbyPage`): relee el piso del nodo, fija la cota y hace hasta
 * `source.maxRequests` pedidos descendentes (corta antes al juntar `source.target` candidatas o cuando no hay más), y lee
 * en lote los objetos de las candidatas. Un cursor que no avanza con más páginas es `PaginationStalledError` (M-2 de
 * #10); el cruce del piso termina la página con lo reunido (`end: 'history_pruned'`). Un pedido vacío con
 * `CHECKPOINT_BOUND` tras un `ITEM_LIMIT` es un fin normal (V-9).
 */
async function fetchSourcePage(client: EventScanClient, args: SourcePageArgs, source: Source): Promise<MyGamesPage> {
  const { publishCheckpoint, before, signal } = args;
  const nodeInfo = await fetchNodeInfo(client, signal);
  let lowerBound = historyLowerBound({ publishCheckpoint, nodeFloor: nodeInfo.lowestAvailableCheckpoint });

  const rows: Exclude<Classified, { kind: 'skip' } | { kind: 'unreadable_event' }>[] = [];
  let unreadableEvents = 0;
  let candidates = 0;
  let cursor = before;
  let hasNextPage = true;
  let end: MyGamesPage['end'] = 'more';

  for (let requests = 0; hasNextPage && requests < source.maxRequests && candidates < source.target; requests++) {
    let page: EventsPage;
    try {
      page = await requestOrPruned(client, {
        filter: source.filter,
        startCheckpoint: lowerBound.checkpoint,
        before: cursor,
        limit: source.limit,
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
    if (page.hasNextPage && (page.cursor === null || page.cursor === cursor)) throw new PaginationStalledError();
    for (const raw of page.events) {
      const row = source.classify(raw);
      if (row.kind === 'skip') continue;
      if (row.kind === 'unreadable_event') {
        unreadableEvents++;
        continue;
      }
      rows.push(row);
      if (row.kind === 'candidate') candidates++;
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

  const items: MyGameEntry[] = [];
  for (const row of rows) {
    const { txDigest, checkpoint } = row;
    if (row.kind === 'unreadable') {
      items.push(row);
      continue;
    }
    const object = objectById.get(row.gameId);
    // `ObjectError` (no existe o borrado): se omite, no es una partida que mostrar.
    if (object === undefined || object instanceof Error) continue;
    try {
      // El parser de objeto es el de la fuente que trajo el evento: exige **su** tipo exacto.
      if (row.source.kind === 'legacy') {
        const game = row.source.parseObject(object);
        items.push({ kind: 'game', game, objectVersion: BigInt(object.version), role: row.role, txDigest, checkpoint });
      } else {
        const duel = row.source.parseObject(object);
        items.push({ kind: 'duel', duel, gameKey: row.gameKey, objectVersion: BigInt(object.version), role: row.role, txDigest, checkpoint });
      }
    } catch (error) {
      if (!(error instanceof ReadDataError)) throw error;
      items.push({ kind: 'unreadable', gameId: row.gameId, role: row.role, txDigest, checkpoint });
    }
  }

  return { items, endCursor: cursor, hasNextPage, lowerBound, end, unreadableEvents };
}

/**
 * Un evento de la actividad (DL-3): un `GameCreated` tiene que ser de la cuenta como `creator`, y un `GameResolved` como
 * `acceptor` (es `ctx.sender()`, y el filtro es por remitente). Si no, o si no se puede leer, la fila es ilegible y
 * nunca se muestra como propia (SEG-10); el `gameId` va si se pudo leer, y el rol, si se reconoce el tipo.
 */
function classifyActivity(raw: RawGameEvent, registry: GameRegistry, address: string): Classified {
  const base = { txDigest: raw.transactionDigest, checkpoint: raw.checkpoint };
  const match = matchEvent(registry, raw.eventType);
  // S-1: con el literal prefijo llegan eventos de un `G` que el registro no conoce; no son una fila rota.
  if (match.kind === 'foreign') return { kind: 'skip' };
  if (match.kind === 'unknown') return { kind: 'unreadable', gameId: null, role: null, ...base };
  const role: MyGameRole = match.event === 'created' ? 'creator' : 'acceptor';
  const { source, game } = match;
  let event: { gameId: string; player: string };
  try {
    if (source.kind === 'legacy') {
      if (role === 'creator') {
        const created = source.parseCreated(raw);
        event = { gameId: created.gameId, player: created.creator };
      } else {
        const resolved = source.parseResolved(raw);
        event = { gameId: resolved.gameId, player: resolved.acceptor };
      }
    } else if (role === 'creator') {
      const created = source.parseCreated(raw);
      event = { gameId: created.duelId, player: created.creator };
    } else {
      const resolved = source.parseResolved(raw);
      event = { gameId: resolved.duelId, player: resolved.acceptor };
    }
  } catch (error) {
    if (!(error instanceof ReadDataError)) throw error;
    return { kind: 'unreadable', gameId: null, role, ...base };
  }
  // Invariante del filtro (`ReadDataError` `invariant` en el plan): un evento de otra cuenta es una fila ilegible.
  if (!sameAddress(event.player, address)) return { kind: 'unreadable', gameId: event.gameId, role, ...base };
  return { kind: 'candidate', gameId: event.gameId, role, source, gameKey: game.key, ...base };
}

/**
 * Una página de la actividad propia (DL-1 (A), DL-3, DL-8): un pedido de `MY_ACTIVITY_EVENTS_PER_REQUEST` eventos con
 * `myActivityFilter`, el invariante de remitente y el estado vigente de cada objeto. Sus ilegibles son filas
 * (`unreadableEvents: 0`).
 */
export async function fetchMyActivityPage(client: EventScanClient, args: SourcePageArgs): Promise<MyGamesPage> {
  return fetchSourcePage(client, args, {
    filter: myActivityFilter(args.registry, args.address, args.games),
    limit: MY_ACTIVITY_EVENTS_PER_REQUEST,
    maxRequests: MY_ACTIVITY_MAX_REQUESTS_PER_PAGE,
    target: Number.POSITIVE_INFINITY,
    classify: (raw) => classifyActivity(raw, args.registry, args.address),
  });
}

/**
 * Una página de invitaciones recibidas (DL-1 (B), DL-8): el escaneo de todos los `GameCreated` con las constantes del
 * lobby (50 / 2 / 20) y el filtro `opponent == cuenta` en el cliente. No descarta las terminadas: DL-5 necesita ver el
 * estado nuevo de una partida fijada. Un **evento** ilegible no da fila (no se sabe a quién invita) y se cuenta en
 * `unreadableEvents` (MINOR-4); un **objeto** ilegible de una invitación a la cuenta sí da fila, con rol `invitee`.
 */
export async function fetchInvitationsPage(client: EventScanClient, args: SourcePageArgs): Promise<MyGamesPage> {
  return fetchSourcePage(client, args, {
    filter: eventTypesFilter(eventLiterals(args.registry, args.games ?? 'all', 'created')),
    limit: LOBBY_EVENTS_PER_REQUEST,
    maxRequests: LOBBY_MAX_REQUESTS_PER_PAGE,
    target: LOBBY_PAGE_TARGET,
    classify: (raw) => {
      const match = matchEvent(args.registry, raw.eventType);
      // S-1: un `G` fuera del registro se ignora (no es una fila rota ni un evento ilegible).
      if (match.kind === 'foreign') return { kind: 'skip' };
      if (match.kind === 'unknown' || match.event !== 'created') return { kind: 'unreadable_event' };
      let invited: { gameId: string; opponent: string | null };
      try {
        if (match.source.kind === 'legacy') {
          const created = match.source.parseCreated(raw);
          invited = { gameId: created.gameId, opponent: created.opponent };
        } else {
          const created = match.source.parseCreated(raw);
          invited = { gameId: created.duelId, opponent: created.opponent };
        }
      } catch (error) {
        if (!(error instanceof ReadDataError)) throw error;
        return { kind: 'unreadable_event' };
      }
      if (invited.opponent === null || !sameAddress(invited.opponent, args.address)) return { kind: 'skip' };
      return {
        kind: 'candidate',
        gameId: invited.gameId,
        role: 'invitee',
        source: match.source,
        gameKey: match.game.key,
        txDigest: raw.transactionDigest,
        checkpoint: raw.checkpoint,
      };
    },
  });
}

/** Sección de la página "Mis partidas" (DL-4). */
export type MyGamesSection = 'invitations' | 'pending' | 'finished';
/** Sección fijada por `gameId` mientras la página está montada (DL-5). */
export type MyGamesPins = ReadonlyMap<string, MyGamesSection>;
/** Filas de cada sección, en el orden en que se muestran. */
export type MyGamesSections = Record<MyGamesSection, MyGameEntry[]>;

/** Clave de deduplicación y de fijado: el `gameId` normalizado, o `null` si la fila no lo tiene. */
export function myGameKey(item: MyGameEntry): string | null {
  const id = item.kind === 'game' ? item.game.id : item.kind === 'duel' ? item.duel.id : item.gameId;
  return id === null ? null : normalizeSuiAddress(id);
}

/**
 * Sección natural de una fila de la fuente nueva (misma regla que `naturalSection` para un `Game`, #73 TASK-7b): un
 * duelo `Active` es de quien lo juega (`pending`: en curso); `Resolved`, `TimedOut` y `Expired` son de los dos jugadores;
 * `Cancelled`, del creador. Un rol `acceptor` con el objeto en `Pending` contradice el contrato ⇒ `null`.
 */
function duelSection({ duel, role }: MyDuelItem, address: string): MyGamesSection | null {
  const isCreator = sameAddress(duel.creator, address);
  switch (duel.state.kind) {
    case 'pending':
      if (role === 'invitee') return 'invitations';
      return role === 'creator' ? 'pending' : null;
    case 'active':
      return isCreator || sameAddress(duel.state.acceptor, address) ? 'pending' : null;
    case 'resolved':
    case 'timed_out':
    case 'expired':
      return isCreator || sameAddress(duel.state.acceptor, address) ? 'finished' : null;
    case 'cancelled':
      return isCreator ? 'finished' : null;
  }
}

/**
 * Sección natural de una fila para la cuenta (DL-4): invitación en `Pending` ⇒ `invitations`; creada en `Pending` ⇒
 * `pending`; resuelta con la cuenta como creador o aceptante, o cancelada y creada por la cuenta ⇒ `finished`; una
 * invitación terminada en la que la cuenta no fue el aceptante (la rechazó o la canceló el creador) ⇒ `null`. Un rol
 * `acceptor` con el objeto en `Pending` contradice el contrato (aceptar es resolver) ⇒ `null`. Ilegibles: las de rol
 * `invitee` ⇒ `invitations`; el resto ⇒ `finished`, nunca `pending` (DL-3).
 */
export function naturalSection(item: MyGameEntry, address: string): MyGamesSection | null {
  if (item.kind === 'unreadable') return item.role === 'invitee' ? 'invitations' : 'finished';
  if (item.kind === 'duel') return duelSection(item, address);
  const { game, role } = item;
  switch (game.state.kind) {
    case 'pending':
      if (role === 'invitee') return 'invitations';
      return role === 'creator' ? 'pending' : null;
    case 'resolved':
      return sameAddress(game.creator, address) || sameAddress(game.state.acceptor, address) ? 'finished' : null;
    case 'cancelled':
      return sameAddress(game.creator, address) ? 'finished' : null;
  }
}

/** Orden de eventos: positivo si `a` es más nuevo que `b` (checkpoint mayor; `null` es el más viejo; empate por digest). */
function compareEvents(a: MyGameEntry, b: MyGameEntry): number {
  if (a.checkpoint !== b.checkpoint) {
    if (a.checkpoint === null) return -1;
    if (b.checkpoint === null) return 1;
    return a.checkpoint > b.checkpoint ? 1 : -1;
  }
  return a.txDigest === b.txDigest ? 0 : a.txDigest > b.txDigest ? 1 : -1;
}

/**
 * Una lectura de la misma partida que llegó por dos fuentes, combinada (H-2): gana la legible; entre legibles, el
 * `game` de la mayor `objectVersion` (empate ⇒ cualquiera: es el mismo objeto), con rol `acceptor` si alguna lo trae y
 * el evento más nuevo; entre ilegibles, la del evento más nuevo.
 */
function mergeTwo(a: MyGameEntry, b: MyGameEntry): MyGameEntry {
  const newer = compareEvents(a, b) >= 0 ? a : b;
  if (a.kind === 'unreadable') return b.kind === 'unreadable' ? newer : b;
  if (b.kind === 'unreadable') return a;
  const read = b.objectVersion > a.objectVersion ? b : a;
  const role = a.role === 'acceptor' || b.role === 'acceptor' ? 'acceptor' : read.role;
  return { ...read, role, txDigest: newer.txDigest, checkpoint: newer.checkpoint };
}

/**
 * Deduplica las dos fuentes por `gameId` (MINOR-5, H-2): una invitación que la cuenta aceptó llega por las dos y es una
 * sola fila. Las ilegibles sin `gameId` no se deduplican. Conserva el orden de primera aparición.
 */
export function mergeMyGames(activity: readonly MyGameEntry[], invitations: readonly MyGameEntry[]): MyGameEntry[] {
  const merged: MyGameEntry[] = [];
  const indexByKey = new Map<string, number>();
  for (const item of [...activity, ...invitations]) {
    const key = myGameKey(item);
    const index = key === null ? undefined : indexByKey.get(key);
    if (index === undefined) {
      if (key !== null) indexByKey.set(key, merged.length);
      merged.push(item);
      continue;
    }
    const current = merged[index];
    if (current !== undefined) merged[index] = mergeTwo(current, item);
  }
  return merged;
}

/**
 * Fija en su sección natural las filas con `gameId` que todavía no tienen sección (DL-5). Recibe los ítems **ya
 * deduplicados** por `mergeMyGames`, para que el pin salga de la lectura ganadora (MINOR-1 del handoff v1). Devuelve **la
 * misma instancia** si no hay nada nuevo que fijar (el hook la guarda en su estado sin re-render), o un `Map` nuevo con
 * los anteriores más los nuevos; nunca muta el recibido.
 */
export function extendPins(pins: MyGamesPins, items: readonly MyGameEntry[], address: string): MyGamesPins {
  const added = new Map<string, MyGamesSection>();
  for (const item of items) {
    const key = myGameKey(item);
    if (key === null || pins.has(key) || added.has(key)) continue;
    const section = naturalSection(item, address);
    if (section !== null) added.set(key, section);
  }
  return added.size === 0 ? pins : new Map([...pins, ...added]);
}

/**
 * Agrupa las filas de las dos fuentes en las tres secciones (DL-4, DL-5): deduplica con `mergeMyGames`, ubica cada fila
 * en su sección fijada o, sin pin, en la natural (las ilegibles sin `gameId`, siempre en la natural), descarta las que no
 * tienen sección, y ordena cada sección de la más nueva a la más vieja por el checkpoint del evento (`null` al final,
 * empate por digest).
 */
export function groupMyGames({
  activity,
  invitations,
  address,
  pins,
}: {
  activity: readonly MyGameEntry[];
  invitations: readonly MyGameEntry[];
  address: string;
  pins: MyGamesPins;
}): MyGamesSections {
  const sections: MyGamesSections = { invitations: [], pending: [], finished: [] };
  for (const item of mergeMyGames(activity, invitations)) {
    const key = myGameKey(item);
    const section = (key === null ? undefined : pins.get(key)) ?? naturalSection(item, address);
    if (section !== null) sections[section].push(item);
  }
  for (const rows of Object.values(sections)) rows.sort((a, b) => compareEvents(b, a));
  return sections;
}

/** Pie de una sección (H-1): texto de vacío, botón de paginación, alerta de "cargar más" y nota del piso. */
export type SectionFooter = {
  /** `definitive` = "No tienes…"; `reviewed` = "… en lo revisado"; `null` = la sección tiene filas. */
  empty: 'definitive' | 'reviewed' | null;
  showMore: boolean;
  moreDisabled: boolean;
  /** `role="alert"` con `readErrorMessage(nextPageError)`. */
  alert: boolean;
  /** Sufijo "en el historial disponible del nodo (desde <fecha>)" en el vacío, o la nota al pie con filas. */
  floorNote: boolean;
};

/**
 * Pie de una sección según su fuente (H-1, DL-16). Pura. El vacío definitivo solo sale sin más páginas, sin `stalled` y
 * sin error de "cargar más": nunca "No tienes…" mientras quede historial por revisar. El botón se muestra con más
 * páginas y sin `stalled`, **también** con error (sirve de reintento), y se deshabilita mientras carga; la alerta va con
 * cualquier error de "cargar más", también con `stalled`.
 */
export function sectionFooter({
  itemsInSection,
  hasNextPage,
  stalled,
  nextPageError,
  isFetchingNextPage,
  floorBased,
}: {
  itemsInSection: number;
  hasNextPage: boolean;
  stalled: boolean;
  nextPageError: unknown;
  isFetchingNextPage: boolean;
  floorBased: boolean;
}): SectionFooter {
  const hasError = nextPageError !== null && nextPageError !== undefined;
  const complete = !hasNextPage && !stalled && !hasError;
  return {
    empty: itemsInSection > 0 ? null : complete ? 'definitive' : 'reviewed',
    showMore: hasNextPage && !stalled,
    moreDisabled: isFetchingNextPage,
    alert: hasError,
    floorNote: floorBased,
  };
}
