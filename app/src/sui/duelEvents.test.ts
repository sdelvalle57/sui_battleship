import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import {
  duelEventType,
  parseDuelActivated,
  parseDuelCancelled,
  parseDuelCreated,
  parseDuelExpired,
  parseDuelResolved,
  parseDuelTimedOut,
  parseDuelTurn,
  rawEventFromEntry,
  type DuelEventName,
  type RawGameEvent,
} from './events';
import { definingIdOf, type TypeOrigin } from './gameRegistry';
import { ReadDataError } from './readErrors';

type FixtureEvent = {
  eventType: string;
  bcs: string;
  json: Record<string, string | number | null>;
  checkpoint: string;
  transactionDigest: string;
  eventIndex: number;
};
type ReadsFixture = {
  ids: { coinflipTag: string };
  typeOrigins: TypeOrigin[];
  events: Record<
    | 'duelCreatedOpen'
    | 'duelCreatedInvite'
    | 'duelCancelledByCreator'
    | 'duelCancelledByInvitee'
    | 'duelActivatedCreatorWins'
    | 'duelResolvedCreatorWins'
    | 'duelResolvedAcceptorWins',
    FixtureEvent
  >;
};
type ClockFixture = {
  _meta: { sandbox: boolean };
  ids: Record<string, unknown>;
  typeOrigins: TypeOrigin[];
  events: Record<
    'duelCreated' | 'duelActivated' | 'duelTurn' | 'duelResolved' | 'duelTimedOut' | 'duelExpiredBothPending' | 'duelExpiredOnePending',
    FixtureEvent
  >;
};

const READS_PATH = '../../../contracts/fixtures/duel-reads.localnet.json';
const CLOCK_PATH = '../../../contracts/fixtures/duel-clock.localnet.json';
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', {
  eager: true,
  import: 'default',
})[READS_PATH] as ReadsFixture;
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', {
  eager: true,
  import: 'default',
})[CLOCK_PATH] as ClockFixture;

const OTHER_PKG = `0x${'ab'.repeat(32)}`;
/** Tag del juego de ensayo, el único valor de `ids` con forma de tag (el código no nombra el juego de ensayo). */
const TEST_GAME_TAG = Object.values(clock.ids).find((v): v is string => typeof v === 'string' && /^0x[0-9a-f]{64}::\w+::\w+$/.test(v)) ?? '';

/** Tipo exacto esperado de un evento de producción: ID de definición **del evento** (por módulo + nombre) y tag del coinflip. */
const prod = (name: DuelEventName): string =>
  duelEventType(definingIdOf(reads.typeOrigins, 'duel', name) ?? '', name, reads.ids.coinflipTag);
/** Ídem para el juego de ensayo de la fixture de reloj. */
const trial = (name: DuelEventName): string =>
  duelEventType(definingIdOf(clock.typeOrigins, 'duel', name) ?? '', name, TEST_GAME_TAG);

function entry(e: FixtureEvent): Pick<SuiClientTypes.EventEntry, 'eventType' | 'bcs' | 'transactionDigest' | 'checkpoint'> {
  return { eventType: e.eventType, bcs: fromBase64(e.bcs), transactionDigest: e.transactionDigest, checkpoint: e.checkpoint };
}
const raw = (e: FixtureEvent): RawGameEvent => rawEventFromEntry(entry(e));

/** Dirección esperada desde el `json` del nodo; un campo ausente es un error del test, no un `null`. */
function addr(v: string | number | null | undefined): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') throw new Error('campo de dirección ausente en la fixture');
  return normalizeSuiAddress(v);
}
const big = (v: string | number | null | undefined): bigint => BigInt(String(v));

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

