import { ABORT_MESSAGES } from './errors';
import type { Game } from './game';
import { sameAddress } from './ids';

/**
 * Si la cuenta conectada ve "Cancelar" (DL-10): es el creador y la partida está pendiente. Es cortesía de la UI: el
 * contrato valida igual (`game`/3 y `game`/4, SEG-2).
 */
export function canCancel(game: Pick<Game, 'creator' | 'state'>, address: string | null): boolean {
  return address !== null && sameAddress(address, game.creator) && game.state.kind === 'pending';
}

/**
 * Si la cuenta conectada ve "Rechazar" (D-20261102-05): la partida es una invitación a esa cuenta y está pendiente. El
 * contrato valida igual (`game`/6, `game`/5 y `game`/4).
 */
export function canReject(game: Pick<Game, 'opponent' | 'state'>, address: string | null): boolean {
  return address !== null && game.opponent !== null && sameAddress(address, game.opponent) && game.state.kind === 'pending';
}

/** Qué puede hacer la cuenta conectada con "Aceptar" (M-3 de #12). */
export type AcceptState = 'not_pending' | 'no_account' | 'creator' | 'not_invited' | 'available';

/**
 * Estado de "Aceptar" para la cuenta conectada (M-3), evaluado en este orden: `not_pending` (la partida terminó, con o
 * sin cuenta), `no_account`, `creator` (no se juega contra uno mismo, `game`/9), `not_invited` (invitación a otra
 * dirección, `game`/5; D-20261103-02: aviso sin botón) y `available`. Es cortesía de la UI: el contrato valida igual
 * (SEG-2). `no_account` ya implica `Pending`, así que una partida terminada vista sin cuenta no muestra ningún aviso.
 */
export function acceptState(game: Pick<Game, 'creator' | 'opponent' | 'state'>, address: string | null): AcceptState {
  if (game.state.kind !== 'pending') return 'not_pending';
  if (address === null) return 'no_account';
  if (sameAddress(address, game.creator)) return 'creator';
  if (game.opponent !== null && !sameAddress(address, game.opponent)) return 'not_invited';
  return 'available';
}

/**
 * Aviso para una cuenta que abre una invitación ajena (D-20261103-02): el mismo texto que el abort `game`/5
 * (`ENotInvited`), para que la UI y el contrato digan lo mismo.
 */
export const NOT_INVITED_HINT: string = ABORT_MESSAGES.game[5] ?? '';
