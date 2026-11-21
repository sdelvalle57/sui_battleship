import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import { buildGameRegistry, type TypeOrigin } from '../sui/gameRegistry';
import { createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { duelSourceOf } from './gameRow';
import { queryKeys } from './queryKeys';
import type { GameTarget, TxView } from './txSession';
import { useAcceptGame } from './useAcceptGame';
import { useAppConfig } from './useAppConfig';
import { useCancelGame } from './useCancelGame';
import { useClaimTimeout } from './useClaimTimeout';
import { useCreateGame } from './useCreateGame';
import { useRefundStalled } from './useRefundStalled';
import { useRejectGame } from './useRejectGame';
import { useTxTarget } from './useTxTarget';

// Hooks de acción enrutados por la fuente (#73, TASK-8a) con la máquina real (kit y `sui/execution` mockeados), contra las
// transacciones reales de `duel-tx` (crear, cancelar, rechazar y aceptar con `DuelActivated` + `DuelResolved`). La config
// tiene **tres versiones** del paquete: el target lleva el `packageId` vigente (la versión 3) y el argumento de tipo del
// juego, el ID de **definición** (el del upgrade que introdujo el módulo): `definingId ≠ packageId`. El reclamo por tiempo y
// el reembolso no tienen transacción de producción (el coinflip no persiste `Active`): sus eventos son sintéticos.

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn(), useCurrentAccount: vi.fn(), useDAppKit: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureEvent = { eventType: string; bcs: string; json: Record<string, unknown> };
type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: FixtureEvent[] };
type Case = 'createOpen' | 'createInvite' | 'cancel' | 'reject' | 'acceptCreatorWins';
type TxFixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; coinflipTag: string; duels: Record<'open' | 'invite' | 'cancelled' | 'rejected' | 'acceptCreatorWins', string> };
  house: { type: string; owner: SuiClientTypes.ObjectOwner; content: string; json: { fee_rate: number; min_bet: string; max_bet: string } };
  executed: Record<Case, { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
type ReadsFixture = { ids: { upgrades: { version: number; packageId: string; txDigest: string }[] }; typeOrigins: TypeOrigin[] };
const txFixture = import.meta.glob<TxFixture>('../../../contracts/fixtures/duel-tx.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-tx.localnet.json'
] as TxFixture;
const reads = import.meta.glob<ReadsFixture>('../../../contracts/fixtures/duel-reads.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-reads.localnet.json'
] as ReadsFixture;

/** La versión 3 del paquete (sintética): la vigente; el juego sigue definido en la versión 2 de la fixture. */
const CURRENT = `0x${'3'.repeat(64)}`;
const IDS = txFixture.ids;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: CURRENT,
  originalPackageId: IDS.originalPackageId,
  houseId: IDS.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
  upgrades: [...reads.ids.upgrades, { version: 3, packageId: CURRENT, txDigest: '22222222222222222222222222222222' }],
  typeOrigins: reads.typeOrigins,
};
const REGISTRY = buildGameRegistry(CONFIG);
const GAME_TAG = duelSourceOf(REGISTRY, 'coinflip').gameTag;
const DUEL = { gameKey: 'coinflip', source: 'duel' } as const;

const ACCEPT = txFixture.executed.acceptCreatorWins.Transaction;
const RESOLVED = ACCEPT.events.find((event) => event.eventType.includes('::duel::DuelResolved<'))?.json ?? {};
const ACCEPTOR = String(RESOLVED.acceptor);
const CREATOR = String(RESOLVED.creator);
const BET = BigInt(txFixture.house.json.min_bet);
const SHOWN = { feeRate: txFixture.house.json.fee_rate, minBet: BET, maxBet: BigInt(txFixture.house.json.max_bet) };
const OPEN = IDS.duels.open;

