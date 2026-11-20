import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import type { UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useHouse } from '../hooks/useHouse';
import { useHouseCap } from '../hooks/useHouseCap';
import type { TxNotice, TxResult, TxView } from '../hooks/txSession';
import { useTxTarget } from '../hooks/useTxTarget';
import { useUpdateBetLimits } from '../hooks/useUpdateBetLimits';
import { useUpdateFeeRate } from '../hooks/useUpdateFeeRate';
import { useWithdrawFees } from '../hooks/useWithdrawFees';
import type { AppConfig } from '../sui/config';
import type { ExpiredGame, TimedOutGame } from '../sui/gameTx';
import type { House } from '../sui/house';
import type { BetLimitsUpdatedEvent, FeeRateUpdatedEvent } from '../sui/houseAdmin';
import { ACCEPTOR, CREATOR, GAME_ID } from '../test/duelRows';
import { HouseAdminPanel } from './HouseAdminPanel';

// #73 (TASK-8b): el panel de la House NO muestra el resultado adoptado de un reclamo ni de un reembolso (no son acciones de la
// House): su `switch` devuelve `null` para las dos y el panel no dibuja nada de ellas.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useHouseCap', () => ({ useHouseCap: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useUpdateFeeRate', () => ({ useUpdateFeeRate: vi.fn() }));
vi.mock('../hooks/useUpdateBetLimits', () => ({ useUpdateBetLimits: vi.fn() }));
vi.mock('../hooks/useWithdrawFees', () => ({ useWithdrawFees: vi.fn() }));

const CAP_ID = `0x${'c'.repeat(64)}`;
const HOUSE: House = { id: `0x${'b'.repeat(64)}`, version: 1n, feeRate: 250, feesCollected: 10_000_000n, minBet: 2_000_000n, maxBet: 10_000_000_000n };
const VIEW: TxView = { target: { kind: 'house' }, viewId: 1, key: ['tx', 'house'], accountKey: ['tx'], targetHash: '' };
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
const txHook = <T,>(): UseExecuteTransaction<T> => ({ stage: 'idle', outcome: null, execute: vi.fn() });
const success = <T,>(value: T): TxResult<T> => ({ kind: 'success', digest: DIGEST, value, indexed: true, cost: 1n });

const claim: TimedOutGame = {
  gameId: GAME_ID,
  creator: CREATOR,
  acceptor: ACCEPTOR,
  winner: ACCEPTOR,
  pot: 4_000_000n,
  fee: 100_000n,
  payout: 3_900_000n,
  claimedBy: CREATOR,
  transactionDigest: DIGEST,
};
const refund: ExpiredGame = { gameId: GAME_ID, creator: CREATOR, acceptor: ACCEPTOR, refundEach: 2_000_000n, transactionDigest: DIGEST };

function renderWith(notice: TxNotice) {
  vi.mocked(useHouse).mockReturnValue({ house: HOUSE, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  vi.mocked(useHouseCap).mockReturnValue({
    kind: 'account',
    address: `0x${'a'.repeat(64)}`,
    cap: { kind: 'known', cap: { id: CAP_ID, owner: `0x${'a'.repeat(64)}` } },
    status: { kind: 'ready', refreshing: false },
    isFetching: false,
    refetch: vi.fn(),
  });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice, unconfirmed: null, acknowledge: vi.fn() });
  vi.mocked(useUpdateFeeRate).mockReturnValue({ ...txHook<FeeRateUpdatedEvent | null>(), update: vi.fn() });
  vi.mocked(useUpdateBetLimits).mockReturnValue({ ...txHook<BetLimitsUpdatedEvent | null>(), update: vi.fn() });
  vi.mocked(useWithdrawFees).mockReturnValue({ ...txHook<bigint | null>(), withdraw: vi.fn() });
  return render(<HouseAdminPanel capId={CAP_ID} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('HouseAdminPanel: adopted results that are not of the House', () => {
  it.each([
    ['a claim', { kind: 'adopted', adopted: { action: 'claim', outcome: success(claim) } }],
    ['a refund', { kind: 'adopted', adopted: { action: 'refundStalled', outcome: success(refund) } }],
  ] as [string, TxNotice][])('draws nothing of %s: it is not an action of the House', (_name, notice) => {
    const { container } = renderWith(notice);
    expect(container.querySelector('.tx-status')).toBeNull();
    expect(container).not.toHaveTextContent(/Reclamo|Reembolso|por tiempo/);
  });
});
