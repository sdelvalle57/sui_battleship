import { playerResult } from '../sui/acceptGame';
import type { Duel, DuelState } from '../sui/duel';
import type { Game } from '../sui/game';
import { acceptState, canCancel, canReject, type AcceptState } from '../sui/gameActions';
import type { GameDetailObject } from '../sui/gameDetail';
import {
  TIME_CONTROLS,
  controlLabel,
  type DuelSource,
  type GameDef,
  type GameKey,
  type GameRegistry,
} from '../sui/gameRegistry';
import type { LobbyItem } from '../sui/lobby';
import type { MyGameEntry, MyGameRole } from '../sui/myGames';

/**
 * Modelo de fila **neutral a la fuente** (#73, TASK-8a): una partida del lobby, de "Mis partidas" o del detalle con la
 * misma forma sea del `game::Game` anterior o del `Duel<G>` nuevo. Los componentes dibujan esto y nunca leen un `Game` ni
 * un `Duel` (ni arman un tag, un target o un argumento de tipo: ARQ-1); la fuente viaja en `source` solo para **enrutar**
 * las acciones (los hooks eligen su builder y su intérprete por ella). Se arma con las funciones `rowFrom*` de abajo, desde
 * `LobbyItem`, `MyGameEntry` y el detalle.
 */

/**
 * Control de tiempo de una fila nueva: el plazo por jugada que trae la cadena y su etiqueta (`controlLabel`: "la cadena
 * manda", un valor fuera del espejo se muestra en formato genérico). `id` es el del evento de creación o, si la fila sale
 * del objeto (que solo guarda `turn_ms`), el del espejo de controles; `null` si el valor no está en el espejo.
 */
export type RowControl = { id: number | null; turnMs: bigint; label: string };

type RowCommon = {
  /** ID de la partida (el del objeto). */
  id: string;
  gameKey: GameKey;
  creator: string;
  opponent: string | null;
  bet: bigint;
  feeRate: number;
  /** Estado completo del objeto: las tres variantes de la fuente anterior y las seis del `Duel`. */
  state: DuelState;
};

/** Partida de la fuente anterior: sin control de tiempo. */
export type LegacyGameRow = RowCommon & { source: 'legacy'; control: null };
/** Partida de la fuente nueva (`Duel<G>`): con su control de tiempo. */
export type DuelGameRow = RowCommon & { source: 'duel'; control: RowControl };
/** Una partida legible de cualquiera de las dos fuentes. */
export type GameRow = LegacyGameRow | DuelGameRow;

/**
 * Una partida en un listado (lobby, "Mis partidas"): la fila y lo que sabe el listado de ella. `role` es por qué es de la
 * cuenta (en el lobby, `creator` si la creó la cuenta conectada; en "Mis partidas", el que sale de los eventos) y
 * `txDigest`, la transacción del evento que la trajo (la hora de "creada" o del evento).
 */
export type ListedGame = { kind: 'game'; row: GameRow; role: MyGameRole | null; txDigest: string };
/** Una fila ilegible que no oculta las sanas (DL-2, DL-3). */
export type UnreadableRow = { kind: 'unreadable'; gameId: string | null; role: MyGameRole | null; txDigest: string };
/** Fila de un listado: una partida legible o una ilegible. */
export type ListedRow = ListedGame | UnreadableRow;

/** Lo que enruta una acción: el juego y la fuente del objeto. */
export type RoutedGame = Pick<GameRow, 'gameKey' | 'source'>;

/** Control de una fila armada desde el objeto: el id sale del espejo por `turn_ms` (`null` si la cadena trae otro valor). */
export function rowControlOf(turnMs: bigint, id?: number): RowControl {
  return { id: id ?? TIME_CONTROLS.find((control) => control.turnMs === turnMs)?.id ?? null, turnMs, label: controlLabel(turnMs) };
}

/** Clave del juego dueño de la fuente anterior: las filas `Game` no la traen, la da el registro. */
export function legacyGameKey(registry: GameRegistry): GameKey {
  const def = registry.find((game) => game.sources.some((source) => source.kind === 'legacy'));
  if (def === undefined) throw new Error('Error de configuración: el registro de juegos no tiene la fuente anterior');
  return def.key;
}

/**
 * Fuente nueva (`Duel<G>`) de un juego del registro: la que usan los builders y los intérpretes de la fuente nueva. La clave
 * se recibe como `string` (cualquier `GameKey` sirve): con un solo juego registrado, `GameKey` es un literal único y la
 * comparación con la del registro sería siempre verdadera para el linter.
 */
export function duelSourceOf(registry: GameRegistry, gameKey: string): DuelSource {
  const source = registry
    .find((game) => game.key === gameKey)
    ?.sources.find((candidate): candidate is DuelSource => candidate.kind === 'duel');
  if (source === undefined) throw new Error(`Error de configuración: el juego ${gameKey} no tiene la fuente nueva en el registro`);
  return source;
}

/**
 * El juego al que va "crear" (`GameDef.createSource` decide la fuente: la anterior mientras no haya upgrade y la nueva
 * después): el pedido, o el primero que se pueda crear. Lanza si el registro no tiene ninguno.
 */
export function creatableGameOf(registry: GameRegistry, gameKey?: string): GameDef {
  const def = registry.find((game) => game.creatable && (gameKey === undefined || game.key === gameKey));
  if (def === undefined) throw new Error('Error de configuración: el registro de juegos no tiene un juego que se pueda crear');
  return def;
}

