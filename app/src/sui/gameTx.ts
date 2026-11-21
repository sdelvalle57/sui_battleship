import type { SuiClientTypes } from '@mysten/sui/client';
import { isExactType } from './game';
import {
  gameEventType,
  parseGameCancelled,
  parseGameCreated,
  parseGameResolved,
  type GameCreatedEvent,
  type GameResolvedEvent,
  type RawGameEvent,
} from './events';
import { sameAddress } from './ids';
import type { DuelSource } from './gameRegistry';

/** Resultado del nodo con los eventos de la transacción (lo que devuelve `confirmTransaction`). */
type ResultWithEvents = SuiClientTypes.TransactionResult<{ events: true }>;

/** Eventos del resultado adaptados a `RawGameEvent`, con el digest de la transacción y sin checkpoint (no hace falta). */
function rawEvents(result: ResultWithEvents): RawGameEvent[] {
  const tx = result.Transaction ?? result.FailedTransaction;
  return tx.events.map((event) => ({
    eventType: event.eventType,
    bcs: event.bcs,
    transactionDigest: tx.digest,
    checkpoint: null,
  }));
}

/** Corre un parser y devuelve `null` si lanza: un evento ilegible no identifica nada. */
function parseOrNull<T>(parse: () => T): T | null {
  try {
    return parse();
  } catch {
    return null;
  }
}

/**
 * La partida que creó la transacción (DL-9): el **único** `GameCreated` del paquete original, parseado con el BCS exacto,
 * con `creator` = la cuenta que firmó. Cero o más de uno, ilegible o de otro creador ⇒ `null`: la acción sigue siendo un
 * éxito honesto, pero sin navegar al detalle.
 */
export function parseCreatedGame(
  result: ResultWithEvents,
  { originalPackageId, sender }: { originalPackageId: string; sender: string },
): GameCreatedEvent | null {
  const type = gameEventType(originalPackageId, 'GameCreated');
  const created = rawEvents(result).filter((event) => isExactType(event.eventType, type));
  const [only] = created;
  if (created.length !== 1 || only === undefined) return null;
  const event = parseOrNull(() => parseGameCreated(only, originalPackageId));
  return event !== null && sameAddress(event.creator, sender) ? event : null;
}

/**
 * Reembolso de una cancelación o un rechazo (DL-10): `refund` del **único** `GameCancelled` de esta partida en la
 * transacción. Se lee del evento, no se supone igual a la apuesta. Si no está o es ambiguo ⇒ `null`.
 */
export function cancelledRefund(
  result: ResultWithEvents,
  { originalPackageId, gameId }: { originalPackageId: string; gameId: string },
): bigint | null {
  const type = gameEventType(originalPackageId, 'GameCancelled');
  const matches = rawEvents(result)
    .filter((event) => isExactType(event.eventType, type))
    .map((event) => parseOrNull(() => parseGameCancelled(event, originalPackageId)))
    .filter((event) => event !== null && sameAddress(event.gameId, gameId));
  const [only] = matches;
  return matches.length === 1 && only ? only.refund : null;
}

/**
 * Resultado de una aceptación (DL-2): el **único** `GameResolved` de esta partida en la transacción confirmada por el nodo,
 * con `acceptor` = la cuenta que firmó. El ganador, el pozo, la comisión y el pago se leen del evento, nunca se calculan
 * ni se animan antes (SEG-10). Cero o más de uno, ilegible, de otro paquete o de otro aceptante ⇒ `null`: la acción sigue
 * siendo un éxito honesto, sin resultado que mostrar.
 */
