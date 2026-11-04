import { bcs } from '@mysten/sui/bcs';
import { ObjectError } from '@mysten/sui/client';
import { GrpcTypes, RpcError } from '@mysten/sui/grpc';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { b64, listRequest, makeScanClient, scanFrames, type ScanEvent } from '../test/scanHarness';
import { gameEventType } from './events';
import { eventTypeFilter } from './eventScan';
import { gameType, type Game, type GameState } from './game';
import { LOBBY_EVENTS_PER_REQUEST, LOBBY_MAX_REQUESTS_PER_PAGE, LOBBY_PAGE_TARGET } from './lobby';
import {
  extendPins,
  fetchInvitationsPage,
  fetchMyActivityPage,
  groupMyGames,
  mergeMyGames,
  MY_ACTIVITY_EVENTS_PER_REQUEST,
  MY_ACTIVITY_MAX_REQUESTS_PER_PAGE,
  myActivityFilter,
  naturalSection,
  sectionFooter,
  type MyGameItem,
  type MyGameRole,
  type MyGamesPins,
} from './myGames';
import { PaginationStalledError } from './readErrors';

const { QueryEndReason } = GrpcTypes;

// ---------- Direcciones, IDs y tipos ----------
const PKG = normalizeSuiAddress('0xb47');
const HOUSE = normalizeSuiAddress('0x4005e');
const ME = normalizeSuiAddress('0xa11ce');
const OTHER = normalizeSuiAddress('0xb0b');
const THIRD = normalizeSuiAddress('0xc0c');
const gid = (n: number) => normalizeSuiAddress((0x1000 + n).toString(16));
const CREATED = gameEventType(PKG, 'GameCreated');
const RESOLVED = gameEventType(PKG, 'GameResolved');

// ---------- BCS de `contracts/sources/game.move` (copia de test de los esquemas de game.ts y events.ts) ----------
const GameBcs = bcs.struct('Game', {
  id: bcs.Address,
  version: bcs.u64(),
  house_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  stake: bcs.u64(),
  fee_rate: bcs.u16(),
  state: bcs.enum('GameState', {
    Pending: null,
    Cancelled: null,
    Resolved: bcs.struct('GameStateResolved', { acceptor: bcs.Address, winner: bcs.Address }),
  }),
});
const CreatedBcs = bcs.struct('GameCreated', {
  game_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
});
const ResolvedBcs = bcs.struct('GameResolved', {
  game_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});

const BET = 1_000_000n;
type Spec = { id: string; creator: string; opponent?: string | null; state?: GameState; version?: bigint; stake?: bigint };

function gameOf({ id, creator, opponent = null, state = { kind: 'pending' } }: Spec): Game {
  return { id, version: 1n, houseId: HOUSE, creator, opponent, bet: BET, stake: state.kind === 'pending' ? BET : 0n, feeRate: 250, state };
}

/** Objeto del SDK (`getObjects` con `content`) de una partida; `stake` permite romper el invariante. */
function gameObject(spec: Spec) {
  const game = gameOf(spec);
  const state =
    game.state.kind === 'resolved'
      ? { Resolved: { acceptor: game.state.acceptor, winner: game.state.winner } }
      : game.state.kind === 'cancelled'
        ? { Cancelled: true }
        : { Pending: true };
  const content = GameBcs.serialize({
    id: game.id,
    version: 1n,
    house_id: HOUSE,
    creator: game.creator,
    opponent: game.opponent,
    bet: game.bet,
    stake: spec.stake ?? game.stake,
    fee_rate: game.feeRate,
    state,
  }).toBytes();
  return {
    objectId: game.id,
    version: String(spec.version ?? 4n),
    digest: 'objdigest',
    owner: { $kind: 'Shared' as const, Shared: { initialSharedVersion: '3' } },
    type: gameType(PKG),
    content,
  };
}

function createdEvent(spec: Spec, txDigest: string, checkpoint = 100n): ScanEvent {
  const value = CreatedBcs.serialize({ game_id: spec.id, creator: spec.creator, opponent: spec.opponent ?? null, bet: BET, fee_rate: 250 }).toBytes();
  return { eventType: CREATED, contents: { value }, transactionDigest: txDigest, checkpoint };
}

