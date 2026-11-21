import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { duelSourceOf } from '../hooks/gameRow';
import { useAppConfig } from '../hooks/useAppConfig';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import { buildGameRegistry, type TypeOrigin } from '../sui/gameRegistry';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, GAME_ID, activeState, duelRow } from '../test/duelRows';
import { createPolicyQueryClient } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { GameActions } from './GameActions';

// UX-9 (#73, TASK-8b): las acciones de tiempo con la máquina real (`useTxTarget` + `useClaimTimeout`); kit y `sui/execution`
// mockeados. El candado y el "sin confirmar" son los de siempre: el botón dice por qué no está disponible.
const kit = vi.hoisted(() => ({ address: '', signAndExecuteTransaction: vi.fn(), getObject: vi.fn() }));
vi.mock('@mysten/dapp-kit-react', () => ({
  useCurrentAccount: () => ({ address: kit.address }),
  useCurrentClient: () => ({ getObject: kit.getObject }),
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

type ReadsFixture = { ids: { originalPackageId: string; upgrades: { version: number; packageId: string; txDigest: string }[] }; typeOrigins: TypeOrigin[] };
type TxFixture = { ids: { houseId: string }; house: { type: string; owner: unknown; content: string } };
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;
const txFixture = import.meta.glob<TxFixture>('../../../contracts/fixtures/duel-tx.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-tx.localnet.json'
] as TxFixture;

const CURRENT = `0x${'3'.repeat(64)}`;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: CURRENT,
  originalPackageId: reads.ids.originalPackageId,
  houseId: txFixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
  upgrades: [...reads.ids.upgrades, { version: 3, packageId: CURRENT, txDigest: '22222222222222222222222222222222' }],
  typeOrigins: reads.typeOrigins,
};
const GAME_TAG = duelSourceOf(buildGameRegistry(CONFIG), 'coinflip').gameTag;
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 5_000);

let queryClient: QueryClient;
const claimButton = () => screen.getByRole('button', { name: 'Reclamar victoria' });

function mount() {
  const fake = createFakeScreenClock();
  fake.sample(CHAIN_NOW);
  render(
    <QueryClientProvider client={queryClient}>{withScreenClock(fake.clock, <GameActions game={duelRow(activeState(1, DEADLINE))} />)}</QueryClientProvider>,
  );
  act(() => {
    fake.advance(5_000);
  });
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useWalletAccount).mockReturnValue({ address: ACCEPTOR, short: 'x' });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  kit.address = ACCEPTOR;
  kit.getObject.mockResolvedValue({ object: { type: txFixture.house.type, owner: txFixture.house.owner, content: new Uint8Array() } });
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: DIGEST } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('time actions with the global machine (UX-9)', () => {
  it('builds the claim from the registry (current packageId, the type argument of the game, the House) and sends it through the preflight', async () => {
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    mount();
    fireEvent.click(claimButton());
    await waitFor(() => {
      expect(preflightTransaction).toHaveBeenCalledTimes(1);
    });
    const built = vi.mocked(preflightTransaction).mock.calls[0]?.[1];
    if (built === undefined) throw new Error('la preflight debe recibir la transacción armada');
    expect(built.getData().commands[0]).toMatchObject({ MoveCall: { package: CURRENT, module: 'duel', function: 'claim_timeout', typeArguments: [GAME_TAG] } });
    const objectIds = built.getData().inputs.flatMap((input) => (input.UnresolvedObject === undefined ? [] : [input.UnresolvedObject.objectId]));
    expect(objectIds).toEqual([GAME_ID, CONFIG.houseId]);
  });

  it('UX-7 (action in progress) and UX-9: while the claim is in flight the button says another transaction is in progress, and the lock is the usual one', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValue(confirm.promise);
    mount();
    fireEvent.click(claimButton());
    await waitFor(() => {
      expect(claimButton()).toBeDisabled();
    });
    expect(document.querySelector('.duel-reason')).toHaveTextContent('Hay otra transacción en curso: espera a que termine');
    expect(screen.getByRole('status')).toHaveTextContent('Confirmando en la red…');
  });

  it('UX-7 (unconfirmed) and UX-9: an unconfirmed claim shows one alert and one "Ya la revisé"; the button says why it is blocked and unlocks with it', async () => {
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    mount();
    fireEvent.click(claimButton());
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    });
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Ya la revisé' })).toHaveLength(1);
    expect(claimButton()).toBeDisabled();
    expect(document.querySelector('.duel-reason')).toHaveTextContent('La transacción anterior quedó sin confirmar: revísala antes de volver a intentar');
    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé' }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(claimButton()).toBeEnabled();
    expect(document.querySelector('.duel-reason')).toBeNull();
  });
});
