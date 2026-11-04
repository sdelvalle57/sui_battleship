import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { cancelledRefund, parseCreatedGame, parseResolvedGame } from './gameTx';

type FixtureEvent = { packageId: string; module: string; eventType: string; bcs: string; json: Record<string, unknown> };
type FixtureTx = { digest: string; status: SuiClientTypes.ExecutionStatus; events: FixtureEvent[] };
type FixtureResult = { $kind: 'Transaction'; Transaction: FixtureTx };
type AcceptCase = 'acceptCreatorWins' | 'acceptAcceptorWins' | 'acceptInvite';
type Fixture = {
  ids: { originalPackageId: string; games: Record<'open' | 'invite' | 'cancelled' | 'rejected' | AcceptCase, string> };
  executed: Record<'createOpen' | 'createInvite' | 'cancel' | 'reject' | AcceptCase, FixtureResult>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.ids.originalPackageId;
const OTHER_PKG = `0x${'e'.repeat(64)}`;

type Result = SuiClientTypes.TransactionResult<{ events: true }>;
type ResultEvent = SuiClientTypes.Event;

/** Resultado del SDK a partir de la fixture: `bcs` de base64 a bytes; `sender` vacío (la fixture no lo guarda). */
function resultOf(entry: FixtureResult, mapEvents: (events: ResultEvent[]) => ResultEvent[] = (e) => e): Result {
  const events = entry.Transaction.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) }));
  return { $kind: 'Transaction', Transaction: { ...entry.Transaction, events: mapEvents(events) } } as unknown as Result;
}
const creator = (entry: FixtureResult) => String(entry.Transaction.events[0]?.json.creator);

describe('parseCreatedGame', () => {
  it('reads the game created by the real open-game transaction', () => {
    const entry = fixture.executed.createOpen;
    expect(parseCreatedGame(resultOf(entry), { originalPackageId: PKG, sender: creator(entry) })).toEqual({
      gameId: fixture.ids.games.open,
      creator: creator(entry),
      opponent: null,
      bet: 1_000_001n,
      feeRate: 250,
      transactionDigest: entry.Transaction.digest,
    });
  });

  it('reads the invitation and its opponent from the real invite transaction', () => {
    const entry = fixture.executed.createInvite;
    const created = parseCreatedGame(resultOf(entry), { originalPackageId: PKG, sender: creator(entry).toUpperCase().replace('0X', '0x') });
    expect(created).toMatchObject({ gameId: fixture.ids.games.invite, bet: 2_000_002n, feeRate: 250 });
    expect(created?.opponent).toBe(entry.Transaction.events[0]?.json.opponent);
  });

  it('returns null without events, with two GameCreated, with another package type or another creator', () => {
    const entry = fixture.executed.createOpen;
    const sender = creator(entry);
    expect(parseCreatedGame(resultOf(entry, () => []), { originalPackageId: PKG, sender })).toBeNull();
    expect(parseCreatedGame(resultOf(entry, (e) => [...e, ...e]), { originalPackageId: PKG, sender })).toBeNull();
    expect(
      parseCreatedGame(
        resultOf(entry, (e) => e.map((ev) => ({ ...ev, eventType: ev.eventType.replace(PKG, OTHER_PKG) }))),
        { originalPackageId: PKG, sender },
      ),
    ).toBeNull();
    expect(parseCreatedGame(resultOf(entry), { originalPackageId: PKG, sender: OTHER_PKG })).toBeNull();
  });

  it('returns null when the GameCreated bytes are not canonical', () => {
    const entry = fixture.executed.createOpen;
    const broken = resultOf(entry, (e) => e.map((ev) => ({ ...ev, bcs: ev.bcs.slice(0, -1) })));
    expect(parseCreatedGame(broken, { originalPackageId: PKG, sender: creator(entry) })).toBeNull();
  });
});

