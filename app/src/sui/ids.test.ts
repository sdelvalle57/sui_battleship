import { describe, expect, it } from 'vitest';
import { parseObjectIdInput, sameAddress } from './ids';

const SIX = `0x${'0'.repeat(63)}6`;
const FULL = `0x${'ab'.repeat(32)}`;

describe('parseObjectIdInput', () => {
  it.each([
    ['empty', '', null],
    ['only 0x', '0x', null],
    ['short form', '0x6', SIX],
    ['short form without 0x', '6', SIX],
    ['uppercase', `0X${'AB'.repeat(32)}`, FULL],
    ['64 hex', FULL, FULL],
    ['65 hex', `${FULL}a`, null],
    ['not hex', '0xzz', null],
    ['leading space', ` ${FULL}`, null],
    ['trailing space', `${FULL} `, null],
  ])('%s', (_name, raw, expected) => {
    expect(parseObjectIdInput(raw)).toBe(expected);
  });
});

describe('sameAddress', () => {
  it('ignores case and leading zeros', () => {
    expect(sameAddress('0x6', SIX)).toBe(true);
    expect(sameAddress(FULL.toUpperCase().replace('0X', '0x'), FULL)).toBe(true);
  });

  it('distinguishes different addresses', () => {
    expect(sameAddress('0x6', '0x7')).toBe(false);
  });
});
