import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { SimulationError, type SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { fromBase64 } from '@mysten/sui/utils';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { AppConfig } from '../sui/config';
import { transactionErrorMessage } from '../sui/errors';
import {
  confirmTransaction,
  PREFLIGHT_NETWORK_MESSAGE,
  PreflightNetworkError,
  preflightTransaction,
  waitForCheckpoint,
  type NodeTransactionResult,
} from '../sui/execution';
import { buildCancelGameTx } from '../sui/transactions/game';
import { queryWrapper } from '../test/queryHarness';
import { queryKeys } from './queryKeys';
import type { TxAction } from './txInvalidation';
import { useAppConfig } from './useAppConfig';
import type { TxTarget } from './txSession';
import { CONNECT_WALLET_MESSAGE, PREPARE_FAILED_PREFIX, useExecuteTransaction, type ExecuteInput, type TxStage } from './useExecuteTransaction';
import { useTxTarget } from './useTxTarget';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));
vi.mock('../sui/errors', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../sui/errors')>();
  return { ...actual, transactionErrorMessage: vi.fn(actual.transactionErrorMessage) };
});

type FixtureEvent = { packageId: string; module: string; eventType: string; bcs: string; json: Record<string, unknown> };
type FixtureTx = {
  digest: string;
  checkpoint: string | null;
  status: SuiClientTypes.ExecutionStatus;
  effects: { bcs: string; gasUsed: SuiClientTypes.GasCostSummary };
  events: FixtureEvent[];
};
type FixtureResult = { $kind: 'Transaction'; Transaction: FixtureTx } | { $kind: 'FailedTransaction'; FailedTransaction: FixtureTx };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: Record<'open' | 'cancelled', string> };
  simulationErrors: Record<string, { message: string; executionError: SuiClientTypes.ExecutionError }>;
  executed: Record<'createOpen' | 'cancel' | 'cancelNotCreatorExecuted', FixtureResult>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const PKG = fixture.ids.originalPackageId;
const SENDER = `0x${'d'.repeat(64)}`;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: fixture.ids.packageId,
  originalPackageId: PKG,
  houseId: fixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
};

/** Resultado del nodo desde la fixture (`bcs` a bytes), con `checkpoint` opcionalmente reemplazado. */
function nodeResult(entry: FixtureResult, checkpoint?: string | null): NodeTransactionResult {
  const tx = entry.$kind === 'Transaction' ? entry.Transaction : entry.FailedTransaction;
  const converted = {
    ...tx,
    checkpoint: checkpoint === undefined ? tx.checkpoint : checkpoint,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: entry.$kind, [entry.$kind]: converted } as unknown as NodeTransactionResult;
}
const OPEN_OK = fixture.executed.createOpen;
const OPEN_DIGEST = (OPEN_OK as { Transaction: FixtureTx }).Transaction.digest;
const FAILED = fixture.executed.cancelNotCreatorExecuted;
const FAILED_DIGEST = (FAILED as { FailedTransaction: FixtureTx }).FailedTransaction.digest;

const signAndExecuteTransaction = vi.fn();
let queryClient: QueryClient;
let resetSpy: MockInstance<QueryClient['resetQueries']>;
let invalidateSpy: MockInstance<QueryClient['invalidateQueries']>;