function resultOf(tx: FixtureTx): NodeTransactionResult {
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((event) => ({ ...event, sender: '', bcs: fromBase64(event.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}

// Eventos de `duel.move` sintéticos (R.5 del handoff) para el reclamo por tiempo y el reembolso.
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
const CLOCK_DUEL = `0x${'d1'.repeat(32)}`;
const CALLER = `0x${'ca'.repeat(32)}`;
/**
 * Resultado con eventos sintéticos y los efectos reales de una transacción de la fixture (la máquina lee el costo de los
 * efectos): solo el digest y los eventos son del caso.
 */
function syntheticResult(events: { eventType: string; bytes: Uint8Array }[]): NodeTransactionResult {
  const real = resultOf(ACCEPT);
  const base = real.Transaction;
  if (base === undefined) throw new Error('la fixture debe traer una transacción ejecutada');
  const tx = { ...base, digest: 'synthetic-digest', events: events.map((event) => ({ eventType: event.eventType, bcs: event.bytes, sender: '' })) };
  return { $kind: 'Transaction', Transaction: tx } as unknown as NodeTransactionResult;
}
const timedOutResult = (claimedBy = CALLER) =>
  syntheticResult([
    {
      eventType: duelSourceOf(REGISTRY, 'coinflip').eventTypes.timedOut,
      bytes: DuelTimedOutBcs.serialize({ duel_id: CLOCK_DUEL, creator: CREATOR, acceptor: ACCEPTOR, winner: ACCEPTOR, claimed_by: claimedBy, pot: 20_000_000n, fee: 1_000_000n, payout: 19_000_000n }).toBytes(),
    },
  ]);
const expiredResult = () =>
  syntheticResult([
    {
      eventType: duelSourceOf(REGISTRY, 'coinflip').eventTypes.expired,
      bytes: DuelExpiredBcs.serialize({ duel_id: CLOCK_DUEL, creator: CREATOR, acceptor: ACCEPTOR, refund_each: 10_000_000n }).toBytes(),
    },
  ]);

const signAndExecuteTransaction = vi.fn();
const getObject = vi.fn();
let queryClient: QueryClient;
let resetSpy: MockInstance<QueryClient['resetQueries']>;
let invalidateSpy: MockInstance<QueryClient['invalidateQueries']>;

const built = () => vi.mocked(preflightTransaction).mock.calls[0]?.[1] as Transaction;
const commandsOf = () => built().getData().commands;

function signAs(address: string, digest: string) {
  vi.mocked(useCurrentAccount).mockReturnValue({ address } as ReturnType<typeof useCurrentAccount>);
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest } });
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  resetSpy = vi.spyOn(queryClient, 'resetQueries');
  invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getObject } as unknown as SuiGrpcClient);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  getObject.mockResolvedValue({ object: { type: txFixture.house.type, owner: txFixture.house.owner, content: fromBase64(txFixture.house.content) } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

/** Los IDs de objeto que la transacción construida usa como entrada, en orden. */
const objectIdsOf = () => built().getData().inputs.flatMap((input) => (input.UnresolvedObject === undefined ? [] : [input.UnresolvedObject.objectId]));

/** La vista del detalle de la partida con la acción pedida, sobre el mismo `QueryClient` real. */
function renderAction<T>(gameId: string, use: (view: TxView<GameTarget>) => T) {
  return renderHook(
    () => {
      const target = useTxTarget({ kind: 'game', gameId });
      return { target, action: use(target.view) };
    },
    { wrapper: queryWrapper(queryClient) },
  );
}
async function settle(hook: { result: { current: { action: { outcome: unknown } } } }, run: () => void) {
  act(run);
  await waitFor(() => {
    expect(hook.result.current.action.outcome).not.toBeNull();
  });
}

describe('useCreateGame routed by createSource', () => {
  const renderCreate = () => renderHook(() => useCreateGame(useTxTarget({ kind: 'create' }).view), { wrapper: queryWrapper(queryClient) });

  it('with upgrades (createSource duel) builds the new coinflip with the current packageId and reads its DuelCreated (open)', async () => {
    const create = txFixture.executed.createOpen.Transaction;
    signAs(String(create.events[0]?.json.creator), create.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(create));
    const hook = renderCreate();
    act(() => {
      hook.result.current.create({ bet: BET, opponent: null, shown: SHOWN });
    });
    await waitFor(() => {
      expect(hook.result.current.outcome).not.toBeNull();
    });
    expect(commandsOf()[1]).toMatchObject({ MoveCall: { package: CURRENT, module: 'coinflip', function: 'create' } });
    expect(hook.result.current.outcome).toMatchObject({
      kind: 'success',
      digest: create.digest,
      value: {
        created: { gameId: OPEN, bet: BigInt(String(create.events[0]?.json.bet)), feeRate: SHOWN.feeRate, opponent: null, creator: String(create.events[0]?.json.creator) },
        feeChanged: null,
      },
    });
  });

  it('reads the invitation of the new source with its opponent, and reports feeChanged against the fee that was shown', async () => {
    const create = txFixture.executed.createInvite.Transaction;
    signAs(String(create.events[0]?.json.creator), create.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(create));
    const hook = renderCreate();
    act(() => {
      hook.result.current.create({ bet: BET, opponent: `0x${'b'.repeat(64)}`, shown: SHOWN });
    });
    await waitFor(() => {
      expect(hook.result.current.outcome).not.toBeNull();
    });
    expect(hook.result.current.outcome).toMatchObject({
      kind: 'success',
      value: { created: { gameId: IDS.duels.invite, opponent: String(create.events[0]?.json.opponent) }, feeChanged: null },
    });
  });

  it('succeeds with created null when the DuelCreated is not from the account that signed (DL-9)', async () => {
    const create = txFixture.executed.createOpen.Transaction;
    signAs(`0x${'d'.repeat(64)}`, create.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(create));
    const hook = renderCreate();
    act(() => {
      hook.result.current.create({ bet: BET, opponent: null, shown: SHOWN });
    });
    await waitFor(() => {
      expect(hook.result.current.outcome).not.toBeNull();
    });
    expect(hook.result.current.outcome).toMatchObject({ kind: 'success', value: { created: null, feeChanged: null } });
  });

  it('reports feeChanged when the DuelCreated stored another fee than the one shown, and builds nothing before the House reread', async () => {
    const create = txFixture.executed.createOpen.Transaction;
    signAs(String(create.events[0]?.json.creator), create.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(create));
    const hook = renderCreate();
    act(() => {
      hook.result.current.create({ bet: BET, opponent: null, shown: { ...SHOWN, feeRate: SHOWN.feeRate + 1 } });
    });
    await waitFor(() => {
      expect(hook.result.current.outcome).not.toBeNull();
    });
    expect(getObject).toHaveBeenCalledWith(expect.objectContaining({ objectId: IDS.houseId }));
    expect(hook.result.current.outcome).toMatchObject({ kind: 'failure', digest: null });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });
});

describe('useAcceptGame routed by the source of the object', () => {
  it('builds the new coinflip accept with the current packageId, the bet of the row and Random LAST', async () => {
    signAs(ACCEPTOR, ACCEPT.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT));
    const hook = renderAction(IDS.duels.acceptCreatorWins, (view) => useAcceptGame(view, { bet: BET, ...DUEL }));
    await settle(hook, () => {
      hook.result.current.action.accept();
    });
    const commands = commandsOf();
    expect(commands.at(-1)).toMatchObject({ MoveCall: { package: CURRENT, module: 'coinflip', function: 'accept' } });
    expect(commands[0]).toHaveProperty('SplitCoins');
    expect(objectIdsOf()).toEqual(expect.arrayContaining([IDS.duels.acceptCreatorWins, IDS.houseId]));
  });

  it('returns the real DuelResolved as the value (winner, pot, fee and payout), not the DuelActivated of the same transaction', async () => {
    signAs(ACCEPTOR, ACCEPT.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT));
    const hook = renderAction(IDS.duels.acceptCreatorWins, (view) => useAcceptGame(view, { bet: BET, ...DUEL }));
    await settle(hook, () => {
      hook.result.current.action.accept();
    });
    expect(hook.result.current.action.outcome).toEqual({
      kind: 'success',
      digest: ACCEPT.digest,
      indexed: true,
      cost: expect.any(BigInt) as bigint,
      value: {
        gameId: IDS.duels.acceptCreatorWins,
        creator: CREATOR,
        acceptor: ACCEPTOR,
        winner: RESOLVED.winner,
        pot: BigInt(String(RESOLVED.pot)),
        fee: BigInt(String(RESOLVED.fee)),
        payout: BigInt(String(RESOLVED.payout)),
        transactionDigest: ACCEPT.digest,
      },
    });
  });

  it('succeeds with value null when the confirmation has only the DuelActivated, or when another account signed', async () => {
    signAs(ACCEPTOR, ACCEPT.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf({ ...ACCEPT, events: ACCEPT.events.filter((event) => event.eventType.includes('::duel::DuelActivated<')) }));
    const first = renderAction(IDS.duels.acceptCreatorWins, (view) => useAcceptGame(view, { bet: BET, ...DUEL }));
    await settle(first, () => {
      first.result.current.action.accept();
    });
    expect(first.result.current.action.outcome).toMatchObject({ kind: 'success', value: null });

    vi.mocked(preflightTransaction).mockClear();
    signAs(`0x${'d'.repeat(64)}`, ACCEPT.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT));
    const second = renderAction(IDS.duels.acceptCreatorWins, (view) => useAcceptGame(view, { bet: BET, ...DUEL }));
    await settle(second, () => {
      second.result.current.action.accept();
    });
    expect(second.result.current.action.outcome).toMatchObject({ kind: 'success', value: null });
  });

  it('resets the lobby and invalidates the game, the balance, the House and "Mis partidas" like for the previous source', async () => {
    signAs(ACCEPTOR, ACCEPT.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT));
    const hook = renderAction(IDS.duels.acceptCreatorWins, (view) => useAcceptGame(view, { bet: BET, ...DUEL }));
    await settle(hook, () => {
      hook.result.current.action.accept();
    });
    expect(resetSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([queryKeys.lobby('localnet', IDS.originalPackageId)]);
    expect(invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', IDS.duels.acceptCreatorWins),
      queryKeys.balance('localnet', ACCEPTOR),
      queryKeys.house('localnet', IDS.houseId),
      queryKeys.myGames('localnet', IDS.originalPackageId, ACCEPTOR),
    ]);
  });
});