// Desplazamientos BCS (cada dirección ocupa 32 bytes, `ID` incluido).
const CREATED_OPPONENT_TAG = 64; // duel_id, creator, tag de opponent
const CREATED_TURN_MS_OPEN = 76; // + opponent None (1) + bet 8 + fee_rate 2 + control 1
const CREATED_CONTROL_OPEN = 75;
const ACTIVATED_TURN_MS = 104; // duel_id, creator, acceptor, bet
const ACTIVATED_TO_MOVE = 112;
const ACTIVATED_DEADLINE = 113;
const TURN_TO_MOVE = 64; // duel_id, actor
const RESOLVED_WINNER = 96; // duel_id, creator, acceptor
const RESOLVED_POT = 128;
const TIMED_OUT_WINNER = 96;
const TIMED_OUT_POT = 160; // + claimed_by

describe('duelEventType', () => {
  it('builds the type with the defining id of the event and the full tag of the game', () => {
    expect(prod('DuelCreated')).toBe(reads.events.duelCreatedOpen.eventType);
    expect(prod('DuelResolved')).toBe(reads.events.duelResolvedCreatorWins.eventType);
    expect(trial('DuelTurn')).toBe(clock.events.duelTurn.eventType);
  });

  it('keeps the event id and the game id apart when they were defined in different upgrades', () => {
    const eventId = `0x${'a'.repeat(64)}`;
    const gameId = `0x${'b'.repeat(64)}`;
    expect(duelEventType(eventId, 'DuelTurn', `${gameId}::coinflip::Coinflip`)).toBe(
      `${eventId}::duel::DuelTurn<${gameId}::coinflip::Coinflip>`,
    );
  });

  it('normalizes short ids', () => {
    expect(duelEventType('0x2', 'DuelExpired', '0x3::coinflip::Coinflip')).toBe(
      `0x${'0'.repeat(63)}2::duel::DuelExpired<0x${'0'.repeat(63)}3::coinflip::Coinflip>`,
    );
  });
});

describe('duel event parsers on the real production fixture (BCS ↔ json)', () => {
  it.each(['duelCreatedOpen', 'duelCreatedInvite'] as const)('parses %s', (name) => {
    const e = reads.events[name];
    expect(parseDuelCreated(raw(e), prod('DuelCreated'))).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      opponent: addr(e.json.opponent),
      bet: big(e.json.bet),
      feeRate: Number(e.json.fee_rate),
      control: Number(e.json.control),
      turnMs: big(e.json.turn_ms),
      transactionDigest: e.transactionDigest,
    });
  });

  it('parses the open DuelCreated of the coinflip with control 0, no clock and bigint bet', () => {
    expect(parseDuelCreated(raw(reads.events.duelCreatedOpen), prod('DuelCreated'))).toMatchObject({
      opponent: null,
      bet: 10_000_000n,
      feeRate: 500,
      control: 0,
      turnMs: 0n,
    });
  });

  it.each(['duelCancelledByCreator', 'duelCancelledByInvitee'] as const)('parses %s', (name) => {
    const e = reads.events[name];
    expect(parseDuelCancelled(raw(e), prod('DuelCancelled'))).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      cancelledBy: addr(e.json.cancelled_by),
      refund: big(e.json.refund),
      transactionDigest: e.transactionDigest,
    });
  });

  it('distinguishes cancellation by the creator from rejection by the invitee', () => {
    const byCreator = parseDuelCancelled(raw(reads.events.duelCancelledByCreator), prod('DuelCancelled'));
    const byInvitee = parseDuelCancelled(raw(reads.events.duelCancelledByInvitee), prod('DuelCancelled'));
    expect(byCreator.cancelledBy).toBe(byCreator.creator);
    expect(byInvitee.cancelledBy).not.toBe(byInvitee.creator);
  });

  it('parses the atomic DuelActivated of the coinflip with no clock, to_move 0 and deadline 0', () => {
    const e = reads.events.duelActivatedCreatorWins;
    expect(parseDuelActivated(raw(e), prod('DuelActivated'))).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      acceptor: addr(e.json.acceptor),
      bet: big(e.json.bet),
      turnMs: 0n,
      toMove: 0,
      deadlineMs: 0n,
      transactionDigest: e.transactionDigest,
    });
  });

  it.each(['duelResolvedCreatorWins', 'duelResolvedAcceptorWins'] as const)('parses %s with pot = payout + fee', (name) => {
    const e = reads.events[name];
    const parsed = parseDuelResolved(raw(e), prod('DuelResolved'));
    expect(parsed).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      acceptor: addr(e.json.acceptor),
      winner: addr(e.json.winner),
      pot: big(e.json.pot),
      fee: big(e.json.fee),
      payout: big(e.json.payout),
      transactionDigest: e.transactionDigest,
    });
    expect(parsed.pot).toBe(parsed.payout + parsed.fee);
  });

  it('tells the winner of each real resolution apart', () => {
    const byCreator = parseDuelResolved(raw(reads.events.duelResolvedCreatorWins), prod('DuelResolved'));
    const byAcceptor = parseDuelResolved(raw(reads.events.duelResolvedAcceptorWins), prod('DuelResolved'));
    expect(byCreator.winner).toBe(byCreator.creator);
    expect(byAcceptor.winner).toBe(byAcceptor.acceptor);
  });
});