function walletReturns(digest: string, kind: 'Transaction' | 'FailedTransaction' = 'Transaction') {
  signAndExecuteTransaction.mockResolvedValue({ $kind: kind, [kind]: { digest } });
}
function input(action: TxAction = { kind: 'create' }, overrides: Partial<ExecuteInput<string>> = {}): ExecuteInput<string> {
  return {
    action,
    build: () => buildCancelGameTx({ packageId: CONFIG.packageId, gameId: fixture.ids.games.open }),
    interpret: () => 'interpreted',
    ...overrides,
  };
}
/** Objetivo de la vista para la acción de la entrada (crear o la partida). */
const targetOf = (action: TxAction): TxTarget => (action.kind === 'create' ? { kind: 'create' } : { kind: 'game', gameId: action.gameId });
/** El hook con la vista que lo usa (T3-15 (1)): `target` es la fuente de bloqueo y del "sin confirmar". */
function render(action: TxAction = { kind: 'create' }) {
  return renderHook(
    () => {
      const target = useTxTarget(targetOf(action));
      return { ...useExecuteTransaction<string>(target.view), target };
    },
    { wrapper: queryWrapper(queryClient) },
  );
}
async function runToOutcome(i: ExecuteInput<string> = input()) {
  const hook = render(i.action);
  act(() => {
    hook.result.current.execute(i);
  });
  // Terminó: con resultado propio, o "sin confirmar" (que solo muestra la vista, M-1 (b)).
  await waitFor(() => {
    expect(hook.result.current.outcome !== null || hook.result.current.target.unconfirmed !== null).toBe(true);
  });
  return hook;
}
const resetKeys = () => resetSpy.mock.calls.map((c) => c[0]?.queryKey);
const invalidatedKeys = () => invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
const LOBBY = queryKeys.lobby('localnet', PKG);
const BALANCE = queryKeys.balance('localnet', SENDER);

beforeEach(() => {
  queryClient = new QueryClient();
  resetSpy = vi.spyOn(queryClient, 'resetQueries');
  invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({} as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: SENDER } as ReturnType<typeof useCurrentAccount>);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(OPEN_OK));
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  walletReturns(OPEN_DIGEST);
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('useExecuteTransaction: happy path', () => {
  it('goes through preflight → signing → confirming → indexing → done and succeeds with digest, cost and indexed', async () => {
    const gates: Record<string, (v?: unknown) => void> = {};
    const gate = <V,>(name: string, value: V) =>
      new Promise<V>((resolve) => {
        gates[name] = () => {
          resolve(value);
        };
      });
    vi.mocked(preflightTransaction).mockImplementation(() => gate('preflight', new Uint8Array()));
    signAndExecuteTransaction.mockImplementation(() => gate('sign', { $kind: 'Transaction', Transaction: { digest: OPEN_DIGEST } }));
    vi.mocked(confirmTransaction).mockImplementation(() => gate('confirm', nodeResult(OPEN_OK, null)));
    vi.mocked(waitForCheckpoint).mockImplementation(() => gate('index', true));

    const { result } = render();
    expect(result.current.stage).toBe<TxStage>('idle');
    act(() => {
      result.current.execute(input());
    });
    const seen: TxStage[] = [];
    for (const [name, stage] of [
      ['preflight', 'preflight'],
      ['sign', 'signing'],
      ['confirm', 'confirming'],
      ['index', 'indexing'],
    ] as const) {
      await waitFor(() => {
        expect(gates[name]).toBeDefined();
      });
      await waitFor(() => {
        expect(result.current.stage).toBe(stage);
      });
      seen.push(result.current.stage);
      expect(result.current.target.busy).toBe(true);
      await act(async () => {
        gates[name]?.();
        await Promise.resolve();
      });
    }
    await waitFor(() => {
      expect(result.current.stage).toBe('done');
    });
    expect(seen).toEqual(['preflight', 'signing', 'confirming', 'indexing']);
    expect(result.current.outcome).toEqual({ kind: 'success', digest: OPEN_DIGEST, value: 'interpreted', indexed: true, cost: 3_941_200n });
    expect(result.current.target.busy).toBe(false);
  });

  it.each([
    ['create', { kind: 'create' }, [BALANCE]],
    ['cancel', { kind: 'cancel', gameId: fixture.ids.games.open }, [queryKeys.game('localnet', fixture.ids.games.open), BALANCE]],
    ['reject', { kind: 'reject', gameId: fixture.ids.games.open }, [queryKeys.game('localnet', fixture.ids.games.open), BALANCE]],
  ] as [string, TxAction, unknown[]][])('invalidates exactly the keys of %s, none immutable', async (_name, action, invalidated) => {
    await runToOutcome(input(action));
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual(invalidated);
    const all = JSON.stringify([...resetKeys(), ...invalidatedKeys()]);
    for (const immutable of ['nodeInfo', 'txInfo', 'publishCheckpoint', 'checkpointTime', 'house']) expect(all).not.toContain(immutable);
  });

  it('builds the transaction for the wallet without constructing it', async () => {
    await runToOutcome();
    const [args] = signAndExecuteTransaction.mock.calls[0] as [{ transaction: { getData: () => { sender: string | null } } }];
    expect(args.transaction.getData().sender).toBeNull();
    expect(vi.mocked(preflightTransaction).mock.calls[0]?.[2]).toBe(SENDER);
  });
});

