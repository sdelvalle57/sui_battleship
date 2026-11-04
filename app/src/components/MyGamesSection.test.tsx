import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import type { MyGamesSource } from '../hooks/useMyGames';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import type { Game, GameState } from '../sui/game';
import type { MyGameItem, MyGameRole, MyGamesSection as SectionKey } from '../sui/myGames';
import { PaginationStalledError } from '../sui/readErrors';
import { MyGamesSection } from './MyGamesSection';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));
// Las acciones de la fila se prueban en GameActions.test.tsx y con la máquina real en MyGamesPage.test.tsx.
vi.mock('./GameActions', () => ({
  GameActions: ({ game, variant }: { game: Game; variant?: string }) => (
    <div className="game-actions" data-variant={variant}>
      acciones de {game.id}
    </div>
  ),
}));

const ME = `0x${'ab'.repeat(32)}`;
const OTHER = `0x${'cd'.repeat(32)}`;
const gid = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const FLOOR_MS = Date.UTC(2026, 9, 20, 12, 0, 0);

function game(n: number, { creator = ME, opponent = null, state = { kind: 'pending' } }: { creator?: string; opponent?: string | null; state?: GameState } = {}): Game {
  return {
    id: gid(n),
    version: 1n,
    houseId: gid(99),
    creator,
    opponent,
    bet: 1_000_000n,
    stake: state.kind === 'pending' ? 1_000_000n : 0n,
    feeRate: 250,
    state,
  };
}
const item = (g: Game, role: MyGameRole): MyGameItem => ({ kind: 'game', game: g, objectVersion: 4n, role, txDigest: `tx-${g.id.slice(-2)}`, checkpoint: 100n });
function source(overrides: Partial<MyGamesSource> = {}): MyGamesSource {
  return {
    status: { kind: 'ready', refreshing: false },
    hasData: true,
    refreshRetrying: null,
    refreshError: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    nextPageError: null,
    stalled: false,
    lowerBound: { checkpoint: 59n, kind: 'publish' },
    end: 'bound',
    loadMore: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}
const MORE: Record<SectionKey, string> = { invitations: 'Cargar más invitaciones', pending: 'Cargar más actividad', finished: 'Cargar más actividad' };
function renderSection(section: SectionKey, items: MyGameItem[], src: MyGamesSource = source()) {
  return render(
    <MemoryRouter>
      <MyGamesSection section={section} items={items} source={src} address={ME} moreLabel={MORE[section]} busy={false} />
    </MemoryRouter>,
  );
}
const rows = (container: HTMLElement) => [...container.querySelectorAll('li.my-game-row')];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: FLOOR_MS, status: { kind: 'ready', refreshing: false } });
});

// T5-2
describe('MyGamesSection: rows', () => {
  it('shows an invitation with who invited, bet, state, link and the row actions', () => {
    const { container } = renderSection('invitations', [item(game(1, { creator: OTHER, opponent: ME }), 'invitee')]);
    const section = container.querySelector('section.my-games-section[data-section="invitations"]');
    expect(section).not.toBeNull();
    expect(screen.getByRole('heading', { level: 3, name: 'Invitaciones recibidas' })).toBeInTheDocument();
    const [row] = rows(container);
    expect(row).toHaveAttribute('data-game-id', gid(1));
    expect(row).toHaveTextContent('Te invitó 0xcdcd…cdcd · 0.001 SUI · Pendiente · —');
    expect(within(row as HTMLElement).getByRole('link', { name: 'Ver partida' })).toHaveAttribute('href', `/game/${gid(1)}`);
    expect(row?.querySelector('.game-actions')).toHaveAttribute('data-variant', 'row');
    expect(row?.querySelector('.my-game-result')).toBeNull();
  });

  it('shows own pending games as open or invitation to the opponent, with the row actions', () => {
    const { container } = renderSection('pending', [item(game(1), 'creator'), item(game(2, { opponent: OTHER }), 'creator')]);
    const [open, invite] = rows(container);
    expect(open).toHaveTextContent('Abierta · 0.001 SUI · Pendiente');
    expect(invite).toHaveTextContent('Invitación a 0xcdcd…cdcd · 0.001 SUI · Pendiente');
    expect(container.querySelectorAll('.game-actions[data-variant="row"]')).toHaveLength(2);
  });

  it('shows finished games with the role and the result read from the object, and the cancelled text', () => {
    const { container } = renderSection('finished', [
      item(game(1, { opponent: null, state: { kind: 'resolved', acceptor: OTHER, winner: ME } }), 'creator'),
      item(game(2, { creator: OTHER, state: { kind: 'resolved', acceptor: ME, winner: OTHER } }), 'acceptor'),
      item(game(3, { state: { kind: 'cancelled' } }), 'creator'),
    ]);
    const [won, lost, cancelled] = rows(container);
    expect(won).toHaveTextContent('Creaste · Abierta · 0.001 SUI · Resuelta');
    expect(won?.querySelector('.my-game-result')).toHaveTextContent('Ganaste · pozo 0.002 SUI · al ganador 0.00195 SUI (según la fórmula del contrato)');
    expect(lost).toHaveTextContent('Aceptaste · Aceptaste la de 0xcdcd…cdcd · 0.001 SUI · Resuelta');
    expect(lost?.querySelector('.my-game-result')).toHaveTextContent('Perdiste · pozo 0.002 SUI · al ganador 0.00195 SUI (según la fórmula del contrato)');
    expect(cancelled).toHaveTextContent('Creaste · Abierta · 0.001 SUI · Cancelada');
    expect(cancelled?.querySelector('.my-game-result')).toHaveTextContent('Cancelada: la apuesta volvió a quien la creó');
    expect(container.querySelector('.game-actions')).toBeNull();
  });

  it('shows unreadable rows as such, with a link and data-game-id only when the game id is known', () => {
    const { container } = renderSection('finished', [
      { kind: 'unreadable', gameId: gid(5), role: 'creator', txDigest: 'tx-a', checkpoint: 10n },
      { kind: 'unreadable', gameId: null, role: null, txDigest: 'tx-b', checkpoint: 9n },
    ]);
    const [known, unknown] = rows(container);
    expect(known).toHaveTextContent('Partida ilegible');
    expect(known).toHaveAttribute('data-game-id', gid(5));
    expect(within(known as HTMLElement).getByRole('link')).toHaveAttribute('href', `/game/${gid(5)}`);
    expect(unknown).toHaveTextContent('Partida ilegible');
    expect(unknown).not.toHaveAttribute('data-game-id');
  });
});