describe('duel event parsers on the clock fixture (sandbox: only the mechanism)', () => {
  it('comes from the sandbox and is tagged with a game whose id differs from the one of the events', () => {
    expect(clock._meta.sandbox).toBe(true);
    expect(TEST_GAME_TAG.split('::')[0]).not.toBe(clock.events.duelTurn.eventType.split('::')[0]);
  });

  it('parses DuelCreated with a control outside the table and keeps the id and the ms of the chain', () => {
    const e = clock.events.duelCreated;
    expect(parseDuelCreated(raw(e), trial('DuelCreated'))).toMatchObject({
      control: Number(e.json.control),
      turnMs: big(e.json.turn_ms),
      opponent: null,
    });
  });

  it('parses DuelActivated with clock: to_move 1..=3 and an absolute deadline', () => {
    const e = clock.events.duelActivated;
    const parsed = parseDuelActivated(raw(e), trial('DuelActivated'));
    expect(parsed).toMatchObject({ toMove: Number(e.json.to_move), turnMs: big(e.json.turn_ms), deadlineMs: big(e.json.deadline_ms) });
    expect(parsed.deadlineMs).toBeGreaterThan(0n);
  });

  it('parses DuelTurn with the actor and the state after the move', () => {
    const e = clock.events.duelTurn;
    expect(parseDuelTurn(raw(e), trial('DuelTurn'))).toEqual({
      duelId: addr(e.json.duel_id),
      actor: addr(e.json.actor),
      toMove: Number(e.json.to_move),
      deadlineMs: big(e.json.deadline_ms),
      transactionDigest: e.transactionDigest,
    });
  });

  it('parses DuelResolved of the clock path', () => {
    const e = clock.events.duelResolved;
    expect(parseDuelResolved(raw(e), trial('DuelResolved'))).toMatchObject({ winner: addr(e.json.winner), pot: big(e.json.pot) });
  });

  it('parses DuelTimedOut with who claimed it, which is not the winner', () => {
    const e = clock.events.duelTimedOut;
    const parsed = parseDuelTimedOut(raw(e), trial('DuelTimedOut'));
    expect(parsed).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      acceptor: addr(e.json.acceptor),
      winner: addr(e.json.winner),
      claimedBy: addr(e.json.claimed_by),
      pot: big(e.json.pot),
      fee: big(e.json.fee),
      payout: big(e.json.payout),
      transactionDigest: e.transactionDigest,
    });
    expect(parsed.claimedBy).not.toBe(parsed.winner);
    expect(parsed.pot).toBe(parsed.payout + parsed.fee);
  });

  it.each(['duelExpiredBothPending', 'duelExpiredOnePending'] as const)('parses %s with the refund of each player', (name) => {
    const e = clock.events[name];
    expect(parseDuelExpired(raw(e), trial('DuelExpired'))).toEqual({
      duelId: addr(e.json.duel_id),
      creator: addr(e.json.creator),
      acceptor: addr(e.json.acceptor),
      refundEach: big(e.json.refund_each),
      transactionDigest: e.transactionDigest,
    });
  });
});

