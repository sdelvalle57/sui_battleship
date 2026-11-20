import { describe, expect, it } from 'vitest';
import type { Duel, DuelState } from '../sui/duel';
import type { Game } from '../sui/game';
import type { GameDetailObject } from '../sui/gameDetail';
import { buildGameRegistry, type GameRegistry, type TypeOrigin } from '../sui/gameRegistry';
import type { LobbyItem } from '../sui/lobby';
import type { MyDuelItem, MyGameEntry } from '../sui/myGames';
import {
  acceptorOf,
  creatableGameOf,
  duelSourceOf,
  legacyGameKey,
  rowAcceptState,
  rowCanCancel,
  rowCanReject,
  rowControlOf,
  rowFromDetail,
  rowFromDuel,
  rowFromGame,
  rowFromLobbyItem,
  rowFromMyGameEntry,
  rowPlayerResult,
  type GameRow,
} from './gameRow';

// Modelo de fila neutral a la fuente (#73, TASK-8a). Direcciones sintéticas; el registro con las dos fuentes sale de
// `duel-reads` (la misma forma de `typeOrigins` que arma `config.ts`). El `turn_ms` de ensayo sale de la fixture marcada como
// ensayo, por valor.

type ReadsFixture = { ids: { originalPackageId: string; upgrades: { packageId: string }[] }; typeOrigins: TypeOrigin[] };
type ClockFixture = { _meta: { sandbox: boolean; sandboxConstants: Record<string, number> } };
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-clock.localnet.json'
] as ClockFixture;

const both: GameRegistry = buildGameRegistry({ originalPackageId: reads.ids.originalPackageId, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins });
const legacyOnly: GameRegistry = buildGameRegistry({ originalPackageId: reads.ids.originalPackageId });

const CREATOR = `0x${'ab'.repeat(32)}`;
const ACCEPTOR = `0x${'cd'.repeat(32)}`;
const INVITEE = `0x${'ef'.repeat(32)}`;
const THIRD = `0x${'12'.repeat(32)}`;
const id = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

const game = (n: number, state: Game['state'] = { kind: 'pending' }, opponent: string | null = null): Game => ({
  id: id(n),
  version: 1n,
  houseId: id(99),
  creator: CREATOR,
  opponent,
  bet: 2_000_000n,
  stake: state.kind === 'pending' ? 2_000_000n : 0n,
  feeRate: 250,
  state,
});
const duel = (n: number, state: DuelState = { kind: 'pending' }, opponent: string | null = null, turnMs = 0n): Duel => ({
  id: id(0x100 + n),
  version: 1n,
  houseId: id(99),
  creator: CREATOR,
  opponent,
  bet: 2_000_000n,
  stake: 0n,
  feeRate: 250,
  turnMs,
  state,
});

describe('rowControlOf', () => {
  it('takes the id from the mirror by turn_ms: 0 is "sin reloj" and 10 minutes is control 1', () => {
    expect(rowControlOf(0n)).toEqual({ id: 0, turnMs: 0n, label: 'sin reloj' });
    expect(rowControlOf(600_000n)).toEqual({ id: 1, turnMs: 600_000n, label: '10 min por jugada' });
  });

  it('keeps the id of the creation event when it is given (the chain says which control was chosen)', () => {
    expect(rowControlOf(86_400_000n, 5)).toEqual({ id: 5, turnMs: 86_400_000n, label: '1 día por jugada' });
  });

  it('shows a turn_ms outside the mirror in the generic format with a null id, never as an error', () => {
    expect(rowControlOf(45_000n)).toEqual({ id: null, turnMs: 45_000n, label: '45 s por jugada' });
    expect(rowControlOf(90_000n)).toEqual({ id: null, turnMs: 90_000n, label: '90 s por jugada' });
  });

  it('shows the turn_ms of the rehearsal fixture (marked as sandbox) in the generic format, read by value', () => {
    expect(clock._meta.sandbox).toBe(true);
    const entry = Object.entries(clock._meta.sandboxConstants).find(([name]) => name.endsWith('TURN_MS'));
    if (entry === undefined) throw new Error('la fixture de ensayo debe traer el turn_ms de ensayo');
    const turnMs = BigInt(entry[1]);
    const control = rowControlOf(turnMs);
    expect(control.id).toBeNull();
    expect(control.label).toBe(`${String(turnMs / 1_000n)} s por jugada`);
  });
});

