import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { duelType, isValidToMove, parseDuelObject, type Duel, type DuelObjectInput } from './duel';
import { definingIdOf, type TypeOrigin } from './gameRegistry';
import { ReadDataError } from './readErrors';

type FixtureObject = {
  objectId: string;
  type: string;
  owner: SuiClientTypes.ObjectOwner;
  content: string;
  json: {
    id: string;
    version: string;
    house_id: string;
    creator: string;
    opponent: string | null;
    bet: string;
    stake: string;
    fee_rate: number;
    turn_ms: string;
    state: { '@variant': string; acceptor?: string; winner?: string; to_move?: number; deadline_ms?: string };
  };
};
type ReadsFixture = {
  ids: { duelType: string; coinflipTag: string };
  typeOrigins: TypeOrigin[];
  objects: Record<
    'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'cancelledByInvitee' | 'resolvedCreatorWins' | 'resolvedAcceptorWins',
    FixtureObject
  >;
};
/** Fixture de ensayo: `ids` se lee sin nombrar sus claves (el juego de ensayo no aparece en el código de la app). */
type ClockFixture = {
  _meta: { sandbox: boolean; sandboxConstants: Record<string, number> };
  ids: Record<string, unknown>;
  typeOrigins: TypeOrigin[];
  objects: Record<
    'pending' | 'activeOnePending' | 'activeBothPending' | 'activeSevenDays' | 'timedOut' | 'expiredBothPending' | 'expiredOnePending' | 'resolved',
    FixtureObject
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
const DUEL_DEFINING_ID = definingIdOf(reads.typeOrigins, 'duel', 'Duel') ?? '';
const DUEL_TYPE = duelType(DUEL_DEFINING_ID, reads.ids.coinflipTag);

/** Tag del juego de ensayo y plazo de ensayo: el único valor con forma de tag y el que termina en `_TURN_MS`. */
const TEST_GAME_TAG = Object.values(clock.ids).find((v): v is string => typeof v === 'string' && /^0x[0-9a-f]{64}::\w+::\w+$/.test(v)) ?? '';
const TEST_TURN_MS = BigInt(Object.entries(clock._meta.sandboxConstants).find(([key]) => key.endsWith('_TURN_MS'))?.[1] ?? -1);
const CLOCK_DUEL_TYPE = duelType(definingIdOf(clock.typeOrigins, 'duel', 'Duel') ?? '', TEST_GAME_TAG);

/** Desplazamientos del layout BCS de un `Duel`: id 32 + version 8 + house_id 32 + creator 32 + opponent (1 o 33). */
function layout(o: FixtureObject) {
  const afterOpponent = 104 + (o.json.opponent === null ? 1 : 33);
  const state = afterOpponent + 26;
  return {
    opponentTag: 104,
    bet: afterOpponent,
    stake: afterOpponent + 8,
    feeRate: afterOpponent + 16,
    turnMs: afterOpponent + 18,
    state,
    acceptor: state + 1,
    toMove: state + 33,
    deadline: state + 34,
    winner: state + 33,
  };
}

function input(o: FixtureObject, patch?: (bytes: Uint8Array, view: DataView) => void): DuelObjectInput {
  const content = fromBase64(o.content);
  patch?.(content, new DataView(content.buffer, content.byteOffset, content.byteLength));
  return { type: o.type, owner: o.owner, content };
}

/** Valor esperado armado desde el `json` del nodo: es el cruce BCS ↔ json de DL-1. */
function fromJson(json: FixtureObject['json']): Duel {
  const s = json.state;
  const address = (value: string | undefined): string => normalizeSuiAddress(value ?? '');
  const state: Duel['state'] = (() => {
    switch (s['@variant']) {
      case 'Pending':
        return { kind: 'pending' };
      case 'Cancelled':
        return { kind: 'cancelled' };
      case 'Active':
        return { kind: 'active', acceptor: address(s.acceptor), toMove: s.to_move ?? -1, deadlineMs: BigInt(s.deadline_ms ?? '-1') };
      case 'Resolved':
        return { kind: 'resolved', acceptor: address(s.acceptor), winner: address(s.winner) };
      case 'TimedOut':
        return { kind: 'timed_out', acceptor: address(s.acceptor), winner: address(s.winner) };
      case 'Expired':
        return { kind: 'expired', acceptor: address(s.acceptor) };
      default:
        throw new Error(`variante desconocida en la fixture: ${s['@variant']}`);
    }
  })();
  return {
    id: normalizeSuiAddress(json.id),
    version: BigInt(json.version),
    houseId: normalizeSuiAddress(json.house_id),
    creator: normalizeSuiAddress(json.creator),
    opponent: json.opponent === null ? null : normalizeSuiAddress(json.opponent),
    bet: BigInt(json.bet),
    stake: BigInt(json.stake),
    feeRate: json.fee_rate,
    turnMs: BigInt(json.turn_ms),
    state,
  };
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

describe('duelType', () => {
  it('builds the normalized Duel<G> type from the defining ids of Duel and of the game', () => {
    expect(DUEL_TYPE).toBe(reads.ids.duelType);
    expect(duelType('0x2', '0x3::coinflip::Coinflip')).toBe(`0x${'0'.repeat(63)}2::duel::Duel<0x${'0'.repeat(63)}3::coinflip::Coinflip>`);
  });

  it('keeps the ids apart when Duel and the game were defined in different upgrades', () => {
    const duelId = `0x${'a'.repeat(64)}`;
    const gameId = `0x${'b'.repeat(64)}`;
    expect(duelType(duelId, `${gameId}::coinflip::Coinflip`)).toBe(`${duelId}::duel::Duel<${gameId}::coinflip::Coinflip>`);
  });
});

describe('isValidToMove', () => {
  it.each([1, 2, 3])('accepts the mask %i', (mask) => {
    expect(isValidToMove(mask)).toBe(true);
  });

  it.each([0, 4, 255])('rejects the mask %i', (mask) => {
    expect(isValidToMove(mask)).toBe(false);
  });
});

describe('parseDuelObject on the real production fixture (duel-reads)', () => {
  it.each(Object.keys(reads.objects) as (keyof ReadsFixture['objects'])[])('matches the node json for %s', (name) => {
    expect(parseDuelObject(input(reads.objects[name]), DUEL_TYPE)).toEqual(fromJson(reads.objects[name].json));
  });

  it('parses an open pending duel without clock and with bigint amounts', () => {
    const duel = parseDuelObject(input(reads.objects.pendingOpen), DUEL_TYPE);
    expect(duel).toMatchObject({ opponent: null, bet: 10_000_000n, stake: 10_000_000n, feeRate: 500, turnMs: 0n, state: { kind: 'pending' } });
    expect(duel.id).toBe(reads.objects.pendingOpen.objectId);
  });

  it('parses an invitation with the invited address', () => {
    expect(parseDuelObject(input(reads.objects.pendingInvite), DUEL_TYPE).opponent).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it.each(['cancelledByCreator', 'cancelledByInvitee'] as const)('parses %s with stake 0', (name) => {
    expect(parseDuelObject(input(reads.objects[name]), DUEL_TYPE)).toMatchObject({ stake: 0n, state: { kind: 'cancelled' } });
  });

  it.each(['resolvedCreatorWins', 'resolvedAcceptorWins'] as const)('parses %s with a winner among the two players', (name) => {
    const duel = parseDuelObject(input(reads.objects[name]), DUEL_TYPE);
    expect(duel.stake).toBe(0n);
    expect(duel.state.kind).toBe('resolved');
    if (duel.state.kind === 'resolved') expect([duel.creator, duel.state.acceptor]).toContain(duel.state.winner);
  });

  it('distinguishes the winner of each real resolution', () => {
    const byCreator = parseDuelObject(input(reads.objects.resolvedCreatorWins), DUEL_TYPE);
    const byAcceptor = parseDuelObject(input(reads.objects.resolvedAcceptorWins), DUEL_TYPE);
    expect(byCreator.state.kind === 'resolved' && byCreator.state.winner === byCreator.creator).toBe(true);
    expect(byAcceptor.state.kind === 'resolved' && byAcceptor.state.winner === byAcceptor.state.acceptor).toBe(true);
  });
});

describe('parseDuelObject on the clock fixture (sandbox: only the mechanism, no production constant)', () => {
  it('comes from the sandbox: it is flagged and carries its own constants', () => {
    expect(clock._meta.sandbox).toBe(true);
    expect(TEST_GAME_TAG).not.toBe('');
    expect(TEST_TURN_MS).toBeGreaterThan(0n);
  });

  it('uses a Duel<G> type whose game id differs from the Duel id (different upgrades)', () => {
    const [duelPart] = CLOCK_DUEL_TYPE.split('::');
    expect(TEST_GAME_TAG.split('::')[0]).not.toBe(duelPart);
    expect(clock.objects.pending.type).toBe(CLOCK_DUEL_TYPE);
  });

  it.each(Object.keys(clock.objects) as (keyof ClockFixture['objects'])[])('matches the node json for %s', (name) => {
    expect(parseDuelObject(input(clock.objects[name]), CLOCK_DUEL_TYPE)).toEqual(fromJson(clock.objects[name].json));
  });

  it.each([
    ['activeOnePending', 1],
    ['activeSevenDays', 2],
    ['activeBothPending', 3],
  ] as const)('parses %s as Active with to_move %i and an absolute deadline', (name, toMove) => {
    const duel = parseDuelObject(input(clock.objects[name]), CLOCK_DUEL_TYPE);
    expect(duel.stake).toBe(2n * duel.bet);
    expect(duel.state).toMatchObject({ kind: 'active', toMove });
    expect(duel.state.kind === 'active' && duel.state.deadlineMs > 0n).toBe(true);
  });

  it('parses the TimedOut, Expired and Resolved final states with stake 0', () => {
    expect(parseDuelObject(input(clock.objects.timedOut), CLOCK_DUEL_TYPE).state.kind).toBe('timed_out');
    expect(parseDuelObject(input(clock.objects.expiredBothPending), CLOCK_DUEL_TYPE).state.kind).toBe('expired');
    expect(parseDuelObject(input(clock.objects.expiredOnePending), CLOCK_DUEL_TYPE).state.kind).toBe('expired');
    expect(parseDuelObject(input(clock.objects.resolved), CLOCK_DUEL_TYPE)).toMatchObject({ stake: 0n, state: { kind: 'resolved' } });
  });

  it('reads a turn_ms outside the control table as it comes from the chain (never an error)', () => {
    expect(parseDuelObject(input(clock.objects.pending), CLOCK_DUEL_TYPE).turnMs).toBe(TEST_TURN_MS);
  });
});

describe('parseDuelObject does not validate turn_ms against the control table (the chain rules)', () => {
  it.each([45_000n, 90_000n, 1n, 600_000n])('accepts a pending duel with turn_ms %s', (turnMs) => {
    const o = reads.objects.pendingOpen;
    const parsed = parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).turnMs, turnMs, true); }), DUEL_TYPE);
    expect(parsed.turnMs).toBe(turnMs);
  });

  it('accepts an active duel whose turn_ms is not in the table', () => {
    const o = clock.objects.activeOnePending;
    const parsed = parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).turnMs, 45_000n, true); }), CLOCK_DUEL_TYPE);
    expect(parsed.turnMs).toBe(45_000n);
  });
});

