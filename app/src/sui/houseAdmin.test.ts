import type { SuiClientTypes } from '@mysten/sui/client';
import { fromBase64 } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { U64_MAX } from './format';
import {
  canWithdraw,
  HOUSE_MAX_FEE_BPS,
  houseEventType,
  parseBetLimitsUpdated,
  parseFeeRateUpdated,
  parseFeesWithdrawn,
  validateBetLimits,
  validateFeeRate,
} from './houseAdmin';

type FixtureEvent = { packageId: string; module: string; eventType: string; bcs: string; json: Record<string, unknown> };
type FixtureTx = { digest: string; status: SuiClientTypes.ExecutionStatus; events: FixtureEvent[] };
type FixtureResult = { $kind: 'Transaction'; Transaction: FixtureTx };
type Fixture = {
  ids: { originalPackageId: string; houseId: string };
  executed: Record<'updateFeeRate' | 'updateBetLimits' | 'withdrawFees', FixtureResult>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/house-admin.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/house-admin.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.ids.originalPackageId;
const HOUSE_ID = fixture.ids.houseId;
const IDS = { originalPackageId: PKG, houseId: HOUSE_ID };
const OTHER = `0x${'e'.repeat(64)}`;

type Result = SuiClientTypes.TransactionResult<{ events: true }>;
type ResultEvent = SuiClientTypes.Event;

/** Resultado del SDK a partir de la fixture: `bcs` de base64 a bytes; `sender` vacío (la fixture no lo guarda). */
function resultOf(entry: FixtureResult, mapEvents: (events: ResultEvent[]) => ResultEvent[] = (e) => e): Result {
  const events = entry.Transaction.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) }));
  return { $kind: 'Transaction', Transaction: { ...entry.Transaction, events: mapEvents(events) } } as unknown as Result;
}

describe('validateFeeRate', () => {
  it.each([
    ['', 'empty'],
    [' 250', 'invalid'],
    ['250 ', 'invalid'],
    ['-1', 'invalid'],
    ['+1', 'invalid'],
    ['2.5', 'invalid'],
    ['1e3', 'invalid'],
    ['0x10', 'invalid'],
    ['1001', 'too_high'],
    ['99999999999999999999', 'too_high'],
    ['250', 'unchanged'],
    ['0250', 'unchanged'],
  ])('rejects %o with %s (current 250 bps)', (text, error) => {
    expect(validateFeeRate(text, 250)).toEqual({ ok: false, error });
  });

  it.each([
    ['1000', 1000],
    ['0', 0],
    ['00250', 250],
    ['1', 1],
  ])('accepts %o as %i bps (current 300 bps)', (text, bps) => {
    expect(validateFeeRate(text, 300)).toEqual({ ok: true, bps });
  });

  it('rejects 0 when the current fee is 0', () => {
    expect(validateFeeRate('0', 0)).toEqual({ ok: false, error: 'unchanged' });
  });

  it('mirrors house::MAX_FEE_BPS (10 %)', () => {
    expect(HOUSE_MAX_FEE_BPS).toBe(1000);
  });
});

describe('validateBetLimits', () => {
  const current = { minBet: 1_000_000n, maxBet: 50_000_000_000n };

  it.each([
    ['', 'empty'],
    ['-1', 'negative'],
    [' 1', 'invalid'],
    ['1,5', 'invalid'],
    ['0.0000000001', 'too_many_decimals'],
    ['18446744073.709551616', 'too_large'],
    ['0', 'zero_min'],
    ['0.000000000', 'zero_min'],
  ])('reports the minimum %o as %s', (min, error) => {
    expect(validateBetLimits(min, '50', current)).toEqual({ ok: false, errors: { min: error } });
  });

  it.each([
    ['', 'empty'],
    ['-1', 'negative'],
    ['5 ', 'invalid'],
    ['0.0000000001', 'too_many_decimals'],
    ['18446744073.709551616', 'too_large'],
  ])('reports the maximum %o as %s', (max, error) => {
    expect(validateBetLimits('1', max, current)).toEqual({ ok: false, errors: { max: error } });
  });

  it('reports both fields at once and no pair error', () => {
    expect(validateBetLimits('0', 'x', current)).toEqual({ ok: false, errors: { min: 'zero_min', max: 'invalid' } });
  });

  it('accepts min == max', () => {
    expect(validateBetLimits('2', '2', current)).toEqual({ ok: true, minBet: 2_000_000_000n, maxBet: 2_000_000_000n });
  });

  it('rejects min > max as a pair error', () => {
    expect(validateBetLimits('0.005', '0.001', current)).toEqual({ ok: false, errors: { pair: 'min_above_max' } });
  });

  it('rejects the current limits as unchanged, also written another way', () => {
    expect(validateBetLimits('0.001', '50', current)).toEqual({ ok: false, errors: { pair: 'unchanged' } });
    expect(validateBetLimits('0.0010', '50.0', current)).toEqual({ ok: false, errors: { pair: 'unchanged' } });
  });

  it('accepts U64_MAX in MIST as the maximum and rejects one MIST more', () => {
    expect(validateBetLimits('0.002', '18446744073.709551615', current)).toEqual({ ok: true, minBet: 2_000_000n, maxBet: U64_MAX });
    expect(validateBetLimits('0.002', '18446744073.709551616', current)).toEqual({ ok: false, errors: { max: 'too_large' } });
  });

  it('accepts new limits in MIST without floats', () => {
    expect(validateBetLimits('0.002', '10', current)).toEqual({ ok: true, minBet: 2_000_000n, maxBet: 10_000_000_000n });
  });
});

