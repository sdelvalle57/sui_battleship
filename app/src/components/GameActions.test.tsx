import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import type { TxOutcome, UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useRejectGame } from '../hooks/useRejectGame';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import type { Game, GameState } from '../sui/game';
import { GameActions } from './GameActions';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useCancelGame', () => ({ useCancelGame: vi.fn() }));
vi.mock('../hooks/useRejectGame', () => ({ useRejectGame: vi.fn() }));

const CREATOR = `0x${'a'.repeat(64)}`;
const INVITEE = `0x${'b'.repeat(64)}`;
const OTHER = `0x${'c'.repeat(64)}`;
const ID = `0x${'6'.repeat(64)}`;
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';

function game(opponent: string | null, state: GameState = { kind: 'pending' }): Game {
  return { id: ID, version: 1n, houseId: ID, creator: CREATOR, opponent, bet: 2_000_000n, stake: 2_000_000n, feeRate: 250, state };
}
function txHook(overrides: Partial<UseExecuteTransaction<bigint | null>> = {}) {
  return { stage: 'idle', outcome: null, isBusy: false, execute: vi.fn(), reset: vi.fn(), ...overrides } as UseExecuteTransaction<bigint | null>;
}
const cancel = vi.fn();
const reject = vi.fn();
function setup(address: string | null, opts: { cancel?: Partial<UseExecuteTransaction<bigint | null>>; reject?: Partial<UseExecuteTransaction<bigint | null>> } = {}) {
  vi.mocked(useWalletAccount).mockReturnValue({ address, short: address === null ? null : 'x' });
  vi.mocked(useCancelGame).mockReturnValue({ ...txHook(opts.cancel), cancel });
  vi.mocked(useRejectGame).mockReturnValue({ ...txHook(opts.reject), reject });
}
const success = (value: bigint | null): TxOutcome<bigint | null> => ({ kind: 'success', digest: DIGEST, value, indexed: true, cost: 1n });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('GameActions', () => {
  it('shows no button without account, only the hint for a pending game', () => {
    setup(null);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/Conecta tu wallet para cancelar la partida/)).toBeInTheDocument();
  });

  it('shows no button for another account', () => {
    setup(OTHER);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each([
    ['cancelled', { kind: 'cancelled' }],
    ['resolved', { kind: 'resolved', acceptor: INVITEE, winner: CREATOR }],
  ] as [string, GameState][])('shows no button for the creator or the invitee of a %s game', (_name, state) => {
    setup(CREATOR);
    const { unmount } = render(<GameActions game={game(INVITEE, state)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    setup(INVITEE);
    render(<GameActions game={game(INVITEE, state)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows only Cancelar to the creator and cancels this game', () => {
    setup(CREATOR);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(cancel).toHaveBeenCalledWith(ID);
  });

  it('shows only Rechazar to the invitee and rejects this game', () => {
    setup(INVITEE);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(reject).toHaveBeenCalledWith(ID);
  });

  it('shows no Rechazar on an open game', () => {
    setup(INVITEE);
    render(<GameActions game={game(null)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables the buttons and shows the stage while busy', () => {
    setup(CREATOR, { cancel: { isBusy: true, stage: 'signing' } });
    render(<GameActions game={game(null)} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Esperando la firma en la wallet…');
  });

  it('shows the refund of the cancellation even after the game refreshed to cancelled', () => {
    setup(CREATOR, { cancel: { stage: 'done', outcome: success(10_000_000n) } });
    render(<GameActions game={game(null, { kind: 'cancelled' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Partida cancelada: se devolvieron 0.01 SUI a tu cuenta');
  });

  it('shows the refund of the rejection to the inviter', () => {
    setup(INVITEE, { reject: { stage: 'done', outcome: success(20_000_000n) } });
    render(<GameActions game={game(INVITEE, { kind: 'cancelled' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Invitación rechazada: se devolvieron 0.02 SUI a quien te invitó');
  });

  it('shows the success without amount when the refund could not be read', () => {
    setup(CREATOR, { cancel: { stage: 'done', outcome: success(null) } });
    render(<GameActions game={game(null, { kind: 'cancelled' })} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Partida cancelada');
    expect(status).not.toHaveTextContent('se devolvieron');
  });
});