describe('cancelledRefund', () => {
  it('reads the refund of the real cancel transaction (= bet)', () => {
    expect(cancelledRefund(resultOf(fixture.executed.cancel), { originalPackageId: PKG, gameId: fixture.ids.games.cancelled })).toBe(3_000_003n);
  });

  it('reads the refund of the real reject transaction (= bet, to the creator)', () => {
    expect(cancelledRefund(resultOf(fixture.executed.reject), { originalPackageId: PKG, gameId: fixture.ids.games.rejected })).toBe(4_000_004n);
  });

  it('returns null for another gameId, another package or no event', () => {
    const entry = fixture.executed.cancel;
    expect(cancelledRefund(resultOf(entry), { originalPackageId: PKG, gameId: fixture.ids.games.open })).toBeNull();
    expect(cancelledRefund(resultOf(entry), { originalPackageId: OTHER_PKG, gameId: fixture.ids.games.cancelled })).toBeNull();
    expect(cancelledRefund(resultOf(fixture.executed.createOpen), { originalPackageId: PKG, gameId: fixture.ids.games.open })).toBeNull();
  });
});

describe('parseResolvedGame', () => {
  /** El `GameResolved` real de la fixture (su `json` es la referencia del nodo). */
  const resolvedJson = (entry: FixtureResult) => {
    const event = entry.Transaction.events.find((e) => e.eventType.endsWith('::game::GameResolved'));
    if (!event) throw new Error('la fixture no tiene GameResolved');
    return event.json as { game_id: string; creator: string; acceptor: string; winner: string };
  };
  const options = (name: AcceptCase) => ({
    originalPackageId: PKG,
    gameId: fixture.ids.games[name],
    acceptor: resolvedJson(fixture.executed[name]).acceptor,
  });

  it.each([
    ['acceptCreatorWins', 'creator'],
    ['acceptAcceptorWins', 'acceptor'],
    ['acceptInvite', 'acceptor'],
  ] as [AcceptCase, 'creator' | 'acceptor'][])('reads winner, pot, fee and payout of the real %s transaction', (name, winnerRole) => {
    const entry = fixture.executed[name];
    const json = resolvedJson(entry);
    expect(parseResolvedGame(resultOf(entry), options(name))).toEqual({
      gameId: fixture.ids.games[name],
      creator: json.creator,
      acceptor: json.acceptor,
      winner: json[winnerRole],
      pot: 2_000_002n,
      fee: 50_000n,
      payout: 1_950_002n,
      transactionDigest: entry.Transaction.digest,
    });
  });

  it('accepts the acceptor address in another format', () => {
    const opts = options('acceptCreatorWins');
    const upper = opts.acceptor.toUpperCase().replace('0X', '0x');
    expect(parseResolvedGame(resultOf(fixture.executed.acceptCreatorWins), { ...opts, acceptor: upper })).not.toBeNull();
  });

  it('returns null without events, with two GameResolved, for another game, another acceptor or another package type', () => {
    const entry = fixture.executed.acceptAcceptorWins;
    const opts = options('acceptAcceptorWins');
    expect(parseResolvedGame(resultOf(entry, () => []), opts)).toBeNull();
    expect(parseResolvedGame(resultOf(entry, (e) => [...e, ...e]), opts)).toBeNull();
    expect(parseResolvedGame(resultOf(entry), { ...opts, gameId: fixture.ids.games.open })).toBeNull();
    expect(parseResolvedGame(resultOf(entry), { ...opts, acceptor: resolvedJson(entry).creator })).toBeNull();
    expect(
      parseResolvedGame(
        resultOf(entry, (e) => e.map((ev) => ({ ...ev, eventType: ev.eventType.replace(PKG, OTHER_PKG) }))),
        opts,
      ),
    ).toBeNull();
    expect(parseResolvedGame(resultOf(entry), { ...opts, originalPackageId: OTHER_PKG })).toBeNull();
  });

  it('returns null when the GameResolved bytes are truncated', () => {
    const broken = resultOf(fixture.executed.acceptInvite, (e) => e.map((ev) => ({ ...ev, bcs: ev.bcs.slice(0, -1) })));
    expect(parseResolvedGame(broken, options('acceptInvite'))).toBeNull();
  });

  it('returns null for a create transaction (no GameResolved)', () => {
    const opts = options('acceptCreatorWins');
    expect(parseResolvedGame(resultOf(fixture.executed.createOpen), { ...opts, gameId: fixture.ids.games.open })).toBeNull();
  });
});
