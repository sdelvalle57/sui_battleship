import { bcs } from '@mysten/sui/bcs';
import { fromBase64, normalizeSuiAddress, normalizeSuiObjectId, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { U64_MAX } from '../format';
import { buildGameRegistry, definingIdOf, type DuelSource, type TypeOrigin } from '../gameRegistry';
import {
  buildAcceptCoinflipTx,
  buildCancelDuelTx,
  buildClaimTimeoutTx,
  buildCreateCoinflipTx,
  buildRefundStalledTx,
  buildRejectDuelTx,
} from './duel';

const PKG = `0x${'a'.repeat(64)}`;
const HOUSE = `0x${'b'.repeat(64)}`;
const DUEL = `0x${'c'.repeat(64)}`;
const OPPONENT = `0x${'d'.repeat(64)}`;
// IDs sintéticos de un paquete con tres versiones: la original, la que introduce `duel`/`coinflip` y la vigente.
const ORIGINAL = `0x${'1'.repeat(64)}`;
const DEFINING = `0x${'2'.repeat(64)}`;
const CURRENT = `0x${'3'.repeat(64)}`;
const GAME_TAG = `${DEFINING}::coinflip::Coinflip`;

type PureInput = { $kind: 'Pure'; Pure: { bytes: string } };

function pureBytes(input: unknown): Uint8Array {
  expect(input).toMatchObject({ $kind: 'Pure' });
  return fromBase64((input as PureInput).Pure.bytes);
}

const SPLIT_GAS = {
  $kind: 'SplitCoins',
  SplitCoins: { coin: { $kind: 'GasCoin', GasCoin: true }, amounts: [{ $kind: 'Input', Input: 0, type: 'pure' }] },
};

describe('buildCreateCoinflipTx', () => {
  it('splits the bet from the gas coin and calls <packageId>::coinflip::create(house, coin, opponent) without a control', () => {
    const data = buildCreateCoinflipTx({ packageId: PKG, houseId: HOUSE, bet: 1_000_001n, opponent: null }).getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([
      SPLIT_GAS,
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'coinflip',
          function: 'create',
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
    const data = buildCreateCoinflipTx({ packageId: PKG, houseId: HOUSE, bet: 1n, opponent: OPPONENT.toUpperCase().replace('0X', '0x') }).getData();
    expect(bcs.option(bcs.Address).parse(pureBytes(data.inputs[2]))).toBe(normalizeSuiAddress(OPPONENT));
  });

  it('accepts the bet at U64_MAX', () => {
    const data = buildCreateCoinflipTx({ packageId: PKG, houseId: HOUSE, bet: U64_MAX, opponent: null }).getData();
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
    expect(() => buildCreateCoinflipTx({ packageId: PKG, houseId: HOUSE, bet: 1n, opponent: null, ...override })).toThrow(Error);
  });
});

describe('buildAcceptCoinflipTx', () => {
  const accept = (override: Partial<{ packageId: string; houseId: string; duelId: string; bet: bigint }> = {}) =>
    buildAcceptCoinflipTx({ packageId: PKG, houseId: HOUSE, duelId: DUEL, bet: 1_000_001n, ...override });

  it('splits the bet and calls <packageId>::coinflip::accept as the LAST command (only the split before it)', () => {
    const data = accept().getData();
    expect(data.sender).toBeNull();
    expect(data.commands).toEqual([
      SPLIT_GAS,
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'coinflip',
          function: 'accept',
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
    expect(data.commands.filter((command) => command.$kind === 'MoveCall')).toHaveLength(1);
    expect(bcs.u64().parse(pureBytes(data.inputs[0]))).toBe('1000001');
  });

  it('passes the duel and the house as unresolved objects and Random as the immutable 0x8 object', () => {
    const { inputs } = accept().getData();
    expect(inputs[1]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: DUEL } });
    expect(inputs[2]).toEqual({ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: HOUSE } });
    expect(inputs[3]).toEqual({
      $kind: 'UnresolvedObject',
      UnresolvedObject: { objectId: normalizeSuiObjectId(SUI_RANDOM_OBJECT_ID), mutable: false },
    });
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['duelId', { duelId: '0x' }],
    ['bet 0', { bet: 0n }],
    ['bet U64_MAX + 1', { bet: U64_MAX + 1n }],
  ])('throws on an invalid %s', (_name, override) => {
    expect(() => accept(override)).toThrow(Error);
  });
});

describe.each([
  ['buildCancelDuelTx', buildCancelDuelTx, 'cancel'],
  ['buildRejectDuelTx', buildRejectDuelTx, 'reject'],
  ['buildRefundStalledTx', buildRefundStalledTx, 'refund_stalled'],
] as const)('%s', (_name, build, fn) => {
  it(`calls <packageId>::duel::${fn}<G> with the duel only, the type argument G and no House or Random`, () => {
    const data = build({ packageId: PKG, gameTag: GAME_TAG, duelId: DUEL }).getData();
    expect(data.sender).toBeNull();
    expect(data.inputs).toEqual([{ $kind: 'UnresolvedObject', UnresolvedObject: { objectId: DUEL } }]);
    expect(data.commands).toEqual([
      {
        $kind: 'MoveCall',
        MoveCall: { package: PKG, module: 'duel', function: fn, typeArguments: [GAME_TAG], arguments: [{ $kind: 'Input', Input: 0, type: 'object' }] },
      },
    ]);
  });

  it.each([
    ['packageId', { packageId: 'not-hex' }],
    ['duelId', { duelId: '0x' }],
    ['gameTag without the full address', { gameTag: '0x2::coinflip::Coinflip' }],
    ['gameTag with type parameters', { gameTag: `${DEFINING}::duel::Duel<${GAME_TAG}>` }],
    ['gameTag that is not a tag', { gameTag: DEFINING }],
  ])('throws on an invalid %s', (_field, override) => {
    expect(() => build({ packageId: PKG, gameTag: GAME_TAG, duelId: DUEL, ...override })).toThrow(Error);
  });
});

describe('buildClaimTimeoutTx', () => {
  const claim = (override: Partial<{ packageId: string; gameTag: string; houseId: string; duelId: string }> = {}) =>
    buildClaimTimeoutTx({ packageId: PKG, gameTag: GAME_TAG, houseId: HOUSE, duelId: DUEL, ...override });

  it('calls <packageId>::duel::claim_timeout<G>(duel, house): it takes the House because it collects the fee', () => {
    const data = claim().getData();
    expect(data.inputs).toEqual([
      { $kind: 'UnresolvedObject', UnresolvedObject: { objectId: DUEL } },
      { $kind: 'UnresolvedObject', UnresolvedObject: { objectId: HOUSE } },
    ]);
    expect(data.commands).toEqual([
      {
        $kind: 'MoveCall',
        MoveCall: {
          package: PKG,
          module: 'duel',
          function: 'claim_timeout',
          typeArguments: [GAME_TAG],
          arguments: [
            { $kind: 'Input', Input: 0, type: 'object' },
            { $kind: 'Input', Input: 1, type: 'object' },
          ],
        },
      },
    ]);
  });

  it.each([
    ['packageId', { packageId: '0x2' }],
    ['houseId', { houseId: 'house' }],
    ['duelId', { duelId: '0x' }],
    ['gameTag', { gameTag: 'Coinflip' }],
  ])('throws on an invalid %s', (_field, override) => {
    expect(() => claim(override)).toThrow(Error);
  });
});

describe('type arguments come from typeOrigins (definingId), never from the current packageId', () => {
  // Un paquete con tres versiones: `duel` y `coinflip` los introdujo la 2 (`DEFINING`) y el `packageId` vigente es la 3.
  const typeOrigins: TypeOrigin[] = [
    { module: 'game', name: 'Game', definingId: ORIGINAL },
    { module: 'game', name: 'GameCreated', definingId: ORIGINAL },
    { module: 'game', name: 'GameCancelled', definingId: ORIGINAL },
    { module: 'game', name: 'GameResolved', definingId: ORIGINAL },
    { module: 'coinflip', name: 'Coinflip', definingId: DEFINING },
    { module: 'duel', name: 'Duel', definingId: DEFINING },
    ...['DuelCreated', 'DuelCancelled', 'DuelActivated', 'DuelTurn', 'DuelResolved', 'DuelTimedOut', 'DuelExpired'].map((name) => ({
      module: 'duel',
      name,
      definingId: DEFINING,
    })),
  ];
  const registry = buildGameRegistry({
    originalPackageId: ORIGINAL,
    upgrades: [{ packageId: DEFINING }, { packageId: CURRENT }],
    typeOrigins,
  });
  const source = registry[0]?.sources.find((s): s is DuelSource => s.kind === 'duel');

  it('the case distinguishes something: definingId differs from the current packageId', () => {
    expect(definingIdOf(typeOrigins, 'coinflip', 'Coinflip')).toBe(DEFINING);
    expect(DEFINING).not.toBe(CURRENT);
    expect(source?.gameTag).toBe(GAME_TAG);
  });

  it.each([
    ['cancel', buildCancelDuelTx],
    ['reject', buildRejectDuelTx],
    ['refund_stalled', buildRefundStalledTx],
    ['claim_timeout', (args: { packageId: string; gameTag: string; duelId: string }) => buildClaimTimeoutTx({ ...args, houseId: HOUSE })],
  ])('%s: the target uses the current packageId and the type argument the definingId, by chain equality', (_fn, build) => {
    if (source === undefined) throw new Error('el registro no tiene la fuente duel');
    const command = build({ packageId: CURRENT, gameTag: source.gameTag, duelId: DUEL }).getData().commands[0];
    if (command?.$kind !== 'MoveCall') throw new Error('se esperaba un MoveCall');
    expect(command.MoveCall.package).toBe(CURRENT);
    expect(command.MoveCall.typeArguments).toEqual([`${definingIdOf(typeOrigins, 'coinflip', 'Coinflip') ?? ''}::coinflip::Coinflip`]);
    expect(command.MoveCall.typeArguments[0]).not.toContain(CURRENT);
    expect(command.MoveCall.typeArguments[0]).not.toContain(ORIGINAL);
  });
});
