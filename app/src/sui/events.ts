import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { assertWinner, isValidToMove } from './duel';
import { isExactType, parseExactBcs } from './game';
import { ReadDataError } from './readErrors';

/**
 * Evento crudo mínimo que consumen los parsers (H-4): se arma igual desde un `EventEntry` del SDK (fixtures) o desde un
 * frame del `ListEvents` crudo (lobby).
 */
export type RawGameEvent = { eventType: string; bcs: Uint8Array; transactionDigest: string; checkpoint: bigint | null };

/** Eventos de `battleship::game` (no existe `GameAccepted`, D-20261030-16 D4). */
export type GameEventName = 'GameCreated' | 'GameCancelled' | 'GameResolved';

/** `GameCreated`: partida creada (abierta si `opponent` es `null`, invitación si no). */
export type GameCreatedEvent = {
  gameId: string;
  creator: string;
  opponent: string | null;
  bet: bigint;
  feeRate: number;
  transactionDigest: string;
};

/** `GameCancelled`: cancelada por el creador o rechazada por el invitado (`cancelledBy`). */
export type GameCancelledEvent = {
  gameId: string;
  creator: string;
  cancelledBy: string;
  refund: bigint;
  transactionDigest: string;
};

/** `GameResolved`: aceptada y sorteada en la misma transacción. */
export type GameResolvedEvent = {
  gameId: string;
  creator: string;
  acceptor: string;
  winner: string;
  pot: bigint;
  fee: bigint;
  payout: bigint;
  transactionDigest: string;
};

// Layout BCS de los eventos de `contracts/sources/game.move` (`ID` = dirección de 32 bytes).
const GameCreatedBcs = bcs.struct('GameCreated', {
  game_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
});
const GameCancelledBcs = bcs.struct('GameCancelled', {
  game_id: bcs.Address,
  creator: bcs.Address,
  cancelled_by: bcs.Address,
  refund: bcs.u64(),
});
const GameResolvedBcs = bcs.struct('GameResolved', {
  game_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});

/** Tipo Move normalizado de un evento del juego para el paquete original (DL-9). */
export function gameEventType(originalPackageId: string, name: GameEventName): string {
  return normalizeStructTag(`${originalPackageId}::game::${name}`);
}

/** Adapta un `EventEntry` del SDK al evento crudo de los parsers (checkpoint de string a `bigint`). */
export function rawEventFromEntry(
  entry: Pick<SuiClientTypes.EventEntry, 'eventType' | 'bcs' | 'transactionDigest' | 'checkpoint'>,
): RawGameEvent {
  return {
    eventType: entry.eventType,
    bcs: entry.bcs,
    transactionDigest: entry.transactionDigest,
    checkpoint: entry.checkpoint === null ? null : BigInt(entry.checkpoint),
  };
}

/** Exige que el tipo del evento sea exactamente `expected` (normalizado); si no, `ReadDataError('wrong_type')`. */
function assertExactEventType(raw: RawGameEvent, expected: string): void {
  if (!isExactType(raw.eventType, expected)) {
    throw new ReadDataError('wrong_type', `se esperaba ${expected} y llegó ${raw.eventType}`);
  }
}

function assertEventType(raw: RawGameEvent, originalPackageId: string, name: GameEventName): void {
  assertExactEventType(raw, gameEventType(originalPackageId, name));
}

