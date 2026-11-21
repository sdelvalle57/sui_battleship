import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { shortAddress } from '../sui/format';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, CREATOR, INVITEE, THIRD, activeState, duelRow } from '../test/duelRows';
import { GameStatus } from './GameStatus';

// UX-1, UX-4 y UX-5 (#73, TASK-8b): el resumen de una partida de la fuente nueva para una cuenta, con un reloj inyectado.
const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 10_000);

function setup(row: ReturnType<typeof duelRow>, account: string | null, { sample = true }: { sample?: boolean } = {}) {
  const fake = createFakeScreenClock();
  if (sample) fake.sample(CHAIN_NOW);
  const view = render(withScreenClock(fake.clock, <GameStatus game={row} account={account} />));
  return { fake, ...view };
}
const text = (selector: string) => document.querySelector(selector)?.textContent ?? null;
const advance = (fake: ReturnType<typeof createFakeScreenClock>, ms: number) => {
  act(() => {
    fake.advance(ms);
  });
};

describe('GameStatus: an active game (UX-1)', () => {
  it('UX-1: answers in order what is happening, whose turn it is, how much time is left and what this account can do', () => {
    setup(duelRow(activeState(1, DEADLINE), { opponent: INVITEE }), CREATOR);
    const lines = [...document.querySelectorAll('.duel-status > p')].map((line) => line.className);
    expect(lines).toEqual(['duel-state', 'duel-turn', 'clock-line', 'duel-next']);
    expect(text('.duel-state')).toBe('La partida está en juego.');
    expect(text('.duel-turn')).toBe('Te toca a ti');
    expect(text('.clock-line')).toMatch(/^Tiempo: quedan 10 s \(vence el /);
    expect(text('.duel-next')).toBe('Es tu turno: mueve antes de que venza el plazo o tu rival podrá reclamar la victoria.');
  });

  it.each([
    ['the one who must move', CREATOR, 'Te toca a ti'],
    ['the rival', ACCEPTOR, `Le toca a ${shortAddress(CREATOR)}`],
    ['a third account', THIRD, `Le toca a ${shortAddress(CREATOR)} (quien creó la partida)`],
    ['no account', null, `Le toca a ${shortAddress(CREATOR)} (quien creó la partida)`],
  ])('UX-1: the turn for %s', (_who, account, expected) => {
    setup(duelRow(activeState(1, DEADLINE)), account);
    expect(text('.duel-turn')).toBe(expected);
  });

  it('UX-1: when both must move it says so to everyone', () => {
    setup(duelRow(activeState(3, DEADLINE)), CREATOR);
    expect(text('.duel-turn')).toBe('Les toca a los dos');
    expect(text('.duel-next')).toMatch(/^Les toca a los dos: muevan antes de que venza el plazo/);
  });

  it('UX-1: with the deadline passed the counter says it expired and the next step is to claim', () => {
    const { fake } = setup(duelRow(activeState(1, DEADLINE)), ACCEPTOR);
    advance(fake, 10_000 + 5_000);
    expect(screen.getByRole('timer')).toHaveTextContent('venció');
    expect(text('.duel-next')).toBe('Tu rival no movió a tiempo: ya puedes reclamar la victoria.');
  });

  it('UX-1 and UX-7 (loading the chain time): without chain time it does not guess whether the deadline passed', () => {
    setup(duelRow(activeState(1, DEADLINE)), ACCEPTOR, { sample: false });
    expect(screen.getByRole('timer')).toHaveTextContent('calculando el tiempo restante…');
    expect(text('.duel-next')).toBe('Leyendo la hora de la red para saber si venció el plazo.');
  });

  it('UX-1: a compact summary (a row of "Mis partidas") leaves out the state sentence', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    render(withScreenClock(fake.clock, <GameStatus game={duelRow(activeState(1, DEADLINE))} account={CREATOR} compact />));
    expect(document.querySelector('.duel-state')).toBeNull();
    expect(text('.duel-turn')).toBe('Te toca a ti');
  });
});

