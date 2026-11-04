import { bcs } from '@mysten/sui/bcs';
import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkHouseCapOwnership,
  fetchHouseCap,
  HOUSE_CAP_LOST_MESSAGE,
  HOUSE_CAP_MAX_PAGES,
  houseCapType,
  parseHouseCapObject,
  type HouseCapObjectInput,
} from './houseCap';
import { isTransientReadError, READ_TIMEOUT_MS, shouldRetryRead } from './readPolicy';
import { ReadDataError, ReadTimeoutError } from './readErrors';

type FixtureObject = { objectId: string; version: string; digest: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type FixtureListing = { objects: FixtureObject[]; hasNextPage: boolean; cursor: string | null };
type Fixture = {
  ids: { originalPackageId: string; houseCapId: string };
  houseCapListing: Record<'admin' | 'nonOwner' | 'adminLimit1', FixtureListing>;
  houseCapObject: FixtureObject;
};
const FIXTURE_PATH = '../../../contracts/fixtures/house-admin.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/house-admin.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.ids.originalPackageId;
const CAP_ID = fixture.ids.houseCapId;
const ADMIN = (fixture.houseCapObject.owner as { AddressOwner: string }).AddressOwner;
const OTHER = `0x${'d'.repeat(64)}`;
const OTHER_PKG = `0x${'e'.repeat(64)}`;

// Mismo layout que `house::HouseCap`, para fabricar otro cap bien formado.
const HouseCapBcs = bcs.struct('HouseCap', { id: bcs.Address });

type Listed = SuiClientTypes.Object<{ content: true }>;
type Page = { objects: Listed[]; hasNextPage: boolean; cursor: string | null };

/** Objeto del SDK a partir de la fixture: `content` de base64 a bytes. */
function objectOf(o: FixtureObject, overrides: Partial<Listed> = {}): Listed {
  return { ...o, content: new Uint8Array(fromBase64(o.content)), ...overrides } as Listed;
}
const realCap = () => objectOf(fixture.houseCapListing.admin.objects[0] as FixtureObject);
const otherCap = (): Listed =>
  objectOf(fixture.houseCapObject, { objectId: OTHER, content: new Uint8Array(HouseCapBcs.serialize({ id: OTHER }).toBytes()) });
const pageOf = (listing: FixtureListing): Page => ({ ...listing, objects: listing.objects.map((o) => objectOf(o)) });
const page = (objects: Listed[], hasNextPage: boolean, cursor: string | null = null): Page => ({ objects, hasNextPage, cursor });

function listingClient(...pages: Page[]) {
  const listOwnedObjects = vi.fn<(options: unknown) => Promise<Page>>(() => Promise.resolve(pages.shift() ?? page([], false)));
  return { listOwnedObjects, client: { listOwnedObjects } as unknown as Pick<SuiGrpcClient, 'listOwnedObjects'> };
}
const fetchFor = (client: Pick<SuiGrpcClient, 'listOwnedObjects'>, owner = ADMIN) =>
  fetchHouseCap(client, { owner, originalPackageId: PKG }).catch((e: unknown) => e);

function readError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return null;
}

describe('houseCapType', () => {
  it('builds the normalized type, equal to the one the node returns', () => {
    expect(houseCapType(PKG)).toBe(`${PKG}::house::HouseCap`);
    expect(houseCapType(PKG)).toBe(fixture.houseCapObject.type);
  });
});

describe('parseHouseCapObject', () => {
  it('parses the real cap listed for ADMIN, with a normalized owner (any case)', () => {
    const owner = ADMIN.toUpperCase().replace('0X', '0x');
    expect(parseHouseCapObject(realCap(), { originalPackageId: PKG, owner })).toEqual({ id: CAP_ID, owner: normalizeSuiAddress(ADMIN) });
  });

  const content = () => realCap().content;
  it.each<[string, () => HouseCapObjectInput, string]>([
    ['a type of another package', () => objectOf(fixture.houseCapObject, { type: `${OTHER_PKG}::house::HouseCap`, content: content() }), 'wrong_type'],
    ['a malformed short address in the type', () => objectOf(fixture.houseCapObject, { type: '0xg1::house::HouseCap', content: content() }), 'wrong_type'],
    ['another struct of the package', () => objectOf(fixture.houseCapObject, { type: `${PKG}::house::House`, content: content() }), 'wrong_type'],
    ['a null owner', () => objectOf(fixture.houseCapObject, { owner: null as unknown as SuiClientTypes.ObjectOwner, content: content() }), 'invariant'],
    ['a Shared owner', () => objectOf(fixture.houseCapObject, { owner: { $kind: 'Shared', Shared: { initialSharedVersion: '2' } }, content: content() }), 'invariant'],
    ['an AddressOwner of another address', () => objectOf(fixture.houseCapObject, { owner: { $kind: 'AddressOwner', AddressOwner: OTHER }, content: content() }), 'invariant'],
    ['an extra byte', () => objectOf(fixture.houseCapObject, { content: Uint8Array.from([...content(), 0]) }), 'malformed'],
    ['truncated bytes', () => objectOf(fixture.houseCapObject, { content: content().slice(0, -1) }), 'malformed'],
    ['an id different from objectId', () => objectOf(fixture.houseCapObject, { objectId: OTHER, content: content() }), 'invariant'],
  ])('rejects %s with ReadDataError', (_name, object, reason) => {
    const error = readError(() => parseHouseCapObject(object(), { originalPackageId: PKG, owner: ADMIN }));
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason });
  });
});

