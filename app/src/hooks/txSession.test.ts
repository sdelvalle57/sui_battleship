import { hashKey, type MutationStatus } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from './queryKeys';
import { deriveTargetState, mountSnapshot, toTxEntry, txOutcomeOf, txVariablesOf, type MountSnapshot, type TxEntry } from './txSession';
import type { TxOutcome } from './useExecuteTransaction';

const A = `0x${'a'.repeat(64)}`;
const B = `0x${'b'.repeat(64)}`;
const GAME = `0x${'c'.repeat(64)}`;
const OTHER_GAME = `0x${'d'.repeat(64)}`;
const VIEW = 7;
const FOREIGN = 3;
const EMPTY: MountSnapshot = { maxId: 0, pendingIds: new Set() };

const success: TxOutcome<unknown> = { kind: 'success', digest: 'D1', value: 5n, indexed: true, cost: 1n };
const failure: TxOutcome<unknown> = { kind: 'failure', message: 'x', digest: null, cost: null };
const unconfirmed = (digest: string): TxOutcome<unknown> => ({ kind: 'unconfirmed', digest });

function entry(id: number, over: Partial<TxEntry> = {}): TxEntry {
  return {
    id,
    status: 'success',
    viewId: FOREIGN,
    runId: id,
    action: { kind: 'cancel', gameId: GAME },
    sameTarget: true,
    outcome: success,
    ...over,
  };
}
const derive = (entries: TxEntry[], mount: MountSnapshot = EMPTY) => deriveTargetState({ entries, viewId: VIEW, mount });

/** Una mutación con la forma mínima que lee `txSession` (como las del `MutationCache`). */
function mutation(id: number, status: MutationStatus, key: readonly unknown[], data?: unknown, variables?: unknown) {
  return { mutationId: id, state: { status, data, variables } as never, options: { mutationKey: key } };
}

describe('deriveTargetState (T3-16)', () => {
  it('is empty without mutations', () => {
    expect(derive([])).toEqual({ inFlightForeign: false, notice: null, unconfirmed: null });
  });

  it('reports in_flight for a foreign pending mutation of any target of the account, never for an own one', () => {
    expect(derive([entry(1, { status: 'pending', outcome: null, sameTarget: false })]).notice).toEqual({ kind: 'in_flight' });
    expect(derive([entry(1, { status: 'pending', outcome: null, viewId: VIEW })])).toEqual({ inFlightForeign: false, notice: null, unconfirmed: null });
  });

  it('takes the newest unconfirmed of the target, own or foreign, and ignores other targets', () => {
    const state = derive([
      entry(1, { outcome: unconfirmed('OLD') }),
      entry(2, { outcome: unconfirmed('NEW'), viewId: VIEW }),
      entry(3, { outcome: unconfirmed('ELSEWHERE'), sameTarget: false }),
    ]);
    expect(state.unconfirmed).toEqual({ digest: 'NEW', mutationId: 2 });
  });

  it('adopts a foreign finished mutation of the target that started after mounting', () => {
    expect(derive([entry(5, { outcome: failure })], { maxId: 4, pendingIds: new Set() }).notice).toEqual({
      kind: 'adopted',
      adopted: { action: 'cancel', outcome: failure },
    });
  });

  it('adopts a foreign mutation that was pending when mounting and finished after', () => {
    expect(derive([entry(3)], { maxId: 4, pendingIds: new Set([3]) }).notice).toMatchObject({ kind: 'adopted' });
  });

  it('does not adopt what finished before mounting, an unconfirmed one, another target or an own one', () => {
    const mount = { maxId: 4, pendingIds: new Set<number>() };
    expect(derive([entry(4)], mount).notice).toBeNull();
    expect(derive([entry(5, { outcome: unconfirmed('X') })], mount).notice).toBeNull();
    expect(derive([entry(5, { sameTarget: false })], mount).notice).toBeNull();
    expect(derive([entry(5, { viewId: VIEW })], mount).notice).toBeNull();
    expect(derive([entry(5, { status: 'pending', outcome: null, viewId: VIEW })], mount).notice).toBeNull();
  });

  it('drops the adopted one when an own mutation is newer (M-2 (a)) and shows only the newest adopted', () => {
    expect(derive([entry(1), entry(2, { viewId: VIEW })]).notice).toBeNull();
    expect(derive([entry(1), entry(2, { viewId: VIEW, status: 'pending', outcome: null })]).notice).toBeNull();
    expect(derive([entry(1, { action: { kind: 'cancel', gameId: GAME } }), entry(2, { action: { kind: 'reject', gameId: GAME } })]).notice).toEqual({
      kind: 'adopted',
      adopted: { action: 'reject', outcome: success },
    });
  });

  it('prefers in_flight over an adopted result', () => {
    expect(derive([entry(1), entry(2, { status: 'pending', outcome: null, sameTarget: false })]).notice).toEqual({ kind: 'in_flight' });
  });
});

