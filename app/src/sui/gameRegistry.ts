import { normalizeStructTag } from '@mysten/sui/utils';
import { duelType, parseDuelObject, type Duel, type DuelObjectInput } from './duel';
import {
  duelEventPrefix,
  duelEventType,
  eventTypeFamily,
  gameEventType,
  parseDuelActivated,
  parseDuelCancelled,
  parseDuelCreated,
  parseDuelExpired,
  parseDuelResolved,
  parseDuelTimedOut,
  parseDuelTurn,
  parseGameCancelled,
  parseGameCreated,
  parseGameResolved,
  type DuelActivatedEvent,
  type DuelCancelledEvent,
  type DuelCreatedEvent,
  type DuelEventName,
  type DuelExpiredEvent,
  type DuelResolvedEvent,
  type DuelTimedOutEvent,
  type DuelTurnEvent,
  type GameCancelledEvent,
  type GameCreatedEvent,
  type GameEventName,
  type GameResolvedEvent,
  type RawGameEvent,
} from './events';
import { gameType, isExactType, parseGameObject, type Game, type GameObjectInput } from './game';

// Registro de juegos de la plataforma multijuego (#73, TASK-7a; plan §8.1). Único lugar que arma los tipos de los objetos y
// de los eventos de cada juego: ningún componente arma tags ni targets (ARQ-1). Los tipos salen de `typeOrigins` por
// **(módulo, nombre)**, nunca solo por módulo (S-2), y llevan el ID de **definición**; `packageId` solo sirve para los
// targets de las llamadas (TASK-7b).

// ---------------------------------------------------------------------------------------------------------------------
// Controles de tiempo (espejo de R.2 del handoff y de `duel.move`; `agents.md` §5)
// ---------------------------------------------------------------------------------------------------------------------

/** Un control de tiempo del contrato: su id (el que recibe `create`), el plazo por jugada en ms y su etiqueta. */
export type TimeControl = { id: number; turnMs: bigint; label: string };

const MS_PER_SECOND = 1_000n;
const MS_PER_MINUTE = 60n * MS_PER_SECOND;
const MS_PER_HOUR = 60n * MS_PER_MINUTE;
const MS_PER_DAY = 24n * MS_PER_HOUR;

const TURN_LIMIT_SUFFIX = 'por jugada';

/**
 * Espejo de la tabla de controles de `duel.move` (id → `turn_ms` y etiqueta), solo para mostrar y validar de cortesía: el
 * contrato aborta igual con `duel`/16 ante un id inexistente. Los ids publicados no cambian nunca (PROY-2); un id agregado
 * en un upgrade futuro no está acá y se muestra en formato genérico (`controlLabel`). **Se revisa en todo upgrade que toque
 * la tabla**, en el mismo PR (`agents.md` §5). El id 0 es "sin reloj" (juegos atómicos, como el coinflip).
 */
export const TIME_CONTROLS: readonly TimeControl[] = [
  { id: 0, turnMs: 0n, label: 'sin reloj' },
  { id: 1, turnMs: 10n * MS_PER_MINUTE, label: `10 min ${TURN_LIMIT_SUFFIX}` },
  { id: 2, turnMs: 20n * MS_PER_MINUTE, label: `20 min ${TURN_LIMIT_SUFFIX}` },
  { id: 3, turnMs: 30n * MS_PER_MINUTE, label: `30 min ${TURN_LIMIT_SUFFIX}` },
  { id: 4, turnMs: 60n * MS_PER_MINUTE, label: `60 min ${TURN_LIMIT_SUFFIX}` },
  { id: 5, turnMs: MS_PER_DAY, label: `1 día ${TURN_LIMIT_SUFFIX}` },
  { id: 6, turnMs: 3n * MS_PER_DAY, label: `3 días ${TURN_LIMIT_SUFFIX}` },
  { id: 7, turnMs: 7n * MS_PER_DAY, label: `7 días ${TURN_LIMIT_SUFFIX}` },
];

/**
 * Espejo de `duel::CLAIM_GRACE_MS` (D13, S-2): 7 días después del plazo vencido de un solo jugador pendiente, cualquiera
 * puede reembolsar 100/100 sin comisión (`refund_stalled`). Solo para mostrar; la cadena decide la elegibilidad.
 */
