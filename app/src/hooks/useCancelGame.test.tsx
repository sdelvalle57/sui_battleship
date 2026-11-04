import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, type NodeTransactionResult } from '../sui/execution';
import { queryWrapper } from '../test/queryHarness';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useCancelGame } from './useCancelGame';
import { useRejectGame } from './useRejectGame';
import { useTxTarget } from './useTxTarget';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: { eventType: string; bcs: string }[] };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: Record<'cancelled' | 'rejected', string> };
  executed: Record<'cancel' | 'reject', { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const SENDER = `0x${'d'.repeat(64)}`;
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

function resultOf(tx: FixtureTx): NodeTransactionResult {
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}

const signAndExecuteTransaction = vi.fn();
let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({} as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: SENDER } as ReturnType<typeof useCurrentAccount>);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe.each([
  ['useCancelGame', 'cancel', 'cancel_game', 'cancelled', 3_000_003n],
  ['useRejectGame', 'reject', 'reject_game', 'rejected', 4_000_004n],
] as const)('%s', (_name, kind, fn, game, refund) => {
  it(`calls ${fn} on the game, returns the refund of the real GameCancelled and invalidates the game`, async () => {
    const tx = fixture.executed[kind].Transaction;
    const gameId = fixture.ids.games[game];
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(tx));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    // T3-15 (1): la partida sale de la vista, no del argumento de la acción.
    const { result } = renderHook(
      () => {
        const { view } = useTxTarget({ kind: 'game', gameId });
        const cancel = useCancelGame(view);
        const reject = useRejectGame(view);
        return kind === 'cancel' ? cancel : reject;
      },
      { wrapper: queryWrapper(queryClient) },
    );
    act(() => {
      const current = result.current;
      if ('cancel' in current) current.cancel();
      else current.reject();
    });
    await waitFor(() => {
      expect(result.current.outcome).not.toBeNull();
    });
    const built = vi.mocked(preflightTransaction).mock.calls[0]?.[1] as Transaction;
    expect(built.getData().commands[0]).toMatchObject({ MoveCall: { package: CONFIG.packageId, module: 'game', function: fn } });
    expect(built.getData().inputs[0]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: gameId } });
    expect(result.current.outcome).toEqual({ kind: 'success', digest: tx.digest, value: refund, indexed: true, cost: expect.any(BigInt) as bigint });
    expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', gameId),
      queryKeys.balance('localnet', SENDER),
    ]);
  });
});
