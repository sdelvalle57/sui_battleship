import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { gameType, parseGameObject, resolutionAmounts, type Game, type GameObjectInput } from './game';
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
    state: { '@variant': string; acceptor?: string; winner?: string };
  };
};
type Fixture = {
  objects: Record<'pendingOpen' | 'pendingInvite' | 'cancelledByCreator' | 'cancelledByInvitee' | 'resolved', FixtureObject>;
  events: { gameResolved: { json: Record<string, string> } };
};

const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.objects.pendingOpen.type.split('::')[0] ?? '';
const OTHER_PKG = `0x${'ab'.repeat(32)}`;

// Desplazamientos del layout BCS de un Game sin `opponent` (id 32 + version 8 + house_id 32 + creator 32 + tag 1).
const OPEN_BET = 105;
const OPEN_STAKE = 113;
const OPEN_FEE_RATE = 121;
const OPEN_STATE = 123;
const OPPONENT_TAG = 104;

function input(name: keyof Fixture['objects'], patch?: (bytes: Uint8Array, view: DataView) => void): GameObjectInput {
  const o = fixture.objects[name];
  const content = fromBase64(o.content);
  patch?.(content, new DataView(content.buffer, content.byteOffset, content.byteLength));
  return { type: o.type, owner: o.owner, content };
}

