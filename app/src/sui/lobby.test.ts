import { bcs } from '@mysten/sui/bcs';
import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import { GrpcTypes, RpcError } from '@mysten/sui/grpc';
import { fromBase64, normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';
import { describe, expect, it, vi } from 'vitest';
import { gameEventType } from './events';
import { HISTORY_FLOOR_MARGIN_CHECKPOINTS, type EventScanClient } from './eventScan';
import { parseGameObject, type GameObjectInput } from './game';
import { fetchLobbyPage, LOBBY_EVENTS_PER_REQUEST, LOBBY_MAX_REQUESTS_PER_PAGE, LOBBY_PAGE_TARGET } from './lobby';
import { PaginationStalledError, ReadDataError } from './readErrors';
import { shouldRetryRead } from './readPolicy';

const { Ordering, QueryEndReason } = GrpcTypes;

// ---------- Fixture real (TASK-1) ----------
type FixtureObject = { objectId: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string };
type FixtureFrame = {
  event?: { eventType: string; contents: { value: string }; transactionDigest: string; checkpoint: string; eventIndex: number };
  watermark?: { cursor: string; checkpoint: string };
  end?: { reason: number };
};
type ObjectName = 'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'cancelledByInvitee' | 'resolved';
type Fixture = { objects: Record<ObjectName, FixtureObject>; rawListEventsPage: { frames: FixtureFrame[] } };
const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.objects.pendingOpen.type.split('::')[0] ?? '';
const CREATED_TYPE = gameEventType(PKG, 'GameCreated');
const TESTNET_CHAIN_ID_BASE58 = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD';

// ---------- Objetos y eventos derivados de la fixture ----------
type SdkObject = GameObjectInput & { objectId: string };
type Created = { bcs: Uint8Array; txDigest: string; gameId: string };

const CreatedBcs = bcs.struct('GameCreated', {
  game_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
});

function sdkObject(o: FixtureObject, content = new Uint8Array(fromBase64(o.content)), objectId = o.objectId): SdkObject {
  return { objectId, type: o.type, owner: o.owner, content };
}

/** `GameCreated` coherente con un objeto (mismos id, creador, oponente, apuesta y comisión). */
function createdFor(object: SdkObject, txDigest: string): Created {
  const g = parseGameObject(object, PKG);
  const bytes = CreatedBcs.serialize({ game_id: g.id, creator: g.creator, opponent: g.opponent, bet: g.bet, fee_rate: g.feeRate }).toBytes();
  return { bcs: bytes, txDigest, gameId: g.id };
}

/** Partida abierta sintética n: el `pendingOpen` de la fixture con otro ID (los primeros 32 bytes). */
function openGame(n: number): { object: SdkObject; created: Created } {
  const id = normalizeSuiAddress(n.toString(16));
  const content = new Uint8Array(fromBase64(fixture.objects.pendingOpen.content));
  content.set(fromBase64(toBase64(new Uint8Array(32).map((_, i) => (i === 31 ? n : 0)))), 0);
  const object = sdkObject(fixture.objects.pendingOpen, content, id);
  return { object, created: createdFor(object, `tx-open-${String(n)}`) };
}

const fixtureObject = (name: ObjectName) => sdkObject(fixture.objects[name]);

// ---------- Cliente falso ----------
type Frame = {
  event?: { eventType: string; contents: { value: Uint8Array }; transactionDigest: string; checkpoint: bigint };
  watermark?: { cursor: Uint8Array; checkpoint: bigint };
  end?: { reason: number };
};
type Script = Frame[] | Error;
type ListRequest = {
  readMask: { paths: string[] };
  startCheckpoint: bigint;
  filter: unknown;
  options: { limit: number; ordering: number; before?: Uint8Array };
};

const cursor = (label: string) => new TextEncoder().encode(label);
const b64 = (label: string) => toBase64(cursor(label));
/** Bytes como array: los `Uint8Array` de jsdom y de Node no se comparan bien con `toEqual`. */
const bytesOf = (value: Uint8Array | undefined) => (value === undefined ? undefined : Array.from(value));

/** Frames de un pedido: un evento por frame con el watermark `label`, y el final con `reason` (sin `end` si es `null`). */
function page(events: Created[], reason: number | null, label: string | null): Frame[] {
  const watermark = label === null ? undefined : { cursor: cursor(label), checkpoint: 100n };
  const frames: Frame[] = events.map((e) => ({
    event: { eventType: CREATED_TYPE, contents: { value: e.bcs }, transactionDigest: e.txDigest, checkpoint: 100n },
    ...(watermark ? { watermark } : {}),
  }));
  if (reason !== null) frames.push({ ...(watermark ? { watermark } : {}), end: { reason } });
  return frames;
}

function failingStream(error: Error): AsyncIterable<Frame> {
  return {
    [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(error) }),
  };
}
async function* frameStream(frames: Frame[]): AsyncIterable<Frame> {
  for (const frame of frames) {
    await Promise.resolve();
    yield frame;
  }
}

