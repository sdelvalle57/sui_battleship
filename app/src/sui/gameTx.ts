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
