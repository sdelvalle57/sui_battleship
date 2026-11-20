import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { GrpcTypes } from '@mysten/sui/grpc';
import { fromBase64, normalizeSuiAddress, toBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { b64, listRequest, makeScanClient, scanFrames, type ScanEvent } from '../test/scanHarness';
import type { Duel } from './duel';
import { eventTypeFilter } from './eventScan';
import { gameType } from './game';
import { buildGameRegistry, controlLabel, type DuelSource, type LegacySource, type TypeOrigin } from './gameRegistry';
import { fetchLobbyPage } from './lobby';
import {
  fetchInvitationsPage,
  fetchMyActivityPage,
  groupMyGames,
  mergeMyGames,
  myActivityFilter,
  myGameKey,
  naturalSection,
  type MyDuelItem,
  type MyGameEntry,
} from './myGames';
import { ReadDataError } from './readErrors';

const { QueryEndReason } = GrpcTypes;

// Lobby y "Mis partidas" con las dos fuentes del coinflip (anterior `game::Game` y nueva `Duel<Coinflip>`), contra las
// fixtures reales de TASK-5 (`duel-reads`, producción) y la página cruda de la fixture de ensayo (`duel-clock`, solo para el
// caso de dos instanciaciones de `G`, S-1). Las direcciones salen de las fixtures; las del lado anterior son sintéticas.

type FixtureObject = { objectId: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string; version: string; json: Record<string, unknown> };
type FixtureEvent = { eventType: string; bcs: string; transactionDigest: string; checkpoint: string; json: Record<string, string | number | null> };
type ReadsFixture = {
  ids: { originalPackageId: string; upgrades: { version: number; packageId: string; txDigest: string }[] };
  typeOrigins: TypeOrigin[];
  objects: Record<'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'resolvedCreatorWins', FixtureObject>;
  events: Record<'duelCreatedOpen' | 'duelCreatedInvite' | 'duelResolvedCreatorWins' | 'duelCancelledByCreator', FixtureEvent>;
};
type ClockFixture = {
  _meta: { sandbox: boolean; sandboxConstants: Record<string, number> };
  rawListEventsPage: { frames: { event?: { eventType: string; contents: { value: string }; transactionDigest: string; checkpoint: string } }[] };
};
type LegacyFixture = { objects: { pendingOpen: FixtureObject; resolved: FixtureObject } };

const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-clock.localnet.json'
] as ClockFixture;
const legacyReads = import.meta.glob<LegacyFixture>('../../../contracts/fixtures/game-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/game-reads.localnet.json'
] as LegacyFixture;

const ORIGINAL = reads.ids.originalPackageId;
const registry = buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins });
const legacySource = registry[0]?.sources.find((s): s is LegacySource => s.kind === 'legacy');
const duelSource = registry[0]?.sources.find((s): s is DuelSource => s.kind === 'duel');
if (legacySource === undefined || duelSource === undefined) throw new Error('el registro de la fixture debe tener las dos fuentes');
const KNOWN_GAME_TAG = duelSource.gameTag;

const A = String(reads.events.duelCreatedOpen.json.creator);
const B = String(reads.events.duelCreatedInvite.json.opponent);
const LEGACY_PLAYER = `0x${'ab'.repeat(32)}`;
const LEGACY_OTHER = `0x${'cd'.repeat(32)}`;

// ---------- Eventos y objetos ----------
const fromFixtureEvent = (e: FixtureEvent, checkpoint = BigInt(e.checkpoint)): ScanEvent => ({
  eventType: e.eventType,
  contents: { value: fromBase64(e.bcs) },
  transactionDigest: e.transactionDigest,
  checkpoint,
});
const objectInput = (o: FixtureObject) => ({ objectId: o.objectId, version: o.version, digest: 'd', owner: o.owner, type: o.type, content: fromBase64(o.content) });

const LegacyCreatedBcs = bcs.struct('GameCreated', {
  game_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
});
const LegacyResolvedBcs = bcs.struct('GameResolved', {
  game_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});
const DuelCreatedBcs = bcs.struct('DuelCreated', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  fee_rate: bcs.u16(),
  control: bcs.u8(),
  turn_ms: bcs.u64(),
});

