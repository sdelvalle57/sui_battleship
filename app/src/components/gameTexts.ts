import { acceptorOf, rowPlayerResult, type DuelGameRow, type GameRow } from '../hooks/gameRow';
import type { DeadlinePhase } from '../hooks/useChainNow';
import type { DuelState } from '../sui/duel';
import { formatMist, shortAddress } from '../sui/format';
import { resolutionAmounts } from '../sui/game';
import { sameAddress } from '../sui/ids';
import type { ExpiredGame, TimedOutGame } from '../sui/gameTx';

/**
 * Textos de las vistas de una partida con reloj por jugada (#73, TASK-8b; UX-6): **un solo módulo** con los verbos y los
 * estados, en español con tuteo, sin jerga del contrato (nada de `claim_timeout`, `to_move`, `TimedOut` ni códigos de abort
 * sin su mensaje). Son funciones puras: la vista les pasa la fila neutral a la fuente y la cuenta conectada.
 */

/** Verbos de las acciones, fijos en toda la app. */
export const ACTION_TEXT = {
  accept: 'Aceptar',
  cancel: 'Cancelar',
  reject: 'Rechazar',
  claim: 'Reclamar victoria',
  refund: 'Reembolsar',
} as const;

/** Estados que 8b agrega a lo que ya mostraba la app. */
export const STATE_TEXT = {
  active: 'En juego',
  timedOut: 'Ganó por tiempo',
  expired: 'Nadie movió a tiempo: cada jugador recuperó su apuesta',
} as const;

/** Rótulo de la fuente de una fila cuando conviven las dos (lobby): la anterior y la nueva. */
export const SOURCE_TEXT = { legacy: 'anterior', duel: 'nueva' } as const;

/** La espera tras el plazo vencido de un solo jugador pendiente, a partir de la cual cualquiera puede reembolsar (`CLAIM_GRACE_MS`). */
export const GRACE_TEXT = '7 días';

/** Control de tiempo de una fila para mostrar: "sin reloj" o "10 min por jugada". La fuente anterior no tiene reloj. */
export function controlText(row: GameRow): string {
  return row.control === null ? 'sin reloj' : row.control.label;
}

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;
const short = shortAddress;

/** Quién es la cuenta conectada en la partida (para decir "te toca a ti" o "le toca a tu rival"). */
export type Viewer = 'none' | 'creator' | 'acceptor' | 'invitee' | 'other';

/** El papel de la cuenta en la partida: sin cuenta, creador, aceptante, invitado (que aún no aceptó) u otra cuenta. */
export function viewerOf(row: GameRow, account: string | null): Viewer {
  if (account === null) return 'none';
  if (sameAddress(row.creator, account)) return 'creator';
  const acceptor = acceptorOf(row.state);
  if (acceptor !== null && sameAddress(acceptor, account)) return 'acceptor';
  if (row.opponent !== null && sameAddress(row.opponent, account)) return 'invitee';
  return 'other';
}

type ActiveState = Extract<DuelState, { kind: 'active' }>;

const TO_MOVE_CREATOR = 1;
const TO_MOVE_ACCEPTOR = 2;
const TO_MOVE_BOTH = 3;

/** La contraparte de un jugador (el que no es la cuenta). */
function counterpartOf(row: GameRow, state: ActiveState, viewer: Viewer): string {
  return viewer === 'creator' ? state.acceptor : row.creator;
}

/**
 * De quién es el turno en una partida activa (UX-1): "Te toca a ti", "Le toca a `<contraparte>`" o "Les toca a los dos". Para
 * una cuenta que no juega, a quién le toca por su papel.
 */
export function turnText(row: GameRow, state: ActiveState, account: string | null): string {
  if (state.toMove === TO_MOVE_BOTH) return 'Les toca a los dos';
  const viewer = viewerOf(row, account);
  const mover = state.toMove === TO_MOVE_CREATOR ? 'creator' : 'acceptor';
  if (viewer === mover) return 'Te toca a ti';
  if (viewer === 'creator' || viewer === 'acceptor') return `Le toca a ${short(counterpartOf(row, state, viewer))}`;
  return state.toMove === TO_MOVE_CREATOR ? `Le toca a ${short(row.creator)} (quien creó la partida)` : `Le toca a ${short(state.acceptor)} (quien la aceptó)`;
}