describe('canWithdraw', () => {
  it('is false with 0 fees and true with 1 MIST', () => {
    expect(canWithdraw({ feesCollected: 0n })).toBe(false);
    expect(canWithdraw({ feesCollected: 1n })).toBe(true);
  });
});

describe('house admin events from the real transactions', () => {
  it('builds the normalized event type', () => {
    expect(houseEventType(PKG, 'FeesWithdrawn')).toBe(`${PKG}::house::FeesWithdrawn`);
  });

  it('reads FeeRateUpdated 0 → 250', () => {
    expect(parseFeeRateUpdated(resultOf(fixture.executed.updateFeeRate), IDS)).toEqual({ houseId: HOUSE_ID, oldFeeRate: 0, newFeeRate: 250 });
  });

  it('reads BetLimitsUpdated with the four amounts', () => {
    expect(parseBetLimitsUpdated(resultOf(fixture.executed.updateBetLimits), IDS)).toEqual({
      houseId: HOUSE_ID,
      oldMinBet: 1_000_000n,
      oldMaxBet: 50_000_000_000n,
      newMinBet: 2_000_000n,
      newMaxBet: 10_000_000_000n,
    });
  });

  it('reads the withdrawn amount from FeesWithdrawn', () => {
    expect(parseFeesWithdrawn(resultOf(fixture.executed.withdrawFees), IDS)).toBe(10_000_000n);
  });

  it('accepts the House ID in another case', () => {
    const houseId = HOUSE_ID.toUpperCase().replace('0X', '0x');
    expect(parseFeesWithdrawn(resultOf(fixture.executed.withdrawFees), { originalPackageId: PKG, houseId })).toBe(10_000_000n);
  });

  describe.each([
    ['parseFeeRateUpdated', parseFeeRateUpdated, fixture.executed.updateFeeRate],
    ['parseBetLimitsUpdated', parseBetLimitsUpdated, fixture.executed.updateBetLimits],
    ['parseFeesWithdrawn', parseFeesWithdrawn, fixture.executed.withdrawFees],
  ] as const)('%s', (_name, parse, entry) => {
    it('returns null for another House', () => {
      expect(parse(resultOf(entry), { originalPackageId: PKG, houseId: OTHER })).toBeNull();
    });

    it('returns null without events', () => {
      expect(parse(resultOf(entry, () => []), IDS)).toBeNull();
    });

    it('returns null with two events of the House', () => {
      expect(parse(resultOf(entry, (e) => [...e, ...e]), IDS)).toBeNull();
    });

    it('returns null with broken bytes (truncated or an extra byte)', () => {
      expect(parse(resultOf(entry, (e) => e.map((ev) => ({ ...ev, bcs: ev.bcs.slice(0, -1) }))), IDS)).toBeNull();
      expect(parse(resultOf(entry, (e) => e.map((ev) => ({ ...ev, bcs: Uint8Array.from([...ev.bcs, 0]) }))), IDS)).toBeNull();
    });

    it('returns null for the event type of another package', () => {
      expect(parse(resultOf(entry, (e) => e.map((ev) => ({ ...ev, eventType: ev.eventType.replace(PKG, OTHER) }))), IDS)).toBeNull();
    });
  });

  it('does not read one admin event as another', () => {
    expect(parseFeesWithdrawn(resultOf(fixture.executed.updateFeeRate), IDS)).toBeNull();
    expect(parseFeeRateUpdated(resultOf(fixture.executed.updateBetLimits), IDS)).toBeNull();
    expect(parseBetLimitsUpdated(resultOf(fixture.executed.withdrawFees), IDS)).toBeNull();
  });
});
