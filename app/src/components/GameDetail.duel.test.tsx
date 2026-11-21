import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DuelGameRow } from '../hooks/gameRow';
import type { DuelState } from '../sui/duel';
import { shortAddress } from '../sui/format';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, CREATOR, INVITEE, THIRD, activeState, duelRow } from '../test/duelRows';
import { GameDetail } from './GameDetail';

// UX-1, UX-5, UX-6 y UX-10 (#73, TASK-8b): el detalle de una partida de la fuente nueva en todos sus estados, con el reloj de
// pantalla inyectado. El detalle de una partida de la fuente anterior no cambia (GameDetail.test.tsx).
const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 90_000);
const CONTRACT_JARGON = /claim_timeout|refund_stalled|to_move|deadline_ms|TimedOut|Expired|DuelState/;

function view(row: DuelGameRow, account: string | null = null) {
  const fake = createFakeScreenClock();
  fake.sample(CHAIN_NOW);
  const result = render(withScreenClock(fake.clock, <GameDetail game={row} lastActivityMs={null} network="localnet" account={account} />));
  return { fake, ...result };
}
const field = (name: string) => screen.getByText(name).nextElementSibling;

describe('GameDetail: a game of the new source (UX-1)', () => {
  it('UX-1: an active game shows the summary first (state, turn, time left, next step), then the sheet with the clock and the acceptor', () => {
    const { container } = view(duelRow(activeState(2, DEADLINE)), ACCEPTOR);
    const order = [...container.querySelectorAll('.duel-status, dl')].map((element) => element.tagName);
    expect(order).toEqual(['DIV', 'DL']);
    expect(container.querySelector('.duel-state')).toHaveTextContent('La partida está en juego.');
    expect(container.querySelector('.duel-turn')).toHaveTextContent('Te toca a ti');
    expect(container.querySelector('.clock-line')).toHaveTextContent('Tiempo: quedan 1 min 30 s');
    expect(container.querySelector('.duel-next')).toHaveTextContent('Es tu turno: mueve antes de que venza el plazo');
    expect(field('Estado')).toHaveTextContent('En juego');
    expect(field('Reloj')).toHaveTextContent('10 min por jugada');
    expect(field('Aceptante')).toHaveTextContent(shortAddress(ACCEPTOR));
  });

  it('UX-1: a pending game shows its next step, the clock of the game and no turn or timer', () => {
    const { container } = view(duelRow({ kind: 'pending' }, { opponent: INVITEE }), INVITEE);
    expect(container.querySelector('.duel-next')).toHaveTextContent('Te invitaron: puedes aceptar la partida apostando lo mismo o rechazarla.');
    expect(field('Estado')).toHaveTextContent(`Invitación a ${shortAddress(INVITEE)}`);
    expect(field('Reloj')).toHaveTextContent('10 min por jugada');
    expect(container.querySelector('.duel-turn')).toBeNull();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('UX-1: a game with no clock reads "sin reloj" in the sheet', () => {
    view(duelRow({ kind: 'pending' }, { control: { id: 0, turnMs: 0n, label: 'sin reloj' } }));
    expect(field('Reloj')).toHaveTextContent('sin reloj');
  });

  it('a game of the previous source is drawn as always: no summary and no clock row', () => {
    const fake = createFakeScreenClock();
    const legacy = { ...duelRow({ kind: 'pending' }), source: 'legacy', control: null } as const;
    const { container } = render(withScreenClock(fake.clock, <GameDetail game={legacy} lastActivityMs={null} network="localnet" account={null} />));
    expect(container.querySelector('.duel-status')).toBeNull();
    expect(screen.queryByText('Reloj')).not.toBeInTheDocument();
  });
});

describe('GameDetail: the three finished states, by the variant of the object (TASK-8b)', () => {
  it('resolved shows the winner, the split and the result for the account, as before', () => {
    view(duelRow({ kind: 'resolved', acceptor: ACCEPTOR, winner: ACCEPTOR }), ACCEPTOR);
    expect(field('Estado')).toHaveTextContent('Resuelta');
    expect(field('Ganador')).toHaveTextContent(shortAddress(ACCEPTOR));
    expect(field('Pozo')).toHaveTextContent('0.004 SUI');
    expect(field('Comisión cobrada')).toHaveTextContent('0.0001 SUI');
    expect(field('Pago al ganador')).toHaveTextContent('0.0039 SUI');
    expect(field('Resultado para ti')).toHaveTextContent('ganaste');
  });

  it.each([
    ['the winner', ACCEPTOR, 'ganaste por tiempo'],
    ['the other player', CREATOR, 'perdiste por tiempo'],
  ])('timed out: "Ganó por tiempo" with the pot minus the fee for the rival of who did not move; result for %s', (_who, account, result) => {
    view(duelRow({ kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR }), account);
    expect(field('Estado')).toHaveTextContent('Ganó por tiempo');
    expect(field('Ganador')).toHaveTextContent(shortAddress(ACCEPTOR));
    expect(field('Pozo')).toHaveTextContent('0.004 SUI');
    expect(field('Comisión cobrada')).toHaveTextContent('0.0001 SUI');
    expect(field('Pago al ganador')).toHaveTextContent('0.0039 SUI');
    expect(field('Resultado para ti')).toHaveTextContent(result);
  });

  it('timed out has no "Resultado para ti" for a third account or without an account', () => {
    view(duelRow({ kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR }), THIRD);
    expect(screen.queryByText('Resultado para ti')).not.toBeInTheDocument();
  });

  it('expired: "Nadie movió a tiempo", each player recovers their bet and there is no fee and no winner', () => {
    const { container } = view(duelRow({ kind: 'expired', acceptor: ACCEPTOR }), CREATOR);
    expect(field('Estado')).toHaveTextContent('Nadie movió a tiempo: cada jugador recuperó su apuesta');
    expect(field('Devuelto a cada jugador')).toHaveTextContent('0.002 SUI (sin comisión)');
    expect(field('Resultado para ti')).toHaveTextContent('recuperaste tu apuesta');
    expect(screen.queryByText('Ganador')).not.toBeInTheDocument();
    expect(screen.queryByText('Comisión cobrada')).not.toBeInTheDocument();
    expect(container.querySelector('.duel-next')).toHaveTextContent('No hay nada más que hacer.');
  });

  it('expired has no "Resultado para ti" for a third account', () => {
    view(duelRow({ kind: 'expired', acceptor: ACCEPTOR }), THIRD);
    expect(screen.queryByText('Resultado para ti')).not.toBeInTheDocument();
  });

  it('cancelled says nothing is left to do', () => {
    const { container } = view(duelRow({ kind: 'cancelled' }), CREATOR);
    expect(field('Estado')).toHaveTextContent('Cancelada');
    expect(container.querySelector('.duel-next')).toHaveTextContent('La partida se canceló y la apuesta volvió a quien la creó. No hay nada más que hacer.');
  });
});

describe('GameDetail: every view without contract jargon, and readable by structure (UX-5, UX-6, UX-10)', () => {
  const states: DuelState[] = [
    { kind: 'pending' },
    { kind: 'cancelled' },
    activeState(1, DEADLINE),
    activeState(3, DEADLINE),
    { kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR },
    { kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR },
    { kind: 'expired', acceptor: ACCEPTOR },
  ];
  const accounts = [null, CREATOR, ACCEPTOR, THIRD];

  it('UX-6: no state, with or without account, shows words of the contract in its text', () => {
    for (const state of states) {
      for (const account of accounts) {
        const { container, unmount } = view(duelRow(state, { opponent: INVITEE }), account);
        expect(container.textContent, `${state.kind} / ${account ?? 'sin cuenta'}`).not.toMatch(CONTRACT_JARGON);
        unmount();
      }
    }
  });

  it('UX-1: every state shows a line that says what comes next (a state is never left without one)', () => {
    for (const state of states) {
      const { container, unmount } = view(duelRow(state), THIRD);
      expect(container.querySelector('.duel-next')?.textContent.length ?? 0, state.kind).toBeGreaterThan(20);
      unmount();
    }
  });

  it('UX-5: the state is written with text in the sheet and in the summary, never with color alone', () => {
    for (const state of states) {
      const { container, unmount } = view(duelRow(state), CREATOR);
      expect(field('Estado')?.textContent.trim().length ?? 0).toBeGreaterThan(3);
      expect(container.querySelector('.duel-state')?.textContent.length ?? 0).toBeGreaterThan(10);
      expect(container.querySelector('svg, img')).toBeNull();
      unmount();
    }
  });

  it('UX-10: the detail uses a definition list for the sheet and no tabindex, so the order of tabbing is the order of reading', () => {
    const { container } = view(duelRow(activeState(1, DEADLINE)), CREATOR);
    expect(container.querySelectorAll('dl')).toHaveLength(1);
    expect(container.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(container.querySelector('article')).not.toBeNull();
  });
});
