import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';
import { transactionInvalidations } from './txInvalidation';

const PKG = `0x${'a'.repeat(64)}`;
const HOUSE = `0x${'b'.repeat(64)}`;
const GAME = `0x${'c'.repeat(64)}`;
const ADDRESS = `0x${'d'.repeat(64)}`;
const CTX = { network: 'testnet' as const, originalPackageId: PKG, houseId: HOUSE, address: ADDRESS };
const MY_GAMES = queryKeys.myGames('testnet', PKG, ADDRESS);

describe('transactionInvalidations', () => {
  it('create: resets the lobby and invalidates the balance and my games', () => {
    expect(transactionInvalidations({ kind: 'create' }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.balance('testnet', ADDRESS), MY_GAMES],
    });
  });

  it.each(['cancel', 'reject'] as const)('%s: resets the lobby and invalidates the game, the balance and my games', (kind) => {
    expect(transactionInvalidations({ kind, gameId: GAME }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.game('testnet', GAME), queryKeys.balance('testnet', ADDRESS), MY_GAMES],
    });
  });

  it('accept: resets the lobby and invalidates the game, the balance, the House (fees collected) and my games', () => {
    expect(transactionInvalidations({ kind: 'accept', gameId: GAME }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.game('testnet', GAME), queryKeys.balance('testnet', ADDRESS), queryKeys.house('testnet', HOUSE), MY_GAMES],
    });
    const all = JSON.stringify(transactionInvalidations({ kind: 'accept', gameId: GAME }, CTX));
    for (const key of ['nodeInfo', 'txInfo', 'publishCheckpoint', 'checkpointTime']) expect(all).not.toContain(key);
  });

  it.each([
    ['create', { kind: 'create' }],
    ['cancel', { kind: 'cancel', gameId: GAME }],
    ['reject', { kind: 'reject', gameId: GAME }],
    ['accept', { kind: 'accept', gameId: GAME }],
  ] as const)('%s with an account ends with my games of that account (T4-1, DL-7)', (_name, action) => {
    const { invalidate } = transactionInvalidations(action, { ...CTX, address: ADDRESS.toUpperCase().replace('0X', '0x') });
    expect(invalidate.at(-1)).toEqual(MY_GAMES);
    expect(invalidate.filter((key) => key[2] === 'myGames')).toHaveLength(1);
  });

  it.each([
    ['create', { kind: 'create' }],
    ['cancel', { kind: 'cancel', gameId: GAME }],
    ['reject', { kind: 'reject', gameId: GAME }],
    ['accept', { kind: 'accept', gameId: GAME }],
  ] as const)('%s without account invalidates neither my games nor a balance (T4-1)', (_name, action) => {
    const all = JSON.stringify(transactionInvalidations(action, { ...CTX, address: null }));
    expect(all).not.toContain('myGames');
    expect(all).not.toContain('balance');
  });

  it('skips the balance without account', () => {
    expect(transactionInvalidations({ kind: 'cancel', gameId: GAME }, { ...CTX, address: null }).invalidate).toEqual([
      queryKeys.game('testnet', GAME),
    ]);
  });

  it('never touches immutable or unrelated keys', () => {
    const all = JSON.stringify(
      (['create', 'cancel', 'reject'] as const).map((kind) =>
        transactionInvalidations(kind === 'create' ? { kind } : { kind, gameId: GAME }, CTX),
      ),
    );
    for (const key of ['nodeInfo', 'txInfo', 'publishCheckpoint', 'checkpointTime', 'house']) expect(all).not.toContain(key);
  });
});

describe('queryKeys.myGames, myActivity and myInvitations', () => {
  it('share the my games prefix with the normalized address', () => {
    const prefix = ['sui', 'localnet', 'myGames', PKG, `0x${'0'.repeat(63)}b`];
    expect(queryKeys.myGames('localnet', PKG, '0xB')).toEqual(prefix);
    expect(queryKeys.myActivity('localnet', PKG, '0xb')).toEqual([...prefix, 'activity']);
    expect(queryKeys.myInvitations('localnet', PKG, '0x0B')).toEqual([...prefix, 'invitations']);
  });
});

describe('queryKeys.house and queryKeys.balance', () => {
  it('builds the house key', () => {
    expect(queryKeys.house('localnet', HOUSE)).toEqual(['sui', 'localnet', 'house', HOUSE]);
  });

  it('normalizes the address of the balance key', () => {
    expect(queryKeys.balance('localnet', '0xB')).toEqual(['sui', 'localnet', 'balance', `0x${'0'.repeat(63)}b`]);
    expect(queryKeys.balance('localnet', ADDRESS.toUpperCase().replace('0X', '0x'))).toEqual(['sui', 'localnet', 'balance', ADDRESS]);
  });
});

describe('transactionInvalidations of the House actions (T3-6, H-5 of #14)', () => {
  const HOUSE_KEY = queryKeys.house('testnet', HOUSE);
  const HOUSE_CAP = queryKeys.houseCap('testnet', PKG, ADDRESS);

  it.each(['updateFeeRate', 'updateBetLimits'] as const)('%s: resets nothing and invalidates the House and the HouseCap of the account', (kind) => {
    expect(transactionInvalidations({ kind }, CTX)).toEqual({ reset: [], invalidate: [HOUSE_KEY, HOUSE_CAP] });
  });

  it('withdrawFees: resets nothing and invalidates the House, the balance (it received the coin) and the HouseCap', () => {
    expect(transactionInvalidations({ kind: 'withdrawFees' }, CTX)).toEqual({
      reset: [],
      invalidate: [HOUSE_KEY, queryKeys.balance('testnet', ADDRESS), HOUSE_CAP],
    });
  });

  it.each(['updateFeeRate', 'updateBetLimits', 'withdrawFees'] as const)('%s without account invalidates only the House', (kind) => {
    expect(transactionInvalidations({ kind }, { ...CTX, address: null })).toEqual({ reset: [], invalidate: [HOUSE_KEY] });
  });

  it.each(['updateFeeRate', 'updateBetLimits', 'withdrawFees'] as const)('%s never touches games, the lobby, my games or immutable keys', (kind) => {
    const all = JSON.stringify(transactionInvalidations({ kind }, CTX));
    for (const key of ['lobby', 'game', 'myGames', 'nodeInfo', 'txInfo', 'publishCheckpoint', 'checkpointTime']) {
      expect(all).not.toContain(`"${key}"`);
    }
  });

  it('normalizes the account in the HouseCap key', () => {
    const { invalidate } = transactionInvalidations({ kind: 'updateFeeRate' }, { ...CTX, address: ADDRESS.toUpperCase().replace('0X', '0x') });
    expect(invalidate).toEqual([HOUSE_KEY, HOUSE_CAP]);
  });
});
