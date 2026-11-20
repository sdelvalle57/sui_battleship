import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListedRow } from '../hooks/gameRow';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { catalogOf, useGameCatalog } from '../hooks/useGameCatalog';
import { useLobby, type UseLobbyResult } from '../hooks/useLobby';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import { shortAddress } from '../sui/format';
import { buildGameRegistry } from '../sui/gameRegistry';
import { CREATOR, duelRow } from '../test/duelRows';
import { LobbyList } from './LobbyList';

// UX-7 y UX-14 (#73, TASK-8b): el lobby con las dos fuentes (filtro por juego, rótulo "anterior"/"nueva", control de tiempo) y
// el mismo lobby de siempre con una sola fuente.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useLobby', () => ({ useLobby: vi.fn() }));
vi.mock('../hooks/useGameCatalog', async (importOriginal) => ({ ...(await importOriginal<typeof import('../hooks/useGameCatalog')>()), useGameCatalog: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));

const ORIGINAL = `0x${'1'.repeat(64)}`;
const UPGRADE = `0x${'2'.repeat(64)}`;
const TYPE_NAMES = [
  ['game', 'Game'],
  ['game', 'GameCreated'],
  ['game', 'GameCancelled'],
  ['game', 'GameResolved'],
  ['duel', 'Duel'],
  ['duel', 'DuelCreated'],
  ['duel', 'DuelCancelled'],
  ['duel', 'DuelActivated'],
  ['duel', 'DuelTurn'],
  ['duel', 'DuelResolved'],
  ['duel', 'DuelTimedOut'],
  ['duel', 'DuelExpired'],
  ['coinflip', 'Coinflip'],
] as const;
const TYPE_ORIGINS = TYPE_NAMES.map(([module, name]) => ({ module, name, definingId: module === 'game' ? ORIGINAL : UPGRADE }));
const BOTH = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: [{ packageId: UPGRADE }], typeOrigins: TYPE_ORIGINS }));
const LEGACY_ONLY = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL }));

const id = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const legacyItem = (n: number): ListedRow => ({
  kind: 'game',
  row: { ...duelRow({ kind: 'pending' }, { id: id(n) }), source: 'legacy', control: null },
  role: null,
  txDigest: `tx-${String(n)}`,
});
const duelItem = (n: number, mine = false): ListedRow => ({
  kind: 'game',
  row: duelRow({ kind: 'pending' }, { id: id(n), control: { id: 0, turnMs: 0n, label: 'sin reloj' } }),
  role: mine ? 'creator' : null,
  txDigest: `tx-${String(n)}`,
});
const clockItem = (n: number): ListedRow => ({ kind: 'game', row: duelRow({ kind: 'pending' }, { id: id(n) }), role: null, txDigest: `tx-${String(n)}` });

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
function renderLobby(result: UseLobbyResult, catalog = BOTH) {
  vi.mocked(useLobby).mockReturnValue(result);
  vi.mocked(useGameCatalog).mockReturnValue(catalog);
  return render(
    <MemoryRouter>
      <LobbyList />
    </MemoryRouter>,
  );
}
const select = () => screen.getByLabelText('Juego');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'testnet' } as AppConfig);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
});