describe('fetchHouseCap (H-1)', () => {
  it('finds the real cap of ADMIN with one request by exact type, limit 2 and content', async () => {
    const { client, listOwnedObjects } = listingClient(pageOf(fixture.houseCapListing.admin));
    expect(await fetchFor(client)).toEqual({ id: CAP_ID, owner: normalizeSuiAddress(ADMIN) });
    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
    expect(listOwnedObjects).toHaveBeenCalledWith({
      owner: ADMIN,
      type: houseCapType(PKG),
      limit: 2,
      include: { content: true },
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it('answers null for the real empty listing of an account without the cap', async () => {
    const { client } = listingClient(pageOf(fixture.houseCapListing.nonOwner));
    expect(await fetchFor(client, OTHER)).toBeNull();
  });

  it('also reads the real limit-1 page of ADMIN (last page, without cursor)', async () => {
    expect(fixture.houseCapListing.adminLimit1).toMatchObject({ hasNextPage: false, cursor: null });
    const { client } = listingClient(pageOf(fixture.houseCapListing.adminLimit1));
    expect(await fetchFor(client)).toMatchObject({ id: CAP_ID });
  });

  it('follows an opaque cursor over an empty page and answers null only on the last page', async () => {
    const { client, listOwnedObjects } = listingClient(page([], true, 'c1'), page([], false));
    expect(await fetchFor(client)).toBeNull();
    expect(listOwnedObjects).toHaveBeenCalledTimes(2);
    expect(listOwnedObjects.mock.calls[0]?.[0]).not.toHaveProperty('cursor');
    expect(listOwnedObjects.mock.calls[1]?.[0]).toMatchObject({ cursor: 'c1', type: houseCapType(PKG), limit: 2 });
  });

  it('reports incomplete, never null, after three empty pages that still have more', async () => {
    const { client, listOwnedObjects } = listingClient(page([], true, 'c1'), page([], true, 'c2'), page([], true, 'c3'));
    const error = await fetchFor(client);
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason: 'incomplete' });
    expect(listOwnedObjects).toHaveBeenCalledTimes(HOUSE_CAP_MAX_PAGES);
    expect(HOUSE_CAP_MAX_PAGES).toBe(3);
  });

  it('reports invariant for two caps across pages', async () => {
    const { client } = listingClient(page([realCap()], true, 'c1'), page([otherCap()], false));
    expect(await fetchFor(client)).toMatchObject({ reason: 'invariant' });
  });

  it('reports invariant for two caps in one page without asking again', async () => {
    const { client, listOwnedObjects } = listingClient(page([realCap(), otherCap()], false), page([], false));
    expect(await fetchFor(client)).toMatchObject({ reason: 'invariant' });
    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
  });

  it('returns the cap found before a final empty page', async () => {
    const { client } = listingClient(page([realCap()], true, 'c1'), page([], false));
    expect(await fetchFor(client)).toEqual({ id: CAP_ID, owner: normalizeSuiAddress(ADMIN) });
  });

  it('reports incomplete for one cap with more pages up to the limit', async () => {
    const { client } = listingClient(page([realCap()], true, 'c1'), page([], true, 'c2'), page([], true, 'c3'));
    expect(await fetchFor(client)).toMatchObject({ reason: 'incomplete' });
  });

  it('reports incomplete when the node says there are more pages but gives no cursor', async () => {
    const { client, listOwnedObjects } = listingClient(page([], true, null));
    expect(await fetchFor(client)).toMatchObject({ reason: 'incomplete' });
    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
  });

  it('rejects a listed object that is not a HouseCap of this package (the node did not filter)', async () => {
    const { client } = listingClient(page([objectOf(fixture.houseCapObject, { type: `${OTHER_PKG}::house::HouseCap`, content: realCap().content })], false));
    expect(await fetchFor(client)).toMatchObject({ reason: 'wrong_type' });
  });
});

describe('fetchHouseCap network errors (T2-17, shared read policy DL-5)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Cliente cuyo `listOwnedObjects` responde, en orden, cada paso: una página o un rechazo. */
  function stepClient(...steps: (Page | Error)[]) {
    const listOwnedObjects = vi.fn<(options: unknown) => Promise<Page>>(() => {
      const step = steps.shift() ?? page([], false);
      return step instanceof Error ? Promise.reject(step) : Promise.resolve(step);
    });
    return { listOwnedObjects, client: { listOwnedObjects } as unknown as Pick<SuiGrpcClient, 'listOwnedObjects'> };
  }

  it('rethrows the same UNAVAILABLE instance of the first request, transient and retried by the policy', async () => {
    const down = new RpcError('down', 'UNAVAILABLE');
    const { client, listOwnedObjects } = stepClient(down);
    const error = await fetchFor(client);
    expect(error).toBe(down);
    expect(isTransientReadError(error)).toBe(true);
    expect(shouldRetryRead(0, error)).toBe(true);
    expect(listOwnedObjects).toHaveBeenCalledTimes(1);
  });

  it('rethrows the same UNAVAILABLE instance of the second request, without a partial result', async () => {
    const down = new RpcError('down', 'UNAVAILABLE');
    const { client, listOwnedObjects } = stepClient(page([], true, 'c1'), down);
    const error = await fetchFor(client);
    expect(error).toBe(down);
    expect(isTransientReadError(error)).toBe(true);
    expect(shouldRetryRead(0, error)).toBe(true);
    expect(listOwnedObjects).toHaveBeenCalledTimes(2);
    expect(listOwnedObjects.mock.calls[1]?.[0]).toMatchObject({ cursor: 'c1' });
  });

  it('turns a hung node into a transient ReadTimeoutError after 10 s', async () => {
    vi.useFakeTimers();
    const listOwnedObjects = vi.fn(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<Page>((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(signal.reason as Error);
          });
        }),
    );
    const client = { listOwnedObjects } as unknown as Pick<SuiGrpcClient, 'listOwnedObjects'>;
    const result = fetchFor(client);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    const error = await result;
    expect(error).toBeInstanceOf(ReadTimeoutError);
    expect(isTransientReadError(error)).toBe(true);
    expect(shouldRetryRead(0, error)).toBe(true);
  });

  it('keeps incomplete and invariant as definitive (not transient), unlike the network errors', async () => {
    const incomplete = await fetchFor(stepClient(page([], true, null)).client);
    const invariant = await fetchFor(stepClient(page([realCap(), otherCap()], false)).client);
    expect(incomplete).toMatchObject({ reason: 'incomplete' });
    expect(invariant).toMatchObject({ reason: 'invariant' });
    expect(isTransientReadError(incomplete)).toBe(false);
    expect(isTransientReadError(invariant)).toBe(false);
    expect(shouldRetryRead(0, incomplete)).toBe(false);
  });
});