/** Parsea un `GameCreated`: tipo exacto y BCS canónico; si no, `ReadDataError`. */
export function parseGameCreated(raw: RawGameEvent, originalPackageId: string): GameCreatedEvent {
  assertEventType(raw, originalPackageId, 'GameCreated');
  const e = parseExactBcs(GameCreatedBcs, raw.bcs, 'GameCreated');
  return {
    gameId: e.game_id,
    creator: e.creator,
    opponent: e.opponent ?? null,
    bet: BigInt(e.bet),
    feeRate: e.fee_rate,
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `GameCancelled`: tipo exacto y BCS canónico; si no, `ReadDataError`. */
export function parseGameCancelled(raw: RawGameEvent, originalPackageId: string): GameCancelledEvent {
  assertEventType(raw, originalPackageId, 'GameCancelled');
  const e = parseExactBcs(GameCancelledBcs, raw.bcs, 'GameCancelled');
  return {
    gameId: e.game_id,
    creator: e.creator,
    cancelledBy: e.cancelled_by,
    refund: BigInt(e.refund),
    transactionDigest: raw.transactionDigest,
  };
}

/**
 * Parsea un `GameResolved`: tipo exacto, BCS canónico e invariantes de `game.move` (`pot == payout + fee`,
 * `winner ∈ {creator, acceptor}`); si no, `ReadDataError`.
 */
export function parseGameResolved(raw: RawGameEvent, originalPackageId: string): GameResolvedEvent {
  assertEventType(raw, originalPackageId, 'GameResolved');
  const e = parseExactBcs(GameResolvedBcs, raw.bcs, 'GameResolved');
  const pot = BigInt(e.pot);
  const fee = BigInt(e.fee);
  const payout = BigInt(e.payout);
  if (pot !== payout + fee) {
    throw new ReadDataError('invariant', `pot ${String(pot)} ≠ payout ${String(payout)} + fee ${String(fee)}`);
  }
  if (e.winner !== e.creator && e.winner !== e.acceptor) {
    throw new ReadDataError('invariant', 'el ganador no es ni el creador ni el aceptante');
  }
  return {
    gameId: e.game_id,
    creator: e.creator,
    acceptor: e.acceptor,
    winner: e.winner,
    pot,
    fee,
    payout,
    transactionDigest: raw.transactionDigest,
  };
}

// Eventos de `battleship::duel` (#73, TASK-7a; R.5 del handoff). Cada uno lleva el juego `G` en el tipo
// (`<ID de definición del evento>::duel::<Evento><<tag de G>>`): los parsers reciben el tipo exacto esperado, que arma el
// registro de juegos desde `typeOrigins` (H-2, S-2). El ID de definición del evento y el de `G` pueden ser distintos.

/** Eventos de `battleship::duel`, uno por transición. */
export type DuelEventName =
  | 'DuelCreated'
  | 'DuelCancelled'
  | 'DuelActivated'
  | 'DuelTurn'
  | 'DuelResolved'
  | 'DuelTimedOut'
  | 'DuelExpired';

/** `DuelCreated`: duelo creado (abierto si `opponent` es `null`, invitación si no), con su control de tiempo. */
export type DuelCreatedEvent = {
  duelId: string;
  creator: string;
  opponent: string | null;
  bet: bigint;
  feeRate: number;
  /** Id del control de tiempo (R.2); el `turnMs` de la cadena es el que manda al mostrarlo. */
  control: number;
  turnMs: bigint;
  transactionDigest: string;
};

/** `DuelCancelled`: cancelado por el creador o rechazado por el invitado (`cancelledBy`). */
export type DuelCancelledEvent = {
  duelId: string;
  creator: string;
  cancelledBy: string;
  refund: bigint;
  transactionDigest: string;
};

/**
 * `DuelActivated`: el duelo pasa a `Active`. Con `turnMs = 0` (juego atómico, como el coinflip) `toMove` y `deadlineMs`
 * valen 0 porque la transacción lo resuelve en el acto; con reloj, `toMove ∈ 1..=3` y `deadlineMs` es absoluto (ms del `Clock`).
 */
export type DuelActivatedEvent = {
  duelId: string;
  creator: string;
  acceptor: string;
  bet: bigint;
  turnMs: bigint;
  toMove: number;
  deadlineMs: bigint;
  transactionDigest: string;
};

/** `DuelTurn`: `actor` movió; `toMove` y `deadlineMs` son el estado posterior. */
export type DuelTurnEvent = {
  duelId: string;
  actor: string;
  toMove: number;
  deadlineMs: bigint;
  transactionDigest: string;
};

/** `DuelResolved`: el duelo terminó con un ganador y se pagó el pozo menos la comisión. */
export type DuelResolvedEvent = {
  duelId: string;
  creator: string;
  acceptor: string;
  winner: string;
  pot: bigint;
  fee: bigint;
  payout: bigint;
  transactionDigest: string;
};

/** `DuelTimedOut`: el rival cobró por tiempo; `claimedBy` es quien envió la transacción (puede no ser el ganador). */
export type DuelTimedOutEvent = {
  duelId: string;
  creator: string;
  acceptor: string;
  winner: string;
  claimedBy: string;
  pot: bigint;
  fee: bigint;
  payout: bigint;
  transactionDigest: string;
};

/** `DuelExpired`: reembolso 100/100 sin comisión; `refundEach` es la apuesta que recuperó cada jugador. */
export type DuelExpiredEvent = {
  duelId: string;
  creator: string;
  acceptor: string;
  refundEach: bigint;
  transactionDigest: string;
};

// Layout BCS de los eventos de `contracts/sources/duel.move` (el orden de campos es el del struct; `G` es `phantom`).
const DuelCreatedBcs = bcs.struct('DuelCreated', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
  control: bcs.u8(),
  turn_ms: bcs.u64(),
});
const DuelCancelledBcs = bcs.struct('DuelCancelled', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  cancelled_by: bcs.Address,
  refund: bcs.u64(),
});
const DuelActivatedBcs = bcs.struct('DuelActivated', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  bet: bcs.u64(),
  turn_ms: bcs.u64(),
  to_move: bcs.u8(),
  deadline_ms: bcs.u64(),
});
const DuelTurnBcs = bcs.struct('DuelTurn', {
  duel_id: bcs.Address,
  actor: bcs.Address,
  to_move: bcs.u8(),
  deadline_ms: bcs.u64(),
});
const DuelResolvedBcs = bcs.struct('DuelResolved', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});
const DuelTimedOutBcs = bcs.struct('DuelTimedOut', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  claimed_by: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});
const DuelExpiredBcs = bcs.struct('DuelExpired', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  refund_each: bcs.u64(),
});

