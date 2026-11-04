import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { bcs } from '@mysten/sui/bcs';
import { ObjectError, SimulationError, type SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { AppConfig } from '../sui/config';
import { ABORT_MESSAGES } from '../sui/errors';
import {
  confirmTransaction,
  isPreflightNetworkCause,
  PREFLIGHT_NETWORK_MESSAGE,
  preflightTransaction,
  waitForCheckpoint,
  type NodeTransactionResult,
} from '../sui/execution';
import { HOUSE_CAP_LOST_MESSAGE } from '../sui/houseCap';
import { queryWrapper } from '../test/queryHarness';
import { deferred, useHouseView } from '../test/txHarness';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { PREPARE_FAILED_PREFIX } from './useExecuteTransaction';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureObject = { objectId: string; version: string; digest: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type FixtureEvent = { eventType: string; bcs: string };
type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: FixtureEvent[] };
type FixtureSimulation = { message: string; executionError?: SuiClientTypes.ExecutionError };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; houseCapId: string };
  houseCapObject: FixtureObject;
  simulationErrors: Record<'feeTooHigh' | 'limitsZeroMin' | 'withdrawNoFees' | 'nonOwnerPreflight', FixtureSimulation>;
  executed: Record<'updateFeeRate' | 'updateBetLimits' | 'withdrawFees', { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/house-admin.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/house-admin.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
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
const PKG = CONFIG.originalPackageId;
const CAP_ID = fixture.ids.houseCapId;
/** La cuenta del clic es la dueña real del cap (`ADMIN` de la fixture). */
const SENDER = normalizeSuiAddress((fixture.houseCapObject.owner as { AddressOwner: string }).AddressOwner);
const OTHER = `0x${'e'.repeat(64)}`;

const HOUSE_KEY = queryKeys.house('localnet', CONFIG.houseId);
const HOUSE_CAP_KEY = queryKeys.houseCap('localnet', PKG, SENDER);
const BALANCE_KEY = queryKeys.balance('localnet', SENDER);

type ActionName = 'fee' | 'limits' | 'withdraw';
const ACTIONS: ActionName[] = ['fee', 'limits', 'withdraw'];
/** Invalidaciones de H-5 con cuenta, por acción. */
const H5: Record<ActionName, unknown[]> = {
  fee: [HOUSE_KEY, HOUSE_CAP_KEY],
  limits: [HOUSE_KEY, HOUSE_CAP_KEY],
  withdraw: [HOUSE_KEY, BALANCE_KEY, HOUSE_CAP_KEY],
};
const EXECUTED: Record<ActionName, keyof Fixture['executed']> = { fee: 'updateFeeRate', limits: 'updateBetLimits', withdraw: 'withdrawFees' };

function nodeResult(name: keyof Fixture['executed'], events?: FixtureEvent[]): NodeTransactionResult {
  const tx = fixture.executed[name].Transaction;
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: (events ?? tx.events).map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}
/** El `getObject` del cap (sin `content`) como lo lee el `precheck`, con cambios opcionales. */
const capRead = (overrides: Record<string, unknown> = {}) =>
  Promise.resolve({ object: { ...fixture.houseCapObject, content: undefined, ...overrides } });
const simulationError = (name: keyof Fixture['simulationErrors']) => {
  const sim = fixture.simulationErrors[name];
  return new SimulationError(sim.message, { executionError: sim.executionError });
};

const getObject = vi.fn();
const listOwnedObjects = vi.fn(() => {
  throw new Error('el precheck no debe usar listOwnedObjects (H-3)');
});
const signAndExecuteTransaction = vi.fn();
let queryClient: QueryClient;
let invalidateSpy: MockInstance<QueryClient['invalidateQueries']>;
let resetSpy: MockInstance<QueryClient['resetQueries']>;
const invalidatedKeys = () => invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);

const renderPanel = () => renderHook(() => useHouseView(), { wrapper: queryWrapper(queryClient) });
type Panel = ReturnType<typeof renderPanel>['result'];
/** Dispara la acción con datos válidos y el cap de la fixture. */
function trigger(result: Panel, name: ActionName) {
  act(() => {
    const { fee, limits, withdraw } = result.current;
    if (name === 'fee') fee.update({ capId: CAP_ID, feeRate: 260 });
    else if (name === 'limits') limits.update({ capId: CAP_ID, minBet: 3_000_000n, maxBet: 20_000_000_000n });
    else withdraw.withdraw({ capId: CAP_ID });
  });
}
async function runAction(name: ActionName) {
  const hook = renderPanel();
  trigger(hook.result, name);
  await waitFor(() => {
    expect(hook.result.current[name].outcome).not.toBeNull();
  });
  return hook;
}