/** Valor esperado armado desde el `json` del nodo: es el cruce BCS ↔ json de DL-1. */
function fromJson(json: FixtureObject['json']): Game {
  const variant = json.state['@variant'];
  const state: Game['state'] =
    variant === 'Pending'
      ? { kind: 'pending' }
      : variant === 'Cancelled'
        ? { kind: 'cancelled' }
        : {
            kind: 'resolved',
            acceptor: normalizeSuiAddress(json.state.acceptor ?? ''),
            winner: normalizeSuiAddress(json.state.winner ?? ''),
          };
  return {
    id: normalizeSuiAddress(json.id),
    version: BigInt(json.version),
    houseId: normalizeSuiAddress(json.house_id),
    creator: normalizeSuiAddress(json.creator),
    opponent: json.opponent === null ? null : normalizeSuiAddress(json.opponent),
    bet: BigInt(json.bet),
    stake: BigInt(json.stake),
    feeRate: json.fee_rate,
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

describe('gameType', () => {
  it('builds the normalized Game type of the original package', () => {
    expect(gameType(PKG)).toBe(`${PKG}::game::Game`);
    expect(gameType('0x2')).toBe(`0x${'0'.repeat(63)}2::game::Game`);
  });
});

describe('parseGameObject on the real fixture', () => {
  it.each(Object.keys(fixture.objects) as (keyof Fixture['objects'])[])('matches the node json for %s', (name) => {
    expect(parseGameObject(input(name), PKG)).toEqual(fromJson(fixture.objects[name].json));
  });

  it('parses an open pending game with bigint amounts', () => {
    const game = parseGameObject(input('pendingOpen'), PKG);
    expect(game).toMatchObject({ opponent: null, bet: 1_000_001n, stake: 1_000_001n, feeRate: 250, state: { kind: 'pending' } });
    expect(game.id).toBe(fixture.objects.pendingOpen.objectId);
  });

  it('parses an invitation with the invited address', () => {
    const game = parseGameObject(input('pendingInvite'), PKG);
    expect(game.bet).toBe(1_000_002n);
    expect(game.opponent).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it.each([
    ['cancelledByCreator', 1_000_003n],
    ['cancelledByInvitee', 1_000_004n],
  ] as const)('parses %s with stake 0', (name, bet) => {
    expect(parseGameObject(input(name), PKG)).toMatchObject({ bet, stake: 0n, state: { kind: 'cancelled' } });
  });

  it('parses a resolved game with acceptor and winner', () => {
    const game = parseGameObject(input('resolved'), PKG);
    expect(game).toMatchObject({ bet: 1_000_005n, stake: 0n });
    expect(game.state.kind).toBe('resolved');
    if (game.state.kind === 'resolved') expect([game.creator, game.state.acceptor]).toContain(game.state.winner);
  });
});

describe('parseGameObject rejects malformed data', () => {
  it('rejects truncated bytes', () => {
    const o = input('pendingOpen');
    expect(readDataReason(() => parseGameObject({ ...o, content: o.content.slice(0, -1) }, PKG))).toBe('malformed');
  });

  it('rejects trailing bytes that bcs parse would accept', () => {
    const o = input('pendingOpen');
    expect(readDataReason(() => parseGameObject({ ...o, content: new Uint8Array([...o.content, 0]) }, PKG))).toBe('malformed');
  });

  it('rejects an unknown GameState variant (index 3)', () => {
    expect(readDataReason(() => parseGameObject(input('pendingOpen', (b) => { b[OPEN_STATE] = 3; }), PKG))).toBe('malformed');
  });

  it('rejects an Option tag 2 in opponent', () => {
    expect(readDataReason(() => parseGameObject(input('pendingOpen', (b) => { b[OPPONENT_TAG] = 2; }), PKG))).toBe('malformed');
  });

  it('rejects a Game type of another package', () => {
    const o = input('pendingOpen');
    expect(readDataReason(() => parseGameObject({ ...o, type: `${OTHER_PKG}::game::Game` }, PKG))).toBe('wrong_type');
  });

  it('rejects a Game type of another module', () => {
    const o = input('pendingOpen');
    expect(readDataReason(() => parseGameObject({ ...o, type: `${PKG}::house::Game` }, PKG))).toBe('wrong_type');
  });

  it('rejects a type that cannot be normalized', () => {
    const o = input('pendingOpen');
    expect(readDataReason(() => parseGameObject({ ...o, type: 'not a type' }, PKG))).toBe('wrong_type');
  });

  it('rejects an owner that is not shared', () => {
    const o = input('pendingOpen');
    const owner: SuiClientTypes.ObjectOwner = { $kind: 'AddressOwner', AddressOwner: OTHER_PKG };
    expect(readDataReason(() => parseGameObject({ ...o, owner }, PKG))).toBe('not_shared');
  });
});

describe('parseGameObject enforces game.move invariants', () => {
  it('rejects a pending game whose stake differs from the bet', () => {
    const o = input('pendingOpen', (_b, v) => { v.setBigUint64(OPEN_STAKE, 1_000_000n, true); });
    expect(readDataReason(() => parseGameObject(o, PKG))).toBe('invariant');
  });

  it('rejects a cancelled game with stake', () => {
    const o = input('cancelledByCreator', (_b, v) => { v.setBigUint64(OPEN_STAKE, 1n, true); });
    expect(readDataReason(() => parseGameObject(o, PKG))).toBe('invariant');
  });

  it('rejects a resolved game with stake', () => {
    const o = input('resolved', (_b, v) => { v.setBigUint64(OPEN_STAKE, 1n, true); });
    expect(readDataReason(() => parseGameObject(o, PKG))).toBe('invariant');
  });

  it('rejects a resolved game whose winner is neither creator nor acceptor', () => {
    const winnerOffset = OPEN_STATE + 1 + 32;
    const o = input('resolved', (b) => { b.fill(0xab, winnerOffset, winnerOffset + 32); });
    expect(readDataReason(() => parseGameObject(o, PKG))).toBe('invariant');
  });

  it('accepts a well-formed fee_rate of 1001 (MAX_FEE_BPS belongs to house)', () => {
    const o = input('pendingOpen', (_b, v) => { v.setUint16(OPEN_FEE_RATE, 1001, true); });
    expect(parseGameObject(o, PKG).feeRate).toBe(1001);
  });

  it('reads the bet from the expected offset', () => {
    const o = input('pendingOpen', (_b, v) => {
      v.setBigUint64(OPEN_BET, 7n, true);
      v.setBigUint64(OPEN_STAKE, 7n, true);
    });
    expect(parseGameObject(o, PKG)).toMatchObject({ bet: 7n, stake: 7n });
  });
});

describe('resolutionAmounts', () => {
  it('matches the GameResolved event of the fixture', () => {
    const resolved = parseGameObject(input('resolved'), PKG);
    const e = fixture.events.gameResolved.json;
    expect(resolutionAmounts(resolved.bet, resolved.feeRate)).toEqual({
      pot: BigInt(e.pot ?? ''),
      fee: BigInt(e.fee ?? ''),
      payout: BigInt(e.payout ?? ''),
    });
  });

  it('computes 10 SUI at 250 bps', () => {
    expect(resolutionAmounts(10_000_000_000n, 250)).toEqual({ pot: 20_000_000_000n, fee: 500_000_000n, payout: 19_500_000_000n });
  });

  it('rounds the fee down (bet 1_000_001 at 250 bps)', () => {
    expect(resolutionAmounts(1_000_001n, 250)).toEqual({ pot: 2_000_002n, fee: 50_000n, payout: 1_950_002n });
  });

  it('charges nothing with feeRate 0', () => {
    expect(resolutionAmounts(1_000_000n, 0)).toEqual({ pot: 2_000_000n, fee: 0n, payout: 2_000_000n });
  });
});