function resolvedEvent({ id, creator, acceptor, winner }: { id: string; creator: string; acceptor: string; winner: string }, txDigest: string, checkpoint = 100n): ScanEvent {
  const value = ResolvedBcs.serialize({ game_id: id, creator, acceptor, winner, pot: 2n * BET, fee: 50_000n, payout: 2n * BET - 50_000n }).toBytes();
  return { eventType: RESOLVED, contents: { value }, transactionDigest: txDigest, checkpoint };
}

const objectsOf = (...objects: ReturnType<typeof gameObject>[]) => new Map<string, unknown>(objects.map((o) => [o.objectId, o]));
const page = (events: ScanEvent[], reason: GrpcTypes.QueryEndReason, label: string) =>
  scanFrames(events, reason, label, { itemLimit: reason === QueryEndReason.ITEM_LIMIT });
const sourceArgs = (before: string | null = null) => ({ originalPackageId: PKG, address: ME, publishCheckpoint: 59n, before });

// ---------- Ítems para las funciones puras ----------
function item(spec: Spec, { role, version = 4n, tx = 'tx', cp = 100n }: { role: MyGameRole; version?: bigint; tx?: string; cp?: bigint | null }): MyGameItem {
  return { kind: 'game', game: gameOf(spec), objectVersion: version, role, txDigest: tx, checkpoint: cp };
}
function unreadable(gameId: string | null, { role = null, tx = 'tx-bad', cp = 100n }: { role?: MyGameRole | null; tx?: string; cp?: bigint | null } = {}): MyGameItem {
  return { kind: 'unreadable', gameId, role, txDigest: tx, checkpoint: cp };
}
const resolvedState = (acceptor: string, winner: string): GameState => ({ kind: 'resolved', acceptor, winner });

// ---------- Tests ----------
describe('constants', () => {
  it('match DL-8 (activity 50 / 1)', () => {
    expect([MY_ACTIVITY_EVENTS_PER_REQUEST, MY_ACTIVITY_MAX_REQUESTS_PER_PAGE]).toEqual([50, 1]);
  });
});

// T2-4
describe('myActivityFilter', () => {
  it('is the exact DNF [sender ∧ GameCreated] ∨ [sender ∧ GameResolved] with the normalized sender', () => {
    const sender = { negated: false, predicate: { oneofKind: 'sender', sender: { address: ME } } };
    const type = (eventType: string) => ({ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType } } });
    expect(myActivityFilter('0xb47', '0xA11CE')).toEqual({
      terms: [{ literals: [sender, type(CREATED)] }, { literals: [sender, type(RESOLVED)] }],
    });
  });
});

