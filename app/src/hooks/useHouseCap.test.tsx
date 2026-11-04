import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import type { SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import type { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useHouseCap } from './useHouseCap';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

type FixtureObject = { objectId: string; version: string; digest: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type FixtureListing = { objects: FixtureObject[]; hasNextPage: boolean; cursor: string | null };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; houseCapId: string };
  houseCapListing: Record<'admin' | 'nonOwner', FixtureListing>;
  houseCapObject: FixtureObject;
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
const ADMIN = (fixture.houseCapObject.owner as { AddressOwner: string }).AddressOwner;
const OTHER = `0x${'e'.repeat(64)}`;
const CAP = { id: fixture.ids.houseCapId, owner: normalizeSuiAddress(ADMIN) };

/** Una página real de la fixture como la devuelve el SDK (`content` en bytes). */
const pageOf = (listing: FixtureListing) =>
  Promise.resolve({ ...listing, objects: listing.objects.map((o) => ({ ...o, content: fromBase64(o.content) })) });
const adminPage = () => pageOf(fixture.houseCapListing.admin);
const emptyPage = () => pageOf(fixture.houseCapListing.nonOwner);
const down = () => Promise.reject(new RpcError('down', 'UNAVAILABLE'));

const listOwnedObjects = vi.fn();
let queryClient: QueryClient;

function asAccount(address: string | null) {
  vi.mocked(useCurrentAccount).mockReturnValue(address === null ? null : ({ address } as ReturnType<typeof useCurrentAccount>));
}
const renderCap = () => renderHook(() => useHouseCap(), { wrapper: queryWrapper(queryClient) });
/** El hook con cuenta (falla el test si no la tiene). */
function withAccount(state: ReturnType<typeof useHouseCap>) {
  if (state.kind !== 'account') throw new Error('se esperaba una cuenta');
  return state;
}

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ listOwnedObjects } as unknown as SuiGrpcClient);
  asAccount(ADMIN);
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('useHouseCap', () => {
  it('T4-1: without account is no_account and never lists objects', async () => {
    asAccount(null);
    const { result } = renderCap();
    await advance(0);
    expect(result.current).toEqual({ kind: 'no_account' });
    expect(listOwnedObjects).not.toHaveBeenCalled();
  });

  it('T4-2: with the real listing of ADMIN is known with the cap, under the houseCap key of the normalized address', async () => {
    asAccount(ADMIN.toUpperCase().replace('0X', '0x'));
    listOwnedObjects.mockImplementation(adminPage);
    const { result } = renderCap();
    expect(withAccount(result.current).cap).toEqual({ kind: 'unknown' });
    await advance(0);
    const state = withAccount(result.current);
    expect(state.address).toBe(normalizeSuiAddress(ADMIN));
    expect(state.cap).toEqual({ kind: 'known', cap: CAP });
    expect(state.status).toMatchObject({ kind: 'ready' });
    expect(queryClient.getQueryData(queryKeys.houseCap('localnet', CONFIG.originalPackageId, ADMIN))).toEqual(CAP);
    expect(listOwnedObjects.mock.calls[0]?.[0]).toMatchObject({ owner: normalizeSuiAddress(ADMIN), limit: 2, include: { content: true } });
  });

  it('T4-2: with the real empty listing of an account without the cap is known with null', async () => {
    asAccount(OTHER);
    listOwnedObjects.mockImplementation(emptyPage);
    const { result } = renderCap();
    await advance(0);
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: null });
  });

  it('T4-16: UNAVAILABLE in the 3 attempts goes through retrying 2 and 3 of 3, then error, and the cap stays unknown', async () => {
    listOwnedObjects.mockImplementation(down);
    const { result } = renderCap();
    await advance(0);
    expect(withAccount(result.current).status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    expect(withAccount(result.current).cap).toEqual({ kind: 'unknown' });
    await advance(1_000);
    expect(withAccount(result.current).status).toEqual({ kind: 'retrying', attempt: 3, max: 3 });
    expect(withAccount(result.current).cap).toEqual({ kind: 'unknown' });
    await advance(2_000);
    const state = withAccount(result.current);
    expect(state.status).toMatchObject({ kind: 'error' });
    expect(state.cap).toEqual({ kind: 'unknown' });
    expect(listOwnedObjects).toHaveBeenCalledTimes(3);
  });

  it('T4-16: when the third attempt answers with the cap, it is known and ready', async () => {
    listOwnedObjects.mockImplementationOnce(down).mockImplementationOnce(down).mockImplementation(adminPage);
    const { result } = renderCap();
    await advance(0);
    await advance(1_000);
    expect(withAccount(result.current).cap).toEqual({ kind: 'unknown' });
    await advance(2_000);
    const state = withAccount(result.current);
    expect(state.cap).toEqual({ kind: 'known', cap: CAP });
    expect(state.status).toMatchObject({ kind: 'ready' });
  });

  it('T4-3: a first non-transient failure (two caps, invariant) is error with the cap unknown, never known with null', async () => {
    listOwnedObjects.mockImplementation(() =>
      adminPage().then((page) => ({ ...page, objects: [...page.objects, { ...page.objects[0], objectId: OTHER }] })),
    );
    const { result } = renderCap();
    await advance(0);
    const state = withAccount(result.current);
    expect(state.status).toMatchObject({ kind: 'error', error: { reason: 'invariant' } });
    expect(state.cap).toEqual({ kind: 'unknown' });
    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
  });

  it('T4-4: with the cap already read, a failing refetch keeps it known (retrying, then error)', async () => {
    listOwnedObjects.mockImplementationOnce(adminPage).mockImplementation(down);
    const { result } = renderCap();
    await advance(0);
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: CAP });
    withAccount(result.current).refetch();
    await advance(0);
    expect(withAccount(result.current).status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: CAP });
    await advance(1_000);
    await advance(2_000);
    expect(withAccount(result.current).status).toMatchObject({ kind: 'error' });
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: CAP });
  });

  it('T4-5: another account is another key and starts unknown (no placeholderData)', async () => {
    listOwnedObjects.mockImplementation(adminPage);
    const { result, rerender } = renderCap();
    await advance(0);
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: CAP });
    listOwnedObjects.mockImplementation(emptyPage);
    asAccount(OTHER);
    rerender();
    expect(withAccount(result.current).address).toBe(OTHER);
    expect(withAccount(result.current).cap).toEqual({ kind: 'unknown' });
    await advance(0);
    expect(withAccount(result.current).cap).toEqual({ kind: 'known', cap: null });
    expect(listOwnedObjects.mock.calls[1]?.[0]).toMatchObject({ owner: OTHER });
  });
});