/**
 * Tipo Move normalizado de un evento de `duel` para el juego `gameTag`: `<definingId>::duel::<name><<gameTag>>`.
 * `definingId` es el de **ese** evento en `typeOrigins` (búsqueda por módulo + nombre, S-2) y `gameTag` el tag completo de
 * `G` (`<ID de definición de G>::<módulo>::<G>`).
 */
export function duelEventType(definingId: string, name: DuelEventName, gameTag: string): string {
  return normalizeStructTag(`${definingId}::duel::${name}<${gameTag}>`);
}

/** El pozo siempre se reparte en pago y comisión (`pot == payout + fee`). */
function assertPotSplit(pot: bigint, fee: bigint, payout: bigint): void {
  if (pot !== payout + fee) {
    throw new ReadDataError('invariant', `pot ${String(pot)} ≠ payout ${String(payout)} + fee ${String(fee)}`);
  }
}

/** Parsea un `DuelCreated`: tipo exacto y BCS canónico; `turn_ms`/`control` no se contrastan con la tabla (la cadena manda). */
export function parseDuelCreated(raw: RawGameEvent, expectedType: string): DuelCreatedEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelCreatedBcs, raw.bcs, 'DuelCreated');
  return {
    duelId: e.duel_id,
    creator: e.creator,
    opponent: e.opponent ?? null,
    bet: BigInt(e.bet),
    feeRate: e.fee_rate,
    control: e.control,
    turnMs: BigInt(e.turn_ms),
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `DuelCancelled`: tipo exacto y BCS canónico; si no, `ReadDataError`. */
export function parseDuelCancelled(raw: RawGameEvent, expectedType: string): DuelCancelledEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelCancelledBcs, raw.bcs, 'DuelCancelled');
  return {
    duelId: e.duel_id,
    creator: e.creator,
    cancelledBy: e.cancelled_by,
    refund: BigInt(e.refund),
    transactionDigest: raw.transactionDigest,
  };
}

