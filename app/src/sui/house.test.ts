import { bcs } from '@mysten/sui/bcs';
import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';
import { fetchHouse, houseType, parseHouseObject, type HouseObjectInput } from './house';
import { isTransientReadError } from './readPolicy';
import { ReadDataError } from './readErrors';

type FixtureHouse = { objectId: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type Fixture = { ids: { originalPackageId: string; houseId: string }; house: FixtureHouse };
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.ids.originalPackageId;
const HOUSE = fixture.house;

// Mismo layout que `house.move`, para fabricar variantes inválidas bien formadas.
const HouseBcs = bcs.struct('House', {
  id: bcs.Address,
  version: bcs.u64(),
  fee_rate: bcs.u16(),
  fees_collected: bcs.u64(),
  min_bet: bcs.u64(),
  max_bet: bcs.u64(),
});
const realFields = HouseBcs.parse(fromBase64(HOUSE.content));

const realContent = () => new Uint8Array(fromBase64(HOUSE.content));
function objectOf(overrides: Partial<HouseObjectInput> = {}): HouseObjectInput {
  return { type: HOUSE.type, owner: HOUSE.owner, content: realContent(), ...overrides };
}
function withFields(fields: Partial<typeof realFields>): HouseObjectInput {
  return objectOf({ content: new Uint8Array(HouseBcs.serialize({ ...realFields, ...fields }).toBytes()) });
}
function readError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return null;
}

describe('parseHouseObject', () => {
  it('parses the real House of the fixture with the genesis limits and the fees it collected', () => {
    expect(parseHouseObject(objectOf(), PKG)).toEqual({
      id: fixture.ids.houseId,
      version: 1n,
      feeRate: 250,
      // Las 3 aceptaciones de la captura de #12 (TASK-1), con comisión 50000 cada una.
      feesCollected: 150_000n,
      minBet: 1_000_000n,
      maxBet: 50_000_000_000n,
    });
  });

  it('builds the exact normalized type', () => {
    expect(houseType(PKG)).toBe(`${PKG}::house::House`);
  });

  it.each([
    ['truncated bytes', () => objectOf({ content: realContent().slice(0, -1) }), 'malformed'],
    ['an extra byte', () => objectOf({ content: Uint8Array.from([...realContent(), 0]) }), 'malformed'],
    ['another type', () => objectOf({ type: HOUSE.type.replace('::house::House', '::game::Game') }), 'wrong_type'],
    ['another package', () => objectOf({ type: `0x${'e'.repeat(64)}::house::House` }), 'wrong_type'],
    ['a non-shared owner', () => objectOf({ owner: { $kind: 'Immutable', Immutable: true } }), 'not_shared'],
    ['min_bet 0', () => withFields({ min_bet: '0' }), 'invariant'],
    ['min_bet > max_bet', () => withFields({ min_bet: '6', max_bet: '5' }), 'invariant'],
  ])('rejects %s with ReadDataError', (_name, object, reason) => {
    const error = readError(() => parseHouseObject(object(), PKG));
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason });
  });

  it('accepts min_bet == max_bet', () => {
    expect(parseHouseObject(withFields({ min_bet: '7', max_bet: '7' }), PKG)).toMatchObject({ minBet: 7n, maxBet: 7n });
  });

  it('parses a well-formed fee_rate 1001 (MAX_FEE_BPS is not validated here)', () => {
    expect(parseHouseObject(withFields({ fee_rate: 1001 }), PKG).feeRate).toBe(1001);
  });
});

describe('fetchHouse', () => {
  it('reads the House with its content and parses it', async () => {
    const getObject = vi.fn(() => Promise.resolve({ object: objectOf() }));
    const client = { getObject } as unknown as Pick<SuiGrpcClient, 'getObject'>;
    const house = await fetchHouse(client, { houseId: fixture.ids.houseId, originalPackageId: PKG });
    expect(house.feeRate).toBe(250);
    expect(getObject).toHaveBeenCalledWith({
      objectId: fixture.ids.houseId,
      include: { content: true },
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it('rethrows a missing House as is, and it is not transient', async () => {
    const cause = new ObjectError('notExists', 'no existe', { reason: 'notFound' });
    const client = { getObject: vi.fn(() => Promise.reject(cause)) } as unknown as Pick<SuiGrpcClient, 'getObject'>;
    const error = await fetchHouse(client, { houseId: fixture.ids.houseId, originalPackageId: PKG }).catch((e: unknown) => e);
    expect(error).toBe(cause);
    expect(isTransientReadError(error)).toBe(false);
  });
});
