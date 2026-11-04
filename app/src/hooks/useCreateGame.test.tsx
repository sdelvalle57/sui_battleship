import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';
import { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, PREFLIGHT_NETWORK_MESSAGE, preflightTransaction, type NodeTransactionResult } from '../sui/execution';
import { queryWrapper } from '../test/queryHarness';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useCreateGame } from './useCreateGame';
import { useTxTarget } from './useTxTarget';

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
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: { open: string } };
  house: { type: string; owner: SuiClientTypes.ObjectOwner; content: string };
  executed: { createOpen: { $kind: 'Transaction'; Transaction: FixtureTx } };
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const PKG = fixture.ids.originalPackageId;
const CREATE_OPEN = fixture.executed.createOpen.Transaction;
const CREATOR = String(CREATE_OPEN.events[0]?.json.creator);
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: fixture.ids.packageId,
  originalPackageId: PKG,
  houseId: fixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
};
const SHOWN = { feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n };

const HouseBcs = bcs.struct('House', {
  id: bcs.Address,
  version: bcs.u64(),
  fee_rate: bcs.u16(),
  fees_collected: bcs.u64(),
  min_bet: bcs.u64(),
  max_bet: bcs.u64(),
});
function houseObject(feeRate?: number) {
  const real = fromBase64(fixture.house.content);
  const content = feeRate === undefined ? real : HouseBcs.serialize({ ...HouseBcs.parse(real), fee_rate: feeRate }).toBytes();
  return { object: { type: fixture.house.type, owner: fixture.house.owner, content } };
}
function createOpenResult(): NodeTransactionResult {
  const converted = {
    ...CREATE_OPEN,
    effects: { ...CREATE_OPEN.effects, bcs: fromBase64(CREATE_OPEN.effects.bcs) },
    events: CREATE_OPEN.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}

const getObject = vi.fn();
const signAndExecuteTransaction = vi.fn();
let queryClient: QueryClient;

/** El hook con la vista del formulario (T3-15 (1)). */
const useCreateView = () => useCreateGame(useTxTarget({ kind: 'create' }).view);
async function create(input: Parameters<ReturnType<typeof useCreateGame>['create']>[0]) {
  const hook = renderHook(useCreateView, { wrapper: queryWrapper(queryClient) });
  act(() => {
    hook.result.current.create(input);
  });
  await waitFor(() => {
    expect(hook.result.current.outcome).not.toBeNull();
  });
  return hook;
}

beforeEach(() => {
  queryClient = new QueryClient();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getObject } as unknown as SuiGrpcClient);
  vi.mocked(useCurrentAccount).mockReturnValue({ address: CREATOR } as ReturnType<typeof useCurrentAccount>);
  vi.mocked(useDAppKit).mockReturnValue({ signAndExecuteTransaction } as unknown as ReturnType<typeof useDAppKit>);
  getObject.mockResolvedValue(houseObject());
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(confirmTransaction).mockResolvedValue(createOpenResult());
  signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: CREATE_OPEN.digest } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('useCreateGame', () => {
  it('rereads the House, builds create_game and returns the created game of createOpen', async () => {
    const { result } = await create({ bet: 1_000_001n, opponent: null, shown: SHOWN });
    expect(getObject).toHaveBeenCalledWith(expect.objectContaining({ objectId: CONFIG.houseId, include: { content: true } }));
    const tx = vi.mocked(preflightTransaction).mock.calls[0]?.[1] as Transaction;
    expect(tx.getData().commands[1]).toMatchObject({ MoveCall: { package: CONFIG.packageId, module: 'game', function: 'create_game' } });
    expect(result.current.outcome).toMatchObject({
      kind: 'success',
      digest: CREATE_OPEN.digest,
      value: { created: { gameId: fixture.ids.games.open, bet: 1_000_001n, feeRate: 250, opponent: null }, feeChanged: null },
    });
  });

  it('reports feeChanged when the created game stored another fee than the one shown (M-2)', async () => {
    getObject.mockResolvedValue(houseObject(300));
    const { result } = await create({ bet: 1_000_001n, opponent: null, shown: { ...SHOWN, feeRate: 300 } });
    expect(result.current.outcome).toMatchObject({ kind: 'success', value: { feeChanged: { from: 300, to: 250 } } });
  });

  it('stops before the preflight when the House fee changed, invalidating the House and without the wallet (M-2)', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = await create({ bet: 1_000_001n, opponent: null, shown: { ...SHOWN, feeRate: 300 } });
    expect(result.current.outcome).toEqual({
      kind: 'failure',
      message: 'La comisión cambió de 3 % a 2.5 %; revisa y vuelve a confirmar',
      digest: null,
      cost: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.house('localnet', CONFIG.houseId) });
    expect(preflightTransaction).not.toHaveBeenCalled();
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('shows the network text when the House reread fails with UNAVAILABLE', async () => {
    getObject.mockRejectedValue(new RpcError('down', 'UNAVAILABLE'));
    const { result } = await create({ bet: 1_000_001n, opponent: null, shown: SHOWN });
    expect(result.current.outcome).toMatchObject({ kind: 'failure', message: PREFLIGHT_NETWORK_MESSAGE });
    expect(signAndExecuteTransaction).not.toHaveBeenCalled();
  });

  it('succeeds without a created game when the event is not from the connected account (DL-9)', async () => {
    vi.mocked(useCurrentAccount).mockReturnValue({ address: `0x${'d'.repeat(64)}` } as ReturnType<typeof useCurrentAccount>);
    const { result } = await create({ bet: 1_000_001n, opponent: null, shown: SHOWN });
    expect(result.current.outcome).toMatchObject({ kind: 'success', value: { created: null, feeChanged: null } });
  });
});