beforeEach(() => {
  queryClient = new QueryClient();
  invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  resetSpy = vi.spyOn(queryClient, 'resetQueries');
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getObject, listOwnedObjects } as unknown as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: SENDER } as ReturnType<typeof useCurrentAccount>);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  getObject.mockImplementation(() => capRead());
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('HouseCap precheck of the three actions (H-3)', () => {
  it.each(ACTIONS)('T4-6: %s stops with the lost-cap text when getObject shows another owner, without preflight or wallet', async (name) => {
    getObject.mockImplementation(() => capRead({ owner: { $kind: 'AddressOwner', AddressOwner: OTHER } }));
    const { result } = await runAction(name);
    expect(result.current[name].outcome).toEqual({ kind: 'failure', message: HOUSE_CAP_LOST_MESSAGE, digest: null, cost: null });
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([HOUSE_CAP_KEY]);
    expect(getObject.mock.calls[0]?.[0]).toMatchObject({ objectId: CAP_ID, include: { content: false } });
  });

  it.each<[string, () => Promise<unknown>]>([
    ['a null owner', () => capRead({ owner: null })],
    ['another type', () => capRead({ type: `0x${'e'.repeat(64)}::house::HouseCap` })],
    ['an ObjectError notFound', () => Promise.reject(new ObjectError('notExists', 'x', { reason: 'notFound' }))],
    ['an ObjectError deleted', () => Promise.reject(new ObjectError('deleted', 'x', { reason: 'deleted' }))],
  ])('T4-7: %s gives the same lost-cap stop', async (_name, read) => {
    getObject.mockImplementation(read);
    const { result } = await runAction('withdraw');
    expect(result.current.withdraw.outcome).toMatchObject({ kind: 'failure', message: HOUSE_CAP_LOST_MESSAGE });
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([HOUSE_CAP_KEY]);
  });

  it.each(ACTIONS)('T4-8: %s never uses listOwnedObjects in its precheck', async (name) => {
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(EXECUTED[name]));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: fixture.executed[EXECUTED[name]].Transaction.digest } });
    const { result } = await runAction(name);
    expect(result.current[name].outcome?.kind).toBe('success');
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(listOwnedObjects).not.toHaveBeenCalled();
  });

  it('T4-9: an ObjectError unknown is "No se pudo preparar la transacción: …", not the lost-cap text', async () => {
    getObject.mockImplementation(() => Promise.reject(new ObjectError('INTERNAL', 'fallo del nodo', { reason: 'unknown' })));
    const { result } = await runAction('fee');
    expect(result.current.fee.outcome).toEqual({ kind: 'failure', message: `${PREPARE_FAILED_PREFIX}: fallo del nodo`, digest: null, cost: null });
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([]);
  });

  it('T4-9: an RpcError UNAVAILABLE is the network text, not the lost-cap text', async () => {
    getObject.mockImplementation(() => Promise.reject(new RpcError('down', 'UNAVAILABLE')));
    const { result } = await runAction('limits');
    expect(result.current.limits.outcome).toEqual({ kind: 'failure', message: PREFLIGHT_NETWORK_MESSAGE, digest: null, cost: null });
    expect(result.current.limits.outcome).not.toMatchObject({ message: HOUSE_CAP_LOST_MESSAGE });
    expect(preflightTransaction).not.toHaveBeenCalled();
  });
});

describe('preflight, node and results of the House actions', () => {
  it.each<[ActionName, keyof Fixture['simulationErrors'], number]>([
    ['fee', 'feeTooHigh', 0],
    ['limits', 'limitsZeroMin', 1],
    ['withdraw', 'withdrawNoFees', 2],
  ])('T4-10: %s maps the real abort %s of the preflight (house/%i), applies H-5 and never opens the wallet', async (name, sim, code) => {
    vi.mocked(preflightTransaction).mockRejectedValue(simulationError(sim));
    const { result } = await runAction(name);
    expect(result.current[name].outcome).toEqual({
      kind: 'failure',
      message: `${ABORT_MESSAGES.house[code] ?? ''} (código house/${String(code)})`,
      digest: null,
      cost: null,
    });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual(H5[name]);
  });

  it.each<[ActionName, unknown]>([
    ['fee', { houseId: CONFIG.houseId, oldFeeRate: 0, newFeeRate: 250 }],
    ['limits', { houseId: CONFIG.houseId, oldMinBet: 1_000_000n, oldMaxBet: 50_000_000_000n, newMinBet: 2_000_000n, newMaxBet: 10_000_000_000n }],
    ['withdraw', 10_000_000n],
  ])('T4-11: %s succeeds with the value read from the real event and invalidates H-5 in order before done', async (name, value) => {
    const tx = fixture.executed[EXECUTED[name]].Transaction;
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(EXECUTED[name]));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    const hook = renderPanel();
    const stagesAtInvalidation: string[] = [];
    invalidateSpy.mockImplementation(() => {
      stagesAtInvalidation.push(hook.result.current[name].stage);
      return Promise.resolve();
    });
    trigger(hook.result, name);
    await waitFor(() => {
      expect(hook.result.current[name].outcome).not.toBeNull();
    });
    expect(hook.result.current[name].outcome).toEqual({ kind: 'success', digest: tx.digest, value, indexed: true, cost: expect.any(BigInt) as bigint });
    expect(invalidatedKeys()).toEqual(H5[name]);
    expect(stagesAtInvalidation).toHaveLength(H5[name].length);
    expect(stagesAtInvalidation).not.toContain('done');
    expect(hook.result.current[name].stage).toBe('done');
  });

  it.each(ACTIONS)('T4-14: %s succeeds with value null when the node result has no readable event', async (name) => {
    const tx = fixture.executed[EXECUTED[name]].Transaction;
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult(EXECUTED[name], []));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    const { result } = await runAction(name);
    expect(result.current[name].outcome).toMatchObject({ kind: 'success', digest: tx.digest, value: null });
  });

  it('T4-12: an unconfirmed House action blocks the House target, and the other two actions run nothing', async () => {
    const tx = fixture.executed.updateFeeRate.Transaction;
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    const { result } = renderPanel();
    trigger(result, 'fee');
    await waitFor(() => {
      expect(result.current.target.unconfirmed).toEqual({ digest: tx.digest });
    });
    expect(result.current.fee.outcome).toBeNull();
    trigger(result, 'limits');
    trigger(result, 'withdraw');
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    expect(signAndExecuteTransaction).toHaveBeenCalledTimes(1);
    expect(result.current.limits.outcome).toBeNull();
    expect(result.current.withdraw.outcome).toBeNull();
  });
});

