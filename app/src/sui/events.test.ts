import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import {
  gameEventType,
  parseGameCancelled,
  parseGameCreated,
  parseGameResolved,
  rawEventFromEntry,
  type RawGameEvent,
} from './events';
import { ReadDataError } from './readErrors';

type FixtureEvent = {
  eventType: string;
  bcs: string;
  json: Record<string, string | number | null>;
  checkpoint: string;
  transactionDigest: string;
  eventIndex: number;
};
type FixtureFrame = {
  event?: { eventType: string; contents: { value: string }; transactionDigest: string; checkpoint: string };
};
type Fixture = {
  events: Record<'gameCreatedOpen' | 'gameCreatedInvite' | 'gameCancelledByCreator' | 'gameCancelledByInvitee' | 'gameResolved', FixtureEvent>;
  rawListEventsPage: { frames: FixtureFrame[] };
};

const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.events.gameCreatedOpen.eventType.split('::')[0] ?? '';
const OTHER_PKG = `0x${'ab'.repeat(32)}`;

// Desplazamientos BCS: GameCreated (game_id 32 + creator 32 + tag de opponent); GameResolved (4 direcciones + 3 u64).
const CREATED_OPPONENT_TAG = 64;
const RESOLVED_WINNER = 96;
const RESOLVED_POT = 128;

function entry(e: FixtureEvent): Pick<SuiClientTypes.EventEntry, 'eventType' | 'bcs' | 'transactionDigest' | 'checkpoint'> {
  return { eventType: e.eventType, bcs: fromBase64(e.bcs), transactionDigest: e.transactionDigest, checkpoint: e.checkpoint };
}
const raw = (name: keyof Fixture['events']): RawGameEvent => rawEventFromEntry(entry(fixture.events[name]));
/** Dirección esperada desde el `json` del nodo; un campo ausente es un error del test, no un `null`. */
function addr(v: string | number | null | undefined): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') throw new Error('campo de dirección ausente en la fixture');
  return normalizeSuiAddress(v);
}

function patched(event: RawGameEvent, patch: (bytes: Uint8Array, view: DataView) => void): RawGameEvent {
  const bytes = new Uint8Array(event.bcs);
  patch(bytes, new DataView(bytes.buffer));
  return { ...event, bcs: bytes };
}

function readDataReason(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof ReadDataError) return error.reason;
    throw error;
  }
  return 'sin error';
}

describe('gameEventType and rawEventFromEntry', () => {
  it('builds normalized event types of the original package', () => {
    expect(gameEventType(PKG, 'GameResolved')).toBe(`${PKG}::game::GameResolved`);
  });

  it('adapts an SDK EventEntry with a bigint checkpoint', () => {
    const e = fixture.events.gameCreatedOpen;
    expect(raw('gameCreatedOpen')).toEqual({
      eventType: e.eventType,
      bcs: fromBase64(e.bcs),
      transactionDigest: e.transactionDigest,
      checkpoint: BigInt(e.checkpoint),
    });
    expect(rawEventFromEntry({ ...entry(e), checkpoint: null }).checkpoint).toBeNull();
  });
});