describe.each([
  ['useCancelGame', 'cancel', 'cancel', 'cancelled', 'cancel'],
  ['useRejectGame', 'reject', 'reject', 'rejected', 'reject'],
] as const)('%s routed by the source of the object', (_name, kind, fn, duelKey, hookKey) => {
  it(`builds duel::${fn}<G> with the current packageId and the tag of the registry (definingId ≠ packageId), and reads the DuelCancelled refund`, async () => {
    const tx = txFixture.executed[kind].Transaction;
    const gameId = IDS.duels[duelKey];
    signAs(CREATOR, tx.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(tx));
    const hook = renderAction(gameId, (view) => (hookKey === 'cancel' ? useCancelGame(view, DUEL) : useRejectGame(view, DUEL)));
    await settle(hook, () => {
      const action = hook.result.current.action;
      if ('cancel' in action) action.cancel();
      else action.reject();
    });
    const [command] = commandsOf();
    expect(command).toMatchObject({ MoveCall: { package: CURRENT, module: 'duel', function: fn, typeArguments: [GAME_TAG] } });
    expect(GAME_TAG).not.toContain(CURRENT);
    expect(hook.result.current.action.outcome).toMatchObject({
      kind: 'success',
      digest: tx.digest,
      value: BigInt(String(tx.events[0]?.json.refund)),
    });
    expect(invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', gameId),
      queryKeys.balance('localnet', CREATOR),
      queryKeys.myGames('localnet', IDS.originalPackageId, CREATOR),
    ]);
  });

  it('succeeds with value null when the confirmation has no DuelCancelled of this duel', async () => {
    const tx = txFixture.executed[kind].Transaction;
    signAs(CREATOR, tx.digest);
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf({ ...tx, events: [] }));
    const hook = renderAction(IDS.duels[duelKey], (view) => (hookKey === 'cancel' ? useCancelGame(view, DUEL) : useRejectGame(view, DUEL)));
    await settle(hook, () => {
      const action = hook.result.current.action;
      if ('cancel' in action) action.cancel();
      else action.reject();
    });
    expect(hook.result.current.action.outcome).toMatchObject({ kind: 'success', value: null });
  });
});

