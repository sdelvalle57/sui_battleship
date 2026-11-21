import { GrpcTypes, RpcError } from '@mysten/sui/grpc';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { b64, bytesOf, listRequest, makeScanClient, scanFrames, type ScanEvent } from '../test/scanHarness';
import {
  countFilterLiterals,
  eventTypeFilter,
  eventTypesFilter,
  MAX_FILTER_LITERALS,
  requestOrPruned,
  splitFilter,
  type EventsRequest,
} from './eventScan';
import { HistoryPrunedError, PaginationStalledError, ReadDataError } from './readErrors';

const { QueryEndReason } = GrpcTypes;

// Pedidos de un filtro de más de 10 literales (V-4 de TASK-1b, M-5 del plan): trozos con su cursor, fusión y orden.

const SENDER = normalizeSuiAddress('0xabc');
const typeOf = (n: number) => `${normalizeSuiAddress('0xb47')}::game::Event${String(n)}`;
const literal = (predicate: GrpcTypes.EventLiteral['predicate']): GrpcTypes.EventLiteral => ({ negated: false, predicate });
const sender = literal({ oneofKind: 'sender', sender: { address: SENDER } });
const eventType = (n: number) => literal({ oneofKind: 'eventType', eventType: { eventType: typeOf(n) } });
/** `[sender ∧ tipo n]`: un término de 2 literales, como la actividad de "Mis partidas". */
const senderTerm = (n: number): GrpcTypes.EventTerm => ({ literals: [sender, eventType(n)] });
/** 5 términos de 2 literales y uno de 1: 11 literales, el caso que el nodo rechaza con `INVALID_ARGUMENT`. */
const ELEVEN: GrpcTypes.EventFilter = { terms: [1, 2, 3, 4, 5].map(senderTerm).concat([{ literals: [eventType(6)] }]) };
const TEN: GrpcTypes.EventFilter = { terms: [1, 2, 3, 4, 5].map(senderTerm) };

type PositionedEvent = ScanEvent & { eventIndex: number; transactionIndex: bigint };
const at = (checkpoint: bigint, transactionIndex: bigint, eventIndex: number, digest: string): PositionedEvent => ({
  eventType: typeOf(1),
  contents: { value: new Uint8Array([1]) },
  transactionDigest: digest,
  checkpoint,
  eventIndex,
  transactionIndex,
});
const digests = (page: { events: { transactionDigest: string }[] }) => page.events.map((e) => e.transactionDigest);
const args = (overrides: Partial<EventsRequest> = {}): EventsRequest => ({ filter: ELEVEN, startCheckpoint: 59n, before: null, limit: 7, ...overrides });
/** Los literales de un filtro de un pedido que recibió el nodo. */
const literalsOf = (request: { filter: unknown }) => countFilterLiterals(request.filter as GrpcTypes.EventFilter);

describe('countFilterLiterals', () => {
  it('counts literals, not terms (a sender ∧ eventType term counts 2)', () => {
    expect(countFilterLiterals(eventTypeFilter(typeOf(1)))).toBe(1);
    expect(countFilterLiterals({ terms: [senderTerm(1), senderTerm(2)] })).toBe(4);
    expect(countFilterLiterals(ELEVEN)).toBe(11);
    expect(countFilterLiterals(TEN)).toBe(MAX_FILTER_LITERALS);
  });
});

describe('eventTypesFilter', () => {
  it('is an OR of single-literal terms, one per type, without repeats', () => {
    expect(eventTypesFilter([typeOf(1), typeOf(2), typeOf(1)])).toEqual({ terms: [...eventTypeFilter(typeOf(1)).terms, ...eventTypeFilter(typeOf(2)).terms] });
  });

  it('with a single type it is the same filter as eventTypeFilter', () => {
    expect(eventTypesFilter([typeOf(1)])).toEqual(eventTypeFilter(typeOf(1)));
  });

  it('throws without types (a listing without games is a programming error)', () => {
    expect(() => eventTypesFilter([])).toThrow(Error);
  });
});