describe('useExecuteTransaction: double submit (M-1)', () => {
  it('runs once for two execute calls in the same tick, and runs again after finishing', async () => {
    const { result } = render();
    act(() => {
      result.current.execute(input());
      result.current.execute(input());
    });
    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('success');
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    expect(signAndExecuteTransaction).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.target.busy).toBe(false);
    });
    act(() => {
      result.current.execute(input());
    });
    await waitFor(() => {
      expect(signAndExecuteTransaction).toHaveBeenCalledTimes(2);
    });
  });

  it('releases the lock after a failure', async () => {
    vi.mocked(preflightTransaction).mockRejectedValueOnce(new Error('boom'));
    const { result } = render();
    act(() => {
      result.current.execute(input());
    });
    await waitFor(() => {
      expect(result.current.outcome?.kind).toBe('failure');
    });
    await waitFor(() => {
      expect(result.current.target.busy).toBe(false);
    });
    act(() => {
      result.current.execute(input());
    });
    await waitFor(() => {
      expect(preflightTransaction).toHaveBeenCalledTimes(2);
    });
  });
});

describe('useExecuteTransaction: before the wallet', () => {
  it('fails with "Conecta tu wallet" without any call when there is no account', async () => {
    vi.mocked(useCurrentAccount).mockReturnValue(null);
    const { result } = await runToOutcome();
    expect(result.current.outcome).toEqual({ kind: 'failure', message: CONNECT_WALLET_MESSAGE, digest: null, cost: null });
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('stops at the precheck with its text, invalidates its keys and never runs preflight or the wallet (M-2)', async () => {
    const houseKey = queryKeys.house('localnet', CONFIG.houseId);
    const precheck = vi.fn(() => Promise.resolve({ stop: 'La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar', invalidate: [houseKey] }));
    const { result } = await runToOutcome(input({ kind: 'create' }, { precheck }));
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar',
      digest: null,
      cost: null,
    });
    expect(invalidatedKeys()).toEqual([houseKey]);
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('maps a transient precheck error (UNAVAILABLE) to the network text without errors.ts (M-3 a)', async () => {
    const precheck = () => Promise.reject(new RpcError('down', 'UNAVAILABLE'));
    const { result } = await runToOutcome(input({ kind: 'create' }, { precheck }));
    expect(result.current.outcome).toMatchObject({ kind: 'failure', message: PREFLIGHT_NETWORK_MESSAGE });
    expect(transactionErrorMessage).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('maps PreflightNetworkError to the network text without errors.ts and without the wallet (M-3 a)', async () => {
    vi.mocked(preflightTransaction).mockRejectedValue(new PreflightNetworkError());
    const { result } = await runToOutcome();
    expect(result.current.outcome).toEqual({ kind: 'failure', message: PREFLIGHT_NETWORK_MESSAGE, digest: null, cost: null });
    expect(transactionErrorMessage).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('maps a real SimulationError of the fixture, applies the action invalidations and never opens the wallet', async () => {
    const sim = fixture.simulationErrors.cancelNotCreator;
    if (sim === undefined) throw new Error('fixture');
    vi.mocked(preflightTransaction).mockRejectedValue(new SimulationError(sim.message, { executionError: sim.executionError }));
    const action: TxAction = { kind: 'cancel', gameId: fixture.ids.games.open };
    const { result } = await runToOutcome(input(action));
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'Solo quien creó la partida puede cancelarla. (código game/3)',
      digest: null,
      cost: null,
    });
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('shows another preflight error as "No se pudo preparar la transacción: …" (v1.3)', async () => {
    vi.mocked(preflightTransaction).mockRejectedValue(new Error('No valid gas coins found for the transaction.'));
    const { result } = await runToOutcome();
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'No se pudo preparar la transacción: No valid gas coins found for the transaction.',
      digest: null,
      cost: null,
    });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });
});

describe('useExecuteTransaction: wallet and node', () => {
  it('fails with the wallet message when it rejects without digest', async () => {
    signAndExecuteTransaction.mockRejectedValue(new Error('User rejected the request.'));
    const { result } = await runToOutcome();
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'La wallet no completó la operación: User rejected the request.',
      digest: null,
      cost: null,
    });
    expect(confirmTransaction).not.toHaveBeenCalled();
  });

  it('confirms with the node when the wallet throws an error with a digest (M-3 b) and succeeds', async () => {
    signAndExecuteTransaction.mockRejectedValue(Object.assign(new Error('wallet crashed'), { digest: OPEN_DIGEST }));
    const { result } = await runToOutcome();
    expect(confirmTransaction).toHaveBeenCalledWith({}, { digest: OPEN_DIGEST, signal: expect.any(AbortSignal) as AbortSignal });
    expect(result.current.outcome).toMatchObject({ kind: 'success', digest: OPEN_DIGEST });
  });

  it('is unconfirmed (never failure) when the wallet throws with a digest and the node does not answer', async () => {
    signAndExecuteTransaction.mockRejectedValue(Object.assign(new Error('wallet crashed'), { digest: OPEN_DIGEST }));
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    const { result } = await runToOutcome();
    expect(result.current.target.unconfirmed?.digest).toBe(OPEN_DIGEST);
    expect(result.current.outcome).toBeNull();
  });

  it('is unconfirmed and still invalidates when the wallet returns a digest and confirmation times out', async () => {
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    const { result } = await runToOutcome(input({ kind: 'cancel', gameId: fixture.ids.games.open }));
    expect(result.current.target.unconfirmed?.digest).toBe(OPEN_DIGEST);
    expect(result.current.outcome).toBeNull();
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
  });

  it('is unconfirmed (never failure) and still invalidates when the node answer is malformed after the wallet digest', async () => {
    vi.mocked(confirmTransaction).mockResolvedValue({} as NodeTransactionResult);
    const { result } = await runToOutcome(input({ kind: 'cancel', gameId: fixture.ids.games.open }));
    expect(result.current.target.unconfirmed?.digest).toBe(OPEN_DIGEST);
    expect(result.current.outcome).toBeNull();
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
  });

  it('fails with the effects message, digest and cost when the node says failure although the wallet said success', async () => {
    walletReturns(FAILED_DIGEST, 'Transaction');
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(FAILED));
    const { result } = await runToOutcome(input({ kind: 'cancel', gameId: fixture.ids.games.open }));
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'Solo quien creó la partida puede cancelarla. (código game/3)',
      digest: FAILED_DIGEST,
      cost: 1_000_294n,
    });
    expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
  });

  it('succeeds with value null when interpret throws after the node confirmed (NIT-1), with normal invalidations', async () => {
    const interpret = () => {
      throw new Error('cannot read');
    };
    const { result } = await runToOutcome(input({ kind: 'create' }, { interpret }));
    expect(result.current.outcome).toEqual({ kind: 'success', digest: OPEN_DIGEST, value: null, indexed: true, cost: 3_941_200n });
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([BALANCE]);
  });
});