export function parseResolvedGame(
  result: ResultWithEvents,
  { originalPackageId, gameId, acceptor }: { originalPackageId: string; gameId: string; acceptor: string },
): GameResolvedEvent | null {
  const type = gameEventType(originalPackageId, 'GameResolved');
  const matches = rawEvents(result)
    .filter((event) => isExactType(event.eventType, type))
    .map((event) => parseOrNull(() => parseGameResolved(event, originalPackageId)))
    .filter((event) => event !== null && sameAddress(event.gameId, gameId));
  const [only] = matches;
  return matches.length === 1 && only && sameAddress(only.acceptor, acceptor) ? only : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Resultados de la fuente nueva (`Duel<G>`, #73 TASK-8a). Mismo contrato que los de arriba: un resultado que no se pudo leer
// es `null`, nunca un error que invente un éxito (SEG-10). Los tipos de evento salen de `DuelSource.eventTypes` (el registro,
// con los IDs de definición de `typeOrigins`), nunca de un tag armado a mano. Los resultados se devuelven con una forma
// **neutral a la fuente** (`gameId` en lugar de `duelId`): las de la fuente anterior ya la cumplen estructuralmente.
// ---------------------------------------------------------------------------------------------------------------------

/** La partida creada, de cualquiera de las dos fuentes (`GameCreatedEvent` y `DuelCreatedEvent` sin los campos propios de una). */
export type CreatedGame = {
  gameId: string;
  creator: string;
  opponent: string | null;
  bet: bigint;
  feeRate: number;
  transactionDigest: string;
};

/** El cierre de una partida aceptada, de cualquiera de las dos fuentes (`GameResolvedEvent` y `DuelResolvedEvent`). */
export type ResolvedGame = {
  gameId: string;
  creator: string;
  acceptor: string;
  winner: string;
  pot: bigint;
  fee: bigint;
  payout: bigint;
  transactionDigest: string;
};

/** Reclamo por tiempo (`DuelTimedOutEvent`): `claimedBy` es quien envió la transacción, que puede no ser el ganador. */
export type TimedOutGame = ResolvedGame & { claimedBy: string };

/** Reembolso de una partida estancada (`DuelExpiredEvent`): `refundEach` es lo que recuperó cada jugador. */
export type ExpiredGame = {
  gameId: string;
  creator: string;
  acceptor: string;
  refundEach: bigint;
  transactionDigest: string;
};

/** Los eventos del resultado que tienen exactamente ese tipo, parseados; uno ilegible se descarta (como los de arriba). */
function parsedEventsOfType<T>(result: ResultWithEvents, type: string, parse: (raw: RawGameEvent) => T): { count: number; events: T[] } {
  const typed = rawEvents(result).filter((event) => isExactType(event.eventType, type));
  const events = typed.map((event) => parseOrNull(() => parse(event))).filter((event): event is T => event !== null);
  return { count: typed.length, events };
}

/**
 * El coinflip nuevo que creó la transacción: el **único** `DuelCreated` del juego, con `creator` = la cuenta que firmó. Cero o
 * más de uno, ilegible o de otro creador ⇒ `null` (la acción sigue siendo un éxito honesto, sin navegar al detalle).
 */
export function parseCreatedDuel(result: ResultWithEvents, { source, sender }: { source: DuelSource; sender: string }): CreatedGame | null {
  const { count, events } = parsedEventsOfType(result, source.eventTypes.created, source.parseCreated);
  const [only] = events;
  if (count !== 1 || only === undefined || !sameAddress(only.creator, sender)) return null;
  return {
    gameId: only.duelId,
    creator: only.creator,
    opponent: only.opponent,
    bet: only.bet,
    feeRate: only.feeRate,
    transactionDigest: only.transactionDigest,
  };
}

/**
 * Reembolso de una cancelación o un rechazo de un duelo: `refund` del **único** `DuelCancelled` de este duelo en la
 * transacción, leído del evento y no supuesto igual a la apuesta. Si no está o es ambiguo ⇒ `null`.
 */
export function duelCancelledRefund(result: ResultWithEvents, { source, duelId }: { source: DuelSource; duelId: string }): bigint | null {
  const { events } = parsedEventsOfType(result, source.eventTypes.cancelled, source.parseCancelled);
  const matches = events.filter((event) => sameAddress(event.duelId, duelId));
  const [only] = matches;
  return matches.length === 1 && only ? only.refund : null;
}

/**
 * Resultado de aceptar un coinflip nuevo: el **único** `DuelResolved` de este duelo en la transacción confirmada, con
 * `acceptor` = la cuenta que firmó. El `DuelActivated` de la misma transacción **no** es el resultado (el contrato activa y
 * resuelve de forma atómica: el ganador, el pozo, la comisión y el pago salen del `DuelResolved`, nunca se calculan ni se
 * anticipan, SEG-10). Cero o más de uno, ilegible, de otro duelo o de otro aceptante ⇒ `null`.
 */
export function parseResolvedDuel(
  result: ResultWithEvents,
  { source, duelId, acceptor }: { source: DuelSource; duelId: string; acceptor: string },
): ResolvedGame | null {
  const { events } = parsedEventsOfType(result, source.eventTypes.resolved, source.parseResolved);
  const matches = events.filter((event) => sameAddress(event.duelId, duelId));
  const [only] = matches;
  if (matches.length !== 1 || only === undefined || !sameAddress(only.acceptor, acceptor)) return null;
  return {
    gameId: only.duelId,
    creator: only.creator,
    acceptor: only.acceptor,
    winner: only.winner,
    pot: only.pot,
    fee: only.fee,
    payout: only.payout,
    transactionDigest: only.transactionDigest,
  };
}

/**
 * Resultado de reclamar por tiempo: el **único** `DuelTimedOut` de este duelo en la transacción, con `claimedBy` = la cuenta
 * que firmó (el pozo menos la comisión va al rival del que debía mover, no necesariamente a quien reclama). Si no está, es
 * ambiguo o es de otra cuenta ⇒ `null`.
 */
export function parseTimedOutDuel(
  result: ResultWithEvents,
  { source, duelId, claimedBy }: { source: DuelSource; duelId: string; claimedBy: string },
): TimedOutGame | null {
  const { events } = parsedEventsOfType(result, source.eventTypes.timedOut, source.parseTimedOut);
  const matches = events.filter((event) => sameAddress(event.duelId, duelId));
  const [only] = matches;
  if (matches.length !== 1 || only === undefined || !sameAddress(only.claimedBy, claimedBy)) return null;
  return {
    gameId: only.duelId,
    creator: only.creator,
    acceptor: only.acceptor,
    winner: only.winner,
    claimedBy: only.claimedBy,
    pot: only.pot,
    fee: only.fee,
    payout: only.payout,
    transactionDigest: only.transactionDigest,
  };
}

/**
 * Resultado de reembolsar un duelo estancado: el **único** `DuelExpired` de este duelo en la transacción (100/100, sin
 * comisión). Si no está o es ambiguo ⇒ `null`. Cualquiera puede ejecutarlo, así que no se exige un remitente.
 */
export function parseExpiredDuel(result: ResultWithEvents, { source, duelId }: { source: DuelSource; duelId: string }): ExpiredGame | null {
  const { events } = parsedEventsOfType(result, source.eventTypes.expired, source.parseExpired);
  const matches = events.filter((event) => sameAddress(event.duelId, duelId));
  const [only] = matches;
  if (matches.length !== 1 || only === undefined) return null;
  return {
    gameId: only.duelId,
    creator: only.creator,
    acceptor: only.acceptor,
    refundEach: only.refundEach,
    transactionDigest: only.transactionDigest,
  };
}