function makeClient({
  scripts,
  floors = [0n],
  objects = [],
}: {
  scripts: Script[];
  floors?: (bigint | null | Error)[];
  objects?: SdkObject[];
}) {
  let call = 0;
  const listEvents = vi.fn((request: ListRequest) => {
    const script = scripts[Math.min(call, scripts.length - 1)] ?? [];
    call++;
    return { request, responses: script instanceof Error ? failingStream(script) : frameStream(script) };
  });
  let infoCall = 0;
  const getServiceInfo = vi.fn(() => {
    const floor = floors[Math.min(infoCall, floors.length - 1)] ?? null;
    infoCall++;
    if (floor instanceof Error) return Promise.reject(floor);
    return Promise.resolve({ response: { chainId: TESTNET_CHAIN_ID_BASE58, checkpointHeight: 1n, lowestAvailableCheckpoint: floor ?? undefined } });
  });
  const byId = new Map(objects.map((o) => [o.objectId, o]));
  const getObjects = vi.fn(({ objectIds }: { objectIds: string[] }) =>
    Promise.resolve({
      objects: objectIds.map((id) => byId.get(id) ?? new ObjectError('notExists', `${id} not found`, { reason: 'notFound', objectId: id })),
    }),
  );
  const client = { ledgerService: { listEvents, getServiceInfo }, getObjects } as unknown as EventScanClient;
  return { client, listEvents, getServiceInfo, getObjects };
}

const request = (mock: ReturnType<typeof makeClient>['listEvents'], i: number): ListRequest => {
  const args = mock.mock.calls[i];
  if (!args) throw new Error(`no hubo pedido ${String(i)}`);
  return args[0];
};
const fetchPage = (client: EventScanClient, opts: { publishCheckpoint?: bigint | null; before?: string | null } = {}) =>
  fetchLobbyPage(client, { originalPackageId: PKG, publishCheckpoint: opts.publishCheckpoint ?? 59n, before: opts.before ?? null });

// ---------- Tests ----------
describe('calibrated constants', () => {
  it('match the TASK-1 calibration (50 / 2 / 20 / 16 000)', () => {
    expect([LOBBY_EVENTS_PER_REQUEST, LOBBY_MAX_REQUESTS_PER_PAGE, LOBBY_PAGE_TARGET, HISTORY_FLOOR_MARGIN_CHECKPOINTS]).toEqual([50, 2, 20, 16_000n]);
  });
});

