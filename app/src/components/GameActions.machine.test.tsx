import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint } from '../sui/execution';
import type { Game } from '../sui/game';
import { createPolicyQueryClient } from '../test/queryHarness';
import { GameActions } from './GameActions';

// T3-18: las acciones del detalle con la máquina real (useTxTarget + useCancelGame/useRejectGame); kit y `sui/execution`
// mockeados. El kit se mockea sin importarlo (regla de capas de components/).
const kit = vi.hoisted(() => ({ address: '', signAndExecuteTransaction: vi.fn() }));
vi.mock('@mysten/dapp-kit-react', () => ({
  useCurrentAccount: () => ({ address: kit.address }),
  useCurrentClient: () => ({}),
  useDAppKit: () => ({ signAndExecuteTransaction: kit.signAndExecuteTransaction }),
}));
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type Fixture = { ids: { packageId: string; originalPackageId: string; houseId: string; games: { open: string } } };
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const CREATOR = `0x${'a'.repeat(64)}`;
const ACCEPTOR = `0x${'c'.repeat(64)}`;
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: fixture.ids.packageId,
  originalPackageId: fixture.ids.originalPackageId,
  houseId: fixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
};
const GAME: Game = {
  id: fixture.ids.games.open,
  version: 1n,
  houseId: fixture.ids.houseId,
  creator: CREATOR,
  opponent: null,
  bet: 1_000_001n,
  stake: 1_000_001n,
  feeRate: 250,
  state: { kind: 'pending' },
};

const { signAndExecuteTransaction } = kit;
let queryClient: QueryClient;

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useWalletAccount).mockReturnValue({ address: CREATOR, short: 'x' });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  kit.address = CREATOR;
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: DIGEST } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('GameActions with the global machine (T3-18)', () => {
  it('shows one unconfirmed alert and one "Ya la revisé" for a cancel; pressing it removes both and unblocks', async () => {
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    render(
      <QueryClientProvider client={queryClient}>
        <GameActions game={GAME} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Ya la revisé' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Ya la revisé' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
  });

  it('T4-11: an unconfirmed acceptance shows one alert and one "Ya la revisé", with Aceptar disabled', async () => {
    kit.address = ACCEPTOR;
    vi.mocked(useWalletAccount).mockReturnValue({ address: ACCEPTOR, short: 'x' });
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    render(
      <QueryClientProvider client={queryClient}>
        <GameActions game={GAME} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Ya la revisé' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeDisabled();
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
  });
});
