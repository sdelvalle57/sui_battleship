import { describe, expect, it } from 'vitest';
import {
  CREATE_GAS_RESERVE_MIST,
  GAME_STORAGE_DEPOSIT_MIST,
  houseChangeMessage,
  houseTermsChanges,
  validateCreateGame,
  type HouseTerms,
} from './createGame';

const ACCOUNT = `0x${'a'.repeat(64)}`;
const FRIEND = `0x${'0'.repeat(63)}b`;
const HOUSE: HouseTerms = { feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n };
const RICH = 10n ** 12n;

function validate(amountText: string, opponentText = '', balance: bigint | null = RICH) {
  return validateCreateGame({ amountText, opponentText, house: HOUSE, balance, account: ACCOUNT });
}

describe('constants', () => {
  it('keeps the gas reserve and the storage deposit measured in #6', () => {
    expect(CREATE_GAS_RESERVE_MIST).toBe(10_000_000n);
    expect(GAME_STORAGE_DEPOSIT_MIST).toEqual({ open: 1_953_200n, invitation: 2_196_400n });
  });
});

describe('validateCreateGame: amount', () => {
  it.each([
    ['empty', '', 'empty'],
    ['not a number', 'abc', 'invalid'],
    ['negative', '-1', 'invalid'],
    ['10 decimals', '0.0000000001', 'too_many_decimals'],
    ['below the minimum', '0.0009', 'below_min'],
    ['zero', '0', 'below_min'],
    ['above the maximum', '50.000000001', 'above_max'],
    ['above u64', '18446744074', 'above_max'],
  ])('rejects %s', (_name, amountText, reason) => {
    expect(validate(amountText)).toEqual({ ok: false, errors: { amount: reason }, balanceUnknown: false });
  });

  it('accepts the minimum and the maximum (inclusive)', () => {
    expect(validate('0.001')).toEqual({ ok: true, bet: 1_000_000n, opponent: null, balanceUnknown: false });
    expect(validate('50')).toEqual({ ok: true, bet: 50_000_000_000n, opponent: null, balanceUnknown: false });
  });

  it('accepts a balance of exactly bet + gas reserve and rejects one MIST less', () => {
    const exact = 1_000_000n + CREATE_GAS_RESERVE_MIST;
    expect(validate('0.001', '', exact)).toMatchObject({ ok: true, bet: 1_000_000n });
    expect(validate('0.001', '', exact - 1n)).toEqual({
      ok: false,
      errors: { amount: 'insufficient_balance' },
      balanceUnknown: false,
    });
  });

  it('does not block on an unknown balance and says so', () => {
    expect(validate('50', '', null)).toEqual({ ok: true, bet: 50_000_000_000n, opponent: null, balanceUnknown: true });
  });
});

describe('validateCreateGame: invitation', () => {
  it('is an open game without invitation (empty or only spaces)', () => {
    expect(validate('1', '')).toMatchObject({ ok: true, opponent: null });
    expect(validate('1', '   ')).toMatchObject({ ok: true, opponent: null });
  });

  it('trims a valid address', () => {
    expect(validate('1', `  ${FRIEND}  `)).toMatchObject({ ok: true, opponent: FRIEND });
  });

  it('normalizes the short form and uppercase', () => {
    expect(validate('1', '0xB')).toMatchObject({ ok: true, opponent: FRIEND });
    expect(validate('1', `0X${'0'.repeat(63)}B`)).toMatchObject({ ok: true, opponent: FRIEND });
  });

  it('rejects an invalid address', () => {
    expect(validate('1', '0xzz')).toEqual({ ok: false, errors: { opponent: 'invalid' }, balanceUnknown: false });
  });

  it('rejects the own account in another format as self_invite', () => {
    expect(validate('1', ACCOUNT.toUpperCase().replace('0X', '0x'))).toEqual({
      ok: false,
      errors: { opponent: 'self_invite' },
      balanceUnknown: false,
    });
  });

  it('reports amount and invitation errors together', () => {
    expect(validate('', 'nope', null)).toEqual({ ok: false, errors: { amount: 'empty', opponent: 'invalid' }, balanceUnknown: true });
  });
});

describe('houseTermsChanges and houseChangeMessage (M-2)', () => {
  it('is null without changes', () => {
    expect(houseTermsChanges(HOUSE, { ...HOUSE })).toBeNull();
  });

  it('reports only the fee', () => {
    const change = houseTermsChanges(HOUSE, { ...HOUSE, feeRate: 300 });
    expect(change).toEqual({ fee: { from: 250, to: 300 } });
    expect(change && houseChangeMessage(change)).toBe('La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar');
  });

  it('reports only the minimum', () => {
    const change = houseTermsChanges(HOUSE, { ...HOUSE, minBet: 50_000_000n });
    expect(change).toEqual({
      limits: { from: { minBet: 1_000_000n, maxBet: 50_000_000_000n }, to: { minBet: 50_000_000n, maxBet: 50_000_000_000n } },
    });
    expect(change && houseChangeMessage(change)).toBe(
      'Los límites de apuesta cambiaron (mínimo 0.001 → 0.05 SUI, máximo 50 → 50 SUI); revisa y vuelve a confirmar',
    );
  });

  it('reports only the maximum', () => {
    const change = houseTermsChanges(HOUSE, { ...HOUSE, maxBet: 10_000_000_000n });
    expect(change && houseChangeMessage(change)).toBe(
      'Los límites de apuesta cambiaron (mínimo 0.001 → 0.001 SUI, máximo 50 → 10 SUI); revisa y vuelve a confirmar',
    );
  });

  it('reports fee and limits as two sentences, fee first', () => {
    const change = houseTermsChanges(HOUSE, { feeRate: 300, minBet: 2_000_000n, maxBet: 50_000_000_000n });
    expect(change && Object.keys(change)).toEqual(['fee', 'limits']);
    expect(change && houseChangeMessage(change)).toBe(
      'La comisión cambió de 2.5 % a 3 %. Los límites de apuesta cambiaron (mínimo 0.001 → 0.002 SUI, máximo 50 → 50 SUI); revisa y vuelve a confirmar',
    );
  });
});