describe('fetchLobbyPage: requests', () => {
  it('keeps only open pending games, in event order, with one bounded raw request', async () => {
    const open1 = openGame(1);
    const created = [
      open1.created,
      createdFor(fixtureObject('pendingInvite'), 'tx-invite'),
      createdFor(fixtureObject('cancelledByCreator'), 'tx-cancelled'),
      createdFor(fixtureObject('resolved'), 'tx-resolved'),
      createdFor(fixtureObject('pendingOpen'), 'tx-open'),
    ];
    const objects = [open1.object, ...(['pendingOpen', 'pendingInvite', 'cancelledByCreator', 'cancelledByInvitee', 'resolved'] as const).map(fixtureObject)];
    const { client, listEvents } = makeClient({ scripts: [page(created, QueryEndReason.CHECKPOINT_BOUND, 'c1')], objects });
    const result = await fetchPage(client);
    expect(result.items.map((i) => (i.kind === 'game' ? i.game.id : i.kind))).toEqual([open1.object.objectId, fixture.objects.pendingOpen.objectId]);
    expect(result.items[0]).toMatchObject({ kind: 'game', createdTxDigest: 'tx-open-1' });
    expect(result).toMatchObject({ hasNextPage: false, end: 'bound', lowerBound: { checkpoint: 59n, kind: 'publish' }, endCursor: b64('c1') });
    expect(listEvents).toHaveBeenCalledTimes(1);
    const req = request(listEvents, 0);
    expect(req.startCheckpoint).toBe(59n);
    expect(req.options).toMatchObject({ limit: LOBBY_EVENTS_PER_REQUEST, ordering: Ordering.DESCENDING, before: undefined });
    expect(req.readMask.paths).not.toContain('sender');
    expect(JSON.stringify(req.filter)).toContain(CREATED_TYPE);
  });

  it('sends the before cursor as bytes', async () => {
    const { client, listEvents } = makeClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'c9')] });
    await fetchPage(client, { before: b64('c0') });
    expect(bytesOf(request(listEvents, 0).options.before)).toEqual(bytesOf(cursor('c0')));
  });

  it('follows empty SCAN_LIMIT requests with the new cursor and the same startCheckpoint', async () => {
    const open1 = openGame(1);
    const { client, listEvents } = makeClient({
      scripts: [page([], QueryEndReason.SCAN_LIMIT, 'c1'), page([open1.created], QueryEndReason.CHECKPOINT_BOUND, 'c2')],
      objects: [open1.object],
    });
    const result = await fetchPage(client);
    expect(listEvents).toHaveBeenCalledTimes(2);
    expect(bytesOf(request(listEvents, 1).options.before)).toEqual(bytesOf(cursor('c1')));
    expect(request(listEvents, 1).startCheckpoint).toBe(59n);
    expect(result).toMatchObject({ hasNextPage: false, end: 'bound' });
    expect(result.items).toHaveLength(1);
  });

  it('never makes more than LOBBY_MAX_REQUESTS_PER_PAGE requests', async () => {
    const scripts = Array.from({ length: 5 }, (_, i) => page([], QueryEndReason.SCAN_LIMIT, `c${String(i + 1)}`));
    const { client, listEvents } = makeClient({ scripts });
    const result = await fetchPage(client);
    expect(listEvents).toHaveBeenCalledTimes(LOBBY_MAX_REQUESTS_PER_PAGE);
    expect(result).toMatchObject({ items: [], hasNextPage: true, end: 'more', endCursor: b64('c2') });
  });

  it('stops when the page target is reached', async () => {
    const games = Array.from({ length: LOBBY_PAGE_TARGET }, (_, i) => openGame(i + 1));
    const { client, listEvents } = makeClient({
      scripts: [page(games.map((g) => g.created), QueryEndReason.ITEM_LIMIT, 'c1'), page([], QueryEndReason.CHECKPOINT_BOUND, 'c2')],
      objects: games.map((g) => g.object),
    });
    const result = await fetchPage(client);
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(LOBBY_PAGE_TARGET);
    expect(result).toMatchObject({ hasNextPage: true, end: 'more' });
  });

  it('ends with hasNextPage false on CHECKPOINT_BOUND even without items', async () => {
    const { client, getObjects } = makeClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'c1')] });
    await expect(fetchPage(client)).resolves.toMatchObject({ items: [], hasNextPage: false, end: 'bound' });
    expect(getObjects).not.toHaveBeenCalled();
  });

  it('omits games whose object no longer exists (raw page of the fixture)', async () => {
    const rawFrames: Frame[] = fixture.rawListEventsPage.frames.map((f) => ({
      ...(f.event
        ? { event: { eventType: f.event.eventType, contents: { value: fromBase64(f.event.contents.value) }, transactionDigest: f.event.transactionDigest, checkpoint: BigInt(f.event.checkpoint) } }
        : {}),
      ...(f.watermark ? { watermark: { cursor: fromBase64(f.watermark.cursor), checkpoint: BigInt(f.watermark.checkpoint) } } : {}),
      ...(f.end ? { end: f.end } : {}),
    }));
    const { client, getObjects } = makeClient({ scripts: [rawFrames, page([], QueryEndReason.CHECKPOINT_BOUND, 'c2')] });
    const result = await fetchPage(client);
    expect(getObjects).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([]);
  });

  it('keeps healthy rows around an unreadable GameCreated and an unreadable object', async () => {
    const open1 = openGame(1);
    const broken = openGame(2);
    const brokenContent = new Uint8Array(broken.object.content);
    new DataView(brokenContent.buffer).setBigUint64(113, 1n, true); // stake ≠ bet en Pending
    const truncated: Created = { ...openGame(3).created, bcs: openGame(3).created.bcs.slice(0, -1), txDigest: 'tx-truncated' };
    const healthy = createdFor(fixtureObject('pendingOpen'), 'tx-open');
    const { client } = makeClient({
      scripts: [page([open1.created, truncated, broken.created, healthy], QueryEndReason.CHECKPOINT_BOUND, 'c1')],
      objects: [open1.object, { ...broken.object, content: brokenContent }, fixtureObject('pendingOpen')],
    });
    const { items } = await fetchPage(client);
    expect(items).toEqual([
      expect.objectContaining({ kind: 'game', createdTxDigest: 'tx-open-1' }),
      { kind: 'unreadable', gameId: null, txDigest: 'tx-truncated' },
      { kind: 'unreadable', gameId: broken.object.objectId, txDigest: 'tx-open-2' },
      expect.objectContaining({ kind: 'game', createdTxDigest: 'tx-open' }),
    ]);
  });
});

