import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { buildGameRegistry, type DuelSource, type TypeOrigin } from './gameRegistry';
import {
  duelCancelledRefund,
  parseCreatedDuel,
  parseCreatedGame,
  parseExpiredDuel,
  parseResolvedDuel,
  parseTimedOutDuel,
} from './gameTx';

// Intérpretes del resultado de las transacciones de la fuente nueva (`Duel<G>`, #73 TASK-8a) contra las transacciones reales
// de `duel-tx` (producción: crear, cancelar, rechazar y aceptar con `DuelActivated` + `DuelResolved`) y el registro que arma
// `duel-reads` (la misma localnet: `typeOrigins` y el upgrade). El reclamo por tiempo y el reembolso (`DuelTimedOut`,
// `DuelExpired`) no tienen transacción de producción (el coinflip no persiste `Active`): sus eventos se arman con direcciones
// sintéticas y el BCS de `duel.move`, y están marcados como tales.

type FixtureEvent = { eventType: string; bcs: string; json: Record<string, unknown> };
type FixtureTx = { digest: string; events: FixtureEvent[] };
type FixtureResult = { $kind: 'Transaction'; Transaction: FixtureTx };
type Case = 'createOpen' | 'createInvite' | 'cancel' | 'reject' | 'acceptCreatorWins' | 'acceptAcceptorWins' | 'acceptInvite';
type TxFixture = {
  ids: { coinflipTag: string; duels: Record<'open' | 'invite' | 'cancelled' | 'rejected' | 'acceptCreatorWins' | 'acceptAcceptorWins' | 'acceptInvite', string> };
  executed: Record<Case, FixtureResult>;
};
type ReadsFixture = { ids: { originalPackageId: string; upgrades: { packageId: string }[] }; typeOrigins: TypeOrigin[] };
const txFixture = import.meta.glob<TxFixture>('../../../contracts/fixtures/duel-tx.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-tx.localnet.json'
] as TxFixture;
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;

const registry = buildGameRegistry({ originalPackageId: reads.ids.originalPackageId, upgrades: reads.ids.upgrades, typeOrigins: reads.typeOrigins });
const source = registry[0]?.sources.find((candidate): candidate is DuelSource => candidate.kind === 'duel');
if (source === undefined) throw new Error('el registro de la fixture debe tener la fuente nueva');
const SOURCE: DuelSource = source;

type Result = SuiClientTypes.TransactionResult<{ events: true }>;
type ResultEvent = SuiClientTypes.Event;

/** Resultado del SDK a partir de la fixture: `bcs` de base64 a bytes; `sender` vacío (la fixture no lo guarda). */
function resultOf(entry: FixtureResult, mapEvents: (events: ResultEvent[]) => ResultEvent[] = (events) => events): Result {
  const events = entry.Transaction.events.map((event) => ({ ...event, sender: '', bcs: fromBase64(event.bcs) })) as unknown as ResultEvent[];
  return { $kind: 'Transaction', Transaction: { ...entry.Transaction, events: mapEvents(events) } } as unknown as Result;
}
const eventOf = (entry: FixtureResult, name: string): FixtureEvent => {
  const found = entry.Transaction.events.find((event) => event.eventType.includes(`::duel::${name}<`));
  if (found === undefined) throw new Error(`la transacción de la fixture no tiene ${name}`);
  return found;
};
const addr = (event: FixtureEvent, field: string) => String(event.json[field]);
const upper = (address: string) => address.toUpperCase().replace('0X', '0x');
const SYNTHETIC_OTHER = `0x${'ab'.repeat(32)}`;

describe('the registry of the fixture matches the transactions of duel-tx', () => {
  it('has the exact tag of the game that the transactions emitted (no tag is built by hand)', () => {
    expect(SOURCE.gameTag).toBe(txFixture.ids.coinflipTag);
    expect(SOURCE.eventTypes.created).toBe(eventOf(txFixture.executed.createOpen, 'DuelCreated').eventType);
  });
});