/** Quién gana por tiempo si vence el plazo de una partida activa: el rival del que debía mover; `null` si deben mover los dos. */
export function winnerOnTimeout(row: GameRow, state: ActiveState): string | null {
  if (state.toMove === TO_MOVE_CREATOR) return state.acceptor;
  if (state.toMove === TO_MOVE_ACCEPTOR) return row.creator;
  return null;
}

/** Lo que cobra el ganador de una partida de la fuente nueva: la misma fórmula que el contrato (pozo, comisión y pago). */
function amountsOf(row: GameRow) {
  return resolutionAmounts(row.bet, row.feeRate);
}

/** "pozo X SUI − comisión Y SUI", los dos montos entre paréntesis de un cobro. */
function potAndFee(row: GameRow): string {
  const { pot, fee } = amountsOf(row);
  return `pozo ${sui(pot)} − comisión ${sui(fee)}`;
}

/** Resultado de una partida ganada por tiempo, para la cuenta (UX-1): ganó, perdió o es un tercero. */
export function timedOutText(row: GameRow, winner: string, account: string | null): string {
  const { payout } = amountsOf(row);
  const players = account !== null && (sameAddress(account, row.creator) || sameAddress(account, acceptorOf(row.state) ?? ''));
  if (account !== null && sameAddress(account, winner)) {
    return `Ganaste por tiempo: tu rival no movió a tiempo. Recibiste ${sui(payout)} (${potAndFee(row)}).`;
  }
  if (players) {
    return `Perdiste por tiempo: no moviste a tiempo. Tu rival recibió ${sui(payout)} (${potAndFee(row)}).`;
  }
  return `Ganó por tiempo ${short(winner)}: su rival no movió a tiempo. Recibió ${sui(payout)} (${potAndFee(row)}).`;
}

/** Resultado de una partida en la que nadie movió a tiempo: cada jugador recuperó su apuesta, sin comisión. */
export function expiredText(row: GameRow): string {
  return `Nadie movió a tiempo: cada jugador recuperó su apuesta (${sui(row.bet)}). Sin comisión.`;
}

/** Qué está pasando con la partida, en una frase (UX-1: lo primero que responde la vista de una partida). */
export function stateSentence(row: GameRow): string {
  switch (row.state.kind) {
    case 'pending':
      return row.opponent === null ? 'La partida está abierta.' : 'La partida es una invitación.';
    case 'cancelled':
      return 'La partida fue cancelada.';
    case 'active':
      return 'La partida está en juego.';
    case 'resolved':
      return 'La partida está resuelta.';
    case 'timed_out':
      return 'La partida terminó: ganó por tiempo.';
    case 'expired':
      return 'La partida terminó: nadie movió a tiempo.';
  }
}

/** Cierre común de lo que ya terminó. */
const NOTHING_MORE = 'No hay nada más que hacer.';

/**
 * Qué sigue para **esta** cuenta (UX-1): nunca un estado sin una línea que lo diga. `phase` es la del plazo de una partida
 * activa (`unknown` mientras no hay hora de la cadena).
 */
export function nextStepText(row: GameRow, account: string | null, phase: DeadlinePhase): string {
  const viewer = viewerOf(row, account);
  const { state } = row;
  switch (state.kind) {
    case 'pending':
      return pendingNext(row, viewer);
    case 'cancelled':
      return `La partida se canceló y la apuesta volvió a quien la creó. ${NOTHING_MORE}`;
    case 'resolved': {
      const result = rowPlayerResult(row, account);
      if (result === 'won') return `Ganaste el sorteo y se te pagó. ${NOTHING_MORE}`;
      if (result === 'lost') return `Perdiste el sorteo: el pozo fue para tu rival. ${NOTHING_MORE}`;
      return `Ya se sorteó y se pagó al ganador. ${NOTHING_MORE}`;
    }
    case 'timed_out':
      return `${timedOutText(row, state.winner, account)} ${NOTHING_MORE}`;
    case 'expired':
      return `${expiredText(row)} ${NOTHING_MORE}`;
    case 'active':
      return activeNext(row, state, viewer, phase);
  }
}

