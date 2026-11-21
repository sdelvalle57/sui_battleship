import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';
import { gameType } from './game';
import { fetchGameDetail } from './gameDetail';
import { buildGameRegistry, type TypeOrigin } from './gameRegistry';
import { GameNotFoundError, NotAGameError, ReadDataError } from './readErrors';

// Detalle por tipo de objeto (#73, TASK-8a): un `Game` anterior, un `Duel` de producción (`duel-reads`) y un objeto de otro tipo.
// El tipo se compara exacto contra el registro (nada se arma a mano). El `Game` usa el BCS real de `game-reads` con el tipo del
// paquete original de la localnet de `duel-reads` (el BCS no lleva el tipo).

type FixtureObject = { objectId: string; version: string; digest: string; owner: SuiClientTypes.ObjectOwner; type: string; previousTransaction: string; content: string };
type ReadsFixture = {
  ids: { originalPackageId: string; upgrades: { packageId: string }[] };
  typeOrigins: TypeOrigin[];
  objects: Record<'pendingOpen' | 'cancelledByCreator' | 'resolvedCreatorWins', FixtureObject>;
};
type GameReadsFixture = { objects: { pendingOpen: FixtureObject } };
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;
const gameReads = import.meta.glob<GameReadsFixture>('../../../contracts/fixtures/game-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/game-reads.localnet.json'
] as GameReadsFixture;

const ORIGINAL = reads.ids.originalPackageId;
const config = { originalPackageId: ORIGINAL, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins };
const registry = buildGameRegistry(config);
const legacyOnly = buildGameRegistry({ originalPackageId: ORIGINAL });
const GAME_OBJECT = gameReads.objects.pendingOpen;

type ObjectInput = Omit<Partial<FixtureObject>, 'content'> & { content?: Uint8Array };
function client(object: ObjectInput) {
  const getObject = vi.fn(() => Promise.resolve({ object }));
  return { getObject } as unknown as Pick<SuiGrpcClient, 'getObject'>;
}
const fromFixture = (object: FixtureObject) => client({ ...object, content: fromBase64(object.content) });

describe('fetchGameDetail', () => {
  it('reads a Game of the previous source by its exact type, with its game, its version and its last transaction', async () => {
    const sdk = client({
      objectId: GAME_OBJECT.objectId,
      version: '11',
      type: gameType(ORIGINAL),
      owner: GAME_OBJECT.owner,
      previousTransaction: 'prev-game',
      content: fromBase64(GAME_OBJECT.content),
    });
    const { detail, previousTransaction } = await fetchGameDetail(sdk, { id: GAME_OBJECT.objectId, registry });
    expect(previousTransaction).toBe('prev-game');
    expect(detail).toMatchObject({ kind: 'game', gameKey: 'coinflip', objectVersion: 11n, game: { state: { kind: 'pending' } } });
  });

  it.each([
    ['Pending', 'pendingOpen', 'pending'],
    ['Cancelled', 'cancelledByCreator', 'cancelled'],
    ['Resolved', 'resolvedCreatorWins', 'resolved'],
  ] as const)('reads a %s Duel of production (duel-reads) as a Duel of its game, with the version of the object', async (_name, key, state) => {
    const object = reads.objects[key];
    const { detail, previousTransaction } = await fetchGameDetail(fromFixture(object), { id: object.objectId, registry });
    expect(detail).toMatchObject({ kind: 'duel', gameKey: 'coinflip', objectVersion: BigInt(object.version), duel: { id: object.objectId, state: { kind: state } } });
    expect(previousTransaction).toBe(object.previousTransaction);
  });

  it('throws NotAGameError for an object of another type, before parsing it', async () => {
    const sdk = client({ objectId: GAME_OBJECT.objectId, version: '1', type: '0x2::coin::Coin<0x2::sui::SUI>', owner: GAME_OBJECT.owner, previousTransaction: 'x', content: new Uint8Array() });
    await expect(fetchGameDetail(sdk, { id: GAME_OBJECT.objectId, registry })).rejects.toBeInstanceOf(NotAGameError);
  });

  it('throws NotAGameError for a Duel of a game the registry does not know (the type must be exactly the registered one)', async () => {
    const object = reads.objects.pendingOpen;
    const sdk = client({ ...object, type: object.type.replace('Coinflip', 'OtherGame'), content: fromBase64(object.content) });
    await expect(fetchGameDetail(sdk, { id: object.objectId, registry })).rejects.toBeInstanceOf(NotAGameError);
  });

  it('throws NotAGameError for a Game of another package and for a Duel when the registry has only the previous source (packageVersion 1)', async () => {
    const otherPackage = client({ objectId: GAME_OBJECT.objectId, version: '1', type: gameType(`0x${'e'.repeat(64)}`), owner: GAME_OBJECT.owner, previousTransaction: 'x', content: fromBase64(GAME_OBJECT.content) });
    await expect(fetchGameDetail(otherPackage, { id: GAME_OBJECT.objectId, registry })).rejects.toBeInstanceOf(NotAGameError);
    const duel = reads.objects.pendingOpen;
    await expect(fetchGameDetail(fromFixture(duel), { id: duel.objectId, registry: legacyOnly })).rejects.toBeInstanceOf(NotAGameError);
  });

  it('reads a Game with the registry of only the previous source (today, with packageVersion 1)', async () => {
    const sdk = client({ objectId: GAME_OBJECT.objectId, version: '2', type: gameType(ORIGINAL), owner: GAME_OBJECT.owner, previousTransaction: null as unknown as string, content: fromBase64(GAME_OBJECT.content) });
    const { detail, previousTransaction } = await fetchGameDetail(sdk, { id: GAME_OBJECT.objectId, registry: legacyOnly });
    expect(detail.kind).toBe('game');
    expect(previousTransaction).toBeNull();
  });

  it('throws GameNotFoundError for a missing or deleted object', async () => {
    for (const reason of ['notFound', 'deleted'] as const) {
      const sdk = { getObject: vi.fn(() => Promise.reject(new ObjectError('notExists', 'x', { reason }))) } as unknown as Pick<SuiGrpcClient, 'getObject'>;
      await expect(fetchGameDetail(sdk, { id: GAME_OBJECT.objectId, registry })).rejects.toBeInstanceOf(GameNotFoundError);
    }
  });

  it('throws ReadDataError for a Duel of the right type with broken bytes (never a default Pending)', async () => {
    const object = reads.objects.pendingOpen;
    const sdk = client({ ...object, content: fromBase64(object.content).slice(0, -1) });
    await expect(fetchGameDetail(sdk, { id: object.objectId, registry })).rejects.toBeInstanceOf(ReadDataError);
  });

  it('asks the node for the content and the previous transaction of exactly that id', async () => {
    const object = reads.objects.pendingOpen;
    const getObject = vi.fn(() => Promise.resolve({ object: { ...object, content: fromBase64(object.content) } }));
    await fetchGameDetail({ getObject } as unknown as Pick<SuiGrpcClient, 'getObject'>, { id: object.objectId, registry });
    const calls = getObject.mock.calls as unknown as [{ objectId: string; include: { content: boolean; previousTransaction: boolean } }][];
    expect(calls[0]?.[0]).toMatchObject({ objectId: object.objectId, include: { content: true, previousTransaction: true } });
  });
});
