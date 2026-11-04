import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcceptGame } from '../hooks/useAcceptGame';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import type { UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useRejectGame } from '../hooks/useRejectGame';
import { useSuiBalance } from '../hooks/useSuiBalance';
import type { AdoptedTx, TxResult, TxView } from '../hooks/txSession';
import { useTxTarget, type TxTargetState } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { ACCEPT_GAS_RESERVE_MIST } from '../sui/acceptGame';
import type { AppConfig } from '../sui/config';
import { RUNTIME_CANCELLED_MESSAGES } from '../sui/errors';
import type { GameResolvedEvent } from '../sui/events';
import type { Game, GameState } from '../sui/game';
import { NOT_INVITED_HINT } from '../sui/gameActions';
import { GameActions } from './GameActions';
import { IN_FLIGHT_TEXT } from './txNotice';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useCancelGame', () => ({ useCancelGame: vi.fn() }));
vi.mock('../hooks/useRejectGame', () => ({ useRejectGame: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useAcceptGame', () => ({ useAcceptGame: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));

const CREATOR = `0x${'a'.repeat(64)}`;
const INVITEE = `0x${'b'.repeat(64)}`;
const OTHER = `0x${'c'.repeat(64)}`;
const ID = `0x${'6'.repeat(64)}`;
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';

function game(opponent: string | null, state: GameState = { kind: 'pending' }): Game {
  return { id: ID, version: 1n, houseId: ID, creator: CREATOR, opponent, bet: 2_000_000n, stake: 2_000_000n, feeRate: 250, state };
}
function txHook(overrides: Partial<UseExecuteTransaction<bigint | null>> = {}) {
  return { stage: 'idle', outcome: null, execute: vi.fn(), ...overrides } as UseExecuteTransaction<bigint | null>;
}
const cancel = vi.fn();
const reject = vi.fn();
const accept = vi.fn();
const acknowledge = vi.fn();
type Balance = ReturnType<typeof useSuiBalance>;
const BALANCE_OK: Balance = { balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() };
const VIEW: TxView = { target: { kind: 'game', gameId: ID }, viewId: 1, key: ['tx', 'game', ID], accountKey: ['tx'], targetHash: '' };
function setup(
  address: string | null,
  opts: {
    cancel?: Partial<UseExecuteTransaction<bigint | null>>;
    reject?: Partial<UseExecuteTransaction<bigint | null>>;
    target?: Partial<TxTargetState<TxView['target']>>;
    accept?: Partial<UseExecuteTransaction<GameResolvedEvent | null>>;
    balance?: Partial<Balance>;
  } = {},
) {
  vi.mocked(useWalletAccount).mockReturnValue({ address, short: address === null ? null : 'x' });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge, ...opts.target });
  vi.mocked(useCancelGame).mockReturnValue({ ...txHook(opts.cancel), cancel });
  vi.mocked(useRejectGame).mockReturnValue({ ...txHook(opts.reject), reject });
  vi.mocked(useAcceptGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), accept, ...opts.accept });
  vi.mocked(useSuiBalance).mockReturnValue({ ...BALANCE_OK, ...opts.balance });
}
const success = (value: bigint | null): TxResult<bigint | null> => ({ kind: 'success', digest: DIGEST, value, indexed: true, cost: 1n });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('GameActions', () => {
  it('shows no button without account, only the hint for a pending game', () => {
    setup(null);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron')).toBeInTheDocument();
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
    expect(cancel).toHaveBeenCalledWith();
    expect(useTxTarget).toHaveBeenCalledWith({ kind: 'game', gameId: ID });
  });

  it('shows Rechazar (and not Cancelar) to the invitee and rejects this game', () => {
    setup(INVITEE);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(reject).toHaveBeenCalledWith();
    expect(useTxTarget).toHaveBeenCalledWith({ kind: 'game', gameId: ID });
  });

  it('shows no Rechazar on an open game', () => {
    setup(INVITEE);
    render(<GameActions game={game(null)} />);
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    // N-1: quien no es el creador ve solo "Aceptar" en una partida abierta (antes de #12, ningún botón).
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Aceptar']);
  });

  it('disables the buttons and shows the stage while busy', () => {
    setup(CREATOR, { cancel: { stage: 'signing' }, target: { busy: true } });
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

const BET_TEXT = 'Apuestas 0.002 SUI, igual que el creador. El ganador se sortea on-chain al ejecutarse la transacción (50 % cada uno) y pagas su gas.';
const PREVIEW_TEXT =
  'Si tu wallet muestra una vista previa con un ganador o un cambio de saldo, es una simulación: el sorteo real ocurre cuando la red ejecuta la transacción.';
const INSUFFICIENT_TEXT = 'Saldo insuficiente: necesitas 0.002 SUI de apuesta más ≈ 0.01 SUI de reserva para el gas';
const UNKNOWN_TEXT = 'No se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al firmar)';
const acceptButton = () => screen.queryByRole('button', { name: 'Aceptar' });
const upper = (address: string) => address.toUpperCase().replace('0X', '0x');
function resolved(winner: string): GameResolvedEvent {
  return { gameId: ID, creator: CREATOR, acceptor: OTHER, winner, pot: 4_000_000n, fee: 100_000n, payout: 3_900_000n, transactionDigest: DIGEST };
}
const accepted = (value: GameResolvedEvent | null): TxResult<GameResolvedEvent | null> => ({ kind: 'success', digest: DIGEST, value, indexed: true, cost: 2_474_847n });

describe('GameActions: Aceptar', () => {
  it('T4-2: without account, a pending game shows the new hint and no button; a cancelled or resolved one shows nothing', () => {
    setup(null);
    const { unmount } = render(<GameActions game={game(null)} />);
    expect(screen.getByText(/^Conecta tu wallet para aceptar la partida/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    unmount();
    for (const state of [{ kind: 'cancelled' }, { kind: 'resolved', acceptor: OTHER, winner: CREATOR }] as GameState[]) {
      const view = render(<GameActions game={game(null, state)} />);
      expect(screen.queryByText(/Conecta tu wallet/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it('T4-3: the creator sees Cancelar and no Aceptar', () => {
    setup(CREATOR);
    render(<GameActions game={game(null)} />);
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('T4-3: another account on an open game sees Aceptar with the bet and the two notes, and accepts', () => {
    setup(OTHER);
    render(<GameActions game={game(null)} />);
    expect(screen.getByText(BET_TEXT)).toBeInTheDocument();
    expect(screen.getByText(PREVIEW_TEXT)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(accept).toHaveBeenCalledWith();
    expect(useAcceptGame).toHaveBeenCalledWith(VIEW, expect.objectContaining({ id: ID, bet: 2_000_000n }));
  });

  it('T4-3: the invitee sees Aceptar and Rechazar; a third account on the invitation sees the hint and no Aceptar', () => {
    setup(INVITEE);
    const { unmount } = render(<GameActions game={game(INVITEE)} />);
    expect(acceptButton()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    unmount();
    setup(OTHER);
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.getByText(NOT_INVITED_HINT)).toBeInTheDocument();
    expect(acceptButton()).not.toBeInTheDocument();
  });

  it('T4-4: insufficient balance disables Aceptar with the reserve text', () => {
    setup(OTHER, { balance: { balance: 2_000_000n + ACCEPT_GAS_RESERVE_MIST - 1n } });
    render(<GameActions game={game(null)} />);
    expect(acceptButton()).toBeDisabled();
    expect(screen.getByText(INSUFFICIENT_TEXT)).toBeInTheDocument();
  });

  it('T4-4: an unread balance keeps Aceptar enabled with its notice; an enough balance shows no notice', () => {
    setup(OTHER, { balance: { balance: null, status: { kind: 'error', error: new Error('down') } } });
    const { unmount } = render(<GameActions game={game(null)} />);
    expect(acceptButton()).toBeEnabled();
    expect(screen.getByText(UNKNOWN_TEXT)).toBeInTheDocument();
    unmount();
    setup(OTHER, { balance: { balance: 2_000_000n + ACCEPT_GAS_RESERVE_MIST } });
    render(<GameActions game={game(null)} />);
    expect(acceptButton()).toBeEnabled();
    expect(screen.queryByText(INSUFFICIENT_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(UNKNOWN_TEXT)).not.toBeInTheDocument();
  });

  it.each(['preflight', 'signing', 'confirming', 'indexing'] as const)(
    'T4-5 (SEG-10): during %s there is no result token anywhere in the actions',
    (stage) => {
      setup(OTHER, { accept: { stage, outcome: null }, target: { busy: true } });
      const { container } = render(<GameActions game={game(null)} />);
      expect(screen.getByRole('status')).toHaveClass('tx-status');
      const text = [...container.querySelectorAll('.tx-status, .game-actions')].map((el) => el.textContent).join(' ');
      for (const token of ['Ganaste', 'Perdiste', 'Recibiste', 'ganó quien', 'Resultado para ti']) expect(text).not.toContain(token);
    },
  );

  it('T4-6: a won acceptance says how much was received, with digest and cost (address in another format)', () => {
    setup(upper(OTHER), { accept: { stage: 'done', outcome: accepted(resolved(OTHER)) } });
    render(<GameActions game={game(null, { kind: 'resolved', acceptor: OTHER, winner: OTHER })} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('¡Ganaste! Recibiste 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)');
    expect(status).toHaveTextContent('Costo de red: 0.002474847 SUI');
    expect(screen.getByTitle(DIGEST)).toBeInTheDocument();
  });

  it('T4-6: a lost acceptance says the creator won, with digest and cost', () => {
    setup(OTHER, { accept: { stage: 'done', outcome: accepted(resolved(upper(CREATOR))) } });
    render(<GameActions game={game(null, { kind: 'resolved', acceptor: OTHER, winner: CREATOR })} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Perdiste: ganó quien creó la partida y recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)');
    expect(status).toHaveTextContent('Costo de red: 0.002474847 SUI');
    expect(screen.getByTitle(DIGEST)).toBeInTheDocument();
  });

  it('T4-6: an acceptance whose result could not be read says so, with digest and cost', () => {
    setup(OTHER, { accept: { stage: 'done', outcome: accepted(null) } });
    render(<GameActions game={game(null, { kind: 'resolved', acceptor: OTHER, winner: CREATOR })} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador');
    expect(status).toHaveTextContent('Costo de red: 0.002474847 SUI');
    expect(screen.getByTitle(DIGEST)).toBeInTheDocument();
  });

  it.each([
    ['game/4', 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)'],
    ['a runtime cancellation (DL-11)', RUNTIME_CANCELLED_MESSAGES.randomness],
  ])('T4-7: shows the failure of an acceptance with %s', (_name, message) => {
    setup(OTHER, { accept: { stage: 'done', outcome: { kind: 'failure', message, digest: null, cost: null } } });
    render(<GameActions game={game(null)} />);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('T4-8: with a transaction of the account in flight, Aceptar, Rechazar and Cancelar are disabled with the in_flight text', () => {
    setup(INVITEE, { target: { busy: true, notice: { kind: 'in_flight' } } });
    const { unmount } = render(<GameActions game={game(INVITEE)} />);
    expect(acceptButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    expect(screen.getByText(IN_FLIGHT_TEXT)).toBeInTheDocument();
    unmount();
    setup(CREATOR, { target: { busy: true, notice: { kind: 'in_flight' } } });
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByText(IN_FLIGHT_TEXT)).toBeInTheDocument();
  });

  it('T4-9: an unconfirmed transaction shows one alert, disables Aceptar and "Ya la revisé" acknowledges it', () => {
    setup(OTHER, { target: { unconfirmed: { digest: DIGEST } } });
    render(<GameActions game={game(null)} />);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    expect(acceptButton()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé' }));
    expect(acknowledge).toHaveBeenCalled();
  });

  it.each([
    [{ action: 'accept', outcome: accepted(resolved(OTHER)) }, '¡Ganaste! Recibiste 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)'],
    [{ action: 'cancel', outcome: success(2_000_000n) }, 'Partida cancelada: se devolvieron 0.002 SUI a tu cuenta'],
  ] as [AdoptedTx, string][])('T4-10: an adopted %o shows the text of its action', (adopted, text) => {
    setup(OTHER, { target: { notice: { kind: 'adopted', adopted } } });
    render(<GameActions game={game(null, { kind: 'resolved', acceptor: OTHER, winner: OTHER })} />);
    expect(screen.getByRole('status')).toHaveTextContent(text);
  });
});

describe("GameActions variant='row' (DL-6, H-3 of #13)", () => {
  it('shows neither the connect hint nor the in_flight text in a row, and keeps both in the detail', () => {
    setup(null);
    const { unmount } = render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(screen.queryByText(/Conecta tu wallet/)).not.toBeInTheDocument();
    unmount();
    setup(INVITEE, { target: { busy: true, notice: { kind: 'in_flight' } } });
    const row = render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(screen.queryByText(IN_FLIGHT_TEXT)).not.toBeInTheDocument();
    expect(acceptButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled();
    row.unmount();
    render(<GameActions game={game(INVITEE)} />);
    expect(screen.getByText(IN_FLIGHT_TEXT)).toBeInTheDocument();
  });

  it('T5-10: hides Aceptar and Rechazar after an own accept success while the read game is still pending; the detail keeps them', () => {
    setup(INVITEE, { accept: { stage: 'done', outcome: accepted(resolved(INVITEE)) } });
    const row = render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('¡Ganaste! Recibiste 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)');
    row.unmount();
    render(<GameActions game={game(INVITEE)} />);
    expect(acceptButton()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('¡Ganaste!');
  });

  it('hides Cancelar in a row after an own cancel success, and every action after an adopted success', () => {
    setup(CREATOR, { cancel: { stage: 'done', outcome: success(2_000_000n) } });
    const own = render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Partida cancelada: se devolvieron 0.002 SUI a tu cuenta');
    own.unmount();
    setup(INVITEE, { target: { notice: { kind: 'adopted', adopted: { action: 'reject', outcome: success(2_000_000n) } } } });
    render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(acceptButton()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Invitación rechazada: se devolvieron 0.002 SUI a quien te invitó');
  });

  it('keeps the actions in a row after a failure, and the unconfirmed alert with "Ya la revisé"', () => {
    setup(INVITEE, { accept: { stage: 'done', outcome: { kind: 'failure', message: 'boom', digest: null, cost: null } } });
    const failed = render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(acceptButton()).toBeEnabled();
    failed.unmount();
    setup(INVITEE, { target: { unconfirmed: { digest: DIGEST } } });
    render(<GameActions game={game(INVITEE)} variant="row" />);
    expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    expect(acceptButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ya la revisé' })).toBeInTheDocument();
  });
});