describe('parseDuelObject rejects malformed data', () => {
  it('rejects truncated bytes', () => {
    const o = input(reads.objects.pendingOpen);
    expect(readDataReason(() => parseDuelObject({ ...o, content: o.content.slice(0, -1) }, DUEL_TYPE))).toBe('malformed');
  });

  it('rejects trailing bytes that bcs parse would accept', () => {
    const o = input(reads.objects.pendingOpen);
    expect(readDataReason(() => parseDuelObject({ ...o, content: new Uint8Array([...o.content, 0]) }, DUEL_TYPE))).toBe('malformed');
  });

  it('rejects an unknown DuelState variant (index 6)', () => {
    const o = reads.objects.pendingOpen;
    expect(readDataReason(() => parseDuelObject(input(o, (b) => { b[layout(o).state] = 6; }), DUEL_TYPE))).toBe('malformed');
  });

  it('rejects an Option tag 2 in opponent', () => {
    const o = reads.objects.pendingOpen;
    expect(readDataReason(() => parseDuelObject(input(o, (b) => { b[layout(o).opponentTag] = 2; }), DUEL_TYPE))).toBe('malformed');
  });

  it('rejects a Duel of another package', () => {
    const o = input(reads.objects.pendingOpen);
    expect(readDataReason(() => parseDuelObject({ ...o, type: o.type.replace(DUEL_DEFINING_ID, OTHER_PKG) }, DUEL_TYPE))).toBe('wrong_type');
  });

  it('rejects a Duel of another game (the type argument is part of the type)', () => {
    const o = input(clock.objects.pending);
    expect(readDataReason(() => parseDuelObject(o, DUEL_TYPE))).toBe('wrong_type');
  });

  it('rejects the legacy Game type', () => {
    const o = input(reads.objects.pendingOpen);
    expect(readDataReason(() => parseDuelObject({ ...o, type: `${DUEL_DEFINING_ID}::game::Game` }, DUEL_TYPE))).toBe('wrong_type');
  });

  it('rejects a type that cannot be normalized', () => {
    const o = input(reads.objects.pendingOpen);
    expect(readDataReason(() => parseDuelObject({ ...o, type: 'not a type' }, DUEL_TYPE))).toBe('wrong_type');
  });

  it('rejects an owner that is not shared', () => {
    const o = input(reads.objects.pendingOpen);
    const owner: SuiClientTypes.ObjectOwner = { $kind: 'AddressOwner', AddressOwner: OTHER_PKG };
    expect(readDataReason(() => parseDuelObject({ ...o, owner }, DUEL_TYPE))).toBe('not_shared');
  });
});

