import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { useLobby, type LobbyRow, type UseLobbyResult } from '../hooks/useLobby';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import type { Game } from '../sui/game';
import { PaginationStalledError, ReadTimeoutError } from '../sui/readErrors';
import { LobbyList } from './LobbyList';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useLobby', () => ({ useLobby: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));

const CONFIG = { network: 'testnet' } as AppConfig;
const MINE = `0x${'ab'.repeat(32)}`;
const OTHER = `0x${'cd'.repeat(32)}`;
const FLOOR_MS = Date.UTC(2026, 9, 19, 4, 6);
const ROW_MS = Date.UTC(2026, 10, 2, 17, 40);

function game(n: number, creator = OTHER): Game {
  return {
    id: `0x${n.toString(16).padStart(64, '0')}`,
    version: 1n,
    houseId: `0x${'3'.repeat(64)}`,
    creator,
    opponent: null,
    bet: 1_000_000_000n,
    stake: 1_000_000_000n,
    feeRate: 250,
    state: { kind: 'pending' },
  };
}
const row = (g: Game, isMine = false, createdTxDigest = `tx-${g.id.slice(-2)}`): LobbyRow => ({ kind: 'game', game: g, createdTxDigest, isMine });

function lobby(overrides: Partial<UseLobbyResult> = {}): UseLobbyResult {
  return {
    items: [],
    status: { kind: 'ready', refreshing: false },
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetching: false,
    nextPageError: null,
    stalled: false,
    lowerBound: { checkpoint: 59n, kind: 'publish' },
    end: 'bound',
    loadMore: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
}

function renderWith(result: UseLobbyResult) {
  vi.mocked(useLobby).mockReturnValue(result);
  return render(
    <MemoryRouter>
      <LobbyList />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: ROW_MS, status: { kind: 'ready', refreshing: false } });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: FLOOR_MS, status: { kind: 'ready', refreshing: false } });
});

describe('LobbyList: read states', () => {
  it('shows loading', () => {
    renderWith(lobby({ status: { kind: 'loading' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
  });

  it('shows retrying', () => {
    renderWith(lobby({ status: { kind: 'retrying', attempt: 2, max: 3 } }));
    expect(screen.getByRole('status')).toHaveTextContent('Reintentando… (intento 2 de 3)');
  });

  it('shows the error through readErrorMessage with Reintentar wired to refresh', () => {
    const refresh = vi.fn();
    renderWith(lobby({ status: { kind: 'error', error: new ReadTimeoutError(10_000) }, refresh }));
    expect(screen.getByRole('alert')).toHaveTextContent('El nodo no respondió en 10 s');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('LobbyList: empty states', () => {
  it('says there are no open games when the scan reached the publish bound', () => {
    renderWith(lobby());
    expect(screen.getByText('No hay partidas abiertas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buscar más atrás|Cargar más/ })).toBeNull();
  });

  it('says so for the node history with the floor date when bounded by the node floor', () => {
    renderWith(lobby({ lowerBound: { checkpoint: 396_619_024n, kind: 'node_floor' } }));
    expect(screen.getByText(/^No hay partidas abiertas en el historial disponible del nodo \(desde .+\)$/)).toBeInTheDocument();
    expect(useCheckpointTime).toHaveBeenCalledWith(396_619_024n);
  });

  it('drops the date when the floor time does not arrive', () => {
    vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: null, status: { kind: 'error', error: new Error('x') } });
    renderWith(lobby({ end: 'history_pruned', lowerBound: { checkpoint: 1n, kind: 'node_floor' } }));
    expect(screen.getByText('No hay partidas abiertas en el historial disponible del nodo')).toBeInTheDocument();
  });

  it('offers to search further back when nothing was found yet but history remains', () => {
    const loadMore = vi.fn();
    renderWith(lobby({ hasNextPage: true, end: 'more', loadMore }));
    expect(screen.getByText('Sin partidas abiertas en lo revisado')).toBeInTheDocument();
    expect(screen.queryByText('No hay partidas abiertas')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar más atrás' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});

describe('LobbyList: rows', () => {
  it('renders bet, fee, creator, time, mine mark and a link to the detail', () => {
    renderWith(lobby({ items: [row(game(1, MINE), true), row(game(2))] }));
    const [first, second] = screen.getAllByRole('listitem');
    expect(first).toHaveTextContent('1 SUI · comisión 2.5 % · creada por 0xabab…abab (tuya)');
    expect(first).toHaveTextContent('2 nov 2026');
    expect(within(first as HTMLElement).getByRole('link', { name: 'Ver partida' })).toHaveAttribute('href', `/game/${game(1).id}`);
    expect(within(first as HTMLElement).getByTitle(MINE)).toBeInTheDocument();
    expect(second).not.toHaveTextContent('(tuya)');
  });

  it('shows "—" when the creation time is pruned or missing', () => {
    vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'error', error: new Error('pruned') } });
    renderWith(lobby({ items: [row(game(1))] }));
    expect(screen.getByRole('listitem')).toHaveTextContent('—');
  });

  it('keeps an unreadable row between healthy rows, with its id link when known and no amounts', () => {
    const unreadableId = game(7).id;
    renderWith(
      lobby({
        items: [row(game(1)), { kind: 'unreadable', gameId: unreadableId, txDigest: 'tx-u', isMine: false }, { kind: 'unreadable', gameId: null, txDigest: 'tx-v', isMine: false }, row(game(2))],
      }),
    );
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[1]).toHaveTextContent('Partida ilegible');
    expect(items[1]).not.toHaveTextContent('SUI');
    expect(within(items[1] as HTMLElement).getByRole('link')).toHaveAttribute('href', `/game/${unreadableId}`);
    expect(items[2]).toHaveTextContent('Partida ilegible');
    expect(within(items[2] as HTMLElement).queryByRole('link')).toBeNull();
  });

  it('adds the node history note below the rows when bounded by the node floor', () => {
    renderWith(lobby({ items: [row(game(1))], lowerBound: { checkpoint: 1n, kind: 'node_floor' } }));
    expect(screen.getByText(/^Solo se muestra el historial disponible del nodo \(desde .+\)$/)).toBeInTheDocument();
  });

  it('disables Cargar más while the next page loads and shows Cargando más…', () => {
    renderWith(lobby({ items: [row(game(1))], hasNextPage: true, isFetchingNextPage: true }));
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeDisabled();
    expect(screen.getByText('Cargando más…')).toBeInTheDocument();
  });

  it('shows the next page error below the loaded rows', () => {
    renderWith(lobby({ items: [row(game(1))], hasNextPage: true, nextPageError: new ReadTimeoutError(10_000) }));
    expect(screen.getByRole('listitem')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('El nodo no respondió en 10 s');
    expect(screen.getByRole('button', { name: 'Cargar más' })).toBeEnabled();
  });

  it('shows the stalled error and offers only Actualizar (M-2)', () => {
    const refresh = vi.fn();
    renderWith(lobby({ items: [row(game(1))], hasNextPage: false, stalled: true, nextPageError: new PaginationStalledError(), refresh }));
    expect(screen.getByRole('alert')).toHaveTextContent('La búsqueda no avanzó: el nodo repitió la posición. Prueba «Actualizar»');
    expect(screen.queryByRole('button', { name: /Buscar más atrás|Cargar más/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('never claims there are no games when stalled without rows', () => {
    renderWith(lobby({ hasNextPage: false, stalled: true, nextPageError: new PaginationStalledError() }));
    expect(screen.queryByText(/No hay partidas abiertas/)).toBeNull();
  });
});