describe('parseCreatedDuel', () => {
  it('reads the open duel created by the real transaction, with the neutral shape (gameId, not duelId)', () => {
    const entry = txFixture.executed.createOpen;
    const event = eventOf(entry, 'DuelCreated');
    expect(parseCreatedDuel(resultOf(entry), { source: SOURCE, sender: addr(event, 'creator') })).toEqual({
      gameId: txFixture.ids.duels.open,
      creator: addr(event, 'creator'),
      opponent: null,
      bet: BigInt(String(event.json.bet)),
      feeRate: 500,
      transactionDigest: entry.Transaction.digest,
    });
  });

  it('reads the invitation and its opponent, with the sender in another address format', () => {
    const entry = txFixture.executed.createInvite;
    const event = eventOf(entry, 'DuelCreated');
    const created = parseCreatedDuel(resultOf(entry), { source: SOURCE, sender: upper(addr(event, 'creator')) });
    expect(created).toMatchObject({ gameId: txFixture.ids.duels.invite, opponent: addr(event, 'opponent') });
  });

  it('returns null without events, with two DuelCreated, with another creator, with another type or with broken bytes', () => {
    const entry = txFixture.executed.createOpen;
    const sender = addr(eventOf(entry, 'DuelCreated'), 'creator');
    expect(parseCreatedDuel(resultOf(entry, () => []), { source: SOURCE, sender })).toBeNull();
    expect(parseCreatedDuel(resultOf(entry, (events) => [...events, ...events]), { source: SOURCE, sender })).toBeNull();
    expect(parseCreatedDuel(resultOf(entry), { source: SOURCE, sender: SYNTHETIC_OTHER })).toBeNull();
    expect(
      parseCreatedDuel(
        resultOf(entry, (events) => events.map((event) => ({ ...event, eventType: event.eventType.replace('DuelCreated', 'DuelCancelled') }))),
        { source: SOURCE, sender },
      ),
    ).toBeNull();
    expect(
      parseCreatedDuel(
        resultOf(entry, (events) => events.map((event) => ({ ...event, bcs: event.bcs.slice(0, -1) }))),
        { source: SOURCE, sender },
      ),
    ).toBeNull();
  });

  it('does not take a DuelCreated of another game as the result (the type must be exactly the one of the registry)', () => {
    const entry = txFixture.executed.createOpen;
    const sender = addr(eventOf(entry, 'DuelCreated'), 'creator');
    const otherGame = resultOf(entry, (events) => events.map((event) => ({ ...event, eventType: event.eventType.replace('Coinflip', 'OtherGame') })));
    expect(parseCreatedDuel(otherGame, { source: SOURCE, sender })).toBeNull();
  });

  it('is not read by the interpreter of the previous source, and the other way around', () => {
    const entry = txFixture.executed.createOpen;
    const sender = addr(eventOf(entry, 'DuelCreated'), 'creator');
    expect(parseCreatedGame(resultOf(entry), { originalPackageId: reads.ids.originalPackageId, sender })).toBeNull();
  });
});

describe('duelCancelledRefund (cancel and reject)', () => {
  it('reads the refund of the real cancellation by the creator', () => {
    const entry = txFixture.executed.cancel;
    const refund = BigInt(String(eventOf(entry, 'DuelCancelled').json.refund));
    expect(duelCancelledRefund(resultOf(entry), { source: SOURCE, duelId: txFixture.ids.duels.cancelled })).toBe(refund);
    expect(refund).toBeGreaterThan(0n);
  });

  it('reads the refund to the creator of the real rejection by the invitee', () => {
    const entry = txFixture.executed.reject;
    const event = eventOf(entry, 'DuelCancelled');
    expect(addr(event, 'cancelled_by')).not.toBe(addr(event, 'creator'));
    expect(duelCancelledRefund(resultOf(entry), { source: SOURCE, duelId: upper(txFixture.ids.duels.rejected) })).toBe(BigInt(String(event.json.refund)));
  });

  it('returns null for another duel, without the event, with two of them or with another type', () => {
    const entry = txFixture.executed.cancel;
    expect(duelCancelledRefund(resultOf(entry), { source: SOURCE, duelId: txFixture.ids.duels.open })).toBeNull();
    expect(duelCancelledRefund(resultOf(entry, () => []), { source: SOURCE, duelId: txFixture.ids.duels.cancelled })).toBeNull();
    expect(duelCancelledRefund(resultOf(entry, (events) => [...events, ...events]), { source: SOURCE, duelId: txFixture.ids.duels.cancelled })).toBeNull();
    expect(
      duelCancelledRefund(
        resultOf(entry, (events) => events.map((event) => ({ ...event, eventType: event.eventType.replace('DuelCancelled', 'DuelExpired') }))),
        { source: SOURCE, duelId: txFixture.ids.duels.cancelled },
      ),
    ).toBeNull();
  });
});

