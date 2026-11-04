import { GrpcTypes, RpcError } from '@mysten/sui/grpc';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { b64, bytesOf, cursor, listRequest, makeScanClient, scanFrames, type ScanEvent } from '../test/scanHarness';
import { eventTypeFilter, historyLowerBound, requestEvents, requestOrPruned, type EventsRequest } from './eventScan';
import { HistoryPrunedError, ReadDataError } from './readErrors';

const { Ordering, QueryEndReason } = GrpcTypes;

const EVENT_TYPE = `${normalizeSuiAddress('0xb47')}::game::GameCreated`;
const FILTER = eventTypeFilter(EVENT_TYPE);
const event = (txDigest: string, checkpoint = 100n): ScanEvent => ({
  eventType: EVENT_TYPE,
  contents: { value: new Uint8Array([1, 2, 3]) },
  transactionDigest: txDigest,
  checkpoint,
});
const args = (overrides: Partial<EventsRequest> = {}): EventsRequest => ({
  filter: FILTER,
  startCheckpoint: 59n,
  before: null,
  limit: 7,
  ...overrides,
});

// T2-1: los casos de `lobbyLowerBound` (#10), movidos sin cambiar valores.
describe('historyLowerBound', () => {
  it.each([
    ['publish above floor + margin', 100_000n, 1_000n, { checkpoint: 100_000n, kind: 'publish' }],
    ['floor + margin above publish', 59n, 1_000n, { checkpoint: 17_000n, kind: 'node_floor' }],
    ['pruned publish (null)', null, 1_000n, { checkpoint: 17_000n, kind: 'node_floor' }],
    ['floor 0: publish without margin', 59n, 0n, { checkpoint: 59n, kind: 'publish' }],
    ['floor null: publish without margin', 59n, null, { checkpoint: 59n, kind: 'publish' }],
    ['both null', null, null, { checkpoint: 0n, kind: 'none' }],
  ])('%s', (_name, publishCheckpoint, nodeFloor, expected) => {
    expect(historyLowerBound({ publishCheckpoint, nodeFloor })).toEqual(expected);
  });
});

describe('eventTypeFilter', () => {
  it('builds the single-literal filter of one event type', () => {
    expect(eventTypeFilter(EVENT_TYPE)).toEqual({
      terms: [{ literals: [{ negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType: EVENT_TYPE } } }] }],
    });
  });
});