/** Un `Game` anterior con otro ID (los primeros 32 bytes del BCS) y el tipo del paquete de la fixture de `duel`. */
function legacyObject(source: FixtureObject, n: number) {
  const id = normalizeSuiAddress(`0x${n.toString(16)}`);
  const content = new Uint8Array(fromBase64(source.content));
  content.set(fromBase64(toBase64(new Uint8Array(32).map((_, i) => (i === 31 ? n : 0)))), 0);
  return { objectId: id, version: '4', digest: 'd', owner: source.owner, type: gameType(ORIGINAL), content };
}
const legacyCreated = (id: string, creator: string, opponent: string | null, tx: string, checkpoint = 100n): ScanEvent => ({
  eventType: legacySource.eventTypes.created,
  contents: { value: LegacyCreatedBcs.serialize({ game_id: id, creator, opponent, bet: 10_000_000n, fee_rate: 500 }).toBytes() },
  transactionDigest: tx,
  checkpoint,
});
const legacyResolved = (id: string, creator: string, acceptor: string, tx: string, checkpoint = 100n): ScanEvent => ({
  eventType: legacySource.eventTypes.resolved,
  contents: { value: LegacyResolvedBcs.serialize({ game_id: id, creator, acceptor, winner: creator, pot: 20_000_000n, fee: 1_000_000n, payout: 19_000_000n }).toBytes() },
  transactionDigest: tx,
  checkpoint,
});
const duelCreated = (id: string, creator: string, opponent: string | null, turnMs: bigint, tx: string, checkpoint = 100n): ScanEvent => ({
  eventType: duelSource.eventTypes.created,
  contents: { value: DuelCreatedBcs.serialize({ duel_id: id, creator, opponent, bet: 10_000_000n, fee_rate: 500, control: turnMs === 0n ? 0 : 8, turn_ms: turnMs }).toBytes() },
  transactionDigest: tx,
  checkpoint,
});

/** Eventos de un `G` que el registro de producción no conoce, de la página cruda de la fixture de ensayo (dos instanciaciones de `G`). */
function foreignEvents(): ScanEvent[] {
  expect(clock._meta.sandbox).toBe(true);
  const known = KNOWN_GAME_TAG;
  return clock.rawListEventsPage.frames.flatMap((frame) =>
    frame.event === undefined || frame.event.eventType.includes(known)
      ? []
      : [
          {
            eventType: frame.event.eventType,
            contents: { value: fromBase64(frame.event.contents.value) },
            transactionDigest: frame.event.transactionDigest,
            checkpoint: BigInt(frame.event.checkpoint),
          },
        ],
  );
}

const page = (events: ScanEvent[], reason: GrpcTypes.QueryEndReason, label: string) => scanFrames(events, reason, label, { itemLimit: reason === QueryEndReason.ITEM_LIMIT });
const lobbyArgs = (games: 'all' | 'coinflip' = 'all') => ({ registry, games, publishCheckpoint: 59n, before: null });
const objectsOf = (...objects: { objectId: string }[]) => new Map<string, unknown>(objects.map((o) => [o.objectId, o]));
const eventLiteralTypes = (filter: unknown) =>
  (filter as GrpcTypes.EventFilter).terms.map((term) => term.literals.map((l) => (l.predicate.oneofKind === 'eventType' ? l.predicate.eventType.eventType : l.predicate.oneofKind)));
const duelRows = (items: MyGameEntry[]) => items.filter((item): item is MyDuelItem => item.kind === 'duel');

