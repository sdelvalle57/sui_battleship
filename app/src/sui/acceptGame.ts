import type { GameResolvedEvent } from './events';
import type { Game } from './game';
import { sameAddress } from './ids';

/**
 * Reserva de gas que la app exige además de la apuesta antes de ofrecer "Aceptar" (DL-4). Medida en TASK-1 de #12 (S-4,
 * localnet, precio de gas 1000): el budget que elige el nodo en la preflight de aceptar fue 3474748 MIST con una moneda
 * de gas y 4474748 con dos (se fusionan); con margen 2× (8949496) y redondeado hacia arriba a 0,005 SUI ⇒ 0,01 SUI. Cubre
 * también el costo sin ningún rebate de storage (1000000 + 6186400 MIST). Es cortesía: el nodo y la wallet deciden; entre
 * `bet + budget` y `bet + reserva` la app marca "insuficiente" un saldo que el nodo aceptaría. El budget escala con el
 * precio de gas de la red: se revisa en #17.
 */
export const ACCEPT_GAS_RESERVE_MIST = 10_000_000n;

/**
 * Si el saldo alcanza para aceptar: la apuesta exacta más la reserva de gas. `null` (saldo sin leer o con error) ⇒
 * `'unknown'`: la UI no bloquea por un dato que no tiene; la preflight decide.
 */
export function acceptBalanceCheck(balance: bigint | null, bet: bigint): 'ok' | 'insufficient' | 'unknown' {
  if (balance === null) return 'unknown';
  return balance < bet + ACCEPT_GAS_RESERVE_MIST ? 'insufficient' : 'ok';
}

/** Si la cuenta ganó la partida que resolvió el evento (direcciones comparadas normalizadas). */
export function wonBy(event: Pick<GameResolvedEvent, 'winner'>, address: string): boolean {
  return sameAddress(event.winner, address);
}

/**
 * Resultado de la partida para la cuenta conectada (DL-12), leído del estado `Resolved` del objeto: `'won'`/`'lost'` si
 * la cuenta es el creador o el aceptante; `null` si la partida no está resuelta, no hay cuenta o es un tercero.
 */
export function playerResult(game: Pick<Game, 'creator' | 'state'>, address: string | null): 'won' | 'lost' | null {
  if (game.state.kind !== 'resolved' || address === null) return null;
  const isPlayer = sameAddress(address, game.creator) || sameAddress(address, game.state.acceptor);
  if (!isPlayer) return null;
  return sameAddress(address, game.state.winner) ? 'won' : 'lost';
}
