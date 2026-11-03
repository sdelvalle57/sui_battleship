import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import type { SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import type { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { useAppConfig } from './useAppConfig';
import { useHouse } from './useHouse';
import { useSuiBalance } from './useSuiBalance';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string };
  house: { type: string; owner: SuiClientTypes.ObjectOwner; content: string };
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
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
const OWNER = `0x${'d'.repeat(64)}`;

const getObject = vi.fn();
const getBalance = vi.fn();
let queryClient: QueryClient;
const houseOk = () => Promise.resolve({ object: { type: fixture.house.type, owner: fixture.house.owner, content: fromBase64(fixture.house.content) } });

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getObject, getBalance } as unknown as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: OWNER } as ReturnType<typeof useCurrentAccount>);
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useHouse', () => {
  it('reads the House of the config with its terms', async () => {
    getObject.mockImplementation(houseOk);
    const { result } = renderHook(() => useHouse(), { wrapper: queryWrapper(queryClient) });
    expect(result.current.status).toEqual({ kind: 'loading' });
    await advance(0);
    expect(result.current.house).toMatchObject({ feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n });
    expect(result.current.status).toMatchObject({ kind: 'ready' });
    expect(getObject.mock.calls[0]?.[0]).toMatchObject({ objectId: CONFIG.houseId, include: { content: true } });
  });

  it('retries a transient error with the common policy (attempt 2 of 3) and has no interval', async () => {
    getObject.mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE')).mockImplementation(houseOk);
    const { result } = renderHook(() => useHouse(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current.status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    await advance(1_000);
    expect(result.current.status).toMatchObject({ kind: 'ready' });
    await advance(60_000);
    expect(getObject).toHaveBeenCalledTimes(2);
  });
});

describe('useSuiBalance', () => {
  it('does not query without account', async () => {
    vi.mocked(useCurrentAccount).mockReturnValue(null);
    const { result } = renderHook(() => useSuiBalance(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(getBalance).not.toHaveBeenCalled();
    expect(result.current.balance).toBeNull();
  });

  it('reads the balance of the connected account', async () => {
    getBalance.mockResolvedValue({ balance: { coinType: '0x2::sui::SUI', balance: '2000000000', coinBalance: '2000000000', addressBalance: '0' } });
    const { result } = renderHook(() => useSuiBalance(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current.balance).toBe(2_000_000_000n);
    expect(getBalance.mock.calls[0]?.[0]).toMatchObject({ owner: OWNER });
  });

  it('retries a transient error with the common policy', async () => {
    getBalance
      .mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE'))
      .mockResolvedValue({ balance: { coinType: '0x2::sui::SUI', balance: '5', coinBalance: '5', addressBalance: '0' } });
    const { result } = renderHook(() => useSuiBalance(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current.status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    await advance(1_000);
    expect(result.current.balance).toBe(5n);
  });
});