describe('parseResolvedDuel (atomic accept: DuelActivated + DuelResolved in the same transaction)', () => {
  it.each([
    ['creator', 'acceptCreatorWins'],
    ['acceptor', 'acceptAcceptorWins'],
    ['acceptor of an invitation', 'acceptInvite'],
  ] as const)('reads the winner, the pot, the fee and the payout of the real accept won by the %s', (_name, name) => {
    const entry = txFixture.executed[name];
    const resolved = eventOf(entry, 'DuelResolved');
    const result = parseResolvedDuel(resultOf(entry), { source: SOURCE, duelId: txFixture.ids.duels[name], acceptor: addr(resolved, 'acceptor') });
    expect(result).toEqual({
      gameId: txFixture.ids.duels[name],
      creator: addr(resolved, 'creator'),
      acceptor: addr(resolved, 'acceptor'),
      winner: addr(resolved, 'winner'),
      pot: BigInt(String(resolved.json.pot)),
      fee: BigInt(String(resolved.json.fee)),
      payout: BigInt(String(resolved.json.payout)),
      transactionDigest: entry.Transaction.digest,
    });
    expect(result !== null && result.pot === result.payout + result.fee).toBe(true);
  });

  it('the DuelActivated of the same transaction is not the result: without a DuelResolved it is null', () => {
    const entry = txFixture.executed.acceptCreatorWins;
    const resolved = eventOf(entry, 'DuelResolved');
    expect(entry.Transaction.events.some((event) => event.eventType.includes('::duel::DuelActivated<'))).toBe(true);
    const onlyActivated = resultOf(entry, (events) => events.filter((event) => event.eventType.includes('::duel::DuelActivated<')));
    expect(parseResolvedDuel(onlyActivated, { source: SOURCE, duelId: txFixture.ids.duels.acceptCreatorWins, acceptor: addr(resolved, 'acceptor') })).toBeNull();
  });

  it('returns null for an event of another account (the signer must be the acceptor), another duel, two events or broken bytes', () => {
    const entry = txFixture.executed.acceptCreatorWins;
    const resolved = eventOf(entry, 'DuelResolved');
    const duelId = txFixture.ids.duels.acceptCreatorWins;
    const acceptor = addr(resolved, 'acceptor');
    expect(parseResolvedDuel(resultOf(entry), { source: SOURCE, duelId, acceptor: addr(resolved, 'creator') })).toBeNull();
    expect(parseResolvedDuel(resultOf(entry), { source: SOURCE, duelId: txFixture.ids.duels.open, acceptor })).toBeNull();
    expect(parseResolvedDuel(resultOf(entry, (events) => [...events, ...events]), { source: SOURCE, duelId, acceptor })).toBeNull();
    expect(
      parseResolvedDuel(
        resultOf(entry, (events) => events.map((event) => ({ ...event, bcs: event.bcs.slice(0, -1) }))),
        { source: SOURCE, duelId, acceptor },
      ),
    ).toBeNull();
  });

  it('accepts the acceptor in another address format', () => {
    const entry = txFixture.executed.acceptAcceptorWins;
    const resolved = eventOf(entry, 'DuelResolved');
    expect(parseResolvedDuel(resultOf(entry), { source: SOURCE, duelId: txFixture.ids.duels.acceptAcceptorWins, acceptor: upper(addr(resolved, 'acceptor')) })).toMatchObject({
      winner: addr(resolved, 'winner'),
    });
  });
});

// Eventos de `duel.move` armados a mano (SINTÉTICOS, no salen de la localnet): el coinflip de producción no persiste `Active`,
// así que ninguna transacción de producción reclama por tiempo ni reembolsa. El BCS es el de R.5 del handoff.
const DuelTimedOutBcs = bcs.struct('DuelTimedOut', {
  duel_id: bcs.Address,
  creator: bcs.Address,
  acceptor: bcs.Address,
  winner: bcs.Address,
  claimed_by: bcs.Address,
  pot: bcs.u64(),
  fee: bcs.u64(),
  payout: bcs.u64(),
});
const DuelExpiredBcs = bcs.struct('DuelExpired', { duel_id: bcs.Address, creator: bcs.Address, acceptor: bcs.Address, refund_each: bcs.u64() });
const DUEL_ID = `0x${'d1'.repeat(32)}`;
const CREATOR = `0x${'c1'.repeat(32)}`;
const ACCEPTOR = `0x${'a2'.repeat(32)}`;
const CALLER = `0x${'ca'.repeat(32)}`;

