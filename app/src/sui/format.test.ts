import { describe, expect, it } from 'vitest';
import { formatMist, parseSuiToMist, shortAddress, U64_MAX } from './format';

describe('U64_MAX', () => {
  it('is 2^64 - 1', () => {
    expect(U64_MAX).toBe(18_446_744_073_709_551_615n);
  });
});

describe('parseSuiToMist', () => {
  it.each([
    ['0', 0n],
    ['0.000000001', 1n],
    ['1', 1_000_000_000n],
    ['0.001', 1_000_000n],
    ['50', 50_000_000_000n],
    ['.5', 500_000_000n],
    ['18446744073.709551615', 18_446_744_073_709_551_615n],
  ])('parses %j as %s MIST', (input, mist) => {
    expect(parseSuiToMist(input)).toEqual({ ok: true, mist });
  });

  it('rejects one MIST above u64 max as too_large', () => {
    expect(parseSuiToMist('18446744073.709551616')).toEqual({ ok: false, reason: 'too_large' });
  });

  it('rejects more than 9 decimals as too_many_decimals', () => {
    expect(parseSuiToMist('1.0000000001')).toEqual({ ok: false, reason: 'too_many_decimals' });
  });

  it.each(['-1', '-0', '-0.5'])('rejects %j as negative', (input) => {
    expect(parseSuiToMist(input)).toEqual({ ok: false, reason: 'negative' });
  });

  it('rejects the empty string as empty', () => {
    expect(parseSuiToMist('')).toEqual({ ok: false, reason: 'empty' });
  });

  it.each(['1.', ' 1', '1 ', '1e3', 'abc', '0x10', '1,5'])('rejects %j as invalid', (input) => {
    expect(parseSuiToMist(input)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('formatMist', () => {
  it.each([
    [0n, '0'],
    [1n, '0.000000001'],
    [1_500_000_000n, '1.5'],
    [50_000_000_000n, '50'],
    [U64_MAX, '18446744073.709551615'],
    [-1n, '-0.000000001'],
  ])('formats %s MIST as %j', (mist, expected) => {
    expect(formatMist(mist)).toBe(expected);
  });

  it.each([2n ** 53n + 1n, U64_MAX])('round-trips %s MIST through parseSuiToMist', (mist) => {
    expect(parseSuiToMist(formatMist(mist))).toEqual({ ok: true, mist });
  });
});

describe('shortAddress', () => {
  it('abbreviates a full address', () => {
    expect(shortAddress(`0x${'ab'.repeat(16)}${'cd'.repeat(16)}`)).toBe('0xabab…cdcd');
  });
});
