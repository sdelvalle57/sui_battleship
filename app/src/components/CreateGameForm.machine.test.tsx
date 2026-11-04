import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { createMemoryRouter, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCreateGame } from '../hooks/useCreateGame';
import { useHouse } from '../hooks/useHouse';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import type { House } from '../sui/house';
import { createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { deferred, useGameView } from '../test/txHarness';
import { CreateGameForm } from './CreateGameForm';
import { IN_FLIGHT_TEXT } from './txNotice';

// T3-17: el formulario con la máquina real (useTxTarget + useCreateGame); kit y `sui/execution` mockeados. El kit se
// mockea sin importarlo (regla de capas de components/): la cuenta sale del store de abajo.
const kit = vi.hoisted(() => ({ account: { current: '' }, getObject: vi.fn(), signAndExecuteTransaction: vi.fn() }));
vi.mock('@mysten/dapp-kit-react', () => ({
  useCurrentAccount: () => ({ address: kit.account.current }),
  useCurrentClient: () => ({ getObject: kit.getObject }),
  useDAppKit: () => ({ signAndExecuteTransaction: kit.signAndExecuteTransaction }),
}));
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: { bcs: string; json: Record<string, unknown> }[] };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: Record<'open' | 'invite', string> };
  house: { type: string; owner: unknown; content: string };
  executed: Record<'createOpen' | 'cancel', { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const CREATE_OPEN = fixture.executed.createOpen.Transaction;
/** La cuenta que creó `createOpen` en la fixture: así `parseCreatedGame` identifica la partida. */
const B = String(CREATE_OPEN.events[0]?.json.creator);
const A = `0x${'a'.repeat(64)}`;
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
const HOUSE: House = { id: fixture.ids.houseId, version: 1n, feeRate: 250, feesCollected: 0n, minBet: 1_000_000n, maxBet: 50_000_000_000n };
const UNCONFIRMED_TEXT = 'La transacción se envió pero la red no la confirmó todavía';

/** base64 → bytes sin el SDK (components/ no importa `@mysten/*`). */
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
function resultOf(tx: FixtureTx): NodeTransactionResult {
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}

/** Cuenta conectada como store externo: cambiarla vuelve a renderizar el formulario sin desmontarlo. */
const listeners = new Set<() => void>();
const accountStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => kit.account.current,
};
function switchAccount(address: string) {
  act(() => {
    kit.account.current = address;
    for (const listener of listeners) listener();
  });
}
function AccountScope() {
  useSyncExternalStore(accountStore.subscribe, accountStore.get);
  return <CreateGameForm />;
}
function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
}

const { getObject, signAndExecuteTransaction } = kit;
let queryClient: QueryClient;

function renderForm() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <AccountScope /> },
      { path: '/game/:id', element: <LocationProbe /> },
    ],
    { initialEntries: ['/'] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
const amount = () => screen.getByLabelText(/Apuesta \(SUI\)/);
const submit = () => screen.getByRole('button', { name: 'Crear partida' });
function typeAmount(value: string) {
  fireEvent.change(amount(), { target: { value } });
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  kit.account.current = B;
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useWalletAccount).mockImplementation(() => ({ address: accountStore.get(), short: 'x' }));
  vi.mocked(useHouse).mockReturnValue({ house: HOUSE, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  getObject.mockResolvedValue({ object: { type: fixture.house.type, owner: fixture.house.owner, content: fromBase64(fixture.house.content) } });
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(confirmTransaction).mockResolvedValue(resultOf(CREATE_OPEN));
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: CREATE_OPEN.digest } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

/** Otra vista de crear de la misma cuenta (otra pestaña de la app no: otra vista del mismo `QueryClient`). */
const renderCreateView = () =>
  renderHook(() => useCreateGame(useTxTarget({ kind: 'create' }).view), { wrapper: queryWrapper(queryClient) });

describe('CreateGameForm with the global machine (T3-17)', () => {
  it('stays blocked by an unconfirmed create after remounting with the same QueryClient; one alert, and "Ya la revisé" unblocks', async () => {
    vi.mocked(confirmTransaction).mockRejectedValueOnce(new DOMException('timeout', 'TimeoutError'));
    const first = renderForm();
    typeAmount('1');
    fireEvent.click(submit());
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(UNCONFIRMED_TEXT);
    });
    first.unmount();

    renderForm();
    typeAmount('1');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(UNCONFIRMED_TEXT);
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé: crear otra partida' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(submit()).toBeEnabled();
    expect(signAndExecuteTransaction).toHaveBeenCalledTimes(1);
  });

  it('is blocked with the in_flight text while a cancel of the same account runs', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    const other = renderHook(() => useGameView(fixture.ids.games.open), { wrapper: queryWrapper(queryClient) });
    act(() => {
      other.result.current.cancel.cancel();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    renderForm();
    typeAmount('1');
    expect(screen.getByText(IN_FLIGHT_TEXT)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    await act(async () => {
      confirm.resolve(resultOf(fixture.executed.cancel.Transaction));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(submit()).toBeEnabled();
    });
    expect(screen.queryByText(IN_FLIGHT_TEXT)).not.toBeInTheDocument();
  });

  it('navigates to the game of an adopted create that succeeds with the created game (M-2 (b))', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    const other = renderCreateView();
    act(() => {
      other.result.current.create({ bet: 1_000_001n, opponent: null, shown: { feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n } });
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    renderForm();
    expect(screen.getByText(IN_FLIGHT_TEXT)).toBeInTheDocument();
    await act(async () => {
      confirm.resolve(resultOf(CREATE_OPEN));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/game/${fixture.ids.games.open}`);
    });
  });

  it('v1.2: after B creates, switching to A, mounting, and back to B without unmounting neither adopts nor navigates', async () => {
    const other = renderCreateView();
    act(() => {
      other.result.current.create({ bet: 1_000_001n, opponent: null, shown: { feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n } });
    });
    await waitFor(() => {
      expect(other.result.current.outcome).toMatchObject({ kind: 'success', value: { created: { gameId: fixture.ids.games.open } } });
    });
    kit.account.current = A;
    renderForm();
    expect(submit()).toBeInTheDocument();
    switchAccount(B);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(submit()).toBeInTheDocument();
    expect(screen.queryByText(IN_FLIGHT_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText('Partida creada')).not.toBeInTheDocument();
  });
});