describe('mountSnapshot (T3-16, v1.2)', () => {
  it('takes maxId and pendingIds from the whole cache: two accounts and two targets', () => {
    const snapshot = mountSnapshot([
      mutation(1, 'success', queryKeys.txTarget('localnet', A, { kind: 'create' })),
      mutation(2, 'pending', queryKeys.txTarget('localnet', B, { kind: 'game', gameId: GAME })),
      mutation(4, 'pending', queryKeys.txTarget('localnet', A, { kind: 'game', gameId: OTHER_GAME })),
      mutation(3, 'success', queryKeys.txTarget('localnet', B, { kind: 'create' })),
    ]);
    expect(snapshot.maxId).toBe(4);
    expect([...snapshot.pendingIds].sort()).toEqual([2, 4]);
    expect(mountSnapshot([])).toEqual({ maxId: 0, pendingIds: new Set() });
  });

  it('with a finished mutation of B (id 2) taken while A was connected, deriving with the key of B does not adopt it', () => {
    const keyB = queryKeys.txTarget('localnet', B, { kind: 'create' });
    const finished = mutation(2, 'success', keyB, success, { viewId: FOREIGN, runId: 2, action: { kind: 'create' } });
    const mount = mountSnapshot([finished]);
    const entries = [finished].map(toTxEntry({ targetHash: hashKey(keyB) }));
    expect(deriveTargetState({ entries, viewId: VIEW, mount }).notice).toBeNull();
  });

  it('with a pending mutation of B (id 2) at mount that finishes later, deriving with the key of B adopts it', () => {
    const keyB = queryKeys.txTarget('localnet', B, { kind: 'create' });
    const variables = { viewId: FOREIGN, runId: 2, action: { kind: 'create' } };
    const mount = mountSnapshot([mutation(2, 'pending', keyB, undefined, variables)]);
    const entries = [mutation(2, 'success', keyB, success, variables)].map(toTxEntry({ targetHash: hashKey(keyB) }));
    expect(deriveTargetState({ entries, viewId: VIEW, mount }).notice).toEqual({ kind: 'adopted', adopted: { action: 'create', outcome: success } });
  });
});

describe('toTxEntry', () => {
  const key = queryKeys.txTarget('localnet', A, { kind: 'game', gameId: GAME });

  it('projects id, status, view, run, action, outcome and whether the key is the target', () => {
    const variables = { input: {}, viewId: 9, runId: 12, action: { kind: 'cancel', gameId: GAME } };
    expect(toTxEntry({ targetHash: hashKey(key) })(mutation(3, 'success', key, failure, variables))).toEqual({
      id: 3,
      status: 'success',
      viewId: 9,
      runId: 12,
      action: { kind: 'cancel', gameId: GAME },
      sameTarget: true,
      outcome: failure,
    });
  });

  it('marks another target (also another game in another address format) and foreign shapes as null', () => {
    const other = queryKeys.txTarget('localnet', A, { kind: 'game', gameId: OTHER_GAME });
    const projected = toTxEntry({ targetHash: hashKey(key) })(mutation(1, 'pending', other, undefined, { foo: 1 }));
    expect(projected).toMatchObject({ sameTarget: false, viewId: null, runId: null, action: null, outcome: null });
    const sameGameUpper = queryKeys.txTarget('localnet', A.toUpperCase().replace('0X', '0x'), { kind: 'game', gameId: GAME.toUpperCase().replace('0X', '0x') });
    expect(toTxEntry({ targetHash: hashKey(key) })(mutation(1, 'pending', sameGameUpper)).sameTarget).toBe(true);
  });

  it('recognizes every action of TxAction, accept included (v1.4: an own acceptance is not foreign)', () => {
    for (const action of [{ kind: 'create' }, { kind: 'cancel', gameId: GAME }, { kind: 'reject', gameId: GAME }, { kind: 'accept', gameId: GAME }]) {
      expect(txVariablesOf({ viewId: 1, runId: 2, action })).toEqual({ viewId: 1, runId: 2, action });
    }
  });

  it('reads only the known shapes of variables and outcome', () => {
    expect(txVariablesOf({ viewId: 1, runId: 2, action: { kind: 'resolve' } })).toBeNull();
    expect(txVariablesOf(null)).toBeNull();
    expect(txOutcomeOf({ kind: 'other' })).toBeNull();
    expect(txOutcomeOf(undefined)).toBeNull();
  });
});

describe('queryKeys.txAccount / txTarget', () => {
  it('normalizes the account and the game, and uses none without account', () => {
    expect(queryKeys.txAccount('localnet', null)).toEqual(['sui', 'localnet', 'tx', 'none']);
    expect(queryKeys.txTarget('testnet', '0xA', { kind: 'create' })).toEqual(['sui', 'testnet', 'tx', `0x${'0'.repeat(63)}a`, 'create']);
    expect(queryKeys.txTarget('localnet', A, { kind: 'game', gameId: '0xC' })).toEqual(['sui', 'localnet', 'tx', A, 'game', `0x${'0'.repeat(63)}c`]);
  });
});
