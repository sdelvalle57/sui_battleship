import { ObjectError } from '@mysten/sui/client';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';
import { fetchGame } from './gameDetail';
import { GameNotFoundError, NotAGameError, ReadDataError } from './readErrors';

type FixtureObject = {
  objectId: string;
  type: string;
  owner: SuiClientTypes.ObjectOwner;
  content: string;
  previousTransaction: string;
};
type Fixture = { objects: Record<'pendingOpen' | 'resolved', FixtureObject> };
const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.objects.pendingOpen.type.split('::')[0] ?? '';

function objectOf(o: FixtureObject, overrides: Record<string, unknown> = {}) {
  return { objectId: o.objectId, type: o.type, owner: o.owner, content: fromBase64(o.content), previousTransaction: o.previousTransaction, ...overrides };
}
function clientReturning(result: () => Promise<unknown>) {
  const getObject = vi.fn(result);
  return { client: { getObject } as unknown as Pick<SuiGrpcClient, 'getObject'>, getObject };
}

describe('fetchGame', () => {
  it('reads a game from the fixture and asks for content and previousTransaction', async () => {
    const o = fixture.objects.pendingOpen;
    const { client, getObject } = clientReturning(() => Promise.resolve({ object: objectOf(o) }));
    const result = await fetchGame(client, { id: o.objectId, originalPackageId: PKG });
    expect(result.game).toMatchObject({ id: o.objectId, bet: 1_000_001n, state: { kind: 'pending' } });
    expect(result.previousTransaction).toBe(o.previousTransaction);
    expect(getObject).toHaveBeenCalledWith({
      objectId: o.objectId,
      include: { content: true, previousTransaction: true },
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  it('returns previousTransaction as is for a resolved game (last transaction, possibly a failed one)', async () => {
    const o = fixture.objects.resolved;
    const { client } = clientReturning(() => Promise.resolve({ object: objectOf(o) }));
    const result = await fetchGame(client, { id: o.objectId, originalPackageId: PKG });
    expect(result.game.state.kind).toBe('resolved');
    expect(result.previousTransaction).toBe(o.previousTransaction);
  });

  it.each(['notFound', 'deleted'] as const)('maps ObjectError %s to GameNotFoundError', async (reason) => {
    const cause = new ObjectError('notExists', 'x', { reason });
    const { client } = clientReturning(() => Promise.reject(cause));
    const error = await fetchGame(client, { id: '0x6', originalPackageId: PKG }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GameNotFoundError);
    expect(error).toMatchObject({ id: '0x6', cause });
  });

  it('rethrows other ObjectErrors', async () => {
    const unknown = new ObjectError('INTERNAL', 'x', { reason: 'unknown' });
    const { client } = clientReturning(() => Promise.reject(unknown));
    await expect(fetchGame(client, { id: '0x6', originalPackageId: PKG })).rejects.toBe(unknown);
  });

  it('rejects an object of another type with NotAGameError before parsing', async () => {
    const o = fixture.objects.pendingOpen;
    const { client } = clientReturning(() => Promise.resolve({ object: objectOf(o, { type: '0x2::coin::Coin<0x2::sui::SUI>', content: new Uint8Array() }) }));
    await expect(fetchGame(client, { id: o.objectId, originalPackageId: PKG })).rejects.toBeInstanceOf(NotAGameError);
  });

  it('rejects a Game that is not shared', async () => {
    const o = fixture.objects.pendingOpen;
    const owner = { $kind: 'AddressOwner', AddressOwner: o.objectId };
    const { client } = clientReturning(() => Promise.resolve({ object: objectOf(o, { owner }) }));
    await expect(fetchGame(client, { id: o.objectId, originalPackageId: PKG })).rejects.toMatchObject({ reason: 'not_shared' });
  });

  it('rejects unreadable Game data', async () => {
    const o = fixture.objects.pendingOpen;
    const { client } = clientReturning(() => Promise.resolve({ object: objectOf(o, { content: fromBase64(o.content).slice(0, -1) }) }));
    const error = await fetchGame(client, { id: o.objectId, originalPackageId: PKG }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason: 'malformed' });
  });
});
