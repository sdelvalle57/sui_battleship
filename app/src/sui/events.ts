import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
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

function assertEventType(raw: RawGameEvent, originalPackageId: string, name: GameEventName): void {
  const expected = gameEventType(originalPackageId, name);
  if (!isExactType(raw.eventType, expected)) {
    throw new ReadDataError('wrong_type', `se esperaba ${expected} y llegó ${raw.eventType}`);
  }
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
