import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSuiBalance } from './account';
import { ReadTimeoutError } from './readErrors';
import { READ_TIMEOUT_MS } from './readPolicy';

const OWNER = `0x${'d'.repeat(64)}`;

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchSuiBalance', () => {
  it('returns balance.balance as bigint (coins + address balance)', async () => {
    const getBalance = vi.fn(() =>
      Promise.resolve({
        balance: { coinType: '0x2::sui::SUI', balance: '149999999995058799', coinBalance: '149999999995058799', addressBalance: '0' },
      }),
    );
    const client = { getBalance } as unknown as Pick<SuiGrpcClient, 'getBalance'>;
    await expect(fetchSuiBalance(client, { owner: OWNER })).resolves.toBe(149_999_999_995_058_799n);
    expect(getBalance).toHaveBeenCalledWith({ owner: OWNER, signal: expect.any(AbortSignal) as AbortSignal });
  });

  it('fails with ReadTimeoutError after 10 s without an answer', async () => {
    vi.useFakeTimers();
    const getBalance = vi.fn(
      ({ signal }: { signal: AbortSignal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    const client = { getBalance } as unknown as Pick<SuiGrpcClient, 'getBalance'>;
    const result = fetchSuiBalance(client, { owner: OWNER }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    expect(READ_TIMEOUT_MS).toBe(10_000);
    expect(await result).toBeInstanceOf(ReadTimeoutError);
  });
});