describe('event parsers on the real fixture (BCS ↔ json)', () => {
  it.each(['gameCreatedOpen', 'gameCreatedInvite'] as const)('parses %s', (name) => {
    const e = fixture.events[name];
    expect(parseGameCreated(raw(name), PKG)).toEqual({
      gameId: addr(e.json.game_id),
      creator: addr(e.json.creator),
      opponent: addr(e.json.opponent),
      bet: BigInt(String(e.json.bet)),
      feeRate: Number(e.json.fee_rate),
      transactionDigest: e.transactionDigest,
    });
  });

  it('parses the open GameCreated without opponent and with bigint bet', () => {
    expect(parseGameCreated(raw('gameCreatedOpen'), PKG)).toMatchObject({ opponent: null, bet: 1_000_001n, feeRate: 250 });
  });

  it.each(['gameCancelledByCreator', 'gameCancelledByInvitee'] as const)('parses %s', (name) => {
    const e = fixture.events[name];
    expect(parseGameCancelled(raw(name), PKG)).toEqual({
      gameId: addr(e.json.game_id),
      creator: addr(e.json.creator),
      cancelledBy: addr(e.json.cancelled_by),
      refund: BigInt(String(e.json.refund)),
      transactionDigest: e.transactionDigest,
    });
  });

  it('distinguishes cancellation by the creator from rejection by the invitee', () => {
    const byCreator = parseGameCancelled(raw('gameCancelledByCreator'), PKG);
    const byInvitee = parseGameCancelled(raw('gameCancelledByInvitee'), PKG);
    expect(byCreator.cancelledBy).toBe(byCreator.creator);
    expect(byInvitee.cancelledBy).not.toBe(byInvitee.creator);
  });

  it('parses GameResolved with pot = payout + fee', () => {
    const e = fixture.events.gameResolved;
    const parsed = parseGameResolved(raw('gameResolved'), PKG);
    expect(parsed).toEqual({
      gameId: addr(e.json.game_id),
      creator: addr(e.json.creator),
      acceptor: addr(e.json.acceptor),
      winner: addr(e.json.winner),
      pot: BigInt(String(e.json.pot)),
      fee: BigInt(String(e.json.fee)),
      payout: BigInt(String(e.json.payout)),
      transactionDigest: e.transactionDigest,
    });
    expect(parsed.pot).toBe(parsed.payout + parsed.fee);
  });

  it('parses GameCreated frames of the raw ListEvents page (H-4)', () => {
    const frames = fixture.rawListEventsPage.frames.flatMap((f) => (f.event ? [f.event] : []));
    expect(frames).toHaveLength(3);
    for (const f of frames) {
      const event: RawGameEvent = {
        eventType: f.eventType,
        bcs: fromBase64(f.contents.value),
        transactionDigest: f.transactionDigest,
        checkpoint: BigInt(f.checkpoint),
      };
      expect(parseGameCreated(event, PKG).creator).toMatch(/^0x[0-9a-f]{64}$/);
    }
  });
});

describe('event parsers reject malformed events (unreadable rows)', () => {
  it('rejects truncated bytes', () => {
    const e = raw('gameCreatedOpen');
    expect(readDataReason(() => parseGameCreated({ ...e, bcs: e.bcs.slice(0, -1) }, PKG))).toBe('malformed');
  });

  it('rejects trailing bytes', () => {
    const e = raw('gameCancelledByCreator');
    expect(readDataReason(() => parseGameCancelled({ ...e, bcs: new Uint8Array([...e.bcs, 0]) }, PKG))).toBe('malformed');
  });

  it('rejects an Option tag 2 in opponent', () => {
    const e = patched(raw('gameCreatedOpen'), (b) => { b[CREATED_OPPONENT_TAG] = 2; });
    expect(readDataReason(() => parseGameCreated(e, PKG))).toBe('malformed');
  });

  it('rejects an event of another package', () => {
    const e = raw('gameCreatedOpen');
    expect(readDataReason(() => parseGameCreated({ ...e, eventType: `${OTHER_PKG}::game::GameCreated` }, PKG))).toBe('wrong_type');
  });

  it('rejects an event of another type for the parser', () => {
    expect(readDataReason(() => parseGameCancelled(raw('gameCreatedOpen'), PKG))).toBe('wrong_type');
  });

  it('rejects a GameResolved with pot ≠ payout + fee', () => {
    const e = patched(raw('gameResolved'), (_b, v) => { v.setBigUint64(RESOLVED_POT, 1n, true); });
    expect(readDataReason(() => parseGameResolved(e, PKG))).toBe('invariant');
  });

  it('rejects a GameResolved whose winner is neither creator nor acceptor', () => {
    const e = patched(raw('gameResolved'), (b) => { b.fill(0xab, RESOLVED_WINNER, RESOLVED_WINNER + 32); });
    expect(readDataReason(() => parseGameResolved(e, PKG))).toBe('invariant');
  });
});
