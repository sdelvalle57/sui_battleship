import { SimulationError, TransactionError, type ClientWithCoreApi, type SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifyExecution,
  confirmTransaction,
  digestFromError,
  networkCost,
  PREFLIGHT_NETWORK_MESSAGE,
  PreflightNetworkError,
  preflightTransaction,
  TX_CONFIRM_TIMEOUT_MS,
  TX_INDEX_TIMEOUT_MS,
  TX_PREFLIGHT_TIMEOUT_MS,
  waitForCheckpoint,
} from './execution';
import { ReadTimeoutError } from './readErrors';
import { buildCancelGameTx } from './transactions/game';

type FixtureTx = { digest: string; status: SuiClientTypes.ExecutionStatus; effects: { gasUsed: SuiClientTypes.GasCostSummary } };
type Fixture = {
  executed: {
    createOpen: { $kind: 'Transaction'; Transaction: FixtureTx };
    cancelNotCreatorExecuted: { $kind: 'FailedTransaction'; FailedTransaction: FixtureTx };
  };
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const PKG = `0x${'a'.repeat(64)}`;
const GAME = `0x${'c'.repeat(64)}`;
const SENDER = `0x${'d'.repeat(64)}`;
const DIGEST = fixture.executed.createOpen.Transaction.digest;
const CLIENT = {} as ClientWithCoreApi;

const newTx = () => buildCancelGameTx({ packageId: PKG, gameId: GAME });

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('preflightTransaction', () => {
  it('builds a copy with the sender and leaves the original transaction without sender', async () => {
    let builtSender: string | null | undefined;
    const build = vi.spyOn(Transaction.prototype, 'build').mockImplementation(function (this: Transaction) {
      builtSender = this.getData().sender;
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    });
    const tx = newTx();
    await expect(preflightTransaction(CLIENT, tx, SENDER)).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(build).toHaveBeenCalledWith({ client: CLIENT });
    expect(builtSender).toBe(SENDER);
    expect(tx.getData().sender).toBeNull();
  });

  it('rethrows a SimulationError as is', async () => {
    const error = new SimulationError('Transaction resolution failed: MoveAbort …');
    vi.spyOn(Transaction.prototype, 'build').mockRejectedValue(error);
    await expect(preflightTransaction(CLIENT, newTx(), SENDER)).rejects.toBe(error);
  });

  it('turns a transient RpcError (UNAVAILABLE) into PreflightNetworkError with its text', async () => {
    const cause = new RpcError('Failed to fetch', 'UNAVAILABLE');
    vi.spyOn(Transaction.prototype, 'build').mockRejectedValue(cause);
    const error = await preflightTransaction(CLIENT, newTx(), SENDER).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PreflightNetworkError);
    expect(error).toMatchObject({ message: PREFLIGHT_NETWORK_MESSAGE, cause });
    expect(PREFLIGHT_NETWORK_MESSAGE).toBe('No se pudo verificar la transacción (red); intenta de nuevo');
  });

  it('turns the 20 s cutoff into PreflightNetworkError', async () => {
    vi.useFakeTimers();
    vi.spyOn(Transaction.prototype, 'build').mockReturnValue(new Promise<never>(() => undefined));
    const result = preflightTransaction(CLIENT, newTx(), SENDER).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(TX_PREFLIGHT_TIMEOUT_MS - 1);
    let settled = false;
    void result.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const error = await result;
    expect(TX_PREFLIGHT_TIMEOUT_MS).toBe(20_000);
    expect(error).toBeInstanceOf(PreflightNetworkError);
    expect((error as PreflightNetworkError).cause).toBeInstanceOf(ReadTimeoutError);
  });

  it('rethrows a non-transient error as is', async () => {
    const error = new Error('No valid gas coins found for the transaction.');
    vi.spyOn(Transaction.prototype, 'build').mockRejectedValue(error);
    await expect(preflightTransaction(CLIENT, newTx(), SENDER)).rejects.toBe(error);
  });

  it('stops with the reason of the caller signal, without classifying it', async () => {
    vi.spyOn(Transaction.prototype, 'build').mockReturnValue(new Promise<never>(() => undefined));
    const controller = new AbortController();
    const result = preflightTransaction(CLIENT, newTx(), SENDER, controller.signal);
    const reason = new Error('unmounted');
    controller.abort(reason);
    await expect(result).rejects.toBe(reason);
  });
});

describe('confirmTransaction', () => {
  it('returns the node read with effects and events, with the 30 s cutoff', async () => {
    const nodeResult = { $kind: 'Transaction', Transaction: { digest: DIGEST } };
    const waitForTransaction = vi.fn(() => Promise.resolve(nodeResult));
    const client = { waitForTransaction } as unknown as Pick<SuiGrpcClient, 'waitForTransaction'>;
    const signal = new AbortController().signal;
    await expect(confirmTransaction(client, { digest: DIGEST, signal })).resolves.toBe(nodeResult);
    expect(waitForTransaction).toHaveBeenCalledWith({
      digest: DIGEST,
      include: { effects: true, events: true },
      timeout: TX_CONFIRM_TIMEOUT_MS,
      signal,
    });
    expect(TX_CONFIRM_TIMEOUT_MS).toBe(30_000);
  });

  it('propagates the cutoff error', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError');
    const client = { waitForTransaction: vi.fn(() => Promise.reject(timeout)) } as unknown as Pick<SuiGrpcClient, 'waitForTransaction'>;
    await expect(confirmTransaction(client, { digest: DIGEST })).rejects.toBe(timeout);
  });
});

