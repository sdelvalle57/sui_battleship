import type { DuelGameRow } from '../hooks/gameRow';
import type { DuelState } from '../sui/duel';
import { TIME_CONTROLS } from '../sui/gameRegistry';

/** Direcciones y filas sintéticas de la fuente nueva para los tests de las vistas con reloj (#73, TASK-8b). */
export const CREATOR = `0x${'ab'.repeat(32)}`;
export const ACCEPTOR = `0x${'cd'.repeat(32)}`;
export const THIRD = `0x${'ef'.repeat(32)}`;
export const INVITEE = `0x${'12'.repeat(32)}`;
export const GAME_ID = `0x${'6'.repeat(64)}`;

/** Una apuesta de 0,002 SUI: pozo 0,004; con comisión de 250 bps, comisión 0,0001 y pago 0,0039. */
export const BET = 2_000_000n;
export const FEE_RATE = 250;

/** El control de 10 minutos del espejo (id 1), como lo trae una fila de la fuente nueva. */
const TEN_MINUTES = TIME_CONTROLS.find((control) => control.id === 1);

/** Estado `Active` con la máscara de turno y el plazo absoluto (ms de la cadena). */
export function activeState(toMove: number, deadlineMs: bigint, acceptor = ACCEPTOR): DuelState {
  return { kind: 'active', acceptor, toMove, deadlineMs };
}

/** Una partida de la fuente nueva en cualquier estado, con reloj de 10 min por jugada salvo que se pida otro control. */
export function duelRow(state: DuelState, overrides: Partial<DuelGameRow> = {}): DuelGameRow {
  if (TEN_MINUTES === undefined) throw new Error('el espejo de controles debe tener el id 1');
  return {
    source: 'duel',
    id: GAME_ID,
    gameKey: 'coinflip',
    creator: CREATOR,
    opponent: null,
    bet: BET,
    feeRate: FEE_RATE,
    state,
    control: { id: TEN_MINUTES.id, turnMs: TEN_MINUTES.turnMs, label: TEN_MINUTES.label },
    ...overrides,
  };
}