describe('LobbyList with both sources: filter, labels and time control (UX-14)', () => {
  it('UX-14: the filter is a labeled select, "Todos" by default, with every game of the registry and the visible count', () => {
    renderLobby(lobby({ items: [legacyItem(1), duelItem(2), clockItem(3)] }));
    expect(select()).toHaveDisplayValue('Todos');
    expect(within(select()).getAllByRole('option').map((option) => option.textContent)).toEqual(['Todos', 'Coinflip']);
    expect(screen.getByText('3 partidas')).toBeInTheDocument();
    expect(useLobby).toHaveBeenLastCalledWith('all');
  });

  it('UX-14: the count is singular for one game and says there may be more when more pages can be loaded', () => {
    const first = renderLobby(lobby({ items: [duelItem(1)] }));
    expect(screen.getByText('1 partida')).toBeInTheDocument();
    first.unmount();
    renderLobby(lobby({ items: [duelItem(1), duelItem(2)], hasNextPage: true }));
    expect(screen.getByText('2 partidas; puede haber más')).toBeInTheDocument();
  });

  it('UX-14: an unreadable row is not counted as a game', () => {
    renderLobby(lobby({ items: [duelItem(1), { kind: 'unreadable', gameId: id(9), role: null, txDigest: 'tx-9' }] }));
    expect(screen.getByText('1 partida')).toBeInTheDocument();
  });

  it('UX-14: each row says as TEXT which source it is ("anterior"/"nueva") and its time control', () => {
    renderLobby(lobby({ items: [legacyItem(1), duelItem(2), clockItem(3)] }));
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('anterior · sin reloj');
    expect(rows[1]).toHaveTextContent('nueva · sin reloj');
    expect(rows[2]).toHaveTextContent('nueva · 10 min por jugada');
    expect(rows[2]?.querySelector('.duel-control')).toHaveTextContent('10 min por jugada');
    expect(rows[0]?.querySelector('.duel-source')).toHaveTextContent('anterior');
  });

  it('UX-14: choosing a game asks the lobby for that game and choosing "Todos" goes back to all of them', () => {
    renderLobby(lobby({ items: [duelItem(1)] }));
    fireEvent.change(select(), { target: { value: 'coinflip' } });
    expect(useLobby).toHaveBeenLastCalledWith('coinflip');
    expect(select()).toHaveDisplayValue('Coinflip');
    fireEvent.change(select(), { target: { value: 'all' } });
    expect(useLobby).toHaveBeenLastCalledWith('all');
    fireEvent.change(select(), { target: { value: 'otro-juego' } });
    expect(useLobby).toHaveBeenLastCalledWith('all');
  });

  it('UX-10: the filter comes before the list in the DOM, so the tab order is the reading order', () => {
    renderLobby(lobby({ items: [duelItem(1)] }));
    const focusable = [...document.querySelectorAll('button, select, a')].map((element) => `${element.tagName}:${element.textContent}`);
    expect(focusable[0]).toBe('BUTTON:Actualizar');
    expect(focusable[1]).toMatch(/^SELECT:/);
    expect(focusable.at(-1)).toBe('A:Ver partida');
    for (const element of document.querySelectorAll('[tabindex]')) expect(Number(element.getAttribute('tabindex'))).toBeLessThanOrEqual(0);
  });

  it('UX-10: the list is a semantic list and the headings do not skip levels', () => {
    renderLobby(lobby({ items: [duelItem(1), duelItem(2)] }));
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Partidas abiertas' })).toBeInTheDocument();
  });
});

describe('LobbyList: every state of the view (UX-7)', () => {
  it('UX-7: an empty lobby filtered by a game says which game, and differs from the global empty one', () => {
    renderLobby(lobby({ items: [] }));
    expect(screen.getByText('No hay partidas abiertas')).toBeInTheDocument();
    fireEvent.change(select(), { target: { value: 'coinflip' } });
    expect(screen.getByText('No hay partidas abiertas de Coinflip')).toBeInTheDocument();
    expect(screen.queryByText('No hay partidas abiertas')).not.toBeInTheDocument();
  });

  it('UX-7: the empty lobby of a game keeps saying it is the history the node has, when the bound is the node floor', () => {
    renderLobby(lobby({ items: [], lowerBound: { checkpoint: 70n, kind: 'node_floor' } }));
    fireEvent.change(select(), { target: { value: 'coinflip' } });
    expect(screen.getByText(/^No hay partidas abiertas de Coinflip en el historial disponible del nodo/)).toBeInTheDocument();
  });

  it('UX-7: loading shows "Cargando…" and no count; an error shows its message with "Reintentar"', () => {
    const first = renderLobby(lobby({ status: { kind: 'loading' } }));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(screen.queryByText(/partida/)).not.toBeInTheDocument();
    first.unmount();
    const refresh = vi.fn();
    renderLobby(lobby({ status: { kind: 'error', error: new Error('down') }, refresh }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('keeps the filter available while loading so the choice is not lost', () => {
    renderLobby(lobby({ status: { kind: 'loading' } }));
    expect(select()).toHaveDisplayValue('Todos');
  });
});

describe('LobbyList with one source: the lobby of today', () => {
  it('shows no filter, no source label and no time control, and asks for all the games', () => {
    renderLobby(lobby({ items: [legacyItem(1), legacyItem(2)] }), LEGACY_ONLY);
    expect(screen.queryByLabelText('Juego')).not.toBeInTheDocument();
    expect(document.querySelector('.duel-filter')).toBeNull();
    expect(document.body).not.toHaveTextContent(/anterior|nueva|sin reloj|partidas$/);
    expect(useLobby).toHaveBeenLastCalledWith('all');
  });

  it('keeps the row text identical to the one before 8b (bet, fee, creator, "tuya", time and link)', () => {
    const view = renderLobby(lobby({ items: [duelItem(1, true)] }), LEGACY_ONLY);
    expect(view.container.querySelector('li')?.textContent).toBe(`0.002 SUI · comisión 2.5 % · creada por ${shortAddress(CREATOR)} (tuya) · — · Ver partida`);
  });
});