export const CLAIM_GRACE_MS = 7n * MS_PER_DAY;

/** Unidades del formato genérico, de mayor a menor: la primera que divide exacto el plazo. */
const GENERIC_UNITS: readonly { ms: bigint; singular: string; plural: string }[] = [
  { ms: MS_PER_DAY, singular: 'día', plural: 'días' },
  { ms: MS_PER_HOUR, singular: 'h', plural: 'h' },
  { ms: MS_PER_MINUTE, singular: 'min', plural: 'min' },
  { ms: MS_PER_SECOND, singular: 's', plural: 's' },
];

/** El control con ese id (el que trae `DuelCreated.control`), o `null` si el espejo no lo conoce. */
export function timeControlById(id: number): TimeControl | null {
  return TIME_CONTROLS.find((control) => control.id === id) ?? null;
}

/**
 * Etiqueta del plazo por jugada. **La cadena manda** (H-2): si `turnMs` coincide con un control del espejo, usa su etiqueta;
 * si no (un id agregado en un upgrade, o un valor de ensayo), usa el formato genérico "15 s por jugada", "N min por
 * jugada", "N h por jugada" o "N días por jugada" (la mayor unidad que lo divide exacto; sin divisor entero de segundo,
 * milisegundos). Nunca es un error de configuración ni de lectura.
 */
