import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameRow, ListedRow } from '../hooks/gameRow';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import type { MyGamesSource } from '../hooks/useMyGames';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import { shortAddress } from '../sui/format';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, CREATOR, activeState, duelRow } from '../test/duelRows';
import { MyGamesSection } from './MyGamesSection';

// UX-1, UX-3 y UX-6 (#73, TASK-8b): las filas de "Mis partidas" con partidas de la fuente nueva con reloj.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));
vi.mock('./GameActions', () => ({
  GameActions: ({ game, variant }: { game: GameRow; variant?: string }) => (
    <div className="game-actions" data-variant={variant}>
      acciones de {game.id}
    </div>
  ),
}));

const CHAIN_NOW = 1_800_000_000_000;
const id = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const source: MyGamesSource = {
  status: { kind: 'ready', refreshing: false },
  hasData: true,
  refreshRetrying: null,
  refreshError: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  nextPageError: null,
  stalled: false,
  lowerBound: { checkpoint: 59n, kind: 'publish' },
  end: 'bound',
  loadMore: vi.fn(),
  retry: vi.fn(),
};
const item = (n: number, state: Parameters<typeof duelRow>[0], role: 'creator' | 'acceptor' = 'creator', control = true): ListedRow => ({
  kind: 'game',
  row: duelRow(state, { id: id(n), ...(control ? {} : { control: { id: 0, turnMs: 0n, label: 'sin reloj' } }) }),
  role,
  txDigest: `tx-${String(n)}`,
});

function renderSection(section: 'pending' | 'finished', items: ListedRow[], account = CREATOR) {
  const fake = createFakeScreenClock();
  fake.sample(CHAIN_NOW);
  const view = render(
    withScreenClock(
      fake.clock,
      <MemoryRouter>
        <MyGamesSection section={section} items={items} source={source} address={account} moreLabel="Cargar más actividad" busy={false} />
      </MemoryRouter>,
    ),
  );
  return { fake, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
});

describe('MyGamesSection: rows with a clock (TASK-8b)', () => {
  it('UX-1: an active row shows its label, the turn, the time left and the next step, between the line and the actions', () => {
    const deadline = BigInt(CHAIN_NOW + 125_000);
    const { container } = renderSection('pending', [item(1, activeState(1, deadline))]);
    const row = container.querySelector('li');
    expect(row?.querySelector('p')).toHaveTextContent(`Abierta · 0.002 SUI · 10 min por jugada · En juego`);
    expect(row?.querySelector('.duel-state')).toBeNull();
    expect(row?.querySelector('.duel-turn')).toHaveTextContent('Te toca a ti');
    expect(row?.querySelector('.clock-line')).toHaveTextContent('Tiempo: quedan 2 min 5 s');
    expect(row?.querySelector('.duel-next')).toHaveTextContent('Es tu turno');
    const children = [...(row?.children ?? [])].map((element) => element.className);
    expect(children).toEqual(['', 'duel-status', 'game-actions']);
  });

  it('UX-3: many active rows share ONE interval and each counter ticks on its own', () => {
    const deadline = BigInt(CHAIN_NOW + 125_000);
    const items = Array.from({ length: 12 }, (_, n) => item(n + 1, activeState(1, deadline + BigInt(n * 1_000))));
    const { fake } = renderSection('pending', items);
    expect(screen.getAllByRole('timer')).toHaveLength(12);
    expect(fake.createdCount()).toBe(1);
    act(() => {
      fake.advance(5_000);
    });
    expect(screen.getAllByRole('timer')[0]).toHaveTextContent('quedan 2 min');
    expect(screen.getAllByRole('timer')[11]).toHaveTextContent('quedan 2 min 11 s');
  });

  it('shows the time control of a row of the new source only when it has a clock ("sin reloj" is the usual case: no noise)', () => {
    const { container } = renderSection('pending', [item(1, { kind: 'pending' }, 'creator', false), item(2, { kind: 'pending' }, 'creator', true)]);
    const [coinflip, clock] = [...container.querySelectorAll('li > p')];
    expect(coinflip).not.toHaveTextContent('sin reloj');
    expect(coinflip).not.toHaveTextContent('por jugada');
    expect(clock).toHaveTextContent('10 min por jugada');
  });

  it('a game won by time reads "Ganó por tiempo" in its label and tells the account whether it won', () => {
    const { container } = renderSection('finished', [item(1, { kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR })], CREATOR);
    expect(container.querySelector('li > p')).toHaveTextContent('Ganó por tiempo');
    expect(container.querySelector('.my-game-result')).toHaveTextContent('Ganaste por tiempo');
  });

  it('the acceptor of a timed-out game it lost reads "Perdiste por tiempo"', () => {
    const { container } = renderSection('finished', [item(1, { kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR }, 'acceptor')], ACCEPTOR);
    expect(container.querySelector('.my-game-result')).toHaveTextContent('Perdiste por tiempo');
    expect(container.querySelector('li > p')).toHaveTextContent(`Aceptaste la de ${shortAddress(CREATOR)}`);
  });

  it('UX-6: none of the rows has words of the contract', () => {
    const { container } = renderSection('finished', [
      item(1, { kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR }),
      item(2, { kind: 'expired', acceptor: ACCEPTOR }),
    ]);
    expect(container.textContent).not.toMatch(/claim_timeout|refund_stalled|to_move|deadline_ms|TimedOut|Expired|DuelState/);
  });
});