function pendingNext(row: GameRow, viewer: Viewer): string {
  const invitation = row.opponent !== null;
  switch (viewer) {
    case 'creator':
      return invitation && row.opponent !== null
        ? `Espera a que ${short(row.opponent)} la acepte; mientras tanto puedes cancelarla y recuperar tu apuesta.`
        : 'Espera a que alguien la acepte; mientras tanto puedes cancelarla y recuperar tu apuesta.';
    case 'invitee':
      return 'Te invitaron: puedes aceptar la partida apostando lo mismo o rechazarla.';
    case 'none':
      return invitation ? 'Es una invitación: conecta tu wallet para ver si es para ti.' : 'Conecta tu wallet para aceptar la partida.';
    case 'acceptor':
    case 'other':
      return invitation
        ? 'Es una invitación para otra cuenta: solo ella puede aceptarla.'
        : 'Puedes aceptar la partida apostando lo mismo que quien la creó.';
  }
}

function activeNext(row: GameRow, state: ActiveState, viewer: Viewer, phase: DeadlinePhase): string {
  const player = viewer === 'creator' || viewer === 'acceptor';
  const mover = state.toMove === TO_MOVE_CREATOR ? 'creator' : 'acceptor';
  switch (phase) {
    case 'unknown':
      return 'Leyendo la hora de la red para saber si venció el plazo.';
    case 'running':
      if (state.toMove === TO_MOVE_BOTH) {
        return player
          ? 'Les toca a los dos: muevan antes de que venza el plazo o se devolverá la apuesta a cada uno.'
          : 'Les toca a los dos: si el plazo vence sin que muevan, se devolverá la apuesta a cada uno.';
      }
      if (viewer === mover) return 'Es tu turno: mueve antes de que venza el plazo o tu rival podrá reclamar la victoria.';
      if (player) return 'Espera a que mueva tu rival; si no lo hace a tiempo, podrás reclamar la victoria.';
      return 'Partida en curso: si vence el plazo, cualquiera podrá reclamar la victoria para el rival de quien debía mover.';
    case 'expired':
      if (state.toMove === TO_MOVE_BOTH) return 'Venció el plazo y nadie movió: ya se puede reembolsar a cada jugador su apuesta.';
      return expiredClaimNext(row, state, viewer);
    case 'stalled':
      if (state.toMove === TO_MOVE_BOTH) return 'Venció el plazo y nadie movió: ya se puede reembolsar a cada jugador su apuesta.';
      return `Pasó la espera de ${GRACE_TEXT} tras el plazo: ya se puede reclamar la victoria o reembolsar a cada jugador su apuesta.`;
  }
}

function expiredClaimNext(row: GameRow, state: ActiveState, viewer: Viewer): string {
  const winner = winnerOnTimeout(row, state);
  const mover = state.toMove === TO_MOVE_CREATOR ? 'creator' : 'acceptor';
  if (viewer === mover) return 'Se te venció el plazo: tu rival ya puede reclamar la victoria y no puedes mover.';
  if (viewer === 'creator' || viewer === 'acceptor') return 'Tu rival no movió a tiempo: ya puedes reclamar la victoria.';
  return `Venció el plazo: cualquiera puede reclamar la victoria, que cobra ${winner === null ? 'el rival' : short(winner)}.`;
}

/** Aviso de una sola vez cuando un plazo vence (región `status`, UX-4); `null` si no hay nada que anunciar. */
export function expiryAnnouncement(state: ActiveState, phase: DeadlinePhase): string | null {
  if (phase !== 'expired' && phase !== 'stalled') return null;
  return state.toMove === TO_MOVE_BOTH
    ? 'Venció el plazo: ya se puede reembolsar la partida.'
    : 'Venció el plazo: ya se puede reclamar la victoria.';
}

// ---------------------------------------------------------------------------------------------------------------------
// Acciones de tiempo: qué pasará con los fondos (UX-8) y por qué un botón no está disponible (UX-9)
// ---------------------------------------------------------------------------------------------------------------------

/** Qué pasa con los fondos al reclamar la victoria (UX-8): el pozo menos la comisión va al rival de quien no movió. */
export function claimDescription(row: GameRow, state: ActiveState, account: string | null): string {
  const { pot, fee } = amountsOf(row);
  const winner = winnerOnTimeout(row, state);
  const who = winner === null ? 'el rival de quien no movió' : account !== null && sameAddress(account, winner) ? 'ti' : short(winner);
  return `El pozo (${sui(pot)}) menos la comisión (${sui(fee)}) va a ${who}; no necesariamente a quien ejecuta.`;
}