describe('each duel event parser accepts only its own event type', () => {
  const parsers: [DuelEventName, FixtureEvent, (r: RawGameEvent, t: string) => unknown][] = [
    ['DuelCreated', clock.events.duelCreated, parseDuelCreated],
    ['DuelActivated', clock.events.duelActivated, parseDuelActivated],
    ['DuelTurn', clock.events.duelTurn, parseDuelTurn],
    ['DuelResolved', clock.events.duelResolved, parseDuelResolved],
    ['DuelTimedOut', clock.events.duelTimedOut, parseDuelTimedOut],
    ['DuelExpired', clock.events.duelExpiredBothPending, parseDuelExpired],
  ];
  const cases = parsers.flatMap(([name, , parse]) =>
    parsers.filter(([other]) => other !== name).map(([other, event]) => [name, other, event, parse] as const),
  );

  it.each(cases)('%s rejects a %s event', (name, _other, event, parse) => {
    expect(readDataReason(() => parse(raw(event), trial(name)))).toBe('wrong_type');
  });

  it('DuelCancelled rejects every other duel event', () => {
    for (const [, event] of parsers) {
      expect(readDataReason(() => parseDuelCancelled(raw(event), trial('DuelCancelled')))).toBe('wrong_type');
    }
  });
});

describe('duel event parsers reject a wrong type', () => {
  it('rejects an event of another game (same event, other type argument)', () => {
    expect(readDataReason(() => parseDuelCreated(raw(clock.events.duelCreated), prod('DuelCreated')))).toBe('wrong_type');
    expect(readDataReason(() => parseDuelResolved(raw(reads.events.duelResolvedCreatorWins), trial('DuelResolved')))).toBe('wrong_type');
  });

  it('rejects an event of another package', () => {
    const e = raw(reads.events.duelCreatedOpen);
    const hostile = { ...e, eventType: e.eventType.replace(/^0x[0-9a-f]{64}/, OTHER_PKG) };
    expect(readDataReason(() => parseDuelCreated(hostile, prod('DuelCreated')))).toBe('wrong_type');
  });

  it('rejects an event whose type cannot be normalized', () => {
    const e = raw(reads.events.duelCreatedOpen);
    expect(readDataReason(() => parseDuelCreated({ ...e, eventType: 'not a type' }, prod('DuelCreated')))).toBe('wrong_type');
  });

  it('rejects the event of the legacy game', () => {
    const e = raw(reads.events.duelCreatedOpen);
    const legacy = { ...e, eventType: e.eventType.replace('::duel::DuelCreated<', '::game::GameCreated<') };
    expect(readDataReason(() => parseDuelCreated(legacy, prod('DuelCreated')))).toBe('wrong_type');
  });
});

describe('duel event parsers reject malformed bytes (unreadable rows)', () => {
  it.each([
    ['DuelCreated', reads.events.duelCreatedOpen, parseDuelCreated, prod('DuelCreated')],
    ['DuelCancelled', reads.events.duelCancelledByCreator, parseDuelCancelled, prod('DuelCancelled')],
    ['DuelActivated', reads.events.duelActivatedCreatorWins, parseDuelActivated, prod('DuelActivated')],
    ['DuelResolved', reads.events.duelResolvedCreatorWins, parseDuelResolved, prod('DuelResolved')],
    ['DuelTurn', clock.events.duelTurn, parseDuelTurn, trial('DuelTurn')],
    ['DuelTimedOut', clock.events.duelTimedOut, parseDuelTimedOut, trial('DuelTimedOut')],
    ['DuelExpired', clock.events.duelExpiredOnePending, parseDuelExpired, trial('DuelExpired')],
  ] as const)('rejects truncated and trailing bytes of %s', (_name, event, parse, type) => {
    const e = raw(event);
    expect(readDataReason(() => parse({ ...e, bcs: e.bcs.slice(0, -1) }, type))).toBe('malformed');
    expect(readDataReason(() => parse({ ...e, bcs: new Uint8Array([...e.bcs, 0]) }, type))).toBe('malformed');
  });

  it('rejects an Option tag 2 in the opponent of DuelCreated', () => {
    const e = patched(raw(reads.events.duelCreatedOpen), (b) => { b[CREATED_OPPONENT_TAG] = 2; });
    expect(readDataReason(() => parseDuelCreated(e, prod('DuelCreated')))).toBe('malformed');
  });
});

