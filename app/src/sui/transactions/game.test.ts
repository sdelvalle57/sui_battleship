import { bcs } from '@mysten/sui/bcs';
import { fromBase64, normalizeSuiAddress, normalizeSuiObjectId, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { U64_MAX } from '../format';
import { buildAcceptGameTx, buildCancelGameTx, buildCreateGameTx, buildRejectGameTx } from './game';

const PKG = `0x${'a'.repeat(64)}`;
const HOUSE = `0x${'b'.repeat(64)}`;
const GAME = `0x${'c'.repeat(64)}`;
const OPPONENT = `0x${'d'.repeat(64)}`;

type PureInput = { $kind: 'Pure'; Pure: { bytes: string } };

function pureBytes(input: unknown): Uint8Array {
  expect(input).toMatchObject({ $kind: 'Pure' });
  return fromBase64((input as PureInput).Pure.bytes);
}

describe('buildCreateGameTx', () => {
  it('splits the bet from the gas coin and calls <packageId>::game::create_game with the coin as stake', () => {
    const data = buildCreateGameTx({ packageId: PKG, houseId: HOUSE, bet: 1_000_001n, opponent: null }).getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([
      {
        $kind: 'SplitCoins',
        SplitCoins: { coin: { $kind: 'GasCoin', GasCoin: true }, amounts: [{ $kind: 'Input', Input: 0, type: 'pure' }] },
      },
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'game',
          function: 'create_game',
          typeArguments: [],
          arguments: [
            { $kind: 'Input', Input: 1, type: 'object' },
            { $kind: 'NestedResult', NestedResult: [0, 0] },
            { $kind: 'Input', Input: 2, type: 'pure' },
          ],
        },
      },
    ]);
    expect(data.inputs[1]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: HOUSE } });
    expect(bcs.u64().parse(pureBytes(data.inputs[0]))).toBe('1000001');
    expect(bcs.option(bcs.Address).parse(pureBytes(data.inputs[2]))).toBeNull();
  });

  it('encodes an invitation as some(address), normalized', () => {
    const data = buildCreateGameTx({ packageId: PKG, houseId: HOUSE, bet: 1n, opponent: OPPONENT.toUpperCase().replace('0X', '0x') }).getData();
    expect(bcs.option(bcs.Address).parse(pureBytes(data.inputs[2]))).toBe(normalizeSuiAddress(OPPONENT));
  });

  it('accepts the bet at U64_MAX', () => {
    const data = buildCreateGameTx({ packageId: PKG, houseId: HOUSE, bet: U64_MAX, opponent: null }).getData();
    expect(bcs.u64().parse(pureBytes(data.inputs[0]))).toBe(U64_MAX.toString());
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['opponent', { opponent: '0x123' }],
    ['bet 0', { bet: 0n }],
    ['negative bet', { bet: -1n }],
    ['bet U64_MAX + 1', { bet: U64_MAX + 1n }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => buildCreateGameTx({ packageId: PKG, houseId: HOUSE, bet: 1n, opponent: null, ...override })).toThrow(Error);
  });
});

describe.each([
  ['buildCancelGameTx', buildCancelGameTx, 'cancel_game'],
  ['buildRejectGameTx', buildRejectGameTx, 'reject_game'],
] as const)('%s', (_name, build, fn) => {
  it(`calls <packageId>::game::${fn} with the game as an unresolved object`, () => {
    const data = build({ packageId: PKG, gameId: GAME }).getData();
    expect(data.sender).toBeNull();
    expect(data.inputs).toEqual([{ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: GAME } }]);
    expect(data.commands).toEqual([
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'game',
          function: fn,
          typeArguments: [],
          arguments: [{ $kind: 'Input', Input: 0, type: 'object' }],
        },
      },
    ]);
  });

  it.each([
    ['packageId', { packageId: 'not-hex' }],
    ['gameId', { gameId: '0x' }],
  ])('throws on an invalid %s', (_field, override) => {
    expect(() => build({ packageId: PKG, gameId: GAME, ...override })).toThrow(Error);
  });
});

describe('buildAcceptGameTx', () => {
  const accept = (override: Partial<{ packageId: string; houseId: string; gameId: string; bet: bigint }> = {}) =>
    buildAcceptGameTx({ packageId: PKG, houseId: HOUSE, gameId: GAME, bet: 1_000_001n, ...override });

  it('splits the bet from the gas coin and calls <packageId>::game::accept_game as the last command', () => {
    const data = accept().getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([
      {
        $kind: 'SplitCoins',
        SplitCoins: { coin: { $kind: 'GasCoin', GasCoin: true }, amounts: [{ $kind: 'Input', Input: 0, type: 'pure' }] },
      },
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'game',
          function: 'accept_game',
          typeArguments: [],
          arguments: [
            { $kind: 'Input', Input: 1, type: 'object' },
            { $kind: 'Input', Input: 2, type: 'object' },
            { $kind: 'NestedResult', NestedResult: [0, 0] },
            { $kind: 'Input', Input: 3, type: 'object' },
          ],
        },
      },
    ]);
    expect(data.commands.at(-1)?.$kind).toBe('MoveCall');
    expect(bcs.u64().parse(pureBytes(data.inputs[0]))).toBe('1000001');
  });

  it('passes the game and the house as unresolved objects and Random as the immutable 0x8 object', () => {
    const { inputs } = accept().getData();
    expect(inputs[1]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: GAME } });
    expect(inputs[2]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: HOUSE } });
    expect(inputs[3]).toEqual({
      $kind: 'UnresolvedObject',
      UnresolvedObject: { objectId: normalizeSuiObjectId(SUI_RANDOM_OBJECT_ID), mutable: false },
    });
  });

  it('accepts the bet at U64_MAX', () => {
    expect(bcs.u64().parse(pureBytes(accept({ bet: U64_MAX }).getData().inputs[0]))).toBe(U64_MAX.toString());
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['gameId', { gameId: '0x' }],
    ['bet 0', { bet: 0n }],
    ['bet U64_MAX + 1', { bet: U64_MAX + 1n }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => accept(override)).toThrow(Error);
  });
});