/** Qué pasa con los fondos al reembolsar (UX-8): cada jugador recupera su apuesta, sin comisión. */
export function refundDescription(row: GameRow): string {
  return `Cada jugador recupera su apuesta (${sui(row.bet)}). Sin comisión.`;
}

/** Por qué no se puede usar una acción de tiempo (UX-9), en el orden en que se evalúan. */
export type UnavailableCause = 'no_account' | 'busy' | 'unconfirmed' | 'done' | 'unknown_time' | 'not_yet';

/** El texto de un motivo; `not_yet` lleva además el tiempo que falta (un nodo aparte: lo cuenta el contador). */
export const UNAVAILABLE_TEXT: Record<Exclude<UnavailableCause, 'not_yet'>, string> = {
  no_account: 'Conecta tu wallet',
  busy: 'Hay otra transacción en curso: espera a que termine',
  unconfirmed: 'La transacción anterior quedó sin confirmar: revísala antes de volver a intentar',
  done: 'Esta partida ya terminó',
  unknown_time: 'Leyendo la hora de la red para saber si venció el plazo',
};

/** Prefijo del motivo "aún no venció el plazo", antes del tiempo que falta: "Aún no venció el plazo (quedan 3 min 20 s)". */
export const NOT_YET_PREFIX = 'Aún no venció el plazo';

/** Nota para quien espera al rival: sin reclamo durante la gracia, los fondos quedan en espera (y luego se reembolsan). */
export const GRACE_NOTE = `Si nadie reclama en ${GRACE_TEXT} tras el plazo, cualquiera podrá reembolsar a los dos jugadores.`;

/** Nota de las partidas en las que los dos deben mover: si vence, no hay ganador. */
export const BOTH_NOTE = 'Si el plazo vence con los dos pendientes, nadie gana: se devuelve la apuesta a cada jugador.';

// ---------------------------------------------------------------------------------------------------------------------
// Resultados adoptados de una acción de tiempo (otra pestaña o la fila de "Mis partidas")
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Resultado de reclamar la victoria por tiempo, leído del `DuelTimedOut` de la confirmación del nodo (SEG-10): quién ganó, lo
 * que cobró y que el pago no es de quien ejecuta, salvo que sea el mismo. Sin evento, un éxito honesto que remite al detalle.
 */
export function claimedText(event: TimedOutGame | null, account: string | null): string {
  if (event === null) return 'Reclamo enviado; no se pudo leer el resultado de la transacción: el detalle muestra cómo terminó la partida';
  const amounts = `(pozo ${sui(event.pot)} − comisión ${sui(event.fee)})`;
  if (account !== null && sameAddress(account, event.winner)) return `¡Ganaste por tiempo! Recibiste ${sui(event.payout)} ${amounts}`;
  const claimedByMe = account !== null && sameAddress(account, event.claimedBy);
  return claimedByMe
    ? `Reclamo hecho: ganó por tiempo ${short(event.winner)}, el rival de quien no movió, y recibió ${sui(event.payout)} ${amounts}`
    : `${short(event.claimedBy)} reclamó: ganó por tiempo ${short(event.winner)} y recibió ${sui(event.payout)} ${amounts}`;
}

/** Resultado de reembolsar una partida estancada, del `DuelExpired` de la confirmación: lo que recuperó cada jugador. */
export function refundedText(event: ExpiredGame | null): string {
  if (event === null) return 'Reembolso enviado; no se pudo leer el resultado de la transacción: el detalle muestra cómo terminó la partida';
  return `Reembolso hecho: cada jugador recuperó su apuesta (${sui(event.refundEach)}). Sin comisión.`;
}

/** Una fila de la fuente nueva en estado activo (`Active`): lo único que tienen en común la vista y las acciones de tiempo. */
export type ActiveDuelRow = DuelGameRow & { state: ActiveState };

/** Si la fila es una partida activa de la fuente nueva, con el estado ya estrechado. */
export function asActiveDuel(row: GameRow): ActiveDuelRow | null {
  return row.source === 'duel' && row.state.kind === 'active' ? { ...row, state: row.state } : null;
}