describe('duel event parsers do not validate the time control against the table (the chain rules)', () => {
  it.each([45_000n, 90_000n])('accepts a DuelCreated whose turn_ms is %s and whose control id is unknown', (turnMs) => {
    const e = patched(raw(reads.events.duelCreatedOpen), (b, v) => {
      v.setBigUint64(CREATED_TURN_MS_OPEN, turnMs, true);
      b[CREATED_CONTROL_OPEN] = 9;
    });
    expect(parseDuelCreated(e, prod('DuelCreated'))).toMatchObject({ control: 9, turnMs });
  });
});

describe('duel event parsers enforce the duel.move invariants', () => {
  it('rejects a DuelActivated without clock whose to_move is not 0', () => {
    const e = patched(raw(reads.events.duelActivatedCreatorWins), (b) => { b[ACTIVATED_TO_MOVE] = 1; });
    expect(readDataReason(() => parseDuelActivated(e, prod('DuelActivated')))).toBe('invariant');
  });

  it('rejects a DuelActivated without clock whose deadline is not 0', () => {
    const e = patched(raw(reads.events.duelActivatedCreatorWins), (_b, v) => { v.setBigUint64(ACTIVATED_DEADLINE, 5n, true); });
    expect(readDataReason(() => parseDuelActivated(e, prod('DuelActivated')))).toBe('invariant');
  });

  it.each([0, 4])('rejects a DuelActivated with clock and to_move %i', (toMove) => {
    const e = patched(raw(clock.events.duelActivated), (b) => { b[ACTIVATED_TO_MOVE] = toMove; });
    expect(readDataReason(() => parseDuelActivated(e, trial('DuelActivated')))).toBe('invariant');
  });

  it('rejects a DuelActivated that claims a clock of 0 ms but moves a player', () => {
    const e = patched(raw(clock.events.duelActivated), (_b, v) => { v.setBigUint64(ACTIVATED_TURN_MS, 0n, true); });
    expect(readDataReason(() => parseDuelActivated(e, trial('DuelActivated')))).toBe('invariant');
  });

  it.each([0, 4])('rejects a DuelTurn with to_move %i', (toMove) => {
    const e = patched(raw(clock.events.duelTurn), (b) => { b[TURN_TO_MOVE] = toMove; });
    expect(readDataReason(() => parseDuelTurn(e, trial('DuelTurn')))).toBe('invariant');
  });

  it('rejects a DuelResolved with pot ≠ payout + fee', () => {
    const e = patched(raw(reads.events.duelResolvedCreatorWins), (_b, v) => { v.setBigUint64(RESOLVED_POT, 1n, true); });
    expect(readDataReason(() => parseDuelResolved(e, prod('DuelResolved')))).toBe('invariant');
  });

  it('rejects a DuelResolved whose winner is neither creator nor acceptor', () => {
    const e = patched(raw(reads.events.duelResolvedCreatorWins), (b) => { b.fill(0xab, RESOLVED_WINNER, RESOLVED_WINNER + 32); });
    expect(readDataReason(() => parseDuelResolved(e, prod('DuelResolved')))).toBe('invariant');
  });

  it('rejects a DuelTimedOut with pot ≠ payout + fee', () => {
    const e = patched(raw(clock.events.duelTimedOut), (_b, v) => { v.setBigUint64(TIMED_OUT_POT, 1n, true); });
    expect(readDataReason(() => parseDuelTimedOut(e, trial('DuelTimedOut')))).toBe('invariant');
  });

  it('rejects a DuelTimedOut whose winner is neither creator nor acceptor', () => {
    const e = patched(raw(clock.events.duelTimedOut), (b) => { b.fill(0xab, TIMED_OUT_WINNER, TIMED_OUT_WINNER + 32); });
    expect(readDataReason(() => parseDuelTimedOut(e, trial('DuelTimedOut')))).toBe('invariant');
  });
});
