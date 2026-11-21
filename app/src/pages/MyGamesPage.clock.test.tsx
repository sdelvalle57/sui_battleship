import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListedRow } from '../hooks/gameRow';
import { useAccountTxBusy } from '../hooks/useAccountTxBusy';
import { useAppConfig } from '../hooks/useAppConfig';
import { useMyGames, type MyGamesSource, type UseMyGamesResult } from '../hooks/useMyGames';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { ACCEPTOR, CREATOR, activeState, duelRow } from '../test/duelRows';
import { MyGamesPage } from './MyGamesPage';

// #73 (TASK-8b): "Mis partidas" lee la hora de la cadena **una sola vez** y solo si alguna partida activa con reloj cuenta un
// plazo; sin ellas, ningún pedido de más.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useMyGames', () => ({ useMyGames: vi.fn() }));
vi.mock('../hooks/useAccountTxBusy', () => ({ useAccountTxBusy: vi.fn() }));
vi.mock('../components/ChainClockSampler', () => ({ ChainClockSampler: () => <span data-testid="chain-sampler" /> }));
vi.mock('../components/MyGamesSection', () => ({ MyGamesSection: ({ section }: { section: string }) => <section data-section={section} /> }));

const source: MyGamesSource = {
  status: { kind: 'ready', refreshing: false },
  hasData: true,
  refreshRetrying: null,
  refreshError: null,
  hasNextPage: false,
  isFetchingNextPage: false,
  nextPageError: null,
  stalled: false,
  lowerBound: null,
  end: null,
  loadMore: vi.fn(),
  retry: vi.fn(),
};
const item = (state: Parameters<typeof duelRow>[0]): ListedRow => ({ kind: 'game', row: duelRow(state), role: 'creator', txDigest: 'tx' });
function renderPage(pending: ListedRow[]) {
  const result: UseMyGamesResult = {
    kind: 'ready',
    sections: { invitations: [], pending, finished: [] },
    unreadableEvents: 0,
    activity: source,
    invitations: source,
    isFetching: false,
    refresh: vi.fn(),
  };
  vi.mocked(useMyGames).mockReturnValue(result);
  return render(
    <MemoryRouter>
      <MyGamesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useWalletAccount).mockReturnValue({ address: CREATOR, short: 'x' });
  vi.mocked(useAccountTxBusy).mockReturnValue(false);
});

describe('MyGamesPage and the chain clock', () => {
  it('mounts the sampler ONCE when an active game with a clock is pending, however many rows there are', () => {
    renderPage([item(activeState(1, 5n)), item(activeState(2, 9n, ACCEPTOR)), item({ kind: 'pending' })]);
    expect(screen.getAllByTestId('chain-sampler')).toHaveLength(1);
  });

  it('does not read the chain time with no active game', () => {
    renderPage([item({ kind: 'pending' })]);
    expect(screen.queryByTestId('chain-sampler')).not.toBeInTheDocument();
  });

  it('does not read the chain time for an unreadable row', () => {
    renderPage([{ kind: 'unreadable', gameId: null, role: 'creator', txDigest: 'tx' }]);
    expect(screen.queryByTestId('chain-sampler')).not.toBeInTheDocument();
  });
});