describe('fetchLobbyPage: protocol errors', () => {
  it('throws PaginationStalledError when the cursor does not advance (M-2)', async () => {
    const { client } = makeClient({ scripts: [page([], QueryEndReason.SCAN_LIMIT, 'c1')] });
    const error = await fetchPage(client, { before: b64('c1') }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaginationStalledError);
    expect(shouldRetryRead(0, error)).toBe(false);
  });

  it('throws PaginationStalledError on SCAN_LIMIT without a cursor', async () => {
    const { client } = makeClient({ scripts: [page([], QueryEndReason.SCAN_LIMIT, null)] });
    await expect(fetchPage(client)).rejects.toBeInstanceOf(PaginationStalledError);
  });

  it('rejects a stream without QueryEnd as malformed', async () => {
    const { client } = makeClient({ scripts: [page([], null, 'c1')] });
    await expect(fetchPage(client)).rejects.toMatchObject({ reason: 'malformed' });
  });

  it.each([
    ['UNKNOWN', QueryEndReason.UNKNOWN],
    ['out of the enum', 99],
  ])('rejects a %s end reason as malformed', async (_name, reason) => {
    const { client } = makeClient({ scripts: [page([], reason, 'c1')] });
    const error = await fetchPage(client).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason: 'malformed' });
  });
});

