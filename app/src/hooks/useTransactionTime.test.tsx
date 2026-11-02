import { useCurrentClient } from '@mysten/dapp-kit-react';
import { TransactionError } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import type { AppConfig } from '../sui/config';
import { useAppConfig } from './useAppConfig';
import { useCheckpointTime } from './useCheckpointTime';
import { useTransactionTime } from './useTransactionTime';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

const DIGEST = '8ABS8QfS4tcmpKnGhj2rMUc4EoReGG6o19j4ukdR9a5Y';
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '1f1f882e',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};

const getTransaction = vi.fn<(input: { digest: string }) => Promise<unknown>>();
const getCheckpoint = vi.fn<(input: object) => Promise<unknown>>();
let queryClient: QueryClient;

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  getTransaction.mockReset();
  getCheckpoint.mockReset();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getTransaction, ledgerService: { getCheckpoint } } as unknown as SuiGrpcClient);
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe('useTransactionTime', () => {
  it.each([null, ''])('does not query without a digest (%j)', async (digest) => {
    const { result } = renderHook(() => useTransactionTime(digest), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(getTransaction).not.toHaveBeenCalled();
    expect(result.current.timestampMs).toBeNull();
  });

  it('returns the transaction time', async () => {
    getTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { timestampMs: 1_793_641_224_118, checkpoint: '204' } });
    const { result } = renderHook(() => useTransactionTime(DIGEST), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current).toEqual({ timestampMs: 1_793_641_224_118, status: { kind: 'ready', refreshing: false } });
  });

  it('leaves a pruned transaction without time and without retries', async () => {
    getTransaction.mockRejectedValue(new TransactionError('notFound', DIGEST));
    const { result } = renderHook(() => useTransactionTime(DIGEST), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    await advance(5000);
    expect(result.current.timestampMs).toBeNull();
    expect(result.current.status.kind).toBe('error');
    expect(getTransaction).toHaveBeenCalledTimes(1);
  });
});

describe('useCheckpointTime', () => {
  it('does not query without a sequence number', async () => {
    const { result } = renderHook(() => useCheckpointTime(null), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(getCheckpoint).not.toHaveBeenCalled();
    expect(result.current.timestampMs).toBeNull();
  });

  it('returns the checkpoint time', async () => {
    getCheckpoint.mockResolvedValue({ response: { checkpoint: { summary: { timestamp: { seconds: 1_793_641_192n, nanos: 607_000_000 } } } } });
    const { result } = renderHook(() => useCheckpointTime(59n), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current.timestampMs).toBe(1_793_641_192_607);
  });
});
