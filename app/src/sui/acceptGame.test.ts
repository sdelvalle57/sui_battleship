import { describe, expect, it } from 'vitest';
import { ACCEPT_GAS_RESERVE_MIST, acceptBalanceCheck, playerResult, wonBy } from './acceptGame';
import type { GameState } from './game';

const CREATOR = `0x${'a'.repeat(64)}`;
const ACCEPTOR = `0x${'b'.repeat(64)}`;
const OTHER = `0x${'c'.repeat(64)}`;
const upper = (address: string) => address.toUpperCase().replace('0X', '0x');
const BET = 1_000_001n;

describe('ACCEPT_GAS_RESERVE_MIST', () => {
  it('is 0.01 SUI (2 × the measured preflight budget, rounded up to 0.005 SUI)', () => {
    expect(ACCEPT_GAS_RESERVE_MIST).toBe(10_000_000n);
  });
});

describe('acceptBalanceCheck', () => {
  it('is ok with exactly bet + reserve and above', () => {
    expect(acceptBalanceCheck(BET + ACCEPT_GAS_RESERVE_MIST, BET)).toBe('ok');
    expect(acceptBalanceCheck(BET + ACCEPT_GAS_RESERVE_MIST + 1n, BET)).toBe('ok');
  });

  it('is insufficient one MIST below bet + reserve and with zero balance', () => {
    expect(acceptBalanceCheck(BET + ACCEPT_GAS_RESERVE_MIST - 1n, BET)).toBe('insufficient');
    expect(acceptBalanceCheck(0n, BET)).toBe('insufficient');
  });

  it('is unknown without a balance', () => {
    expect(acceptBalanceCheck(null, BET)).toBe('unknown');
  });
});

describe('wonBy', () => {
  it('compares the winner with the account, in any address format', () => {
    expect(wonBy({ winner: CREATOR }, CREATOR)).toBe(true);
    expect(wonBy({ winner: CREATOR }, upper(CREATOR))).toBe(true);
    expect(wonBy({ winner: CREATOR }, ACCEPTOR)).toBe(false);
  });
});

describe('playerResult', () => {
  const resolved = (winner: string): GameState => ({ kind: 'resolved', acceptor: ACCEPTOR, winner });
  const game = (state: GameState) => ({ creator: CREATOR, state });

  it('is won/lost for the creator', () => {
    expect(playerResult(game(resolved(CREATOR)), CREATOR)).toBe('won');
    expect(playerResult(game(resolved(ACCEPTOR)), CREATOR)).toBe('lost');
  });

  it('is won/lost for the acceptor, with addresses in another format', () => {
    expect(playerResult(game(resolved(ACCEPTOR)), upper(ACCEPTOR))).toBe('won');
    expect(playerResult(game(resolved(upper(CREATOR))), ACCEPTOR)).toBe('lost');
  });

  it('is null for a third account or without account', () => {
    expect(playerResult(game(resolved(CREATOR)), OTHER)).toBeNull();
    expect(playerResult(game(resolved(CREATOR)), null)).toBeNull();
  });

  it.each([
    ['pending', { kind: 'pending' }],
    ['cancelled', { kind: 'cancelled' }],
  ] as [string, GameState][])('is null for a %s game', (_name, state) => {
    expect(playerResult(game(state), CREATOR)).toBeNull();
  });
});