/**
 * Parsea un `DuelActivated`: tipo exacto, BCS canónico e invariantes de `activate`/`activate_atomic`: sin reloj
 * (`turn_ms = 0`) `to_move` y `deadline_ms` valen 0; con reloj, `to_move ∈ 1..=3`.
 */
export function parseDuelActivated(raw: RawGameEvent, expectedType: string): DuelActivatedEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelActivatedBcs, raw.bcs, 'DuelActivated');
  const turnMs = BigInt(e.turn_ms);
  const deadlineMs = BigInt(e.deadline_ms);
  if (turnMs === 0n) {
    if (e.to_move !== 0 || deadlineMs !== 0n) {
      throw new ReadDataError('invariant', 'DuelActivated sin reloj con to_move o deadline_ms distintos de 0');
    }
  } else if (!isValidToMove(e.to_move)) {
    throw new ReadDataError('invariant', `DuelActivated con to_move ${String(e.to_move)} fuera de 1..=3`);
  }
  return {
    duelId: e.duel_id,
    creator: e.creator,
    acceptor: e.acceptor,
    bet: BigInt(e.bet),
    turnMs,
    toMove: e.to_move,
    deadlineMs,
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `DuelTurn`: tipo exacto, BCS canónico y `to_move ∈ 1..=3` (R.4: `record_move` aborta con `EBadMask` si no). */
export function parseDuelTurn(raw: RawGameEvent, expectedType: string): DuelTurnEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelTurnBcs, raw.bcs, 'DuelTurn');
  if (!isValidToMove(e.to_move)) {
    throw new ReadDataError('invariant', `DuelTurn con to_move ${String(e.to_move)} fuera de 1..=3`);
  }
  return {
    duelId: e.duel_id,
    actor: e.actor,
    toMove: e.to_move,
    deadlineMs: BigInt(e.deadline_ms),
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `DuelResolved`: tipo exacto, BCS canónico, `pot == payout + fee` y `winner ∈ {creator, acceptor}`. */
export function parseDuelResolved(raw: RawGameEvent, expectedType: string): DuelResolvedEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelResolvedBcs, raw.bcs, 'DuelResolved');
  const pot = BigInt(e.pot);
  const fee = BigInt(e.fee);
  const payout = BigInt(e.payout);
  assertPotSplit(pot, fee, payout);
  assertWinner(e.winner, e.creator, e.acceptor);
  return {
    duelId: e.duel_id,
    creator: e.creator,
    acceptor: e.acceptor,
    winner: e.winner,
    pot,
    fee,
    payout,
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `DuelTimedOut`: tipo exacto, BCS canónico, `pot == payout + fee` y `winner ∈ {creator, acceptor}`. */
export function parseDuelTimedOut(raw: RawGameEvent, expectedType: string): DuelTimedOutEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelTimedOutBcs, raw.bcs, 'DuelTimedOut');
  const pot = BigInt(e.pot);
  const fee = BigInt(e.fee);
  const payout = BigInt(e.payout);
  assertPotSplit(pot, fee, payout);
  assertWinner(e.winner, e.creator, e.acceptor);
  return {
    duelId: e.duel_id,
    creator: e.creator,
    acceptor: e.acceptor,
    winner: e.winner,
    claimedBy: e.claimed_by,
    pot,
    fee,
    payout,
    transactionDigest: raw.transactionDigest,
  };
}

/** Parsea un `DuelExpired`: tipo exacto y BCS canónico; si no, `ReadDataError`. */
export function parseDuelExpired(raw: RawGameEvent, expectedType: string): DuelExpiredEvent {
  assertExactEventType(raw, expectedType);
  const e = parseExactBcs(DuelExpiredBcs, raw.bcs, 'DuelExpired');
  return {
    duelId: e.duel_id,
    creator: e.creator,
    acceptor: e.acceptor,
    refundEach: BigInt(e.refund_each),
    transactionDigest: raw.transactionDigest,
  };
}