describe('useExecuteTransaction: indexing (S-1 bis)', () => {
  it('skips waitForCheckpoint when the confirmation already has a checkpoint and invalidates right away', async () => {
    const { result } = await runToOutcome();
    expect(waitForCheckpoint).not.toHaveBeenCalled();
    expect(result.current.outcome).toMatchObject({ kind: 'success', indexed: true });
    expect(resetSpy).toHaveBeenCalled();
  });

  it('waits for the checkpoint before invalidating when the confirmation has none', async () => {
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(OPEN_OK, null));
    await runToOutcome();
    const waited = vi.mocked(waitForCheckpoint).mock.invocationCallOrder[0] ?? Infinity;
    const reset = resetSpy.mock.invocationCallOrder[0] ?? -Infinity;
    expect(waitForCheckpoint).toHaveBeenCalledWith({}, { digest: OPEN_DIGEST, signal: expect.any(AbortSignal) as AbortSignal });
    expect(waited).toBeLessThan(reset);
  });

  it('succeeds with indexed false and still invalidates when the checkpoint never comes', async () => {
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(OPEN_OK, null));
    vi.mocked(waitForCheckpoint).mockResolvedValue(false);
    const { result } = await runToOutcome();
    expect(result.current.outcome).toMatchObject({ kind: 'success', indexed: false });
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([BALANCE]);
  });

  it('still invalidates when the component unmounts during confirming', async () => {
    let confirm: (r: NodeTransactionResult) => void = () => undefined;
    vi.mocked(confirmTransaction).mockImplementation(
      () =>
        new Promise((resolve) => {
          confirm = resolve;
        }),
    );
    const { result, unmount } = render({ kind: 'cancel', gameId: fixture.ids.games.open });
    act(() => {
      result.current.execute(input({ kind: 'cancel', gameId: fixture.ids.games.open }));
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    unmount();
    confirm(nodeResult(OPEN_OK));
    await waitFor(() => {
      expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
    });
    expect(resetKeys()).toEqual([LOBBY]);
  });
});