describe('waitForCheckpoint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const read = (checkpoint: string | null) => Promise.resolve({ $kind: 'Transaction', Transaction: { digest: DIGEST, checkpoint } });
  const notFound = () => Promise.reject(new TransactionError('notFound', DIGEST));
  function clientWith(...attempts: (() => Promise<unknown>)[]) {
    const getTransaction = vi.fn(() => (attempts.shift() ?? notFound)());
    return { client: { getTransaction } as unknown as Pick<SuiGrpcClient, 'getTransaction'>, getTransaction };
  }

  it('returns true on the second attempt, 500 ms later', async () => {
    const { client, getTransaction } = clientWith(
      () => read(null),
      () => read('654'),
    );
    const result = waitForCheckpoint(client, { digest: DIGEST });
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe(true);
    expect(getTransaction).toHaveBeenCalledTimes(2);
    expect(getTransaction).toHaveBeenCalledWith({ digest: DIGEST, signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('returns true after an attempt that fails', async () => {
    const { client } = clientWith(
      () => Promise.reject(new RpcError('down', 'UNAVAILABLE')),
      () => read('654'),
    );
    const result = waitForCheckpoint(client, { digest: DIGEST });
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe(true);
  });

  it('treats "not found" as a failed attempt until the transaction is indexed (S-1 bis)', async () => {
    const { client, getTransaction } = clientWith(notFound, notFound, notFound, () => read('1214'));
    const result = waitForCheckpoint(client, { digest: DIGEST });
    await vi.advanceTimersByTimeAsync(1_500);
    await expect(result).resolves.toBe(true);
    expect(getTransaction).toHaveBeenCalledTimes(4);
  });

  it('returns false when the transaction never shows a checkpoint before the cutoff', async () => {
    const { client } = clientWith(...Array.from({ length: 200 }, () => () => read(null)));
    const result = waitForCheckpoint(client, { digest: DIGEST });
    await vi.advanceTimersByTimeAsync(TX_INDEX_TIMEOUT_MS);
    await expect(result).resolves.toBe(false);
    expect(TX_INDEX_TIMEOUT_MS).toBe(30_000);
  });

  it('returns false when it is always "not found" until TX_INDEX_TIMEOUT_MS', async () => {
    const { client, getTransaction } = clientWith();
    const result = waitForCheckpoint(client, { digest: DIGEST });
    let settled = false;
    void result.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(TX_INDEX_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe(false);
    expect(getTransaction.mock.calls.length).toBeGreaterThan(50);
  });

  it('stops with the caller signal', async () => {
    const { client } = clientWith();
    const controller = new AbortController();
    const result = waitForCheckpoint(client, { digest: DIGEST, signal: controller.signal });
    const outcome = result.catch((e: unknown) => e);
    const reason = new Error('unmounted');
    controller.abort(reason);
    await vi.advanceTimersByTimeAsync(500);
    await expect(outcome).resolves.toBe(reason);
  });
});

describe('classifyExecution', () => {
  it('is a success for the real createOpen read', () => {
    expect(classifyExecution(fixture.executed.createOpen as unknown as SuiClientTypes.TransactionResult)).toEqual({ kind: 'success' });
  });

  it('is a failure with the node error for the real executed abort', () => {
    const result = fixture.executed.cancelNotCreatorExecuted as unknown as SuiClientTypes.TransactionResult;
    expect(classifyExecution(result)).toEqual({
      kind: 'failure',
      error: fixture.executed.cancelNotCreatorExecuted.FailedTransaction.status.error,
    });
  });
});

describe('digestFromError', () => {
  it('finds a valid digest on the error or in its cause', () => {
    expect(digestFromError(Object.assign(new Error('wallet'), { digest: DIGEST }))).toBe(DIGEST);
    expect(digestFromError(new Error('outer', { cause: new Error('inner', { cause: { digest: DIGEST } }) }))).toBe(DIGEST);
  });

  it('returns null for an invalid digest or without digest', () => {
    expect(digestFromError(Object.assign(new Error('wallet'), { digest: 'not-a-digest' }))).toBeNull();
    expect(digestFromError(new Error('User rejected the request.'))).toBeNull();
    expect(digestFromError(undefined)).toBeNull();
  });
});

describe('networkCost', () => {
  it('is computation + storage − rebate of the real createOpen gas', () => {
    const { gasUsed } = fixture.executed.createOpen.Transaction.effects;
    expect(gasUsed).toMatchObject({ computationCost: '1000000', storageCost: '2941200', storageRebate: '0' });
    expect(networkCost(gasUsed)).toBe(3_941_200n);
  });

  it('can be negative when the transaction frees storage', () => {
    expect(networkCost({ computationCost: '1', storageCost: '2', storageRebate: '10', nonRefundableStorageFee: '0' })).toBe(-7n);
  });
});