describe('lobby with the two sources of the coinflip', () => {
  it('"Todos": ONE request, an OR of one literal per source (the exact legacy tag and the duel PREFIX, no emit module)', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    await fetchLobbyPage(client, lobbyArgs());
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(eventLiteralTypes(listRequest(listEvents, 0).filter)).toEqual([[legacySource.eventTypes.created], [duelSource.eventPrefixes.created]]);
    expect(duelSource.eventPrefixes.created).not.toContain('<');
  });

  it('one game: the full tag of G instead of the prefix', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    await fetchLobbyPage(client, lobbyArgs('coinflip'));
    expect(eventLiteralTypes(listRequest(listEvents, 0).filter)).toEqual([[legacySource.eventTypes.created], [duelSource.eventTypes.created]]);
  });

  it('dispatches by event type: an open duel and an open legacy game come back as rows of their source', async () => {
    const legacy = legacyObject(legacyReads.objects.pendingOpen, 0x77);
    const { client } = makeScanClient({
      scripts: [
        page(
          [fromFixtureEvent(reads.events.duelCreatedOpen), legacyCreated(legacy.objectId, LEGACY_PLAYER, null, 'tx-legacy', 90n)],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(objectInput(reads.objects.pendingOpen), legacy),
    });
    const result = await fetchLobbyPage(client, lobbyArgs());
    expect(result.items).toMatchObject([
      { kind: 'duel', gameKey: 'coinflip', duel: { id: reads.objects.pendingOpen.objectId, state: { kind: 'pending' }, opponent: null }, createdTxDigest: reads.events.duelCreatedOpen.transactionDigest },
      { kind: 'game', game: { id: legacy.objectId, state: { kind: 'pending' } }, createdTxDigest: 'tx-legacy' },
    ]);
  });

  it('the time control of a duel row comes from its DuelCreated: "sin reloj" for the coinflip (control 0)', async () => {
    const { client } = makeScanClient({
      scripts: [page([fromFixtureEvent(reads.events.duelCreatedOpen)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(objectInput(reads.objects.pendingOpen)),
    });
    const [row] = (await fetchLobbyPage(client, lobbyArgs())).items;
    expect(row).toMatchObject({ kind: 'duel', control: { id: 0, turnMs: 0n, label: 'sin reloj' } });
  });

  it('a turn_ms outside the mirror (read from the ensayo fixture) is shown in the generic format, never an error', async () => {
    expect(clock._meta.sandbox).toBe(true);
    const turnMs = BigInt(Object.entries(clock._meta.sandboxConstants).find(([key]) => key.endsWith('_TURN_MS'))?.[1] ?? -1);
    expect(turnMs).toBeGreaterThan(0n);
    const { client } = makeScanClient({
      scripts: [page([duelCreated(reads.objects.pendingOpen.objectId, A, null, turnMs, 'tx-clock')], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(objectInput(reads.objects.pendingOpen)),
    });
    const [row] = (await fetchLobbyPage(client, lobbyArgs())).items;
    expect(row).toMatchObject({ kind: 'duel', control: { id: 8, turnMs, label: controlLabel(turnMs) } });
    expect(row).toMatchObject({ control: { label: `${String(Number(turnMs) / 1000)} s por jugada` } });
  });

  it('S-1: events of a G that the registry does not know are ignored (no row, no unreadable row, their objects are not read)', async () => {
    const foreign = foreignEvents();
    expect(foreign.length).toBeGreaterThan(1);
    const { client, getObjects } = makeScanClient({ scripts: [page(foreign, QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    const result = await fetchLobbyPage(client, lobbyArgs());
    expect(result.items).toEqual([]);
    expect(getObjects).not.toHaveBeenCalled();
  });

  it('S-1: foreign events mixed with a known one do not hide it nor break the page', async () => {
    const { client } = makeScanClient({
      scripts: [page([...foreignEvents(), fromFixtureEvent(reads.events.duelCreatedOpen)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(objectInput(reads.objects.pendingOpen)),
    });
    expect((await fetchLobbyPage(client, lobbyArgs())).items).toMatchObject([{ kind: 'duel' }]);
  });

  it('skips invitations and non-pending duels, and keeps unreadable events and objects as unreadable rows', async () => {
    const truncated = { ...fromFixtureEvent(reads.events.duelCreatedOpen), contents: { value: new Uint8Array([1, 2, 3]) } };
    const wrongTypeObject = { ...objectInput(reads.objects.pendingOpen), type: gameType(ORIGINAL) };
    const { client } = makeScanClient({
      scripts: [
        page(
          [
            fromFixtureEvent(reads.events.duelCreatedInvite),
            duelCreated(reads.objects.cancelledByCreator.objectId, A, null, 0n, 'tx-cancelled'),
            truncated,
            duelCreated(reads.objects.pendingOpen.objectId, A, null, 0n, 'tx-wrong-type'),
          ],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(objectInput(reads.objects.cancelledByCreator), wrongTypeObject),
    });
    const { items } = await fetchLobbyPage(client, lobbyArgs());
    expect(items).toEqual([
      { kind: 'unreadable', gameId: null, txDigest: reads.events.duelCreatedOpen.transactionDigest },
      { kind: 'unreadable', gameId: reads.objects.pendingOpen.objectId, txDigest: 'tx-wrong-type' },
    ]);
  });
});

describe('myActivityFilter and the pages of "Mis partidas" with the two sources', () => {
  it('"Todos": [sender ∧ created] and [sender ∧ resolved] for the legacy tag and the duel prefix: 8 literals, ONE request', async () => {
    const filter = myActivityFilter(registry, A);
    expect(eventLiteralTypes(filter)).toEqual([
      ['sender', legacySource.eventTypes.created],
      ['sender', duelSource.eventPrefixes.created],
      ['sender', legacySource.eventTypes.resolved],
      ['sender', duelSource.eventPrefixes.resolved],
    ]);
    const { client, listEvents } = makeScanClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    await fetchMyActivityPage(client, { registry, address: A, publishCheckpoint: 59n, before: null });
    expect(listEvents).toHaveBeenCalledTimes(1);
    expect(listRequest(listEvents, 0).filter).toEqual(filter);
  });

  it('one game: the full tag of G in the duel terms', () => {
    expect(eventLiteralTypes(myActivityFilter(registry, A, 'coinflip')).flat()).toContain(duelSource.eventTypes.created);
    expect(eventLiteralTypes(myActivityFilter(registry, A, 'coinflip')).flat()).not.toContain(duelSource.eventPrefixes.created);
  });

  it('a duel and a legacy creation come back as rows of their source with the object version; an event of another account is unreadable', async () => {
    const legacy = legacyObject(legacyReads.objects.pendingOpen, 0x78);
    const { client } = makeScanClient({
      scripts: [
        page(
          [
            fromFixtureEvent(reads.events.duelResolvedCreatorWins),
            fromFixtureEvent(reads.events.duelCreatedOpen),
            legacyCreated(legacy.objectId, A, null, 'tx-legacy', 80n),
          ],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(objectInput(reads.objects.resolvedCreatorWins), objectInput(reads.objects.pendingOpen), legacy),
    });
    // El evento de resolución es de B (aceptante) y el de creación de A: consultando como A, el primero no es suyo.
    const asA = await fetchMyActivityPage(client, { registry, address: A, publishCheckpoint: 59n, before: null });
    expect(asA.items).toMatchObject([
      { kind: 'unreadable', gameId: reads.objects.resolvedCreatorWins.objectId, role: 'acceptor' },
      { kind: 'duel', gameKey: 'coinflip', role: 'creator', objectVersion: BigInt(reads.objects.pendingOpen.version), duel: { id: reads.objects.pendingOpen.objectId } },
      { kind: 'game', role: 'creator', objectVersion: 4n, game: { id: legacy.objectId } },
    ]);
  });

  it('as the acceptor: the DuelResolved gives a row with role acceptor and the resolved object', async () => {
    const { client } = makeScanClient({
      scripts: [page([fromFixtureEvent(reads.events.duelResolvedCreatorWins)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(objectInput(reads.objects.resolvedCreatorWins)),
    });
    const { items } = await fetchMyActivityPage(client, { registry, address: B, publishCheckpoint: 59n, before: null });
    expect(items).toMatchObject([{ kind: 'duel', role: 'acceptor', duel: { state: { kind: 'resolved', acceptor: B } } }]);
  });

  it('a legacy resolution gives a row with role acceptor and the Resolved game', async () => {
    const resolved = legacyObject(legacyReads.objects.resolved, 0x7a);
    const { client } = makeScanClient({
      scripts: [page([legacyResolved(resolved.objectId, LEGACY_OTHER, A, 'tx-legacy-accept', 85n)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(resolved),
    });
    const { items } = await fetchMyActivityPage(client, { registry, address: A, publishCheckpoint: 59n, before: null });
    expect(items).toMatchObject([{ kind: 'game', role: 'acceptor', txDigest: 'tx-legacy-accept', game: { id: resolved.objectId, state: { kind: 'resolved' } } }]);
  });

  it('S-1: the activity ignores the events of an unregistered G (no unreadable rows) but keeps the known ones', async () => {
    const { client } = makeScanClient({
      scripts: [page([...foreignEvents(), fromFixtureEvent(reads.events.duelCreatedOpen)], QueryEndReason.CHECKPOINT_BOUND, 'bound')],
      objects: objectsOf(objectInput(reads.objects.pendingOpen)),
    });
    const { items } = await fetchMyActivityPage(client, { registry, address: A, publishCheckpoint: 59n, before: null });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'duel', role: 'creator' });
  });

  it('an event of another account for the filter is an unreadable row, also for the new source (SEG-10)', async () => {
    const { client } = makeScanClient({ scripts: [page([fromFixtureEvent(reads.events.duelCreatedOpen)], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    const { items } = await fetchMyActivityPage(client, { registry, address: B, publishCheckpoint: 59n, before: null });
    expect(items).toEqual([
      { kind: 'unreadable', gameId: reads.objects.pendingOpen.objectId, role: 'creator', txDigest: reads.events.duelCreatedOpen.transactionDigest, checkpoint: BigInt(reads.events.duelCreatedOpen.checkpoint) },
    ]);
  });

  it('invitations: the scan reads the created events of both sources (legacy tag and prefix) and keeps those with opponent = the account', async () => {
    const legacy = legacyObject(legacyReads.objects.pendingOpen, 0x79);
    const { client, listEvents } = makeScanClient({
      scripts: [
        page(
          [fromFixtureEvent(reads.events.duelCreatedInvite), fromFixtureEvent(reads.events.duelCreatedOpen), legacyCreated(legacy.objectId, LEGACY_OTHER, B, 'tx-legacy-invite', 70n), ...foreignEvents()],
          QueryEndReason.CHECKPOINT_BOUND,
          'bound',
        ),
      ],
      objects: objectsOf(objectInput(reads.objects.pendingInvite), legacy),
    });
    const result = await fetchInvitationsPage(client, { registry, address: B, publishCheckpoint: 59n, before: null });
    expect(eventLiteralTypes(listRequest(listEvents, 0).filter)).toEqual([[legacySource.eventTypes.created], [duelSource.eventPrefixes.created]]);
    expect(result.items).toMatchObject([
      { kind: 'duel', role: 'invitee', gameKey: 'coinflip', duel: { id: reads.objects.pendingInvite.objectId, opponent: B } },
      { kind: 'game', role: 'invitee', game: { id: legacy.objectId } },
    ]);
    expect(result.unreadableEvents).toBe(0);
    // Con un solo literal la consulta por la fuente `legacy` sigue siendo el filtro de siempre.
    expect(eventTypeFilter(legacySource.eventTypes.created).terms).toHaveLength(1);
  });
});

describe('sections of "Mis partidas" for the rows of the new source', () => {
  const parse = (o: FixtureObject): Duel => duelSource.parseObject({ type: o.type, owner: o.owner, content: fromBase64(o.content) });
  const pending = parse(reads.objects.pendingOpen);
  const invite = parse(reads.objects.pendingInvite);
  const cancelled = parse(reads.objects.cancelledByCreator);
  const resolved = parse(reads.objects.resolvedCreatorWins);
  const row = (duel: Duel, role: MyDuelItem['role'], extra: Partial<MyDuelItem> = {}): MyDuelItem => ({
    kind: 'duel',
    duel,
    gameKey: 'coinflip',
    objectVersion: 5n,
    role,
    txDigest: 'tx',
    checkpoint: 100n,
    ...extra,
  });
  const active = (acceptor: string): Duel => ({ ...pending, stake: 2n * pending.bet, state: { kind: 'active', acceptor, toMove: 1, deadlineMs: 1n } });

  it.each<[string, MyDuelItem, string, ReturnType<typeof naturalSection>]>([
    ['an invitation Pending for the invitee', row(invite, 'invitee'), B, 'invitations'],
    ['an open Pending created by the account', row(pending, 'creator'), A, 'pending'],
    ['an acceptor role with the object still Pending contradicts the contract', row(pending, 'acceptor'), B, null],
    ['an Active duel is in progress for its creator', row(active(B), 'creator'), A, 'pending'],
    ['an Active duel is in progress for its acceptor', row(active(B), 'acceptor'), B, 'pending'],
    ['an Active duel is not shown to a third party', row(active(B), 'invitee'), LEGACY_OTHER, null],
    ['a Resolved duel is finished for the creator', row(resolved, 'creator'), A, 'finished'],
    ['a Resolved duel is finished for the acceptor', row(resolved, 'acceptor'), B, 'finished'],
    ['a TimedOut duel is finished for both players', row({ ...resolved, state: { kind: 'timed_out', acceptor: B, winner: A } }, 'acceptor'), B, 'finished'],
    ['an Expired duel is finished for both players', row({ ...resolved, state: { kind: 'expired', acceptor: B } }, 'creator'), A, 'finished'],
    ['a Cancelled duel is finished for its creator', row(cancelled, 'creator'), A, 'finished'],
    ['a Cancelled invitation is not shown to the invitee', row({ ...cancelled, opponent: B }, 'invitee'), B, null],
  ])('%s', (_name, item, address, expected) => {
    expect(naturalSection(item, address)).toBe(expected);
  });

  it('myGameKey is the normalized id of the duel', () => {
    expect(myGameKey(row(pending, 'creator'))).toBe(normalizeSuiAddress(pending.id));
  });

  it('mergeMyGames keeps one row per duel, the one read with the greater object version, with role acceptor if any has it', () => {
    const stale = row(invite, 'invitee', { objectVersion: 4n, checkpoint: 300n, txDigest: 'tx-create' });
    const fresh = row({ ...invite, stake: 0n, state: { kind: 'resolved', acceptor: B, winner: A } }, 'acceptor', { objectVersion: 9n, checkpoint: 410n, txDigest: 'tx-accept' });
    expect(mergeMyGames([fresh], [stale])).toEqual([fresh]);
    expect(mergeMyGames([stale], [fresh])).toEqual([fresh]);
  });

  it('groupMyGames places legacy and duel rows in their sections, newest first, and drops what has no section', () => {
    const sections = groupMyGames({
      activity: [row(pending, 'creator', { checkpoint: 100n, txDigest: 'tx-open' }), row(resolved, 'acceptor', { checkpoint: 500n, txDigest: 'tx-done' })],
      invitations: [row(invite, 'invitee', { checkpoint: 300n, txDigest: 'tx-invite' }), row({ ...cancelled, opponent: B }, 'invitee', { txDigest: 'tx-dropped' })],
      address: B,
      pins: new Map(),
    });
    expect(sections.invitations.map((r) => r.txDigest)).toEqual(['tx-invite']);
    expect(sections.finished.map((r) => r.txDigest)).toEqual(['tx-done']);
    expect(sections.pending.map((r) => r.txDigest)).toEqual(['tx-open']);
    expect(duelRows(sections.invitations)).toHaveLength(1);
  });

  it('the parser of the new source rejects an object of the legacy type (the row stays unreadable, never a wrong state)', () => {
    const wrongType = { type: gameType(ORIGINAL), owner: reads.objects.pendingOpen.owner, content: fromBase64(reads.objects.pendingOpen.content) };
    expect(() => duelSource.parseObject(wrongType)).toThrow(ReadDataError);
  });
});

describe('the lobby cursor of the legacy-only config is the node one (no partition below 10 literals)', () => {
  it('"Todos" with a single source keeps the plain node cursor as endCursor', async () => {
    const legacyRegistry = buildGameRegistry({ originalPackageId: ORIGINAL });
    const { client } = makeScanClient({ scripts: [page([], QueryEndReason.CHECKPOINT_BOUND, 'c1')] });
    const result = await fetchLobbyPage(client, { registry: legacyRegistry, publishCheckpoint: 59n, before: null });
    expect(result.endCursor).toBe(b64('c1'));
  });
});
