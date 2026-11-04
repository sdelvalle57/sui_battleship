import { describe, expect, it } from 'vitest';
import type { Game, GameState } from './game';
import { ABORT_MESSAGES } from './errors';
import { acceptState, canCancel, canReject, NOT_INVITED_HINT } from './gameActions';

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

describe('acceptState', () => {
  const upper = (address: string) => address.toUpperCase().replace('0X', '0x');

  it('is available for another account on an open game', () => {
    expect(acceptState(game(null), OTHER)).toBe('available');
  });

  it('is available for the invitee of an invitation, also in another address format', () => {
    expect(acceptState(game(INVITEE), INVITEE)).toBe('available');
    expect(acceptState(game(INVITEE), upper(INVITEE))).toBe('available');
    expect(acceptState(game(`0x${'0'.repeat(62)}0b`), '0xb')).toBe('available');
  });

  it('is not_invited for a third account on an invitation', () => {
    expect(acceptState(game(INVITEE), OTHER)).toBe('not_invited');
  });

  it('is creator for the creator of an open game or an invitation, also in another format', () => {
    expect(acceptState(game(null), CREATOR)).toBe('creator');
    expect(acceptState(game(INVITEE), CREATOR)).toBe('creator');
    expect(acceptState(game(null), upper(CREATOR))).toBe('creator');
  });

  it('is no_account without account on a pending game, also on an invitation (never not_invited)', () => {
    expect(acceptState(game(null), null)).toBe('no_account');
    expect(acceptState(game(INVITEE), null)).toBe('no_account');
  });

  it.each([
    ['cancelled', { kind: 'cancelled' }],
    ['resolved', { kind: 'resolved', acceptor: OTHER, winner: CREATOR }],
  ] as [string, GameState][])('is not_pending for a %s game, with and without account (M-3)', (_name, state) => {
    for (const opponent of [null, INVITEE]) {
      for (const address of [null, CREATOR, INVITEE, OTHER]) {
        expect(acceptState(game(opponent, state), address)).toBe('not_pending');
      }
    }
  });
});

describe('NOT_INVITED_HINT', () => {
  it('is the text of the game/5 abort (D-20261103-02)', () => {
    expect(NOT_INVITED_HINT).toBe(ABORT_MESSAGES.game[5]);
    expect(NOT_INVITED_HINT).toBe('Esta invitación es para otra dirección.');
  });
});