describe('fetchLobbyPage: pruned history (M-4, H-5)', () => {
  it('uses floor + margin as startCheckpoint when the publish transaction was pruned', async () => {
    const { client, listEvents } = makeClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'c1')], floors: [1_000n] });
    const result = await fetchPage(client, { publishCheckpoint: null });
    expect(request(listEvents, 0).startCheckpoint).toBe(1_000n + HISTORY_FLOOR_MARGIN_CHECKPOINTS);
    expect(result.lowerBound).toEqual({ checkpoint: 17_000n, kind: 'node_floor' });
  });

  it('ends with the earlier items when the floor moved past the bound mid-scan', async () => {
    const open1 = openGame(1);
    const { client, getServiceInfo } = makeClient({
      scripts: [page([open1.created], QueryEndReason.SCAN_LIMIT, 'c1'), new RpcError('stream reset', 'INTERNAL')],
      floors: [0n, 5_000n],
      objects: [open1.object],
    });
    const result = await fetchPage(client, { publishCheckpoint: 100n });
    expect(result.items.map((i) => i.kind)).toEqual(['game']);
    expect(result).toMatchObject({ hasNextPage: false, end: 'history_pruned', lowerBound: { checkpoint: 100n, kind: 'node_floor' } });
    expect(getServiceInfo).toHaveBeenCalledTimes(2);
  });

  it('rethrows the original error when the floor did not move', async () => {
    const original = new RpcError('stream reset', 'INTERNAL');
    const { client } = makeClient({ scripts: [page([openGame(1).created], QueryEndReason.SCAN_LIMIT, 'c1'), original], floors: [0n, 0n] });
    await expect(fetchPage(client, { publishCheckpoint: 100n })).rejects.toBe(original);
  });

  it('rethrows the original request error when re-reading the floor also fails (NIT-1)', async () => {
    const original = new RpcError('stream reset', 'UNAVAILABLE');
    const { client } = makeClient({
      scripts: [page([], QueryEndReason.SCAN_LIMIT, 'c1'), original],
      floors: [0n, new RpcError('node down', 'INTERNAL')],
    });
    await expect(fetchPage(client, { publishCheckpoint: 100n })).rejects.toBe(original);
  });

  it('re-reads the floor at the start of every page', async () => {
    const { client, getServiceInfo } = makeClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'c1')] });
    await fetchPage(client);
    await fetchPage(client);
    expect(getServiceInfo).toHaveBeenCalledTimes(2);
  });

  it('turns OUT_OF_RANGE mid-scan into history_pruned without re-reading the floor (H-5)', async () => {
    const open1 = openGame(1);
    const { client, getServiceInfo } = makeClient({
      scripts: [page([open1.created], QueryEndReason.SCAN_LIMIT, 'c1'), new RpcError('requested data below earliest available', 'OUT_OF_RANGE')],
      floors: [0n],
      objects: [open1.object],
    });
    const result = await fetchPage(client, { publishCheckpoint: 100n });
    expect(result.items).toHaveLength(1);
    expect(result).toMatchObject({ hasNextPage: false, end: 'history_pruned', lowerBound: { kind: 'node_floor' } });
    expect(getServiceInfo).toHaveBeenCalledTimes(1);
  });

  it('returns an empty history_pruned page when the first request is OUT_OF_RANGE (H-5)', async () => {
    const outOfRange = new RpcError('requested data below earliest available', 'OUT_OF_RANGE');
    const { client } = makeClient({ scripts: [outOfRange], floors: [1_000n] });
    await expect(fetchPage(client)).resolves.toMatchObject({
      items: [],
      hasNextPage: false,
      end: 'history_pruned',
      lowerBound: { kind: 'node_floor' },
    });
    expect(shouldRetryRead(0, outOfRange)).toBe(false);
  });

  it('rethrows CANCELLED without re-reading the floor', async () => {
    const cancelled = new RpcError('cancelled', 'CANCELLED');
    const { client, getServiceInfo } = makeClient({ scripts: [cancelled], floors: [0n, 5_000n] });
    await expect(fetchPage(client)).rejects.toBe(cancelled);
    expect(getServiceInfo).toHaveBeenCalledTimes(1);
  });
});