/** Fila de una partida de la fuente anterior. */
export function rowFromGame(game: Game, gameKey: GameKey): LegacyGameRow {
  return {
    source: 'legacy',
    id: game.id,
    gameKey,
    creator: game.creator,
    opponent: game.opponent,
    bet: game.bet,
    feeRate: game.feeRate,
    state: game.state,
    control: null,
  };
}

/** Fila de un duelo de la fuente nueva, con el control que se le pasa (el del evento de creación o el derivado del objeto). */
export function rowFromDuel(duel: Duel, gameKey: GameKey, control: RowControl): DuelGameRow {
  return {
    source: 'duel',
    id: duel.id,
    gameKey,
    creator: duel.creator,
    opponent: duel.opponent,
    bet: duel.bet,
    feeRate: duel.feeRate,
    state: duel.state,
    control,
  };
}

/** Fila del detalle de una partida (`fetchGameDetail`), con el control derivado del objeto en la fuente nueva. */
export function rowFromDetail(detail: GameDetailObject): GameRow {
  return detail.kind === 'game'
    ? rowFromGame(detail.game, detail.gameKey)
    : rowFromDuel(detail.duel, detail.gameKey, rowControlOf(detail.duel.turnMs));
}

/**
 * Fila del lobby: la partida abierta de cualquiera de las dos fuentes (el control de una nueva es el de su `DuelCreated`).
 * `isMine` la marca como creada por la cuenta conectada (`role: 'creator'`).
 */
export function rowFromLobbyItem(item: LobbyItem, { isMine, registry }: { isMine: boolean; registry: GameRegistry }): ListedRow {
  const role: MyGameRole | null = isMine ? 'creator' : null;
  switch (item.kind) {
    case 'game':
      return { kind: 'game', row: rowFromGame(item.game, legacyGameKey(registry)), role, txDigest: item.createdTxDigest };
    case 'duel':
      return { kind: 'game', row: rowFromDuel(item.duel, item.gameKey, item.control), role, txDigest: item.createdTxDigest };
    case 'unreadable':
      return { kind: 'unreadable', gameId: item.gameId, role: null, txDigest: item.txDigest };
  }
}

/** Fila de "Mis partidas": la partida de cualquiera de las dos fuentes con el rol de la cuenta y el evento que la trajo. */
export function rowFromMyGameEntry(entry: MyGameEntry, registry: GameRegistry): ListedRow {
  switch (entry.kind) {
    case 'game':
      return { kind: 'game', row: rowFromGame(entry.game, legacyGameKey(registry)), role: entry.role, txDigest: entry.txDigest };
    case 'duel':
      return { kind: 'game', row: rowFromDuel(entry.duel, entry.gameKey, rowControlOf(entry.duel.turnMs)), role: entry.role, txDigest: entry.txDigest };
    case 'unreadable':
      return { kind: 'unreadable', gameId: entry.gameId, role: entry.role, txDigest: entry.txDigest };
  }
}

/** El aceptante de un estado que ya lo tiene (`Active`, `Resolved`, `TimedOut` o `Expired`); `null` en `Pending` y `Cancelled`. */
export function acceptorOf(state: DuelState): string | null {
  switch (state.kind) {
    case 'active':
    case 'resolved':
    case 'timed_out':
    case 'expired':
      return state.acceptor;
    case 'pending':
    case 'cancelled':
      return null;
  }
}

/**
 * Lo único que las reglas de acciones de hoy (`acceptState`, `canCancel`, `canReject`) miran del estado es si está
 * pendiente: solo un `Pending` se acepta, se cancela o se rechaza. Cualquier otro estado (`Active`, `TimedOut` y `Expired`
 * incluidos) no ofrece esas tres acciones; las de tiempo son de 8b. Se proyecta al tipo que esperan.
 */
function actionView(row: GameRow): Pick<Game, 'creator' | 'opponent' | 'state'> {
  return { creator: row.creator, opponent: row.opponent, state: row.state.kind === 'pending' ? { kind: 'pending' } : { kind: 'cancelled' } };
}

/** Estado de "Aceptar" para la cuenta conectada (las mismas reglas que para un `Game`). */
export function rowAcceptState(row: GameRow, address: string | null): AcceptState {
  return acceptState(actionView(row), address);
}

/** Si la cuenta ve "Cancelar": es el creador y la partida está pendiente. */
export function rowCanCancel(row: GameRow, address: string | null): boolean {
  return canCancel(actionView(row), address);
}

/** Si la cuenta ve "Rechazar": la partida es una invitación a esa cuenta y está pendiente. */
export function rowCanReject(row: GameRow, address: string | null): boolean {
  return canReject(actionView(row), address);
}

/**
 * Resultado de la partida para la cuenta, leído del estado `Resolved` del objeto (`'won'`/`'lost'`); `null` si la partida no
 * está resuelta (el reclamo por tiempo y el reembolso son de 8b), no hay cuenta o es un tercero.
 */
export function rowPlayerResult(row: GameRow, address: string | null): 'won' | 'lost' | null {
  return playerResult({ creator: row.creator, state: row.state.kind === 'resolved' ? row.state : { kind: 'cancelled' } }, address);
}