export function controlLabel(turnMs: bigint): string {
  const known = TIME_CONTROLS.find((control) => control.turnMs === turnMs);
  if (known !== undefined) return known.label;
  for (const unit of GENERIC_UNITS) {
    if (turnMs % unit.ms === 0n) {
      const amount = turnMs / unit.ms;
      return `${String(amount)} ${amount === 1n ? unit.singular : unit.plural} ${TURN_LIMIT_SUFFIX}`;
    }
  }
  return `${String(turnMs)} ms ${TURN_LIMIT_SUFFIX}`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Tipos del registro y su ID de definición (`typeOrigins`)
// ---------------------------------------------------------------------------------------------------------------------

/** Entrada de `typeOrigins` de `deployments/<red>.json`: la tabla de orígenes del objeto paquete (plan §4.4). */
export type TypeOrigin = { module: string; name: string; definingId: string };

/** Par (módulo, nombre) de un tipo del registro: la única clave de búsqueda (S-2). */
export type TypeKey = { module: string; name: string };

const GAME_MODULE = 'game';
const DUEL_MODULE = 'duel';
const COINFLIP_MODULE = 'coinflip';
const COINFLIP_STRUCT = 'Coinflip';

const GAME_EVENT_NAMES: readonly GameEventName[] = ['GameCreated', 'GameCancelled', 'GameResolved'];
const DUEL_EVENT_NAMES: readonly DuelEventName[] = [
  'DuelCreated',
  'DuelCancelled',
  'DuelActivated',
  'DuelTurn',
  'DuelResolved',
  'DuelTimedOut',
  'DuelExpired',
];

/** Tipos de la fuente `legacy` (`game::Game` y sus eventos): existen desde la v1 y llevan el ID original. */
const LEGACY_TYPE_KEYS: readonly TypeKey[] = [
  { module: GAME_MODULE, name: 'Game' },
  ...GAME_EVENT_NAMES.map((name) => ({ module: GAME_MODULE, name })),
];

/** Tipos de la fuente `duel` del coinflip (`Duel<Coinflip>`, sus 7 eventos y el witness): los introduce el upgrade de #73. */
const DUEL_TYPE_KEYS: readonly TypeKey[] = [
  { module: DUEL_MODULE, name: 'Duel' },
  ...DUEL_EVENT_NAMES.map((name) => ({ module: DUEL_MODULE, name })),
  { module: COINFLIP_MODULE, name: COINFLIP_STRUCT },
];

/**
 * Tipos que el registro necesita de `typeOrigins`: los de la fuente `legacy` siempre y los de `duel` solo si hay upgrades
 * (`packageVersion > 1`). `config.ts` exige una entrada de cada uno (si falta, error de configuración, nunca "no hay
 * partidas").
 */
export function registryTypeKeys(hasUpgrades: boolean): readonly TypeKey[] {
  return hasUpgrades ? [...LEGACY_TYPE_KEYS, ...DUEL_TYPE_KEYS] : LEGACY_TYPE_KEYS;
}

/**
 * ID de definición de un tipo, buscado por **(módulo, nombre)** y nunca solo por módulo (S-2): un struct agregado a un
 * módulo existente en un upgrade tiene su propio ID de definición, distinto del de sus hermanos. `null` si no hay entrada.
 */
export function definingIdOf(typeOrigins: readonly TypeOrigin[], module: string, name: string): string | null {
  return typeOrigins.find((origin) => origin.module === module && origin.name === name)?.definingId ?? null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Registro de juegos
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Lo que el registro necesita de la configuración (`AppConfig` lo cumple tal cual). Sin `upgrades` (`packageVersion` 1) el
 * mapa puede faltar y todo cae al ID original; con upgrades, falta de una entrada de un tipo del registro es un error de
 * configuración (plan §4.4).
 */
export type RegistryConfig = {
  originalPackageId: string;
  upgrades?: readonly { packageId: string }[];
  typeOrigins?: readonly TypeOrigin[];
};

/** Fuente `legacy` del coinflip: `game::Game` y sus tres eventos, con parsers ya atados a sus tipos exactos. */
export type LegacySource = {
  kind: 'legacy';
  /** Tipo Move normalizado de `game::Game`. */
  objectType: string;
  /** Tags exactos de los eventos de `game`. */
  eventTypes: { created: string; cancelled: string; resolved: string };
  /**
   * Eventos que "envía" un jugador (los usa "Mis partidas" para filtrar por remitente, plan §8.2): el creador emite la
   * creación y el aceptante la resolución.
   */
  sentEventTypes: readonly string[];
  parseObject: (object: GameObjectInput) => Game;
  parseCreated: (raw: RawGameEvent) => GameCreatedEvent;
  parseCancelled: (raw: RawGameEvent) => GameCancelledEvent;
  parseResolved: (raw: RawGameEvent) => GameResolvedEvent;
};

/** Fuente `duel` del coinflip: `Duel<Coinflip>` y los 7 eventos de la base, con parsers atados a sus tipos exactos. */
export type DuelSource = {
  kind: 'duel';
  /** Tipo Move normalizado de `Duel<G>`. */
  objectType: string;
  /** Tag normalizado de `G` (`<ID de definición del juego>::<módulo>::<G>`), también argumento de tipo de las `entry` genéricas. */
  gameTag: string;
  eventTypes: {
    created: string;
    cancelled: string;
    activated: string;
    turn: string;
    resolved: string;
    timedOut: string;
    expired: string;
  };
  /**
   * Literales **prefijo** (sin parámetros de tipo) de los eventos que lee el lobby y "Mis partidas" (#73, TASK-7b): casan con
   * todas las instanciaciones de `G`, el literal de "Todos" (`eventLiterals`). El ID es el de definición de **ese** evento.
   */
  eventPrefixes: { created: string; resolved: string };
  /** Eventos que "envía" un jugador: la creación (creador) y la resolución (aceptante, en el camino atómico del coinflip). */
  sentEventTypes: readonly string[];
  parseObject: (object: DuelObjectInput) => Duel;
  parseCreated: (raw: RawGameEvent) => DuelCreatedEvent;
  parseCancelled: (raw: RawGameEvent) => DuelCancelledEvent;
  parseActivated: (raw: RawGameEvent) => DuelActivatedEvent;
  parseTurn: (raw: RawGameEvent) => DuelTurnEvent;
  parseResolved: (raw: RawGameEvent) => DuelResolvedEvent;
  parseTimedOut: (raw: RawGameEvent) => DuelTimedOutEvent;
  parseExpired: (raw: RawGameEvent) => DuelExpiredEvent;
};

/** Una fuente de tipos de un juego: la anterior (`legacy`) o la nueva sobre la base común (`duel`). */
export type GameSource = LegacySource | DuelSource;

/** Clave de un juego del registro. */
export type GameKey = 'coinflip';

/** Un juego de la plataforma: qué muestra, qué ofrece al crear y de qué fuentes lee. */
export type GameDef = {
  key: GameKey;
  label: string;
  /** Si la app puede crear partidas de este juego. */
  creatable: boolean;
  /**
   * Fuente a la que va "crear" (D9: solo la nueva): la `duel` si existe y, mientras no haya upgrade, la `legacy`, que es lo
   * que la app hace hoy. TASK-7b arma los builders con esto.
   */
  createSource: GameSource['kind'];
  /** Si el juego usa reloj por jugada: solo entonces el formulario ofrece controles (el coinflip crea con el 0, sin mostrarlo). */
  usesClock: boolean;
  /** Ids de los controles que ofrece el formulario de crear (R.2); vacío para un juego sin reloj. */
  controlIds: readonly number[];
  sources: readonly GameSource[];
};

/** Los juegos de la plataforma, en el orden en que se listan. */
export type GameRegistry = readonly GameDef[];

/** ID de definición de un tipo para el registro; ver `RegistryConfig` para el caso sin upgrades y el de entrada faltante. */
function resolveDefiningId(config: RegistryConfig, module: string, name: string): string {
  const found = definingIdOf(config.typeOrigins ?? [], module, name);
  if (found !== null) return found;
  if ((config.upgrades?.length ?? 0) === 0) return config.originalPackageId;
  throw new Error(`Error de configuración: typeOrigins no tiene una entrada para ${module}::${name}`);
}

function buildLegacySource(config: RegistryConfig): LegacySource {
  const gameDefiningId = resolveDefiningId(config, GAME_MODULE, 'Game');
  const createdId = resolveDefiningId(config, GAME_MODULE, 'GameCreated');
  const cancelledId = resolveDefiningId(config, GAME_MODULE, 'GameCancelled');
  const resolvedId = resolveDefiningId(config, GAME_MODULE, 'GameResolved');
  const eventTypes = {
    created: gameEventType(createdId, 'GameCreated'),
    cancelled: gameEventType(cancelledId, 'GameCancelled'),
    resolved: gameEventType(resolvedId, 'GameResolved'),
  };
  return {
    kind: 'legacy',
    objectType: gameType(gameDefiningId),
    eventTypes,
    sentEventTypes: [eventTypes.created, eventTypes.resolved],
    parseObject: (object) => parseGameObject(object, gameDefiningId),
    parseCreated: (raw) => parseGameCreated(raw, createdId),
    parseCancelled: (raw) => parseGameCancelled(raw, cancelledId),
    parseResolved: (raw) => parseGameResolved(raw, resolvedId),
  };
}

function buildDuelSource(config: RegistryConfig): DuelSource {
  const gameTag = normalizeStructTag(
    `${resolveDefiningId(config, COINFLIP_MODULE, COINFLIP_STRUCT)}::${COINFLIP_MODULE}::${COINFLIP_STRUCT}`,
  );
  const eventType = (name: DuelEventName): string =>
    duelEventType(resolveDefiningId(config, DUEL_MODULE, name), name, gameTag);
  const eventTypes = {
    created: eventType('DuelCreated'),
    cancelled: eventType('DuelCancelled'),
    activated: eventType('DuelActivated'),
    turn: eventType('DuelTurn'),
    resolved: eventType('DuelResolved'),
    timedOut: eventType('DuelTimedOut'),
    expired: eventType('DuelExpired'),
  };
  const objectType = duelType(resolveDefiningId(config, DUEL_MODULE, 'Duel'), gameTag);
  return {
    kind: 'duel',
    objectType,
    gameTag,
    eventTypes,
    eventPrefixes: {
      created: duelEventPrefix(resolveDefiningId(config, DUEL_MODULE, 'DuelCreated'), 'DuelCreated'),
      resolved: duelEventPrefix(resolveDefiningId(config, DUEL_MODULE, 'DuelResolved'), 'DuelResolved'),
    },
    sentEventTypes: [eventTypes.created, eventTypes.resolved],
    parseObject: (object) => parseDuelObject(object, objectType),
    parseCreated: (raw) => parseDuelCreated(raw, eventTypes.created),
    parseCancelled: (raw) => parseDuelCancelled(raw, eventTypes.cancelled),
    parseActivated: (raw) => parseDuelActivated(raw, eventTypes.activated),
    parseTurn: (raw) => parseDuelTurn(raw, eventTypes.turn),
    parseResolved: (raw) => parseDuelResolved(raw, eventTypes.resolved),
    parseTimedOut: (raw) => parseDuelTimedOut(raw, eventTypes.timedOut),
    parseExpired: (raw) => parseDuelExpired(raw, eventTypes.expired),
  };
}

/**
 * Arma el registro de juegos desde la configuración (una sola lectura de config, ARQ-8). Con `packageVersion` 1 (sin
 * `upgrades`) solo existe la fuente `legacy` y todo cae al ID original; con upgrades se suma la fuente `duel` y **cada**
 * tipo sale de `typeOrigins` por (módulo, nombre). Lanza un `Error` de configuración si falta la entrada de un tipo (nunca
 * devuelve un registro "vacío"): `resolveConfig` ya lo rechaza antes de llegar acá.
 */
export function buildGameRegistry(config: RegistryConfig): GameRegistry {
  const sources: GameSource[] = [buildLegacySource(config)];
  if ((config.upgrades?.length ?? 0) > 0) sources.push(buildDuelSource(config));
  return [
    {
      key: 'coinflip',
      label: 'Coinflip',
      creatable: true,
      createSource: sources.some((source) => source.kind === 'duel') ? 'duel' : 'legacy',
      usesClock: false,
      controlIds: [],
      sources,
    },
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// Listados multi-fuente (#73, TASK-7b): qué literales de evento pide un listado y a qué fuente pertenece cada evento
// ---------------------------------------------------------------------------------------------------------------------

/** Qué juegos lista una pantalla (lobby, "Mis partidas"): todos, por defecto, o uno. */
export type GameSelection = 'all' | GameKey;

/** Los eventos que "envía" un jugador y que leen los listados: la creación y la resolución. */
export type SentEventName = 'created' | 'resolved';

const SENT_EVENT_NAMES: readonly SentEventName[] = ['created', 'resolved'];

/** Los juegos de la selección, en el orden del registro. */
export function selectedGames(registry: GameRegistry, selection: GameSelection): GameRegistry {
  const keys: readonly GameKey[] = selection === 'all' ? registry.map((game) => game.key) : [selection];
  return registry.filter((game) => keys.includes(game.key));
}

/**
 * Literales `eventType` de un evento para un listado (sin repetidos, en el orden del registro): el tag exacto de la fuente
 * `legacy` y, para la fuente `duel`, **un literal por evento** con "Todos" (el prefijo sin parámetros de tipo, que casa con
 * todos los `G`, también los que el registro no conoce: `matchEvent` los ignora) o el **tag completo** de `G` cuando se
 * elige un juego. Siempre con IDs de **definición** (el de almacenamiento posterior o el original devuelve 0 eventos, V-4);
 * nunca `emitModule`, que depende de la versión emisora.
 */
export function eventLiterals(registry: GameRegistry, selection: GameSelection, name: SentEventName): string[] {
  const literals = new Set<string>();
  for (const game of selectedGames(registry, selection)) {
    for (const source of game.sources) {
      literals.add(source.kind === 'duel' && selection === 'all' ? source.eventPrefixes[name] : source.eventTypes[name]);
    }
  }
  return [...literals];
}

/**
 * A qué fuente pertenece un evento que trajo un listado: `source` si su tipo es exactamente el de una fuente registrada
 * (con el evento lógico `created`/`resolved`); `foreign` si es de la familia de un evento de `duel` pero de un `G` que el
 * registro no conoce (S-1: con el literal prefijo el nodo devuelve todas las instanciaciones, también las de un juego
 * futuro; se ignora, no es una fila rota); `unknown` si nada del registro lo explica (una fila ilegible).
 */
export type EventMatch =
  | { kind: 'source'; game: GameDef; source: GameSource; event: SentEventName }
  | { kind: 'foreign' }
  | { kind: 'unknown' };

/** Clasifica el tipo de un evento contra el registro (ver `EventMatch`). */
export function matchEvent(registry: GameRegistry, eventType: string): EventMatch {
  const family = eventTypeFamily(eventType);
  let foreign = false;
  for (const game of registry) {
    for (const source of game.sources) {
      for (const event of SENT_EVENT_NAMES) {
        if (isExactType(eventType, source.eventTypes[event])) return { kind: 'source', game, source, event };
        if (source.kind === 'duel' && family !== null && family === source.eventPrefixes[event]) foreign = true;
      }
    }
  }
  return foreign ? { kind: 'foreign' } : { kind: 'unknown' };
}
