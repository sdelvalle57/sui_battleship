import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCreateGame, type CreateGameValue } from '../hooks/useCreateGame';
import type { TxOutcome, UseExecuteTransaction } from '../hooks/useExecuteTransaction';
import { useHouse } from '../hooks/useHouse';
import { useSuiBalance } from '../hooks/useSuiBalance';
import type { TxView } from '../hooks/txSession';
import { useTxTarget, type TxTargetState } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import type { House } from '../sui/house';
import { CreateGameForm } from './CreateGameForm';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../hooks/useCreateGame', () => ({ useCreateGame: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));

const ACCOUNT = `0x${'a'.repeat(64)}`;
const FRIEND = `0x${'0'.repeat(63)}b`;
const GAME_ID = `0x${'6'.repeat(64)}`;
const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
const HOUSE: House = { id: `0x${'3'.repeat(64)}`, version: 1n, feeRate: 250, feesCollected: 0n, minBet: 1_000_000n, maxBet: 50_000_000_000n };
const READY = { kind: 'ready', refreshing: false } as const;

const create = vi.fn();
const acknowledge = vi.fn();
const refetchHouse = vi.fn();
const VIEW: TxView = { target: { kind: 'create' }, viewId: 1, key: ['tx', 'create'], accountKey: ['tx'], targetHash: '["tx","create"]' };
type SetupOptions = {
  account?: string | null;
  house?: House | null;
  houseStatus?: ReturnType<typeof useHouse>['status'];
  balance?: bigint | null;
  balanceStatus?: ReturnType<typeof useSuiBalance>['status'];
  tx?: Partial<UseExecuteTransaction<CreateGameValue>>;
  target?: Partial<TxTargetState<TxView['target']>>;
};
function setup({
  account = ACCOUNT,
  house = HOUSE,
  houseStatus = READY,
  balance = 10n ** 12n,
  balanceStatus = READY,
  tx = {},
  target = {},
}: SetupOptions = {}) {
  vi.mocked(useWalletAccount).mockReturnValue({ address: account, short: account === null ? null : 'x' });
  vi.mocked(useHouse).mockReturnValue({ house, status: houseStatus, isFetching: false, refetch: refetchHouse });
  vi.mocked(useSuiBalance).mockReturnValue({ balance, status: balanceStatus, isFetching: false, refetch: vi.fn() });
  vi.mocked(useCreateGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), create, ...tx });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge, ...target });
}

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{`${location.pathname} ${JSON.stringify(location.state)}`}</p>;
}
function renderForm() {
  const router = createMemoryRouter(
    [
      { path: '/', element: <CreateGameForm /> },
      { path: '/game/:id', element: <LocationProbe /> },
    ],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}
const amount = () => screen.getByLabelText(/Apuesta \(SUI\)/);
const opponent = () => screen.getByLabelText(/Invitar a/);
const submit = () => screen.getByRole('button', { name: 'Crear partida' });
const type = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('CreateGameForm', () => {
  it('is disabled with "Conecta tu wallet para crear una partida" without account, and reads nothing', () => {
    setup({ account: null });
    renderForm();
    expect(screen.getByRole('status')).toHaveTextContent('Conecta tu wallet para crear una partida');
    expect(amount()).toBeDisabled();
    expect(submit()).toBeDisabled();
    expect(useHouse).not.toHaveBeenCalled();
    expect(useCreateGame).not.toHaveBeenCalled();
  });

  it('shows the House loading state', () => {
    setup({ house: null, houseStatus: { kind: 'loading' } });
    renderForm();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(screen.queryByRole('button', { name: 'Crear partida' })).not.toBeInTheDocument();
  });

  it('shows the House error with Reintentar', () => {
    setup({ house: null, houseStatus: { kind: 'error', error: new Error('down') } });
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchHouse).toHaveBeenCalled();
  });

  it('shows the limits, the fee, the balance and the storage note from the House', () => {
    setup({ balance: 2_000_000_000n });
    renderForm();
    expect(screen.getByText('Mínimo 0.001 SUI · máximo 50 SUI')).toBeInTheDocument();
    expect(screen.getByText('Comisión 2.5 % (la partida guarda esta comisión)')).toBeInTheDocument();
    expect(screen.getByText('Saldo: 2 SUI')).toBeInTheDocument();
    expect(
      screen.getByText(/Además del gas, crear la partida deja un depósito de almacenamiento \(≈ 0.0019532 SUI abierta, ≈ 0.0021964 SUI con invitación, al precio actual de testnet\) que no se recupera/),
    ).toHaveTextContent('reserva para el gas');
    expect(submit()).toBeDisabled();
  });

  it.each([
    ['0.0009', 'La apuesta mínima es 0.001 SUI'],
    ['51', 'La apuesta máxima es 50 SUI'],
    ['abc', 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles'],
    ['-1', 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles'],
    ['1,000', 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles'],
    ['0.0000000001', 'Como máximo 9 decimales'],
  ])('shows the amount error for %s', (value, text) => {
    setup();
    renderForm();
    type(amount(), value);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('asks for the amount after clearing it', () => {
    setup();
    renderForm();
    expect(screen.queryByText('Escribe la apuesta en SUI')).not.toBeInTheDocument();
    type(amount(), '1');
    type(amount(), '');
    expect(screen.getByText('Escribe la apuesta en SUI')).toBeInTheDocument();
  });

  it('shows insufficient balance with the gas reserve', () => {
    setup({ balance: 1_000_000n });
    renderForm();
    type(amount(), '0.001');
    expect(screen.getByText('Saldo insuficiente: necesitas la apuesta más ≈ 0.01 SUI para el gas')).toBeInTheDocument();
  });

  it.each([
    ['0xzz', 'Dirección inválida'],
    [ACCOUNT.toUpperCase().replace('0X', '0x'), 'No puedes invitarte a ti mismo'],
  ])('shows the invitation error for %s', (value, text) => {
    setup();
    renderForm();
    type(amount(), '1');
    type(opponent(), value);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('warns about an unknown balance but still lets a valid form submit', () => {
    setup({ balance: null, balanceStatus: { kind: 'error', error: new Error('down') } });
    renderForm();
    type(amount(), '1');
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo leer tu saldo');
    expect(submit()).toBeEnabled();
  });

  it('shows the estimate with the House fee', () => {
    setup();
    renderForm();
    type(amount(), '1');
    expect(screen.getByText('Si alguien acepta: pozo 2 SUI · comisión 0.05 SUI · al ganador 1.95 SUI')).toBeInTheDocument();
  });

  it('submits with the House terms being shown and the normalized invitation', () => {
    setup();
    renderForm();
    type(amount(), '1');
    type(opponent(), ' 0xB ');
    fireEvent.click(submit());
    expect(create).toHaveBeenCalledWith({
      bet: 1_000_000_000n,
      opponent: FRIEND,
      shown: { feeRate: 250, minBet: 1_000_000n, maxBet: 50_000_000_000n },
    });
  });

  it('disables the button and shows the stage while busy', () => {
    setup({ tx: { stage: 'confirming' }, target: { busy: true } });
    renderForm();
    type(amount(), '1');
    expect(submit()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Confirmando en la red…');
  });

  it('navigates to the created game with the notice in the router state', () => {
    const outcome: TxOutcome<CreateGameValue> = {
      kind: 'success',
      digest: DIGEST,
      indexed: true,
      cost: 3_941_200n,
      value: {
        created: { gameId: GAME_ID, creator: ACCOUNT, opponent: FRIEND, bet: 1n, feeRate: 250, transactionDigest: DIGEST },
        feeChanged: { from: 300, to: 250 },
      },
    };
    setup({ tx: { stage: 'done', outcome } });
    renderForm();
    expect(screen.getByTestId('location')).toHaveTextContent(
      `/game/${GAME_ID} {"created":{"digest":"${DIGEST}","invitation":true,"feeChanged":{"from":300,"to":250},"costMist":"3941200"}}`,
    );
  });

  it.each([
    ['value null', null],
    ['created null', { created: null, feeChanged: null }],
  ])('stays on the form with "Partida creada" and the digest when the game is not identified (%s)', (_name, value) => {
    setup({ tx: { stage: 'done', outcome: { kind: 'success', digest: DIGEST, indexed: true, cost: 1n, value } } });
    renderForm();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Partida creada');
    expect(status).toHaveTextContent('No se pudo identificar la partida creada');
    expect(screen.getByTitle(DIGEST)).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('blocks "Crear partida" after an unconfirmed transaction until the user says it was reviewed', () => {
    setup({ tx: { stage: 'done', outcome: null }, target: { unconfirmed: { digest: DIGEST } } });
    renderForm();
    type(amount(), '1');
    expect(screen.getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    expect(submit()).toBeDisabled();
    fireEvent.submit(submit());
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ya la revisé: crear otra partida' }));
    expect(acknowledge).toHaveBeenCalled();
  });

  it('shows a failure of the transaction', () => {
    setup({ tx: { stage: 'done', outcome: { kind: 'failure', message: 'La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar', digest: null, cost: null } } });
    renderForm();
    expect(screen.getByRole('alert')).toHaveTextContent('La comisión cambió de 2.5 % a 3 %; revisa y vuelve a confirmar');
  });
});