function syntheticResult(events: { eventType: string; bytes: Uint8Array }[]): Result {
  return {
    $kind: 'Transaction',
    Transaction: { digest: 'synthetic-digest', events: events.map((event) => ({ eventType: event.eventType, bcs: event.bytes, sender: '', packageId: '', module: '' })) },
  } as unknown as Result;
}
const timedOutEvent = (overrides: Partial<{ duelId: string; claimedBy: string }> = {}) => ({
  eventType: SOURCE.eventTypes.timedOut,
  bytes: DuelTimedOutBcs.serialize({
    duel_id: overrides.duelId ?? DUEL_ID,
    creator: CREATOR,
    acceptor: ACCEPTOR,
    winner: ACCEPTOR,
    claimed_by: overrides.claimedBy ?? CALLER,
    pot: 20_000_000n,
    fee: 1_000_000n,
    payout: 19_000_000n,
  }).toBytes(),
});
const expiredEvent = (duelId = DUEL_ID) => ({
  eventType: SOURCE.eventTypes.expired,
  bytes: DuelExpiredBcs.serialize({ duel_id: duelId, creator: CREATOR, acceptor: ACCEPTOR, refund_each: 10_000_000n }).toBytes(),
});

describe('parseTimedOutDuel (synthetic events)', () => {
  it('reads the claim of this duel with the signer as the one who claimed (the winner is the rival, not the caller)', () => {
    expect(parseTimedOutDuel(syntheticResult([timedOutEvent()]), { source: SOURCE, duelId: DUEL_ID, claimedBy: CALLER })).toEqual({
      gameId: DUEL_ID,
      creator: CREATOR,
      acceptor: ACCEPTOR,
      winner: ACCEPTOR,
      claimedBy: CALLER,
      pot: 20_000_000n,
      fee: 1_000_000n,
      payout: 19_000_000n,
      transactionDigest: 'synthetic-digest',
    });
  });

  it('returns null for another duel, another claimer, two events, no event or an event of another type', () => {
    const one = syntheticResult([timedOutEvent()]);
    expect(parseTimedOutDuel(one, { source: SOURCE, duelId: `0x${'ee'.repeat(32)}`, claimedBy: CALLER })).toBeNull();
    expect(parseTimedOutDuel(one, { source: SOURCE, duelId: DUEL_ID, claimedBy: ACCEPTOR })).toBeNull();
    expect(parseTimedOutDuel(syntheticResult([timedOutEvent(), timedOutEvent()]), { source: SOURCE, duelId: DUEL_ID, claimedBy: CALLER })).toBeNull();
    expect(parseTimedOutDuel(syntheticResult([]), { source: SOURCE, duelId: DUEL_ID, claimedBy: CALLER })).toBeNull();
    expect(parseTimedOutDuel(syntheticResult([expiredEvent()]), { source: SOURCE, duelId: DUEL_ID, claimedBy: CALLER })).toBeNull();
  });
});

describe('parseExpiredDuel (synthetic events)', () => {
  it('reads the refund of this duel: each player recovers the bet', () => {
    expect(parseExpiredDuel(syntheticResult([expiredEvent()]), { source: SOURCE, duelId: DUEL_ID })).toEqual({
      gameId: DUEL_ID,
      creator: CREATOR,
      acceptor: ACCEPTOR,
      refundEach: 10_000_000n,
      transactionDigest: 'synthetic-digest',
    });
  });

  it('returns null for another duel, two events, no event or an event of another type', () => {
    expect(parseExpiredDuel(syntheticResult([expiredEvent()]), { source: SOURCE, duelId: `0x${'ee'.repeat(32)}` })).toBeNull();
    expect(parseExpiredDuel(syntheticResult([expiredEvent(), expiredEvent()]), { source: SOURCE, duelId: DUEL_ID })).toBeNull();
    expect(parseExpiredDuel(syntheticResult([]), { source: SOURCE, duelId: DUEL_ID })).toBeNull();
    expect(parseExpiredDuel(syntheticResult([timedOutEvent()]), { source: SOURCE, duelId: DUEL_ID })).toBeNull();
  });
});