// T5-5, T5-6 (H-1, DL-16)
describe('MyGamesSection: honest footer', () => {
  it.each([
    ['invitations', 'Sin invitaciones pendientes en lo revisado', 'Buscar más atrás', 'No tienes invitaciones pendientes'],
    ['pending', 'Sin partidas pendientes en lo revisado', 'Cargar más actividad', 'No tienes partidas pendientes'],
    ['finished', 'Sin partidas terminadas en lo revisado', 'Cargar más actividad', 'Todavía no hay partidas terminadas'],
  ] as [SectionKey, string, string, string][])('%s: reviewed text and button with more pages; definitive without', (section, reviewed, button, definitive) => {
    const loadMore = vi.fn();
    const first = renderSection(section, [], source({ hasNextPage: true, loadMore }));
    expect(screen.getByText(reviewed)).toBeInTheDocument();
    expect(screen.queryByText(definitive)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(loadMore).toHaveBeenCalledTimes(1);
    first.unmount();
    renderSection(section, []);
    expect(screen.getByText(definitive)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('labels the invitations button "Cargar más invitaciones" with rows', () => {
    renderSection('invitations', [item(game(1, { creator: OTHER, opponent: ME }), 'invitee')], source({ hasNextPage: true }));
    expect(screen.getByRole('button', { name: 'Cargar más invitaciones' })).toBeInTheDocument();
  });

  it('adds the node floor suffix to the empty text, and the note with rows', () => {
    const floor = source({ lowerBound: { checkpoint: 17_000n, kind: 'node_floor' } });
    const empty = renderSection('pending', [], floor);
    expect(screen.getByText(/^No tienes partidas pendientes en el historial disponible del nodo \(desde .+\)$/)).toBeInTheDocument();
    empty.unmount();
    renderSection('pending', [item(game(1), 'creator')], source({ end: 'history_pruned' }));
    expect(screen.getByText(/^Solo se muestra el historial disponible del nodo \(desde .+\)$/)).toBeInTheDocument();
  });

  it('T5-6: a load-more error without stalled keeps the button (retry) with the alert and no definitive text', () => {
    const loadMore = vi.fn();
    renderSection('pending', [], source({ hasNextPage: true, nextPageError: new Error('boom'), loadMore }));
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
    expect(screen.queryByText('No tienes partidas pendientes')).not.toBeInTheDocument();
    expect(screen.getByText('Sin partidas pendientes en lo revisado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más actividad' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('T5-6: stalled hides the button and keeps the alert, without the definitive text', () => {
    renderSection('pending', [], source({ hasNextPage: false, stalled: true, nextPageError: new PaginationStalledError() }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('No tienes partidas pendientes')).not.toBeInTheDocument();
    expect(screen.getByText('Sin partidas pendientes en lo revisado')).toBeInTheDocument();
  });

  it('disables the button and shows "Cargando más…" while loading the next page', () => {
    renderSection('finished', [], source({ hasNextPage: true, isFetchingNextPage: true }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando más…');
    expect(screen.getByRole('button', { name: 'Cargar más actividad' })).toBeDisabled();
  });
});

// DL-17 (la integración con la relectura real está en MyGamesPage.test.tsx, T5-7)
describe('MyGamesSection: first load and refetch notes', () => {
  it('shows the first-load state without data, with a retry on error', () => {
    const retry = vi.fn();
    const loading = renderSection('pending', [], source({ hasData: false, status: { kind: 'loading' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    loading.unmount();
    renderSection('pending', [], source({ hasData: false, status: { kind: 'error', error: new Error('down') }, retry }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/No tienes partidas/)).not.toBeInTheDocument();
  });

  it('keeps the rows with the retrying note, and with the refetch error note and its retry', () => {
    const retry = vi.fn();
    const rowsOf = [item(game(1), 'creator')];
    const retrying = renderSection('pending', rowsOf, source({ refreshRetrying: { attempt: 2, max: 3 } }));
    expect(screen.getByRole('status')).toHaveTextContent('Reintentando… (intento 2 de 3)');
    expect(rows(retrying.container)).toHaveLength(1);
    retrying.unmount();
    const failed = renderSection('pending', rowsOf, source({ refreshError: new Error('down'), retry }));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo actualizar la lista: down; los datos pueden estar desactualizados');
    expect(rows(failed.container)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
