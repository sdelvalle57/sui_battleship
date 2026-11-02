import { TransactionError } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { describe, expect, it, vi } from 'vitest';
import { NotYetCheckpointedError } from './readErrors';
import { shouldRetryRead } from './readPolicy';
import { fetchCheckpointTime, fetchPublishCheckpoint, fetchTransactionInfo } from './transactionInfo';

const DIGEST = 'C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz';

type TxShape = { timestampMs: number | null; checkpoint: string | null };
function txClient(result: () => Promise<unknown>) {
  const getTransaction = vi.fn(result);
  return { client: { getTransaction } as unknown as Pick<SuiGrpcClient, 'getTransaction'>, getTransaction };
}
const ok = (tx: TxShape) => () => Promise.resolve({ $kind: 'Transaction', Transaction: tx });

describe('fetchTransactionInfo', () => {
  it('returns timestampMs and the checkpoint as bigint', async () => {
    const { client, getTransaction } = txClient(ok({ timestampMs: 1_793_641_224_118, checkpoint: '204' }));
    await expect(fetchTransactionInfo(client, { digest: DIGEST })).resolves.toEqual({ timestampMs: 1_793_641_224_118, checkpoint: 204n });
    expect(getTransaction).toHaveBeenCalledWith({ digest: DIGEST, signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('reads a failed transaction too', async () => {
    const { client } = txClient(() => Promise.resolve({ $kind: 'FailedTransaction', FailedTransaction: { timestampMs: 5, checkpoint: '7' } }));
    await expect(fetchTransactionInfo(client, { digest: DIGEST })).resolves.toEqual({ timestampMs: 5, checkpoint: 7n });
  });

  it('keeps a null timestampMs and checkpoint', async () => {
    const { client } = txClient(ok({ timestampMs: null, checkpoint: null }));
    await expect(fetchTransactionInfo(client, { digest: DIGEST })).resolves.toEqual({ timestampMs: null, checkpoint: null });
  });

  it('rethrows TransactionError (not retryable)', async () => {
    const notFound = new TransactionError('notFound', DIGEST);
    const { client } = txClient(() => Promise.reject(notFound));
    const error = await fetchTransactionInfo(client, { digest: DIGEST }).catch((e: unknown) => e);
    expect(error).toBe(notFound);
    expect(shouldRetryRead(0, error)).toBe(false);
  });
});

describe('fetchPublishCheckpoint', () => {
  it('returns the publish checkpoint', async () => {
    const { client } = txClient(ok({ timestampMs: 1, checkpoint: '59' }));
    await expect(fetchPublishCheckpoint(client, { digest: DIGEST })).resolves.toBe(59n);
  });

  it('returns null when the node pruned the publish transaction', async () => {
    const { client } = txClient(() => Promise.reject(new TransactionError('notFound', DIGEST)));
    await expect(fetchPublishCheckpoint(client, { digest: DIGEST })).resolves.toBeNull();
  });

  it('throws a retryable NotYetCheckpointedError when the checkpoint is null', async () => {
    const { client } = txClient(ok({ timestampMs: null, checkpoint: null }));
    const error = await fetchPublishCheckpoint(client, { digest: DIGEST }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NotYetCheckpointedError);
    expect(shouldRetryRead(0, error)).toBe(true);
  });

  it('rethrows other errors', async () => {
    const boom = new Error('boom');
    const { client } = txClient(() => Promise.reject(boom));
    await expect(fetchPublishCheckpoint(client, { digest: DIGEST })).rejects.toBe(boom);
  });
});

describe('fetchCheckpointTime', () => {
  function checkpointClient(checkpoint: unknown) {
    const getCheckpoint = vi.fn(() => Promise.resolve({ response: { checkpoint } }));
    return { client: { ledgerService: { getCheckpoint } } as unknown as Pick<SuiGrpcClient, 'ledgerService'>, getCheckpoint };
  }

  it('returns the checkpoint time in ms using the confirmed read mask', async () => {
    const { client, getCheckpoint } = checkpointClient({ summary: { timestamp: { seconds: 1_793_641_192n, nanos: 607_000_000 } } });
    await expect(fetchCheckpointTime(client, { sequenceNumber: 59n })).resolves.toBe(1_793_641_192_607);
    expect(getCheckpoint).toHaveBeenCalledWith(
      { checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 59n }, readMask: { paths: ['sequence_number', 'summary.timestamp'] } },
      { abort: expect.any(AbortSignal) as AbortSignal },
    );
  });

  it('returns null without a timestamp', async () => {
    const { client } = checkpointClient({ summary: {} });
    await expect(fetchCheckpointTime(client, { sequenceNumber: 59n })).resolves.toBeNull();
  });
});