// T2-2
describe('requestEvents', () => {
  it('sends the given filter and limit, the read mask without sender and descending order', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'c1')] });
    await requestEvents(client, args());
    const req = listRequest(listEvents, 0);
    expect(req.filter).toBe(FILTER);
    expect(req.startCheckpoint).toBe(59n);
    expect(req.options).toMatchObject({ limit: 7, ordering: Ordering.DESCENDING, before: undefined });
    expect(req.readMask.paths).toEqual(['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index']);
    expect(req.readMask.paths).not.toContain('sender');
  });

  it('decodes the before cursor from base64', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'c9')] });
    await requestEvents(client, args({ before: b64('c0') }));
    expect(bytesOf(listRequest(listEvents, 0).options.before)).toEqual(bytesOf(cursor('c0')));
  });

  it('returns the events in node order with the last watermark cursor', async () => {
    const frames = [
      ...scanFrames([event('tx-1', 120n)], null, 'w1'),
      ...scanFrames([event('tx-2', 110n)], QueryEndReason.ITEM_LIMIT, 'w2', { itemLimit: true }),
    ];
    const { client } = makeScanClient({ scripts: [frames] });
    const page = await requestEvents(client, args());
    expect(page).toEqual({
      events: [
        { eventType: EVENT_TYPE, bcs: new Uint8Array([1, 2, 3]), transactionDigest: 'tx-1', checkpoint: 120n },
        { eventType: EVENT_TYPE, bcs: new Uint8Array([1, 2, 3]), transactionDigest: 'tx-2', checkpoint: 110n },
      ],
      cursor: b64('w2'),
      hasNextPage: true,
    });
  });

  it('returns the bound cursor of an empty CHECKPOINT_BOUND frame (V-9)', async () => {
    const { client } = makeScanClient({ scripts: [scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'bound')] });
    await expect(requestEvents(client, args({ before: b64('c1') }))).resolves.toEqual({ events: [], cursor: b64('bound'), hasNextPage: false });
  });

  it.each([
    ['ITEM_LIMIT', QueryEndReason.ITEM_LIMIT, true],
    ['SCAN_LIMIT', QueryEndReason.SCAN_LIMIT, true],
    ['CHECKPOINT_BOUND', QueryEndReason.CHECKPOINT_BOUND, false],
    ['LEDGER_TIP', QueryEndReason.LEDGER_TIP, false],
    ['CURSOR_BOUND', QueryEndReason.CURSOR_BOUND, false],
  ])('maps %s to hasNextPage %s', async (_name, reason, hasNextPage) => {
    const { client } = makeScanClient({ scripts: [scanFrames([], reason, 'c1')] });
    await expect(requestEvents(client, args())).resolves.toMatchObject({ hasNextPage });
  });

  it('returns a null cursor when no frame has a watermark', async () => {
    const { client } = makeScanClient({ scripts: [scanFrames([], QueryEndReason.CHECKPOINT_BOUND, null)] });
    await expect(requestEvents(client, args())).resolves.toMatchObject({ cursor: null });
  });

  it.each([
    ['a stream without QueryEnd', null],
    ['an UNKNOWN end reason', QueryEndReason.UNKNOWN],
    ['an end reason out of the enum', 99],
  ])('rejects %s as malformed', async (_name, reason) => {
    const { client } = makeScanClient({ scripts: [scanFrames([event('tx-1')], reason, 'c1')] });
    const error = await requestEvents(client, args()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReadDataError);
    expect(error).toMatchObject({ reason: 'malformed' });
  });
});

// T2-3
describe('requestOrPruned', () => {
  it('turns OUT_OF_RANGE into HistoryPrunedError with the original error as cause, without re-reading the floor', async () => {
    const outOfRange = new RpcError('requested data below earliest available', 'OUT_OF_RANGE');
    const { client, getServiceInfo } = makeScanClient({ scripts: [outOfRange] });
    const error = await requestOrPruned(client, args()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HistoryPrunedError);
    expect((error as Error).cause).toBe(outOfRange);
    expect(getServiceInfo).not.toHaveBeenCalled();
  });

  it('rethrows CANCELLED without re-reading the floor', async () => {
    const cancelled = new RpcError('cancelled', 'CANCELLED');
    const { client, getServiceInfo } = makeScanClient({ scripts: [cancelled], floors: [5_000n] });
    await expect(requestOrPruned(client, args())).rejects.toBe(cancelled);
    expect(getServiceInfo).not.toHaveBeenCalled();
  });

  it('turns another RpcError into HistoryPrunedError when the floor moved past the bound', async () => {
    const reset = new RpcError('stream reset', 'INTERNAL');
    const { client } = makeScanClient({ scripts: [reset], floors: [5_000n] });
    const error = await requestOrPruned(client, args({ startCheckpoint: 100n })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HistoryPrunedError);
    expect((error as Error).cause).toBe(reset);
  });

  it('rethrows the original error when the floor did not move or cannot be read', async () => {
    const reset = new RpcError('stream reset', 'INTERNAL');
    const still = makeScanClient({ scripts: [reset], floors: [0n] });
    await expect(requestOrPruned(still.client, args({ startCheckpoint: 100n }))).rejects.toBe(reset);
    const down = makeScanClient({ scripts: [reset], floors: [new RpcError('node down', 'UNAVAILABLE')] });
    await expect(requestOrPruned(down.client, args({ startCheckpoint: 100n }))).rejects.toBe(reset);
  });

  it('returns the page unchanged when the request succeeds', async () => {
    const { client } = makeScanClient({ scripts: [scanFrames([event('tx-1')], QueryEndReason.CHECKPOINT_BOUND, 'c1')] });
    await expect(requestOrPruned(client, args())).resolves.toMatchObject({ cursor: b64('c1'), hasNextPage: false, events: [{ transactionDigest: 'tx-1' }] });
  });
});
