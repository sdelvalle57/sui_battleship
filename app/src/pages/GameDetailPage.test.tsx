import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useGame, type UseGameResult } from '../hooks/useGame';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import type { Game } from '../sui/game';
import { GameNotFoundError, NotAGameError, ReadDataError } from '../sui/readErrors';
import { GameDetailPage } from './GameDetailPage';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useGame', () => ({ useGame: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../components/GameActions', () => ({
  GameActions: ({ game }: { game: Game }) => <div data-testid="game-actions">acciones de {game.id}</div>,
}));

const ID = `0x${'6'.repeat(64)}`;
const GAME: Game = {
  id: ID,
  version: 1n,
  houseId: `0x${'3'.repeat(64)}`,
  creator: `0x${'ab'.repeat(32)}`,
  opponent: null,
  bet: 1_000_000_000n,
  stake: 1_000_000_000n,
  feeRate: 250,
  state: { kind: 'pending' },
};
const read = (overrides: Partial<Extract<UseGameResult, { kind: 'read' }>>): UseGameResult => ({
  kind: 'read',
  id: ID,
  game: null,
  previousTransaction: null,
  status: { kind: 'loading' },
  isFetching: true,
  refetch: vi.fn(),
  ...overrides,
});

function renderAt(path: string, result: UseGameResult, state?: unknown) {
  vi.mocked(useGame).mockReturnValue(result);
  render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/game/:id" element={<GameDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
});

describe('GameDetailPage', () => {
  it('shows an invalid id without querying the time', () => {
    renderAt('/game/xyz', { kind: 'invalid_id' });
    expect(useGame).toHaveBeenCalledWith('xyz');
    expect(screen.getByRole('alert')).toHaveTextContent('ID de partida inválido');
    expect(useTransactionTime).toHaveBeenCalledWith(null);
  });

  it.each([
    ['not found', new GameNotFoundError(ID), 'No existe una partida con ese ID en localnet'],
    ['not a game', new NotAGameError(ID, '0x2::coin::Coin<0x2::sui::SUI>'), 'Ese objeto no es una partida de Sui Battleship'],
    ['unreadable data', new ReadDataError('malformed', 'x'), 'El nodo devolvió datos que la app no reconoce'],
  ])('shows the %s error with Reintentar', (_name, error, message) => {
    renderAt(`/game/${ID}`, read({ status: { kind: 'error', error }, isFetching: false }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled();
  });

  it('shows a valid game with the time of its previous transaction as last activity', () => {
    vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: Date.UTC(2026, 10, 2, 17, 40), status: { kind: 'ready', refreshing: false } });
    renderAt(`/game/${ID}`, read({ game: GAME, previousTransaction: 'tx-prev', status: { kind: 'ready', refreshing: false }, isFetching: false }));
    expect(useTransactionTime).toHaveBeenCalledWith('tx-prev');
    expect(screen.getByText('Abierta')).toBeInTheDocument();
    expect(screen.getByText('Última actividad').nextElementSibling).toHaveTextContent('2 nov 2026');
  });

  it('shows the game actions below the detail', () => {
    renderAt(`/game/${ID}`, read({ game: GAME, status: { kind: 'ready', refreshing: false }, isFetching: false }));
    expect(screen.getByTestId('game-actions')).toHaveTextContent(`acciones de ${ID}`);
    expect(screen.queryByText('Partida creada')).not.toBeInTheDocument();
  });

  const DIGEST = '7VXtB8Pc47Jss33zYQRMXJDfLsY7XvdWFX78gzj7q7YH';
  const ready = () => read({ game: GAME, status: { kind: 'ready', refreshing: false }, isFetching: false });

  it('shows the creation notice from the router state with digest and network cost', () => {
    renderAt(`/game/${ID}`, ready(), { created: { digest: DIGEST, costMist: '3941200', invitation: false, feeChanged: null } });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Partida creada');
    expect(notice).toHaveTextContent('Costo de red: 0.0039412 SUI (incluye el depósito de almacenamiento, que no se recupera)');
    expect(screen.getByTitle(DIGEST)).toHaveTextContent('7VXtB8…q7YH');
    expect(notice).not.toHaveTextContent('Comparte el enlace');
  });

  it('adds the share text for an invitation and the stored fee when it changed', () => {
    renderAt(`/game/${ID}`, ready(), { created: { digest: DIGEST, costMist: '1', invitation: true, feeChanged: { from: 250, to: 300 } } });
    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Comparte el enlace de esta página con el invitado; guárdalo para volver a esta partida');
    expect(notice).toHaveTextContent('La partida se creó con comisión 3 % (el formulario mostraba 2.5 %)');
  });

  it('ignores a router state with another shape', () => {
    renderAt(`/game/${ID}`, ready(), { created: { digest: DIGEST, costMist: 1 } });
    expect(screen.queryByText('Partida creada')).not.toBeInTheDocument();
  });

  it('ignores a router state with an invalid digest', () => {
    renderAt(`/game/${ID}`, ready(), { created: { digest: 'not-a-digest', costMist: '1', invitation: false, feeChanged: null } });
    expect(screen.queryByText('Partida creada')).not.toBeInTheDocument();
  });
});