describe('fetchMyActivityPage', () => {
  // T2-5
  it('returns own GameCreated and GameResolved as items with role, object version, digest and checkpoint', async () => {
    const created = { id: gid(1), creator: ME };
    const accepted = { id: gid(2), creator: OTHER, state: resolvedState(ME, OTHER) };
    const { client, listEvents, getObjects } = makeScanClient({
      scripts: [
        page(
          [resolvedEvent({ id: gid(2), creator: OTHER, acceptor: ME, winner: OTHER }, 'tx-accept', 1001n), createdEvent(created, 'tx-create', 384n)],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(gameObject({ ...created, version: 4n }), gameObject({ ...accepted, version: 415n })),
    });
    const result = await fetchMyActivityPage(client, sourceArgs());
    expect(result.items).toEqual([
      { kind: 'game', game: gameOf(accepted), objectVersion: 415n, role: 'acceptor', txDigest: 'tx-accept', checkpoint: 1001n },
      { kind: 'game', game: gameOf(created), objectVersion: 4n, role: 'creator', txDigest: 'tx-create', checkpoint: 384n },
    ]);
    expect(result).toMatchObject({ hasNextPage: false, end: 'bound', endCursor: b64('bound'), unreadableEvents: 0, lowerBound: { checkpoint: 59n, kind: 'publish' } });
    const req = listRequest(listEvents, 0);
    expect(req.filter).toEqual(myActivityFilter(PKG, ME));
    expect(req.options.limit).toBe(MY_ACTIVITY_EVENTS_PER_REQUEST);
    expect(req.readMask.paths).not.toContain('sender');
    expect(getObjects).toHaveBeenCalledTimes(1);
  });

  it('makes a single request per page even when the node has more (DL-8)', async () => {
    const { client, listEvents } = makeScanClient({
      scripts: [page([createdEvent({ id: gid(1), creator: ME }, 'tx-1')], QueryEndReason.ITEM_LIMIT, 'c1'), page([], QueryEndReason.CHECKPOINT_BOUND, 'c2')],
      objects: objectsOf(gameObject({ id: gid(1), creator: ME })),
    });
    const result = await fetchMyActivityPage(client, sourceArgs());
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ hasNextPage: true, end: 'more', endCursor: b64('c1') });
  });

  // T2-6
  it('never shows an event of another account as own: GameCreated by another creator and GameResolved by another acceptor are unreadable', async () => {
    const { client, getObjects } = makeScanClient({
      scripts: [
        page(
          [
            createdEvent({ id: gid(1), creator: OTHER }, 'tx-foreign-create', 120n),
            resolvedEvent({ id: gid(2), creator: ME, acceptor: OTHER, winner: ME }, 'tx-foreign-accept', 110n),
          ],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(gameObject({ id: gid(1), creator: OTHER }), gameObject({ id: gid(2), creator: ME, state: resolvedState(OTHER, ME) })),
    });
    const { items } = await fetchMyActivityPage(client, sourceArgs());
    expect(items).toEqual([
      { kind: 'unreadable', gameId: gid(1), role: 'creator', txDigest: 'tx-foreign-create', checkpoint: 120n },
      { kind: 'unreadable', gameId: gid(2), role: 'acceptor', txDigest: 'tx-foreign-accept', checkpoint: 110n },
    ]);
    expect(getObjects).not.toHaveBeenCalled();
  });

  it('keeps an unparseable or unknown event as an unreadable row (role by type when known)', async () => {
    const truncated = createdEvent({ id: gid(1), creator: ME }, 'tx-truncated');
    const unknown: ScanEvent = { ...createdEvent({ id: gid(2), creator: ME }, 'tx-unknown'), eventType: `${PKG}::game::GameCancelled` };
    const { client } = makeScanClient({
      scripts: [page([{ ...truncated, contents: { value: truncated.contents.value.slice(0, -1) } }, unknown], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
    });
    const { items } = await fetchMyActivityPage(client, sourceArgs());
    expect(items).toEqual([
      { kind: 'unreadable', gameId: null, role: 'creator', txDigest: 'tx-truncated', checkpoint: 100n },
      { kind: 'unreadable', gameId: null, role: null, txDigest: 'tx-unknown', checkpoint: 100n },
    ]);
  });

  // T2-7
  it('ends with history_pruned and the node floor bound when the request crosses the floor', async () => {
    const outOfRange = new RpcError('requested data below earliest available', 'OUT_OF_RANGE');
    const { client } = makeScanClient({ scripts: [outOfRange], floors: [1_000n] });
    await expect(fetchMyActivityPage(client, { ...sourceArgs(), publishCheckpoint: null })).resolves.toMatchObject({
      items: [],
      hasNextPage: false,
      end: 'history_pruned',
      lowerBound: { checkpoint: 17_000n, kind: 'node_floor' },
    });
  });

  it('throws PaginationStalledError when the cursor does not advance with more pages', async () => {
    const { client } = makeScanClient({ scripts: [page([], QueryEndReason.ITEM_LIMIT, 'c1')] });
    await expect(fetchMyActivityPage(client, sourceArgs(b64('c1')))).rejects.toBeInstanceOf(PaginationStalledError);
  });

  it('treats an empty CHECKPOINT_BOUND page after an ITEM_LIMIT cursor as a normal end (V-9)', async () => {
    const { client, getObjects } = makeScanClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    await expect(fetchMyActivityPage(client, sourceArgs(b64('c1')))).resolves.toEqual({
      items: [],
      endCursor: b64('bound'),
      hasNextPage: false,
      lowerBound: { checkpoint: 59n, kind: 'publish' },
      end: 'bound',
      unreadableEvents: 0,
    });
    expect(getObjects).not.toHaveBeenCalled();
  });

  // T2-8
  it('omits a game whose object no longer exists and keeps an unreadable object as a row without hiding healthy ones', async () => {
    const gone = { id: gid(1), creator: ME };
    const broken = { id: gid(2), creator: ME };
    const healthy = { id: gid(3), creator: ME };
    const { client } = makeScanClient({
      scripts: [page([createdEvent(gone, 'tx-gone', 130n), createdEvent(broken, 'tx-broken', 120n), createdEvent(healthy, 'tx-ok', 110n)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: new Map<string, unknown>([
        [gid(1), new ObjectError('notExists', 'not found', { reason: 'notFound', objectId: gid(1) })],
        [gid(2), gameObject({ ...broken, stake: 1n })],
        [gid(3), gameObject(healthy)],
      ]),
    });
    const { items } = await fetchMyActivityPage(client, sourceArgs());
    expect(items).toEqual([
      { kind: 'unreadable', gameId: gid(2), role: 'creator', txDigest: 'tx-broken', checkpoint: 120n },
      expect.objectContaining({ kind: 'game', role: 'creator', txDigest: 'tx-ok' }),
    ]);
  });
});

// T2-9, T2-10
describe('fetchInvitationsPage', () => {
  it('keeps only invitations to the account, also finished ones, with role invitee', async () => {
    const open = { id: gid(1), creator: OTHER };
    const toOther = { id: gid(2), creator: OTHER, opponent: THIRD };
    const pending = { id: gid(3), creator: OTHER, opponent: ME };
    const accepted = { id: gid(4), creator: OTHER, opponent: ME, state: resolvedState(ME, ME) };
    const rejected = { id: gid(5), creator: OTHER, opponent: ME, state: { kind: 'cancelled' } as const };
    const { client, listEvents, getObjects } = makeScanClient({
      scripts: [
        page(
          [createdEvent(open, 'tx-1', 150n), createdEvent(toOther, 'tx-2', 140n), createdEvent(pending, 'tx-3', 130n), createdEvent(accepted, 'tx-4', 120n), createdEvent(rejected, 'tx-5', 110n)],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(gameObject(open), gameObject(toOther), gameObject(pending), gameObject(accepted), gameObject(rejected)),
    });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(result.items.map((i) => (i.kind === 'game' ? [i.game.id, i.role, i.game.state.kind, i.txDigest] : i.kind))).toEqual([
      [gid(3), 'invitee', 'pending', 'tx-3'],
      [gid(4), 'invitee', 'resolved', 'tx-4'],
      [gid(5), 'invitee', 'cancelled', 'tx-5'],
    ]);
    expect(result).toMatchObject({ hasNextPage: false, end: 'bound', unreadableEvents: 0 });
    const req = listRequest(listEvents, 0);
    expect(req.filter).toEqual(eventTypeFilter(CREATED));
    expect(req.options.limit).toBe(LOBBY_EVENTS_PER_REQUEST);
    expect(getObjects.mock.calls[0]?.[0].objectIds).toEqual([gid(3), gid(4), gid(5)]);
  });

  it('never makes more than LOBBY_MAX_REQUESTS_PER_PAGE requests', async () => {
    const scripts = Array.from({ length: 5 }, (_, i) => page([], QueryEndReason.SCAN_LIMIT, `c${String(i + 1)}`));
    const { client, listEvents } = makeScanClient({ scripts });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(listEvents).toHaveBeenCalledTimes(LOBBY_MAX_REQUESTS_PER_PAGE);
    expect(result).toMatchObject({ items: [], hasNextPage: true, end: 'more', endCursor: b64('c2') });
  });

  it('stops when the page target of invitations is reached', async () => {
    const invites = Array.from({ length: LOBBY_PAGE_TARGET }, (_, i) => ({ id: gid(i + 1), creator: OTHER, opponent: ME }));
    const { client, listEvents } = makeScanClient({
      scripts: [page(invites.map((g, i) => createdEvent(g, `tx-${String(i)}`)), QueryEndReason.ITEM_LIMIT, 'c1'), page([], QueryEndReason.CHECKPOINT_BOUND, 'c2')],
      objects: objectsOf(...invites.map(gameObject)),
    });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(result.items).toHaveLength(LOBBY_PAGE_TARGET);
    expect(result).toMatchObject({ hasNextPage: true, end: 'more' });
  });

  it('ends the page with hasNextPage false when exactly LOBBY_EVENTS_PER_REQUEST events remained (V-9)', async () => {
    const others = Array.from({ length: LOBBY_EVENTS_PER_REQUEST }, (_, i) => createdEvent({ id: gid(i + 1), creator: OTHER }, `tx-${String(i)}`));
    const { client, listEvents } = makeScanClient({
      scripts: [page(others, QueryEndReason.ITEM_LIMIT, 'c1'), page([], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
    });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(listEvents).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ items: [], endCursor: b64('bound'), hasNextPage: false, lowerBound: { checkpoint: 59n, kind: 'publish' }, end: 'bound', unreadableEvents: 0 });
  });

  it('ends with the gathered items when the scan crosses the floor (history_pruned)', async () => {
    const pending = { id: gid(1), creator: OTHER, opponent: ME };
    const { client } = makeScanClient({
      scripts: [page([createdEvent(pending, 'tx-1')], QueryEndReason.SCAN_LIMIT, 'c1'), new RpcError('requested data below earliest available', 'OUT_OF_RANGE')],
      objects: objectsOf(gameObject(pending)),
    });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(result.items.map((i) => i.kind)).toEqual(['game']);
    expect(result).toMatchObject({ hasNextPage: false, end: 'history_pruned', lowerBound: { kind: 'node_floor' } });
  });

  it('throws PaginationStalledError when the cursor does not advance', async () => {
    const { client } = makeScanClient({ scripts: [page([], QueryEndReason.SCAN_LIMIT, 'c1')] });
    await expect(fetchInvitationsPage(client, sourceArgs(b64('c1')))).rejects.toBeInstanceOf(PaginationStalledError);
  });

  it('counts an unreadable event without a row, and keeps an unreadable object of an invitation as an invitee row (MINOR-4)', async () => {
    const invite = { id: gid(1), creator: OTHER, opponent: ME };
    const truncated = createdEvent({ id: gid(2), creator: OTHER, opponent: ME }, 'tx-truncated');
    const { client } = makeScanClient({
      scripts: [page([{ ...truncated, contents: { value: truncated.contents.value.slice(0, -1) } }, createdEvent(invite, 'tx-invite', 90n)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(gameObject({ ...invite, stake: 1n })),
    });
    const result = await fetchInvitationsPage(client, sourceArgs());
    expect(result.unreadableEvents).toBe(1);
    expect(result.items).toEqual([{ kind: 'unreadable', gameId: gid(1), role: 'invitee', txDigest: 'tx-invite', checkpoint: 90n }]);
  });
});

// T2-11
describe('naturalSection', () => {
  it.each<[string, MyGameItem, ReturnType<typeof naturalSection>]>([
    ['pending invitation', item({ id: gid(1), creator: OTHER, opponent: ME }, { role: 'invitee' }), 'invitations'],
    ['own pending game', item({ id: gid(1), creator: ME }, { role: 'creator' }), 'pending'],
    ['own invitation to another, pending', item({ id: gid(1), creator: ME, opponent: OTHER }, { role: 'creator' }), 'pending'],
    ['resolved as creator', item({ id: gid(1), creator: ME, state: resolvedState(OTHER, ME) }, { role: 'creator' }), 'finished'],
    ['resolved as acceptor', item({ id: gid(1), creator: OTHER, state: resolvedState(ME, OTHER) }, { role: 'acceptor' }), 'finished'],
    ['accepted invitation (invitee source)', item({ id: gid(1), creator: OTHER, opponent: ME, state: resolvedState(ME, ME) }, { role: 'invitee' }), 'finished'],
    ['own cancelled game', item({ id: gid(1), creator: ME, state: { kind: 'cancelled' } }, { role: 'creator' }), 'finished'],
    ['rejected or cancelled invitation', item({ id: gid(1), creator: OTHER, opponent: ME, state: { kind: 'cancelled' } }, { role: 'invitee' }), null],
    ['acceptor role on a pending object (contradiction)', item({ id: gid(1), creator: OTHER }, { role: 'acceptor' }), null],
    ['unreadable invitation', unreadable(gid(1), { role: 'invitee' }), 'invitations'],
    ['unreadable own creation', unreadable(gid(1), { role: 'creator' }), 'finished'],
    ['unreadable own acceptance', unreadable(gid(1), { role: 'acceptor' }), 'finished'],
    ['unreadable of unknown role', unreadable(null), 'finished'],
  ])('%s', (_name, input, expected) => {
    expect(naturalSection(input, ME)).toBe(expected);
  });

  it('compares the account without regard to case or leading zeros', () => {
    expect(naturalSection(item({ id: gid(1), creator: ME }, { role: 'creator' }), '0xA11CE')).toBe('pending');
  });
});

// T2-12, T2-14
describe('mergeMyGames', () => {
  const invitation = { id: gid(1), creator: OTHER, opponent: ME };
  const acceptedRead = item({ ...invitation, state: resolvedState(ME, OTHER) }, { role: 'acceptor', version: 415n, tx: 'tx-accept', cp: 1001n });
  const pendingRead = item(invitation, { role: 'invitee', version: 4n, tx: 'tx-create', cp: 393n });

  it('merges an accepted invitation from both sources into one row: newest read, role acceptor, newest event', () => {
    expect(mergeMyGames([acceptedRead], [pendingRead])).toEqual([acceptedRead]);
  });

  it('takes the newest object read even when it came from the invitations source (versions not consecutive)', () => {
    const resolved = { ...invitation, state: resolvedState(ME, OTHER) };
    const staleActivity = item(invitation, { role: 'acceptor', version: 4n, tx: 'tx-accept', cp: 1001n });
    const freshInvitation = item(resolved, { role: 'invitee', version: 415n, tx: 'tx-create', cp: 393n });
    expect(mergeMyGames([staleActivity], [freshInvitation])).toEqual([
      { kind: 'game', game: gameOf(resolved), objectVersion: 415n, role: 'acceptor', txDigest: 'tx-accept', checkpoint: 1001n },
    ]);
  });

  it('never merges two different games that share an object version (V-10)', () => {
    const a = item({ id: gid(1), creator: ME }, { role: 'creator', version: 4n, tx: 'tx-batch' });
    const b = item({ id: gid(2), creator: OTHER, opponent: ME }, { role: 'invitee', version: 4n, tx: 'tx-batch' });
    expect(mergeMyGames([a], [b])).toEqual([a, b]);
  });

  it('prefers the readable row over an unreadable one of the same game in both orders (H-2)', () => {
    const broken = unreadable(gid(1), { role: 'invitee', tx: 'tx-newer', cp: 2000n });
    expect(mergeMyGames([acceptedRead], [broken])).toEqual([acceptedRead]);
    expect(mergeMyGames([broken], [acceptedRead])).toEqual([acceptedRead]);
  });

  it('keeps the newest event between two unreadable rows of the same game', () => {
    const older = unreadable(gid(1), { role: 'acceptor', tx: 'tx-old', cp: 10n });
    const newer = unreadable(gid(1), { role: 'invitee', tx: 'tx-new', cp: 20n });
    expect(mergeMyGames([older], [newer])).toEqual([newer]);
    expect(mergeMyGames([newer], [older])).toEqual([newer]);
  });

  it('does not deduplicate unreadable rows without a game id', () => {
    const a = unreadable(null, { tx: 'tx-a' });
    const b = unreadable(null, { tx: 'tx-b' });
    expect(mergeMyGames([a], [b])).toEqual([a, b]);
  });
});

// T2-13
describe('extendPins', () => {
  it('returns the same instance when there is nothing new to pin', () => {
    const pins: MyGamesPins = new Map([[gid(1), 'pending']]);
    const items = [item({ id: gid(1), creator: ME, state: { kind: 'cancelled' } }, { role: 'creator' }), unreadable(null)];
    expect(extendPins(pins, items, ME)).toBe(pins);
  });

  it('does not pin a row without natural section', () => {
    const pins: MyGamesPins = new Map();
    const rejected = item({ id: gid(1), creator: OTHER, opponent: ME, state: { kind: 'cancelled' } }, { role: 'invitee' });
    expect(extendPins(pins, [rejected], ME)).toBe(pins);
  });

  it('returns a new map with the new pins and leaves the previous one intact', () => {
    const pins: MyGamesPins = new Map([[gid(1), 'pending']]);
    const next = extendPins(pins, [item({ id: gid(1), creator: ME }, { role: 'creator' }), item({ id: gid(2), creator: OTHER, opponent: ME }, { role: 'invitee' })], ME);
    expect(next).not.toBe(pins);
    expect([...next]).toEqual([
      [gid(1), 'pending'],
      [gid(2), 'invitations'],
    ]);
    expect([...pins]).toEqual([[gid(1), 'pending']]);
  });

  it('pins a game read differently by the two sources in the section of the H-2 winner (MINOR-1 of handoff v1)', () => {
    const invitation = { id: gid(1), creator: OTHER, opponent: ME };
    const activity = [item({ ...invitation, state: resolvedState(ME, OTHER) }, { role: 'acceptor', version: 415n, cp: 1001n })];
    const invitations = [item(invitation, { role: 'invitee', version: 4n, cp: 393n })];
    expect(extendPins(new Map(), mergeMyGames(activity, invitations), ME).get(gid(1))).toBe('finished');
    const unreadableInvitation = [unreadable(gid(1), { role: 'invitee', cp: 2000n })];
    expect(extendPins(new Map(), mergeMyGames(activity, unreadableInvitation), ME).get(gid(1))).toBe('finished');
  });
});

// T2-15
describe('groupMyGames', () => {
  it('keeps a pinned invitation in its section after it was resolved, and places a new game in its natural section', () => {
    const invitation = { id: gid(1), creator: OTHER, opponent: ME };
    const pins: MyGamesPins = new Map([[gid(1), 'invitations']]);
    const sections = groupMyGames({
      activity: [
        item({ ...invitation, state: resolvedState(ME, ME) }, { role: 'acceptor', version: 415n, tx: 'tx-accept', cp: 1001n }),
        item({ id: gid(2), creator: ME }, { role: 'creator', tx: 'tx-new', cp: 900n }),
      ],
      invitations: [item(invitation, { role: 'invitee', version: 4n, tx: 'tx-create', cp: 393n })],
      address: ME,
      pins,
    });
    expect(sections.invitations).toMatchObject([{ kind: 'game', role: 'acceptor', txDigest: 'tx-accept', game: { id: gid(1), state: resolvedState(ME, ME) } }]);
    expect(sections.pending).toEqual([expect.objectContaining({ txDigest: 'tx-new' })]);
    expect(sections.finished).toEqual([]);
  });

  it('drops rows without section and sorts each section by checkpoint descending (null last, ties by digest)', () => {
    const sections = groupMyGames({
      activity: [
        item({ id: gid(1), creator: ME }, { role: 'creator', tx: 'tx-a', cp: 100n }),
        item({ id: gid(2), creator: ME }, { role: 'creator', tx: 'tx-b', cp: null }),
        item({ id: gid(3), creator: ME }, { role: 'creator', tx: 'tx-c', cp: 300n }),
        item({ id: gid(4), creator: ME }, { role: 'creator', tx: 'tx-d', cp: 100n }),
        unreadable(null, { tx: 'tx-u', cp: 50n }),
      ],
      invitations: [item({ id: gid(5), creator: OTHER, opponent: ME, state: { kind: 'cancelled' } }, { role: 'invitee', cp: 999n })],
      address: ME,
      pins: new Map(),
    });
    expect(sections.pending.map((i) => i.txDigest)).toEqual(['tx-c', 'tx-d', 'tx-a', 'tx-b']);
    expect(sections.finished.map((i) => i.txDigest)).toEqual(['tx-u']);
    expect(sections.invitations).toEqual([]);
  });
});

// T2-16
describe('sectionFooter', () => {
  const base: Parameters<typeof sectionFooter>[0] = { itemsInSection: 0, hasNextPage: false, stalled: false, nextPageError: null, isFetchingNextPage: false, floorBased: false };

  it.each<[string, Partial<typeof base>, ReturnType<typeof sectionFooter>]>([
    ['empty without more pages: definitive, no button', {}, { empty: 'definitive', showMore: false, moreDisabled: false, alert: false, floorNote: false }],
    ['empty with more pages: reviewed and button', { hasNextPage: true }, { empty: 'reviewed', showMore: true, moreDisabled: false, alert: false, floorNote: false }],
    [
      'empty with a load-more error without stalled: reviewed, button and alert',
      { hasNextPage: true, nextPageError: new Error('boom') },
      { empty: 'reviewed', showMore: true, moreDisabled: false, alert: true, floorNote: false },
    ],
    [
      'empty with stalled: reviewed, no button, alert',
      { hasNextPage: true, stalled: true, nextPageError: new Error('stalled') },
      { empty: 'reviewed', showMore: false, moreDisabled: false, alert: true, floorNote: false },
    ],
    ['with rows: no empty text', { itemsInSection: 2, hasNextPage: true }, { empty: null, showMore: true, moreDisabled: false, alert: false, floorNote: false }],
    ['while fetching the next page: button disabled', { hasNextPage: true, isFetchingNextPage: true }, { empty: 'reviewed', showMore: true, moreDisabled: true, alert: false, floorNote: false }],
    ['floor based: floor note', { floorBased: true }, { empty: 'definitive', showMore: false, moreDisabled: false, alert: false, floorNote: true }],
  ])('%s', (_name, overrides, expected) => {
    expect(sectionFooter({ ...base, ...overrides })).toEqual(expected);
  });

  it('never gives the definitive text with an error even without more pages', () => {
    expect(sectionFooter({ ...base, nextPageError: new Error('boom') }).empty).toBe('reviewed');
  });
});
