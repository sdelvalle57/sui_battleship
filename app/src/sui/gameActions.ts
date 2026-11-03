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
