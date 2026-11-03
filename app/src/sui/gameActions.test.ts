import { describe, expect, it } from 'vitest';
import type { Game, GameState } from './game';
import { canCancel, canReject } from './gameActions';

const CREATOR = `0x${'a'.repeat(64)}`;
const INVITEE = `0x${'b'.repeat(64)}`;
const OTHER = `0x${'c'.repeat(64)}`;
const PENDING: GameState = { kind: 'pending' };

function game(opponent: string | null, state: GameState = PENDING): Pick<Game, 'creator' | 'opponent' | 'state'> {
  return { creator: CREATOR, opponent, state };
}

describe('canCancel', () => {
  it('is true only for the creator of a pending game', () => {
    expect(canCancel(game(null), CREATOR)).toBe(true);
  });

  it('is false without account or for another account', () => {
    expect(canCancel(game(null), null)).toBe(false);
    expect(canCancel(game(null), OTHER)).toBe(false);
    expect(canCancel(game(INVITEE), INVITEE)).toBe(false);
  });

  it.each([
    ['cancelled', { kind: 'cancelled' }],
    ['resolved', { kind: 'resolved', acceptor: OTHER, winner: CREATOR }],
  ] as [string, GameState][])('is false for the creator of a %s game', (_name, state) => {
    expect(canCancel(game(null, state), CREATOR)).toBe(false);
  });

  it('accepts the address in another format', () => {
    expect(canCancel(game(null), CREATOR.toUpperCase().replace('0X', '0x'))).toBe(true);
  });
});

describe('canReject', () => {
  it('is true only for the invitee of a pending invitation', () => {
    expect(canReject(game(INVITEE), INVITEE)).toBe(true);
  });

  it('is false without account, for another account or for an open game', () => {
    expect(canReject(game(INVITEE), null)).toBe(false);
    expect(canReject(game(INVITEE), OTHER)).toBe(false);
    expect(canReject(game(null), INVITEE)).toBe(false);
  });

  it.each([
    ['cancelled', { kind: 'cancelled' }],
    ['resolved', { kind: 'resolved', acceptor: INVITEE, winner: INVITEE }],
  ] as [string, GameState][])('is false for the invitee of a %s invitation', (_name, state) => {
    expect(canReject(game(INVITEE, state), INVITEE)).toBe(false);
  });

  it('accepts the invitee address in another format (short form)', () => {
    const shortInvitee = `0x${'0'.repeat(62)}0b`;
    expect(canReject(game(shortInvitee), '0xb')).toBe(true);
    expect(canReject(game(INVITEE), INVITEE.toUpperCase().replace('0X', '0x'))).toBe(true);
  });

  it('lets the creator of an invitation cancel but not reject it', () => {
    expect(canCancel(game(INVITEE), CREATOR)).toBe(true);
    expect(canReject(game(INVITEE), CREATOR)).toBe(false);
  });
});