describe('useExecuteTransaction: wallet abort without digest (T3-13, NIT-2)', () => {
  const action: TxAction = { kind: 'cancel', gameId: fixture.ids.games.open };

  it('maps the SDK MoveAbort text of the wallet error and refreshes the data of the action', async () => {
    const sim = fixture.simulationErrors.cancelNotCreator;
    if (sim === undefined) throw new Error('fixture');
    signAndExecuteTransaction.mockRejectedValue(new Error(sim.message));
    const { result } = await runToOutcome(input(action));
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'Solo quien creó la partida puede cancelarla. (código game/3)',
      digest: null,
      cost: null,
    });
    expect(resetKeys()).toEqual([LOBBY]);
    expect(invalidatedKeys()).toEqual([queryKeys.game('localnet', fixture.ids.games.open), BALANCE]);
    expect(confirmTransaction).not.toHaveBeenCalled();
  });

  it('does not invalidate anything when the wallet error has no abort', async () => {
    signAndExecuteTransaction.mockRejectedValue(new Error('User rejected the request.'));
    const { result } = await runToOutcome(input(action));
    expect(result.current.outcome).toMatchObject({ kind: 'failure', message: 'La wallet no completó la operación: User rejected the request.' });
    expect(resetSpy).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useExecuteTransaction: SimulationError without abort (T3-14, DL-10)', () => {
  it('shows "No se pudo preparar la transacción: …" for the real gas selection rejection (S-6 bis) and never opens the wallet', async () => {
    const message = `Unable to perform gas selection due to insufficient SUI balance (in address balance or coins) for account ${normalizeSuiAddress('0x5ca1ab1f')} to satisfy required budget 3474748.`;
    vi.mocked(preflightTransaction).mockRejectedValue(new SimulationError(message, { cause: new RpcError(message, 'INVALID_ARGUMENT') }));
    const { result } = await runToOutcome();
    expect(result.current.outcome).toEqual({ kind: 'failure', message: `${PREPARE_FAILED_PREFIX}: ${message}`, digest: null, cost: null });
    expect(PREPARE_FAILED_PREFIX).toBe('No se pudo preparar la transacción');
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('keeps "La red no ejecutó…" for a SimulationError with an executionError and no abort', async () => {
    const executionError = { $kind: 'Unknown', message: 'InsufficientCoinBalance in command 0', command: 0, Unknown: null } as SuiClientTypes.ExecutionError;
    vi.mocked(preflightTransaction).mockRejectedValue(
      new SimulationError('Transaction resolution failed: InsufficientCoinBalance in command 0', { executionError }),
    );
    const { result } = await runToOutcome();
    expect(result.current.outcome).toMatchObject({ kind: 'failure', message: 'La red no ejecutó la transacción: InsufficientCoinBalance in command 0' });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });
});