describe('splitFilter', () => {
  it('returns the very same filter, as a single chunk, while it has at most 10 literals', () => {
    expect(splitFilter(TEN)).toEqual([TEN]);
    expect(splitFilter(TEN)[0]).toBe(TEN);
  });

  it('splits 11 literals in two chunks of at most 10, keeping the terms in order and whole', () => {
    const chunks = splitFilter(ELEVEN);
    expect(chunks.map(countFilterLiterals)).toEqual([10, 1]);
    expect(chunks.flatMap((chunk) => chunk.terms)).toEqual(ELEVEN.terms);
  });

  it('never splits a term (an AND): a term bigger than the bound cannot be requested and throws', () => {
    const tooBig: GrpcTypes.EventFilter = { terms: [{ literals: Array.from({ length: 11 }, (_, i) => eventType(i)) }] };
    expect(() => splitFilter(tooBig)).toThrow(Error);
  });

  it('packs more terms into a new chunk when the next one does not fit', () => {
    const terms = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(senderTerm); // 24 literales
    expect(splitFilter({ terms }).map(countFilterLiterals)).toEqual([10, 10, 4]);
  });
});

describe('requestOrPruned with a filter of 11 literals (M-5)', () => {
  it('makes 2 requests, each with at most 10 literals, the same bound and the same size; and asks for transaction_index to order the merge', async () => {
    const { client, listEvents } = makeScanClient({
      scripts: [
        scanFrames([at(300n, 0n, 0, 'tx-a')], QueryEndReason.CHECKPOINT_BOUND, 'a1'),
        scanFrames([at(200n, 0n, 0, 'tx-b')], QueryEndReason.CHECKPOINT_BOUND, 'b1'),
      ],
    });
    await requestOrPruned(client, args());
    expect(listEvents).toHaveBeenCalledTimes(2);
    const requests = [listRequest(listEvents, 0), listRequest(listEvents, 1)];
    expect(requests.map(literalsOf)).toEqual([10, 1]);
    for (const request of requests) {
      expect(request.startCheckpoint).toBe(59n);
      expect(request.options.limit).toBe(7);
      expect(request.readMask.paths).toContain('transaction_index');
      expect(request.readMask.paths).not.toContain('sender');
      expect(request.options.before).toBeUndefined();
    }
  });

  it('merges the events of the chunks newest first by (checkpoint, transaction, event index), without duplicates', async () => {
    const shared = at(250n, 3n, 0, 'tx-shared');
    const { client } = makeScanClient({
      scripts: [
        scanFrames([at(300n, 0n, 0, 'tx-c300'), shared, at(100n, 0n, 0, 'tx-c100')], QueryEndReason.CHECKPOINT_BOUND, 'a1'),
        scanFrames([at(250n, 5n, 1, 'tx-t5e1'), at(250n, 5n, 0, 'tx-t5e0'), shared, at(250n, 1n, 0, 'tx-t1')], QueryEndReason.CHECKPOINT_BOUND, 'b1'),
      ],
    });
    const page = await requestOrPruned(client, args());
    expect(digests(page)).toEqual(['tx-c300', 'tx-t5e1', 'tx-t5e0', 'tx-shared', 'tx-t1', 'tx-c100']);
  });

  it('does not merge two different events of the same transaction that share a checkpoint', async () => {
    const { client } = makeScanClient({
      scripts: [
        scanFrames([at(90n, 2n, 1, 'tx-same'), at(90n, 2n, 0, 'tx-same')], QueryEndReason.CHECKPOINT_BOUND, 'a1'),
        scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'b1'),
      ],
    });
    expect(digests(await requestOrPruned(client, args()))).toEqual(['tx-same', 'tx-same']);
  });

  it('keeps a cursor per chunk: more pages while any chunk has more, and the next request resumes each chunk where it stopped', async () => {
    const { client, listEvents } = makeScanClient({
      scripts: [
        scanFrames([at(300n, 0n, 0, 'tx-a')], QueryEndReason.ITEM_LIMIT, 'a1', { itemLimit: true }),
        scanFrames([at(200n, 0n, 0, 'tx-b')], QueryEndReason.CHECKPOINT_BOUND, 'b1'),
        scanFrames([at(100n, 0n, 0, 'tx-a2')], QueryEndReason.CHECKPOINT_BOUND, 'a2'),
      ],
    });
    const first = await requestOrPruned(client, args());
    expect(first.hasNextPage).toBe(true);
    expect(first.cursor).not.toBeNull();
    // Segundo pedido: el trozo 1 ya terminó y no se vuelve a pedir; el trozo 0 sigue desde su cursor, con la misma cota y tamaño.
    const second = await requestOrPruned(client, args({ before: first.cursor }));
    expect(listEvents).toHaveBeenCalledTimes(3);
    const resumed = listRequest(listEvents, 2);
    expect(bytesOf(resumed.options.before)).toEqual(Array.from(new TextEncoder().encode('a1')));
    expect(literalsOf(resumed)).toBe(10);
    expect(resumed.startCheckpoint).toBe(59n);
    expect(resumed.options.limit).toBe(7);
    expect(digests(second)).toEqual(['tx-a2']);
    expect(second.hasNextPage).toBe(false);
  });

  it('is done (no next page) when every chunk reached its end', async () => {
    const { client } = makeScanClient({
      scripts: [scanFrames([], QueryEndReason.LEDGER_TIP, 'a1'), scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'b1')],
    });
    await expect(requestOrPruned(client, args())).resolves.toMatchObject({ events: [], hasNextPage: false });
  });

  it('a chunk that has more pages without a cursor is a cursor that does not advance (PaginationStalledError)', async () => {
    const { client } = makeScanClient({
      scripts: [scanFrames([at(300n, 0n, 0, 'tx-a')], QueryEndReason.ITEM_LIMIT, null, { itemLimit: true }), scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'b1')],
    });
    await expect(requestOrPruned(client, args())).rejects.toBeInstanceOf(PaginationStalledError);
  });

  it('rejects a cursor that is not the list of the chunks (malformed data, never a request)', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [scanFrames([], QueryEndReason.CHECKPOINT_BOUND, 'a1')] });
    for (const before of [b64('c1'), '[]', '[{"cursor":1,"done":false},{"cursor":null,"done":false}]']) {
      const error = await requestOrPruned(client, args({ before })).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ReadDataError);
    }
    expect(listEvents).not.toHaveBeenCalled();
  });

  it('turns the crossing of the history floor in any chunk into HistoryPrunedError', async () => {
    const outOfRange = new RpcError('requested data below earliest available', 'OUT_OF_RANGE');
    const { client } = makeScanClient({ scripts: [scanFrames([at(300n, 0n, 0, 'tx-a')], QueryEndReason.CHECKPOINT_BOUND, 'a1'), outOfRange] });
    const error = await requestOrPruned(client, args()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HistoryPrunedError);
  });
});

describe('requestOrPruned with a filter of at most 10 literals (unchanged)', () => {
  it('is a single request with the original filter, the default read mask and the node cursor as is', async () => {
    const { client, listEvents } = makeScanClient({ scripts: [scanFrames([at(300n, 0n, 0, 'tx-a')], QueryEndReason.ITEM_LIMIT, 'a1', { itemLimit: true })] });
    const page = await requestOrPruned(client, args({ filter: TEN }));
    expect(listEvents).toHaveBeenCalledTimes(1);
    const request = listRequest(listEvents, 0);
    expect(request.filter).toBe(TEN);
    expect(request.readMask.paths).toEqual(['event_type', 'contents', 'checkpoint', 'transaction_digest', 'event_index']);
    expect(page).toMatchObject({ cursor: b64('a1'), hasNextPage: true });
  });
});
