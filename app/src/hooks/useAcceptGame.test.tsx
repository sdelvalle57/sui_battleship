import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { bcs } from '@mysten/sui/bcs';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import { createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { queryKeys } from './queryKeys';
import { useAcceptGame } from './useAcceptGame';
import { useAppConfig } from './useAppConfig';
import { useTxTarget } from './useTxTarget';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureEvent = { eventType: string; bcs: string; json: Record<string, string> };
type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: FixtureEvent[] };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: { acceptAcceptorWins: string } };
  executed: { acceptAcceptorWins: { $kind: 'Transaction'; Transaction: FixtureTx } };
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const ACCEPT = fixture.executed.acceptAcceptorWins.Transaction;
const RESOLVED = ACCEPT.events[0]?.json ?? {};
/** El aceptante real de la fixture: así `parseResolvedGame` reconoce el evento como de esta cuenta. */
const ACCEPTOR = String(RESOLVED.acceptor);
const GAME_ID = fixture.ids.games.acceptAcceptorWins;
const BET = 1_000_001n;
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
let resetSpy: MockInstance<QueryClient['resetQueries']>;
let invalidateSpy: MockInstance<QueryClient['invalidateQueries']>;

/** La vista del detalle con su acción de aceptar, sobre el mismo `QueryClient` real. */
const renderAccept = () =>
  renderHook(
    () => {
      const target = useTxTarget({ kind: 'game', gameId: GAME_ID });
      return { target, accept: useAcceptGame(target.view, { bet: BET }) };
    },
    { wrapper: queryWrapper(queryClient) },
  );

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  resetSpy = vi.spyOn(queryClient, 'resetQueries');
  invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({} as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: ACCEPTOR } as ReturnType<typeof useCurrentAccount>);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT));
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: ACCEPT.digest } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

async function acceptToOutcome() {
  const hook = renderAccept();
  act(() => {
    hook.result.current.accept.accept();
  });
  await waitFor(() => {
    expect(hook.result.current.accept.outcome).not.toBeNull();
  });
  return hook;
}

describe('useAcceptGame (T4-1)', () => {
  it('builds accept_game with the bet of the game, the House of the config and the game of the view', async () => {
    await acceptToOutcome();
    const built = vi.mocked(preflightTransaction).mock.calls[0]?.[1] as Transaction;
    const data = built.getData();
    expect(data.commands.at(-1)).toMatchObject({ MoveCall: { package: CONFIG.packageId, module: 'game', function: 'accept_game' } });
    const amount = data.inputs[0];
    expect(amount?.$kind).toBe('Pure');
    expect(bcs.u64().parse(fromBase64(amount?.Pure?.bytes ?? ''))).toBe(BET.toString());
    expect(data.inputs[1]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: GAME_ID } });
    expect(data.inputs[2]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: CONFIG.houseId } });
  });

  it('returns the real GameResolved of the fixture as the value', async () => {
    const { result } = await acceptToOutcome();
    expect(result.current.accept.outcome).toEqual({
      kind: 'success',
      digest: ACCEPT.digest,
      indexed: true,
      cost: expect.any(BigInt) as bigint,
      value: {
        gameId: GAME_ID,
        creator: RESOLVED.creator,
        acceptor: ACCEPTOR,
        winner: RESOLVED.winner,
        pot: 2_000_002n,
        fee: 50_000n,
        payout: 1_950_002n,
        transactionDigest: ACCEPT.digest,
      },
    });
  });

  it('succeeds with value null when the confirmation has no GameResolved', async () => {
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf({ ...ACCEPT, events: [] }));
    const { result } = await acceptToOutcome();
    expect(result.current.accept.outcome).toMatchObject({ kind: 'success', value: null });
  });

  it('resets the lobby and invalidates exactly the game, the balance and the House, none immutable', async () => {
    await acceptToOutcome();
    expect(resetSpy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([queryKeys.lobby('localnet', CONFIG.originalPackageId)]);
    expect(invalidateSpy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', GAME_ID),
      queryKeys.balance('localnet', ACCEPTOR),
      queryKeys.house('localnet', CONFIG.houseId),
    ]);
    const all = JSON.stringify([...resetSpy.mock.calls, ...invalidateSpy.mock.calls].map((c) => c[0]?.queryKey));
    for (const key of ['txInfo', 'publishCheckpoint', 'checkpointTime', 'nodeInfo']) expect(all).not.toContain(key);
  });

  it('v1.4: an own acceptance in flight is busy and not foreign (notice null), and its outcome is read by runId', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    const { result } = renderAccept();
    act(() => {
      result.current.accept.accept();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    expect(result.current.target.busy).toBe(true);
    expect(result.current.target.notice).toBeNull();
    await act(async () => {
      confirm.resolve(resultOf(ACCEPT));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.accept.outcome).toMatchObject({ kind: 'success', value: { gameId: GAME_ID } });
    });
    expect(result.current.target.busy).toBe(false);
    expect(result.current.target.notice).toBeNull();
  });
});
