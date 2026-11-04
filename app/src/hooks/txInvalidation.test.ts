import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';
import { transactionInvalidations } from './txInvalidation';

const PKG = `0x${'a'.repeat(64)}`;
const HOUSE = `0x${'b'.repeat(64)}`;
const GAME = `0x${'c'.repeat(64)}`;
const ADDRESS = `0x${'d'.repeat(64)}`;
const CTX = { network: 'testnet' as const, originalPackageId: PKG, houseId: HOUSE, address: ADDRESS };

describe('transactionInvalidations', () => {
  it('create: resets the lobby and invalidates the balance', () => {
    expect(transactionInvalidations({ kind: 'create' }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.balance('testnet', ADDRESS)],
    });
  });

  it.each(['cancel', 'reject'] as const)('%s: resets the lobby and invalidates the game and the balance', (kind) => {
    expect(transactionInvalidations({ kind, gameId: GAME }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.game('testnet', GAME), queryKeys.balance('testnet', ADDRESS)],
    });
  });

  it('accept: resets the lobby and invalidates the game, the balance and the House (fees collected)', () => {
    expect(transactionInvalidations({ kind: 'accept', gameId: GAME }, CTX)).toEqual({
      reset: [queryKeys.lobby('testnet', PKG)],
      invalidate: [queryKeys.game('testnet', GAME), queryKeys.balance('testnet', ADDRESS), queryKeys.house('testnet', HOUSE)],
    });
    const all = JSON.stringify(transactionInvalidations({ kind: 'accept', gameId: GAME }, CTX));
    for (const key of ['nodeInfo', 'txInfo', 'publishCheckpoint', 'checkpointTime']) expect(all).not.toContain(key);
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

describe('queryKeys.house and queryKeys.balance', () => {
  it('builds the house key', () => {
    expect(queryKeys.house('localnet', HOUSE)).toEqual(['sui', 'localnet', 'house', HOUSE]);
  });

  it('normalizes the address of the balance key', () => {
    expect(queryKeys.balance('localnet', '0xB')).toEqual(['sui', 'localnet', 'balance', `0x${'0'.repeat(63)}b`]);
    expect(queryKeys.balance('localnet', ADDRESS.toUpperCase().replace('0X', '0x'))).toEqual(['sui', 'localnet', 'balance', ADDRESS]);
  });
});