describe('checkHouseCapOwnership (H-3)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** El `getObject` real del cap sin `content` (el `precheck` no lo pide). */
  const capRead = (overrides: Partial<Listed> = {}) => ({ object: { ...objectOf(fixture.houseCapObject), content: undefined, ...overrides } });
  function objectClient(getObject: (options: { signal?: AbortSignal }) => Promise<unknown>) {
    const fn = vi.fn(getObject);
    return { getObject: fn, client: { getObject: fn } as unknown as Pick<SuiGrpcClient, 'getObject'> };
  }
  const check = (client: Pick<SuiGrpcClient, 'getObject'>, owner = ADMIN) =>
    checkHouseCapOwnership(client, { capId: CAP_ID, owner, originalPackageId: PKG });

  it('answers owned for the real cap read by ID, owned by ADMIN, without asking for content', async () => {
    const { client, getObject } = objectClient(() => Promise.resolve(capRead()));
    expect(await check(client, ADMIN.toUpperCase().replace('0X', '0x'))).toBe('owned');
    expect(getObject).toHaveBeenCalledWith({ objectId: CAP_ID, include: { content: false }, signal: expect.any(AbortSignal) as AbortSignal });
  });

  it.each<[string, Partial<Listed>]>([
    ['another owner', { owner: { $kind: 'AddressOwner', AddressOwner: OTHER } }],
    ['a null owner', { owner: null as unknown as SuiClientTypes.ObjectOwner }],
    ['a Shared owner', { owner: { $kind: 'Shared', Shared: { initialSharedVersion: '2' } } }],
    ['another type', { type: `${OTHER_PKG}::house::HouseCap` }],
  ])('answers not_owned for %s', async (_name, overrides) => {
    const { client } = objectClient(() => Promise.resolve(capRead(overrides)));
    expect(await check(client)).toBe('not_owned');
  });

  it.each(['notFound', 'deleted'] as const)('answers not_owned for an ObjectError %s', async (reason) => {
    const { client } = objectClient(() => Promise.reject(new ObjectError('notExists', 'x', { reason })));
    expect(await check(client)).toBe('not_owned');
  });

  it.each([
    ['an ObjectError unknown', new ObjectError('INTERNAL', 'x', { reason: 'unknown' })],
    ['an RpcError UNAVAILABLE', new RpcError('down', 'UNAVAILABLE')],
  ])('rethrows %s as is', async (_name, cause) => {
    const { client } = objectClient(() => Promise.reject(cause));
    await expect(check(client)).rejects.toBe(cause);
  });

  it('rethrows the 10 s cut of a hung node as ReadTimeoutError', async () => {
    vi.useFakeTimers();
    const { client } = objectClient(
      ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            reject(signal.reason as Error);
          });
        }),
    );
    const assertion = expect(check(client)).rejects.toBeInstanceOf(ReadTimeoutError);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    await assertion;
  });

  it('has the fixed text for a lost cap', () => {
    expect(HOUSE_CAP_LOST_MESSAGE).toBe('Esta cuenta ya no tiene el HouseCap: no puede administrar la House.');
  });
});