describe('useClaimTimeout and useRefundStalled (the machine, with the target { kind: game, gameId })', () => {
  it('claim builds duel::claim_timeout<G>(duel, House) with the current packageId and the tag of the registry, and reads the DuelTimedOut', async () => {
    signAs(CALLER, 'tx-claim');
    vi.mocked(confirmTransaction).mockResolvedValue(timedOutResult());
    const hook = renderAction(CLOCK_DUEL, (view) => useClaimTimeout(view, DUEL));
    await settle(hook, () => {
      hook.result.current.action.claim();
    });
    expect(commandsOf()).toHaveLength(1);
    expect(commandsOf()[0]).toMatchObject({ MoveCall: { package: CURRENT, module: 'duel', function: 'claim_timeout', typeArguments: [GAME_TAG] } });
    expect(objectIdsOf()).toEqual([CLOCK_DUEL, IDS.houseId]);
    expect(hook.result.current.action.outcome).toMatchObject({
      kind: 'success',
      value: { gameId: CLOCK_DUEL, winner: ACCEPTOR, claimedBy: CALLER, pot: 20_000_000n, fee: 1_000_000n, payout: 19_000_000n },
    });
  });

  it('claim reads null when the DuelTimedOut says another account claimed (the signer is the one who claims)', async () => {
    signAs(CALLER, 'tx-claim');
    vi.mocked(confirmTransaction).mockResolvedValue(timedOutResult(`0x${'e'.repeat(64)}`));
    const hook = renderAction(CLOCK_DUEL, (view) => useClaimTimeout(view, DUEL));
    await settle(hook, () => {
      hook.result.current.action.claim();
    });
    expect(hook.result.current.action.outcome).toMatchObject({ kind: 'success', value: null });
  });

  it('claim resets the lobby and invalidates the game, the balance of the caller, the House and "Mis partidas", none immutable', async () => {
    signAs(CALLER, 'tx-claim');
    vi.mocked(confirmTransaction).mockResolvedValue(timedOutResult());
    const hook = renderAction(CLOCK_DUEL, (view) => useClaimTimeout(view, DUEL));
    await settle(hook, () => {
      hook.result.current.action.claim();
    });
    expect(resetSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([queryKeys.lobby('localnet', IDS.originalPackageId)]);
    expect(invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', CLOCK_DUEL),
      queryKeys.balance('localnet', CALLER),
      queryKeys.house('localnet', IDS.houseId),
      queryKeys.myGames('localnet', IDS.originalPackageId, CALLER),
    ]);
    const all = JSON.stringify([...resetSpy.mock.calls, ...invalidateSpy.mock.calls].map((call) => call[0]?.queryKey));
    for (const key of ['txInfo', 'publishCheckpoint', 'checkpointTime', 'nodeInfo']) expect(all).not.toContain(key);
  });

  it('refund builds duel::refund_stalled<G>(duel) without the House, and reads the DuelExpired', async () => {
    signAs(CALLER, 'tx-refund');
    vi.mocked(confirmTransaction).mockResolvedValue(expiredResult());
    const hook = renderAction(CLOCK_DUEL, (view) => useRefundStalled(view, DUEL));
    await settle(hook, () => {
      hook.result.current.action.refund();
    });
    expect(commandsOf()[0]).toMatchObject({ MoveCall: { package: CURRENT, module: 'duel', function: 'refund_stalled', typeArguments: [GAME_TAG] } });
    expect(objectIdsOf()).toEqual([CLOCK_DUEL]);
    expect(hook.result.current.action.outcome).toMatchObject({ kind: 'success', value: { gameId: CLOCK_DUEL, refundEach: 10_000_000n } });
  });

  it('refund invalidates like accept (the game, the balance, the House, "Mis partidas")', async () => {
    signAs(CALLER, 'tx-refund');
    vi.mocked(confirmTransaction).mockResolvedValue(expiredResult());
    const hook = renderAction(CLOCK_DUEL, (view) => useRefundStalled(view, DUEL));
    await settle(hook, () => {
      hook.result.current.action.refund();
    });
    expect(invalidateSpy.mock.calls.map((call) => call[0]?.queryKey)).toEqual([
      queryKeys.game('localnet', CLOCK_DUEL),
      queryKeys.balance('localnet', CALLER),
      queryKeys.house('localnet', IDS.houseId),
      queryKeys.myGames('localnet', IDS.originalPackageId, CALLER),
    ]);
  });

  it('the lock: a claim in flight is busy for the target and not foreign (notice null), and the outcome is read by runId', async () => {
    signAs(CALLER, 'tx-claim');
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    const hook = renderAction(CLOCK_DUEL, (view) => useClaimTimeout(view, DUEL));
    act(() => {
      hook.result.current.action.claim();
    });
    await waitFor(() => {
      expect(confirmTransaction).toHaveBeenCalled();
    });
    expect(hook.result.current.target.busy).toBe(true);
    expect(hook.result.current.target.notice).toBeNull();
    await act(async () => {
      confirm.resolve(timedOutResult());
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(hook.result.current.action.outcome).toMatchObject({ kind: 'success', value: { gameId: CLOCK_DUEL } });
    });
    expect(hook.result.current.target.busy).toBe(false);
  });

  it('"sin confirmar": a refund whose confirmation times out leaves the target unconfirmed with its digest, until acknowledged', async () => {
    signAs(CALLER, 'tx-refund');
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    const hook = renderAction(CLOCK_DUEL, (view) => useRefundStalled(view, DUEL));
    act(() => {
      hook.result.current.action.refund();
    });
    await waitFor(() => {
      expect(hook.result.current.target.unconfirmed).toMatchObject({ digest: 'tx-refund' });
    });
    act(() => {
      hook.result.current.target.acknowledge();
    });
    await waitFor(() => {
      expect(hook.result.current.target.unconfirmed).toBeNull();
    });
  });
});

describe('the previous source keeps going through game::* (a legacy row never uses the new builders)', () => {
  it('cancel, reject and accept of a legacy row build game::cancel_game, reject_game and accept_game', async () => {
    const legacy = { gameKey: 'coinflip', source: 'legacy' } as const;
    signAs(CREATOR, 'tx-legacy');
    vi.mocked(confirmTransaction).mockResolvedValue(syntheticResult([]));
    const cancel = renderAction(OPEN, (view) => useCancelGame(view, legacy));
    await settle(cancel, () => {
      cancel.result.current.action.cancel();
    });
    expect(commandsOf()[0]).toMatchObject({ MoveCall: { package: CURRENT, module: 'game', function: 'cancel_game' } });
    expect(commandsOf()[0]).toMatchObject({ MoveCall: { typeArguments: [] } });
    vi.mocked(preflightTransaction).mockClear();
    const accept = renderAction(OPEN, (view) => useAcceptGame(view, { bet: BET, ...legacy }));
    await settle(accept, () => {
      accept.result.current.action.accept();
    });
    expect(commandsOf().at(-1)).toMatchObject({ MoveCall: { module: 'game', function: 'accept_game' } });
  });
});
