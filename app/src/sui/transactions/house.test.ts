import { bcs } from '@mysten/sui/bcs';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { U64_MAX } from '../format';
import { buildUpdateBetLimitsTx, buildUpdateFeeRateTx, buildWithdrawFeesTx } from './house';

const PKG = `0x${'a'.repeat(64)}`;
const HOUSE = `0x${'b'.repeat(64)}`;
const CAP = `0x${'c'.repeat(64)}`;
const RECIPIENT = `0x${'d'.repeat(64)}`;
const IDS = { packageId: PKG, houseId: HOUSE, capId: CAP };

type PureInput = { $kind: 'Pure'; Pure: { bytes: string } };

function pureBytes(input: unknown): Uint8Array {
  expect(input).toMatchObject({ $kind: 'Pure' });
  return fromBase64((input as PureInput).Pure.bytes);
}

const OBJECT_INPUTS = [
  { $kind: 'UnresolvedObject', UnresolvedObject: { objectId: HOUSE } },
  { $kind: 'UnresolvedObject', UnresolvedObject: { objectId: CAP } },
];
const houseCall = (fn: string, pureArgs: number) => ({
  $kind: 'MoveCall',
  MoveCall: {
    package: PKG,
    module: 'house',
    function: fn,
    typeArguments: [],
    arguments: [
      { $kind: 'Input', Input: 0, type: 'object' },
      { $kind: 'Input', Input: 1, type: 'object' },
      ...Array.from({ length: pureArgs }, (_v, i) => ({ $kind: 'Input', Input: 2 + i, type: 'pure' })),
    ],
  },
});

describe('buildUpdateFeeRateTx', () => {
  it('calls <packageId>::house::update_fee_rate(house, cap, u16) without sender', () => {
    const data = buildUpdateFeeRateTx({ ...IDS, feeRate: 250 }).getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([houseCall('update_fee_rate', 1)]);
    expect(data.inputs.slice(0, 2)).toEqual(OBJECT_INPUTS);
    expect(bcs.u16().parse(pureBytes(data.inputs[2]))).toBe(250);
  });

  it.each([0, 1001, 65_535])('accepts %i (u16 range, the contract decides the maximum)', (feeRate) => {
    const data = buildUpdateFeeRateTx({ ...IDS, feeRate }).getData();
    expect(bcs.u16().parse(pureBytes(data.inputs[2]))).toBe(feeRate);
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['capId', { capId: '0x123' }],
    ['feeRate -1', { feeRate: -1 }],
    ['feeRate 1.5', { feeRate: 1.5 }],
    ['feeRate 65536', { feeRate: 65_536 }],
    ['feeRate NaN', { feeRate: Number.NaN }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => buildUpdateFeeRateTx({ ...IDS, feeRate: 250, ...override })).toThrow(Error);
  });
});

describe('buildUpdateBetLimitsTx', () => {
  it('calls <packageId>::house::update_bet_limits(house, cap, u64, u64) in order', () => {
    const data = buildUpdateBetLimitsTx({ ...IDS, minBet: 2_000_000n, maxBet: 10_000_000_000n }).getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([houseCall('update_bet_limits', 2)]);
    expect(data.inputs.slice(0, 2)).toEqual(OBJECT_INPUTS);
    expect(bcs.u64().parse(pureBytes(data.inputs[2]))).toBe('2000000');
    expect(bcs.u64().parse(pureBytes(data.inputs[3]))).toBe('10000000000');
  });

  it('accepts 0 and U64_MAX (u64 range, the contract validates 0 < min <= max)', () => {
    const data = buildUpdateBetLimitsTx({ ...IDS, minBet: 0n, maxBet: U64_MAX }).getData();
    expect(bcs.u64().parse(pureBytes(data.inputs[2]))).toBe('0');
    expect(bcs.u64().parse(pureBytes(data.inputs[3]))).toBe(U64_MAX.toString());
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: '' }],
    ['capId', { capId: 'cap' }],
    ['negative minBet', { minBet: -1n }],
    ['negative maxBet', { maxBet: -1n }],
    ['minBet > U64_MAX', { minBet: U64_MAX + 1n }],
    ['maxBet > U64_MAX', { maxBet: U64_MAX + 1n }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => buildUpdateBetLimitsTx({ ...IDS, minBet: 1n, maxBet: 2n, ...override })).toThrow(Error);
  });
});

describe('buildWithdrawFeesTx (D-4, MINOR-6 of the plan)', () => {
  it('has exactly 2 commands: withdraw_fees(house, cap) and TransferObjects([Result 0], recipient)', () => {
    const data = buildWithdrawFeesTx({ ...IDS, recipient: RECIPIENT }).getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toHaveLength(2);
    expect(data.commands).toEqual([
      houseCall('withdraw_fees', 0),
      {
        $kind: 'TransferObjects',
        TransferObjects: {
          objects: [{ $kind: 'Result', Result: 0 }],
          address: { $kind: 'Input', Input: 2, type: 'pure' },
        },
      },
    ]);
    expect(data.inputs).toHaveLength(3);
    expect(data.inputs.slice(0, 2)).toEqual(OBJECT_INPUTS);
    expect(bcs.Address.parse(pureBytes(data.inputs[2]))).toBe(normalizeSuiAddress(RECIPIENT));
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['capId', { capId: '0x123' }],
    ['recipient (short)', { recipient: '0x123' }],
    ['recipient (empty)', { recipient: '' }],
    ['recipient (not hex)', { recipient: `0x${'z'.repeat(64)}` }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => buildWithdrawFeesTx({ ...IDS, recipient: RECIPIENT, ...override })).toThrow(Error);
  });
});