describe('parseDuelObject enforces the duel.move invariants (R.6)', () => {
  it('rejects a pending duel whose stake differs from the bet', () => {
    const o = reads.objects.pendingOpen;
    expect(readDataReason(() => parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).stake, 1n, true); }), DUEL_TYPE))).toBe('invariant');
  });

  it.each(['cancelledByCreator', 'resolvedCreatorWins'] as const)('rejects %s with stake', (name) => {
    const o = reads.objects[name];
    expect(readDataReason(() => parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).stake, 1n, true); }), DUEL_TYPE))).toBe('invariant');
  });

  it.each(['timedOut', 'expiredOnePending'] as const)('rejects %s with stake', (name) => {
    const o = clock.objects[name];
    expect(readDataReason(() => parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).stake, 1n, true); }), CLOCK_DUEL_TYPE))).toBe('invariant');
  });

  it.each([0n, 10_000_000n, 30_000_000n])('rejects an active duel whose stake is %s instead of 2 × bet', (stake) => {
    const o = clock.objects.activeOnePending;
    expect(readDataReason(() => parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).stake, stake, true); }), CLOCK_DUEL_TYPE))).toBe('invariant');
  });

  it.each([0, 4, 255])('rejects an active duel with to_move %i', (toMove) => {
    const o = clock.objects.activeOnePending;
    expect(readDataReason(() => parseDuelObject(input(o, (b) => { b[layout(o).toMove] = toMove; }), CLOCK_DUEL_TYPE))).toBe('invariant');
  });

  it('rejects an active duel without clock (turn_ms 0): it only exists inside an activate_atomic transaction', () => {
    const o = clock.objects.activeOnePending;
    expect(readDataReason(() => parseDuelObject(input(o, (_b, v) => { v.setBigUint64(layout(o).turnMs, 0n, true); }), CLOCK_DUEL_TYPE))).toBe('invariant');
  });

  it.each(['resolvedCreatorWins', 'resolvedAcceptorWins'] as const)('rejects %s whose winner is neither creator nor acceptor', (name) => {
    const o = reads.objects[name];
    expect(readDataReason(() => parseDuelObject(input(o, (b) => { b.fill(0xab, layout(o).winner, layout(o).winner + 32); }), DUEL_TYPE))).toBe('invariant');
  });

  it('rejects a timed-out duel whose winner is neither creator nor acceptor', () => {
    const o = clock.objects.timedOut;
    expect(readDataReason(() => parseDuelObject(input(o, (b) => { b.fill(0xab, layout(o).winner, layout(o).winner + 32); }), CLOCK_DUEL_TYPE))).toBe('invariant');
  });

  it('accepts a well-formed fee_rate of 1001 (MAX_FEE_BPS belongs to house)', () => {
    const o = reads.objects.pendingOpen;
    expect(parseDuelObject(input(o, (_b, v) => { v.setUint16(layout(o).feeRate, 1001, true); }), DUEL_TYPE).feeRate).toBe(1001);
  });

  it('reads the bet and the stake from the expected offsets', () => {
    const o = reads.objects.pendingOpen;
    const parsed = parseDuelObject(
      input(o, (_b, v) => {
        v.setBigUint64(layout(o).bet, 7n, true);
        v.setBigUint64(layout(o).stake, 7n, true);
      }),
      DUEL_TYPE,
    );
    expect(parsed).toMatchObject({ bet: 7n, stake: 7n });
  });
});