describe('withdraw recipient (T4-13, MINOR-6 of the plan, N-2)', () => {
  /** Dirección del `TransferObjects` de una transacción: el input puro al que apunta. */
  function recipientOf(tx: Transaction): string {
    const data = tx.getData();
    const transfer = data.commands.find((c) => c.$kind === 'TransferObjects');
    const address = transfer?.TransferObjects.address;
    const input = address?.$kind === 'Input' ? data.inputs[address.Input] : undefined;
    if (input?.$kind !== 'Pure') throw new Error('el TransferObjects no apunta a un input puro');
    return bcs.Address.parse(fromBase64(input.Pure.bytes));
  }
  const walletTx = () => (signAndExecuteTransaction.mock.calls[0]?.[0] as { transaction: Transaction }).transaction;

  it('sends the coin to the click account in the preflight and in the wallet transaction', async () => {
    const tx = fixture.executed.withdrawFees.Transaction;
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult('withdrawFees'));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    await runAction('withdraw');
    expect(recipientOf(vi.mocked(preflightTransaction).mock.calls[0]?.[1] as Transaction)).toBe(SENDER);
    expect(recipientOf(walletTx())).toBe(SENDER);
    expect(walletTx().getData().commands).toHaveLength(2);
  });

  it('keeps the click account as recipient when the connected account changes before the signature', async () => {
    const tx = fixture.executed.withdrawFees.Transaction;
    const preflight = deferred<Uint8Array>();
    vi.mocked(preflightTransaction).mockReturnValueOnce(preflight.promise);
    vi.mocked(confirmTransaction).mockResolvedValue(nodeResult('withdrawFees'));
    signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: tx.digest } });
    const hook = renderPanel();
    trigger(hook.result, 'withdraw');
    await waitFor(() => {
      expect(preflightTransaction).toHaveBeenCalled();
    });
    vi.mocked(useCurrentAccount).mockReturnValue({ address: OTHER } as ReturnType<typeof useCurrentAccount>);
    hook.rerender();
    await act(async () => {
      preflight.resolve(new Uint8Array());
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
    });
    expect(recipientOf(walletTx())).toBe(SENDER);
    expect(getObject).toHaveBeenCalledTimes(1);
    expect(invalidatedKeys()).toEqual(H5.withdraw);
  });
});

describe('preflight of an account without the cap after an owned precheck (T4-15, V-11)', () => {
  it('shows "No se pudo preparar la transacción: <node text>" without wallet or invalidation, and the next try stops at the precheck', async () => {
    const sim = fixture.simulationErrors.nonOwnerPreflight;
    expect(sim.executionError).toBeUndefined();
    const cause = new RpcError(sim.message, 'INVALID_ARGUMENT');
    // La preflight real relanza este error tal cual: INVALID_ARGUMENT no es un corte de red (DL-10).
    expect(isPreflightNetworkCause(cause)).toBe(false);
    vi.mocked(preflightTransaction).mockRejectedValueOnce(new SimulationError(sim.message, { cause }));
    const { result } = await runAction('fee');
    expect(result.current.fee.outcome).toEqual({ kind: 'failure', message: `${PREPARE_FAILED_PREFIX}: ${sim.message}`, digest: null, cost: null });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(confirmTransaction).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([]);

    getObject.mockImplementation(() => capRead({ owner: { $kind: 'AddressOwner', AddressOwner: OTHER } }));
    trigger(result, 'fee');
    await waitFor(() => {
      expect(result.current.fee.outcome).toMatchObject({ message: HOUSE_CAP_LOST_MESSAGE });
    });
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
    expect(invalidatedKeys()).toEqual([HOUSE_CAP_KEY]);
  });
});