describe('rows from each source', () => {
  it('builds a legacy row without a time control and with the three states of the previous source', () => {
    const states: Game['state'][] = [{ kind: 'pending' }, { kind: 'cancelled' }, { kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR }];
    for (const [index, state] of states.entries()) {
      expect(rowFromGame(game(index, state), 'coinflip')).toEqual({
        source: 'legacy',
        id: id(index),
        gameKey: 'coinflip',
        creator: CREATOR,
        opponent: null,
        bet: 2_000_000n,
        feeRate: 250,
        state,
        control: null,
      });
    }
  });

  it('builds a duel row with every one of the six states and the control it is given', () => {
    const states: DuelState[] = [
      { kind: 'pending' },
      { kind: 'cancelled' },
      { kind: 'active', acceptor: ACCEPTOR, toMove: 1, deadlineMs: 5n },
      { kind: 'resolved', acceptor: ACCEPTOR, winner: ACCEPTOR },
      { kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR },
      { kind: 'expired', acceptor: ACCEPTOR },
    ];
    expect(states.map((state) => state.kind)).toEqual(['pending', 'cancelled', 'active', 'resolved', 'timed_out', 'expired']);
    for (const state of states) {
      const row = rowFromDuel(duel(1, state), 'coinflip', rowControlOf(0n));
      expect(row).toMatchObject({ source: 'duel', id: id(0x101), gameKey: 'coinflip', bet: 2_000_000n, feeRate: 250, state, control: { id: 0, label: 'sin reloj' } });
    }
  });

  it('builds the detail row of each source from the union that useGame returns', () => {
    const asGame: GameDetailObject = { kind: 'game', game: game(1), gameKey: 'coinflip', objectVersion: 4n };
    const asDuel: GameDetailObject = { kind: 'duel', duel: duel(1, { kind: 'pending' }, null, 600_000n), gameKey: 'coinflip', objectVersion: 8n };
    expect(rowFromDetail(asGame)).toMatchObject({ source: 'legacy', id: id(1), control: null });
    expect(rowFromDetail(asDuel)).toMatchObject({ source: 'duel', id: id(0x101), control: { id: 1, turnMs: 600_000n, label: '10 min por jugada' } });
  });
});

describe('rows of the listings', () => {
  it('maps a lobby row of each source with the creation transaction and the creator role only when it is mine', () => {
    const legacy: LobbyItem = { kind: 'game', game: game(1), createdTxDigest: 'tx-1' };
    const next: LobbyItem = { kind: 'duel', duel: duel(2), gameKey: 'coinflip', control: { id: 0, turnMs: 0n, label: 'sin reloj' }, createdTxDigest: 'tx-2' };
    expect(rowFromLobbyItem(legacy, { isMine: true, registry: both })).toEqual({ kind: 'game', row: rowFromGame(game(1), 'coinflip'), role: 'creator', txDigest: 'tx-1' });
    expect(rowFromLobbyItem(next, { isMine: false, registry: both })).toEqual({
      kind: 'game',
      row: rowFromDuel(duel(2), 'coinflip', { id: 0, turnMs: 0n, label: 'sin reloj' }),
      role: null,
      txDigest: 'tx-2',
    });
  });

  it('uses the control that the DuelCreated event brought (not the one derived from the object) for a lobby row', () => {
    const next: LobbyItem = { kind: 'duel', duel: duel(2, { kind: 'pending' }, null, 600_000n), gameKey: 'coinflip', control: { id: 1, turnMs: 600_000n, label: '10 min por jugada' }, createdTxDigest: 'tx-2' };
    const mapped = rowFromLobbyItem(next, { isMine: false, registry: both });
    expect(mapped.kind === 'game' && mapped.row.control).toEqual({ id: 1, turnMs: 600_000n, label: '10 min por jugada' });
  });

  it('keeps an unreadable lobby row, with its id and its transaction, and no role', () => {
    expect(rowFromLobbyItem({ kind: 'unreadable', gameId: id(7), txDigest: 'tx-u' }, { isMine: true, registry: both })).toEqual({
      kind: 'unreadable',
      gameId: id(7),
      role: null,
      txDigest: 'tx-u',
    });
  });

  it('maps a "Mis partidas" row of each source with the role and the transaction of the event, and keeps the unreadable ones', () => {
    const legacy: MyGameEntry = { kind: 'game', game: game(1), objectVersion: 4n, role: 'invitee', txDigest: 'tx-a', checkpoint: 10n };
    const next: MyDuelItem = { kind: 'duel', duel: duel(2, { kind: 'expired', acceptor: ACCEPTOR }), gameKey: 'coinflip', objectVersion: 5n, role: 'acceptor', txDigest: 'tx-b', checkpoint: 11n };
    expect(rowFromMyGameEntry(legacy, both)).toEqual({ kind: 'game', row: rowFromGame(game(1), 'coinflip'), role: 'invitee', txDigest: 'tx-a' });
    expect(rowFromMyGameEntry(next, both)).toMatchObject({ kind: 'game', role: 'acceptor', txDigest: 'tx-b', row: { source: 'duel', state: { kind: 'expired' }, control: { id: 0 } } });
    expect(rowFromMyGameEntry({ kind: 'unreadable', gameId: null, role: 'creator', txDigest: 'tx-c', checkpoint: 12n }, both)).toEqual({
      kind: 'unreadable',
      gameId: null,
      role: 'creator',
      txDigest: 'tx-c',
    });
  });
});