describe('GameStatus: the rest of the states say what comes next (UX-1)', () => {
  it.each([
    ['pending', { kind: 'pending' } as const, 'La partida está abierta.', CREATOR, 'Espera a que alguien la acepte; mientras tanto puedes cancelarla y recuperar tu apuesta.'],
    ['cancelled', { kind: 'cancelled' } as const, 'La partida fue cancelada.', CREATOR, 'La partida se canceló y la apuesta volvió a quien la creó. No hay nada más que hacer.'],
    [
      'resolved',
      { kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR } as const,
      'La partida está resuelta.',
      CREATOR,
      'Ganaste el sorteo y se te pagó. No hay nada más que hacer.',
    ],
    [
      'expired',
      { kind: 'expired', acceptor: ACCEPTOR } as const,
      'La partida terminó: nadie movió a tiempo.',
      CREATOR,
      'Nadie movió a tiempo: cada jugador recuperó su apuesta (0.002 SUI). Sin comisión. No hay nada más que hacer.',
    ],
  ])('UX-1: %s', (_name, state, sentence, account, next) => {
    setup(duelRow(state), account);
    expect(text('.duel-state')).toBe(sentence);
    expect(text('.duel-next')).toBe(next);
    expect(document.querySelector('.duel-turn')).toBeNull();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('UX-1: a game won by time tells who won and the split', () => {
    setup(duelRow({ kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR }), ACCEPTOR);
    expect(text('.duel-state')).toBe('La partida terminó: ganó por tiempo.');
    expect(text('.duel-next')).toMatch(/^Ganaste por tiempo: tu rival no movió a tiempo\. Recibiste 0\.0039 SUI/);
  });
});

describe('GameStatus: announcements (UX-4)', () => {
  const region = () => screen.getByRole('status');

  it('UX-4: the status region exists empty and does not change while time runs: advancing 10 s of ticks adds nothing', () => {
    const { fake } = setup(duelRow(activeState(1, DEADLINE)), ACCEPTOR);
    expect(region()).toBeEmptyDOMElement();
    advance(fake, 9_000);
    expect(region()).toBeEmptyDOMElement();
    expect(screen.getByRole('timer')).toHaveTextContent('quedan 1 s');
  });

  it('UX-4: crossing the deadline adds ONE message to the region and the later ticks do not repeat it', () => {
    const { fake } = setup(duelRow(activeState(1, DEADLINE)), ACCEPTOR);
    advance(fake, 10_000);
    expect(region()).toHaveTextContent('Venció el plazo: ya se puede reclamar la victoria.');
    const message = region().textContent;
    advance(fake, 5 * 60_000);
    expect(region().textContent).toBe(message);
    expect(region().childNodes).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('UX-4: with both pending the announcement is about the refund', () => {
    const { fake } = setup(duelRow(activeState(3, DEADLINE)), ACCEPTOR);
    advance(fake, 10_000);
    expect(region()).toHaveTextContent('Venció el plazo: ya se puede reembolsar la partida.');
  });

  it('UX-4: the timer is not the announcement: it is not a live region', () => {
    setup(duelRow(activeState(1, DEADLINE)), ACCEPTOR);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off');
    expect(region()).not.toContainElement(screen.getByRole('timer'));
  });

  it('UX-5: the urgency is said with text ("venció", "Te toca a ti"), never only with color or an icon', () => {
    const { fake } = setup(duelRow(activeState(2, DEADLINE)), ACCEPTOR);
    advance(fake, 10_000);
    const visible = document.querySelector('.duel-status')?.textContent ?? '';
    expect(visible).toContain('Te toca a ti');
    expect(visible).toContain('venció');
    expect(document.querySelector('.duel-status svg, .duel-status img')).toBeNull();
  });
});