describe('registry lookups (the tags come from the registry, never from the hook)', () => {
  it('finds the game that owns the previous source, with and without the new one', () => {
    expect(legacyGameKey(both)).toBe('coinflip');
    expect(legacyGameKey(legacyOnly)).toBe('coinflip');
  });

  it('gives the new source of a game, and throws a configuration error when there is none (packageVersion 1)', () => {
    expect(duelSourceOf(both, 'coinflip').kind).toBe('duel');
    expect(() => duelSourceOf(legacyOnly, 'coinflip')).toThrow(/no tiene la fuente nueva/);
    expect(() => duelSourceOf(both, 'otro')).toThrow(/no tiene la fuente nueva/);
  });

  it('routes "create" by createSource: the previous source before the upgrade and the new one after', () => {
    expect(creatableGameOf(legacyOnly).createSource).toBe('legacy');
    expect(creatableGameOf(both).createSource).toBe('duel');
    expect(creatableGameOf(both, 'coinflip').key).toBe('coinflip');
    expect(() => creatableGameOf(both, 'otro')).toThrow(/no tiene un juego que se pueda crear/);
  });
});

describe('what a row lets the account do', () => {
  const row = (state: DuelState, opponent: string | null = null): GameRow => rowFromDuel(duel(1, state, opponent), 'coinflip', rowControlOf(0n));

  it('finds the acceptor of the four states that have one', () => {
    expect(acceptorOf({ kind: 'pending' })).toBeNull();
    expect(acceptorOf({ kind: 'cancelled' })).toBeNull();
    expect(acceptorOf({ kind: 'active', acceptor: ACCEPTOR, toMove: 2, deadlineMs: 1n })).toBe(ACCEPTOR);
    expect(acceptorOf({ kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR })).toBe(ACCEPTOR);
    expect(acceptorOf({ kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR })).toBe(ACCEPTOR);
    expect(acceptorOf({ kind: 'expired', acceptor: ACCEPTOR })).toBe(ACCEPTOR);
  });

  it('offers Aceptar, Cancelar and Rechazar on a pending row exactly as for a legacy game', () => {
    const open = row({ kind: 'pending' });
    const invitation = row({ kind: 'pending' }, INVITEE);
    expect(rowAcceptState(open, ACCEPTOR)).toBe('available');
    expect(rowAcceptState(open, CREATOR)).toBe('creator');
    expect(rowAcceptState(open, null)).toBe('no_account');
    expect(rowAcceptState(invitation, THIRD)).toBe('not_invited');
    expect(rowAcceptState(invitation, INVITEE)).toBe('available');
    expect(rowCanCancel(open, CREATOR)).toBe(true);
    expect(rowCanCancel(open, ACCEPTOR)).toBe(false);
    expect(rowCanReject(invitation, INVITEE)).toBe(true);
    expect(rowCanReject(open, ACCEPTOR)).toBe(false);
    const legacy = rowFromGame(game(1, { kind: 'pending' }, INVITEE), 'coinflip');
    expect(rowAcceptState(legacy, INVITEE)).toBe('available');
    expect(rowCanReject(legacy, INVITEE)).toBe(true);
  });

  it.each([
    ['active', { kind: 'active', acceptor: ACCEPTOR, toMove: 1, deadlineMs: 9n }],
    ['cancelled', { kind: 'cancelled' }],
    ['resolved', { kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR }],
    ['timed out', { kind: 'timed_out', acceptor: ACCEPTOR, winner: CREATOR }],
    ['expired', { kind: 'expired', acceptor: ACCEPTOR }],
  ] as [string, DuelState][])('offers none of the three actions on a %s row (the time actions are 8b)', (_name, state) => {
    const finished = row(state, INVITEE);
    for (const account of [CREATOR, ACCEPTOR, INVITEE, THIRD]) {
      expect(rowAcceptState(finished, account)).toBe('not_pending');
      expect(rowCanCancel(finished, account)).toBe(false);
      expect(rowCanReject(finished, account)).toBe(false);
    }
  });

  it('says won or lost only on a resolved row to one of its players; not in TimedOut or Expired (8b)', () => {
    const resolved = row({ kind: 'resolved', acceptor: ACCEPTOR, winner: ACCEPTOR });
    expect(rowPlayerResult(resolved, ACCEPTOR)).toBe('won');
    expect(rowPlayerResult(resolved, CREATOR)).toBe('lost');
    expect(rowPlayerResult(resolved, THIRD)).toBeNull();
    expect(rowPlayerResult(resolved, null)).toBeNull();
    expect(rowPlayerResult(row({ kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR }), ACCEPTOR)).toBeNull();
    expect(rowPlayerResult(row({ kind: 'expired', acceptor: ACCEPTOR }), CREATOR)).toBeNull();
    expect(rowPlayerResult(row({ kind: 'pending' }), CREATOR)).toBeNull();
  });
});
