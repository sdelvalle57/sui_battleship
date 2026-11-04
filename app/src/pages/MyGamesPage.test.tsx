import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { createMemoryRouter, Link, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IN_FLIGHT_TEXT } from '../components/txNotice';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useTransactionTime } from '../hooks/useTransactionTime';
import type { AppConfig } from '../sui/config';
import { confirmTransaction, preflightTransaction, waitForCheckpoint, type NodeTransactionResult } from '../sui/execution';
import type { Game, GameState } from '../sui/game';
import { fetchInvitationsPage, fetchMyActivityPage, type MyGameItem, type MyGameRole, type MyGamesPage as Page } from '../sui/myGames';
import { ReadTimeoutError } from '../sui/readErrors';
import { fetchPublishCheckpoint } from '../sui/transactionInfo';
import { createPolicyQueryClient } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { MyGamesPage } from './MyGamesPage';

// "Mis partidas" con la máquina real (useMyGames, useTxTarget, las acciones y useExecuteTransaction). El kit se mockea
// sin importarlo (regla de capas de pages/); los fetchers de las listas, la publicación y `sui/execution`, por módulo.
const kit = vi.hoisted(() => ({ account: { current: '' }, signAndExecuteTransaction: vi.fn() }));
vi.mock('@mysten/dapp-kit-react', () => ({
  useCurrentAccount: () => (kit.account.current === '' ? null : { address: kit.account.current }),
  useCurrentClient: () => ({}),
  useDAppKit: () => ({ signAndExecuteTransaction: kit.signAndExecuteTransaction }),
}));
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));
vi.mock('../sui/myGames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/myGames')>()),
  fetchMyActivityPage: vi.fn(),
  fetchInvitationsPage: vi.fn(),
}));
vi.mock('../sui/transactionInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/transactionInfo')>()),
  fetchPublishCheckpoint: vi.fn(),
}));
vi.mock('../sui/execution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/execution')>()),
  preflightTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  waitForCheckpoint: vi.fn(),
}));

type FixtureTx = { digest: string; checkpoint: string | null; effects: { bcs: string }; events: { bcs: string; json: Record<string, string> }[] };
type Fixture = {
  ids: { packageId: string; originalPackageId: string; houseId: string; games: Record<'cancelled' | 'rejected' | 'acceptInvite' | 'invite', string> };
  executed: Record<'cancel' | 'reject' | 'acceptInvite', { $kind: 'Transaction'; Transaction: FixtureTx }>;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const ACCEPT_TX = fixture.executed.acceptInvite.Transaction;
/** A creó las partidas de la fixture y B fue el invitado y el aceptante (roles de la captura de #12). */
const A = String(ACCEPT_TX.events[0]?.json.creator);
const B = String(ACCEPT_TX.events[0]?.json.acceptor);
const IDS = fixture.ids.games;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: fixture.ids.packageId,
  originalPackageId: fixture.ids.originalPackageId,
  houseId: fixture.ids.houseId,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: true,
};
const TOKENS = ['Ganaste', 'Perdiste', 'Recibiste', 'ganó quien'];

/** base64 → bytes sin el SDK (pages/ no importa `@mysten/*`). */
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
function resultOf(tx: FixtureTx): NodeTransactionResult {
  const converted = {
    ...tx,
    effects: { ...tx.effects, bcs: fromBase64(tx.effects.bcs) },
    events: tx.events.map((e) => ({ ...e, sender: '', bcs: fromBase64(e.bcs) })),
  };
  return { $kind: 'Transaction', Transaction: converted } as unknown as NodeTransactionResult;
}

function game(id: string, bet: bigint, { opponent = B, state = { kind: 'pending' } }: { opponent?: string | null; state?: GameState } = {}): Game {
  return { id, version: 1n, houseId: CONFIG.houseId, creator: A, opponent, bet, stake: state.kind === 'pending' ? bet : 0n, feeRate: 250, state };
}
const RESOLVED_BY_B: GameState = { kind: 'resolved', acceptor: B, winner: B };
const item = (g: Game, role: MyGameRole, version = 4n, cp = 100n): MyGameItem => ({
  kind: 'game',
  game: g,
  objectVersion: version,
  role,
  txDigest: `tx-${g.id.slice(-4)}-${role}`,
  checkpoint: cp,
});
function page(items: MyGameItem[], next: string | null = null, overrides: Partial<Page> = {}): Page {
  return { items, endCursor: next, hasNextPage: next !== null, lowerBound: { checkpoint: 59n, kind: 'publish' }, end: next === null ? 'bound' : 'more', unreadableEvents: 0, ...overrides };
}
type Served = { activity: Page | Error; invitations: Page | Error };
/** Lo que responde el nodo a cada cuenta, por fuente; se cambia a mitad de un test para simular la relectura. */
const served = new Map<string, Served>();
function serve(address: string, data: Partial<Served>) {
  served.set(address.toLowerCase(), { activity: page([]), invitations: page([]), ...served.get(address.toLowerCase()), ...data });
}
const answer = (address: string, source: keyof Served) => {
  const value = served.get(address.toLowerCase())?.[source] ?? page([]);
  return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
};

/** Cuenta conectada como store externo: cambiarla vuelve a renderizar la página sin desmontar el router. */
const listeners = new Set<() => void>();
const accountStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => kit.account.current,
};
function switchAccount(address: string) {
  act(() => {
    kit.account.current = address;
    for (const listener of listeners) listener();
  });
}
function AccountScope() {
  useSyncExternalStore(accountStore.subscribe, accountStore.get);
  return <MyGamesPage />;
}
function LocationProbe() {
  return (
    <>
      <p data-testid="location">{useLocation().pathname}</p>
      <Link to="/my-games">Volver a Mis partidas</Link>
    </>
  );
}

let queryClient: QueryClient;
function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/my-games', element: <AccountScope /> },
      { path: '/game/:id', element: <LocationProbe /> },
    ],
    { initialEntries: ['/my-games'] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
const sectionEl = (name: 'invitations' | 'pending' | 'finished') => {
  const el = document.querySelector<HTMLElement>(`section.my-games-section[data-section="${name}"]`);
  if (el === null) throw new Error(`sin la sección ${name}`);
  return el;
};
const rowOf = (id: string) => document.querySelector<HTMLElement>(`li.my-game-row[data-game-id="${id}"]`);
const rowEl = (id: string) => {
  const row = rowOf(id);
  if (row === null) throw new Error(`sin la fila ${id}`);
  return row;
};
const actionsText = () => [...document.querySelectorAll('.tx-status, .game-actions')].map((el) => el.textContent).join(' ');
const countText = (root: HTMLElement, text: string) => root.textContent.split(text).length - 1;
async function loaded() {
  await waitFor(() => {
    expect(document.querySelectorAll('section.my-games-section')).toHaveLength(3);
    expect(document.querySelector('.my-games-section [role="status"]')).toBeNull();
  });
}

beforeEach(() => {
  queryClient = createPolicyQueryClient();
  served.clear();
  kit.account.current = B;
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: { kind: 'ready', refreshing: false }, isFetching: false, refetch: vi.fn() });
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: null, status: { kind: 'ready', refreshing: false } });
  vi.mocked(fetchPublishCheckpoint).mockResolvedValue(59n);
  vi.mocked(fetchMyActivityPage).mockImplementation((_client, { address }) => answer(address, 'activity'));
  vi.mocked(fetchInvitationsPage).mockImplementation((_client, { address }) => answer(address, 'invitations'));
  vi.mocked(preflightTransaction).mockResolvedValue(new Uint8Array());
  vi.mocked(waitForCheckpoint).mockResolvedValue(true);
  kit.signAndExecuteTransaction.mockResolvedValue({ $kind: 'Transaction', Transaction: { digest: ACCEPT_TX.digest } });
});

afterEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
});

describe('MyGamesPage: account (T5-1)', () => {
  it('without account shows the fixed text and reads nothing', async () => {
    kit.account.current = '';
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Mis partidas' })).toBeInTheDocument();
    expect(screen.getByText('Conecta tu wallet para ver tus partidas e invitaciones')).toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    expect(fetchPublishCheckpoint).not.toHaveBeenCalled();
    expect(fetchMyActivityPage).not.toHaveBeenCalled();
    expect(fetchInvitationsPage).not.toHaveBeenCalled();
    expect(document.querySelector('section.my-games-section')).toBeNull();
  });

  it('with account shows the three sections inside section.my-games', async () => {
    serve(B, { invitations: page([item(game(IDS.acceptInvite, 1_000_001n), 'invitee')]) });
    renderPage();
    await loaded();
    expect(document.querySelector('section.my-games')).not.toBeNull();
    expect(within(sectionEl('invitations')).getByRole('heading', { name: 'Invitaciones recibidas' })).toBeInTheDocument();
    expect(sectionEl('pending')).toHaveTextContent('No tienes partidas pendientes');
    expect(sectionEl('finished')).toHaveTextContent('Todavía no hay partidas terminadas');
    expect(rowEl(IDS.acceptInvite)).toHaveTextContent('Te invitó');
  });
});

describe('MyGamesPage: actions from the rows (T5-3, T5-4)', () => {
  it('accepts from an invitation row: stages without result tokens, the result of the real GameResolved, and the row stays in its section', async () => {
    const invite = game(IDS.acceptInvite, 1_000_001n);
    serve(B, { invitations: page([item(invite, 'invitee')]) });
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => {
      expect(screen.getByText('Confirmando en la red…')).toBeInTheDocument();
    });
    for (const token of TOKENS) expect(actionsText()).not.toContain(token);
    const resolved = game(IDS.acceptInvite, 1_000_001n, { state: RESOLVED_BY_B });
    serve(B, { activity: page([item(resolved, 'acceptor', 415n, 375n)]), invitations: page([item(resolved, 'invitee', 415n)]) });
    await act(async () => {
      confirm.resolve(resultOf(ACCEPT_TX));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(within(rowEl(IDS.acceptInvite)).getByRole('status')).toHaveTextContent(
        '¡Ganaste! Recibiste 0.001950002 SUI (pozo 0.002000002 SUI − comisión 0.00005 SUI)',
      );
    });
    expect(sectionEl('invitations').contains(rowEl(IDS.acceptInvite))).toBe(true);
    await waitFor(() => {
      expect(rowEl(IDS.acceptInvite)).toHaveTextContent('Resuelta');
    });
    expect(within(rowEl(IDS.acceptInvite)).queryByRole('button', { name: 'Aceptar' })).not.toBeInTheDocument();
    expect(within(rowEl(IDS.acceptInvite)).queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument();
    expect(sectionEl('finished').querySelector('li.my-game-row')).toBeNull();
  });

  it('cancels from "Tus partidas pendientes" with its result text', async () => {
    kit.account.current = A;
    serve(A, { activity: page([item(game(IDS.cancelled, 3_000_003n, { opponent: null }), 'creator')]) });
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(fixture.executed.cancel.Transaction));
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.cancelled)).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(within(rowEl(IDS.cancelled)).getByRole('status')).toHaveTextContent('Partida cancelada: se devolvieron 0.003000003 SUI a tu cuenta');
    });
    expect(sectionEl('pending').contains(rowEl(IDS.cancelled))).toBe(true);
  });

  it('rejects from "Invitaciones recibidas" with its result text', async () => {
    serve(B, { invitations: page([item(game(IDS.rejected, 4_000_004n), 'invitee')]) });
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(fixture.executed.reject.Transaction));
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.rejected)).getByRole('button', { name: 'Rechazar' }));
    await waitFor(() => {
      expect(within(rowEl(IDS.rejected)).getByRole('status')).toHaveTextContent(
        'Invitación rechazada: se devolvieron 0.004000004 SUI a quien te invitó',
      );
    });
  });
});

describe('MyGamesPage: honest pages and refetch (T5-5, T5-7, T5-8)', () => {
  it('T5-5 (V-9): "Cargar más actividad" in both activity sections; an empty last page gives the definitive texts, no alert and no button', async () => {
    vi.mocked(fetchMyActivityPage)
      .mockResolvedValueOnce(page([], 'a1'))
      .mockResolvedValueOnce(page([], null, { end: 'bound' }));
    renderPage();
    await loaded();
    expect(sectionEl('pending')).toHaveTextContent('Sin partidas pendientes en lo revisado');
    expect(sectionEl('finished')).toHaveTextContent('Sin partidas terminadas en lo revisado');
    expect(within(sectionEl('pending')).getByRole('button', { name: 'Cargar más actividad' })).toBeInTheDocument();
    fireEvent.click(within(sectionEl('finished')).getByRole('button', { name: 'Cargar más actividad' }));
    await waitFor(() => {
      expect(sectionEl('pending')).toHaveTextContent('No tienes partidas pendientes');
    });
    expect(fetchMyActivityPage).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ before: 'a1' }));
    expect(sectionEl('finished')).toHaveTextContent('Todavía no hay partidas terminadas');
    expect(screen.queryByRole('button', { name: 'Cargar más actividad' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(document.querySelectorAll('li.my-game-row')).toHaveLength(0);
  });

  it('T5-7 (MINOR-3): a failing refetch after accepting keeps the row, its actions and the digest, with the note; Reintentar clears it', async () => {
    serve(B, { invitations: page([item(game(IDS.acceptInvite, 1_000_001n), 'invitee')]) });
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT_TX));
    renderPage();
    await loaded();
    const failure = new Error('nodo caído');
    serve(B, { activity: failure, invitations: failure });
    fireEvent.click(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => {
      expect(within(rowEl(IDS.acceptInvite)).getByRole('status')).toHaveTextContent('¡Ganaste!');
    });
    expect(within(rowEl(IDS.acceptInvite)).getByTitle(ACCEPT_TX.digest)).toBeInTheDocument();
    expect(rowEl(IDS.acceptInvite).querySelector('.game-actions')).not.toBeNull();
    await waitFor(() => {
      expect(within(sectionEl('invitations')).getByRole('alert')).toHaveTextContent('No se pudo actualizar la lista');
    });
    const resolved = game(IDS.acceptInvite, 1_000_001n, { state: RESOLVED_BY_B });
    serve(B, { activity: page([item(resolved, 'acceptor', 415n)]), invitations: page([item(resolved, 'invitee', 415n)]) });
    fireEvent.click(within(sectionEl('invitations')).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => {
      expect(within(sectionEl('invitations')).queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(within(rowEl(IDS.acceptInvite)).getByRole('status')).toHaveTextContent('¡Ganaste!');
  });

  it('T5-7 (MINOR-3): a retrying refetch after accepting keeps the row mounted with the retrying note until it succeeds', async () => {
    serve(B, { invitations: page([item(game(IDS.acceptInvite, 1_000_001n), 'invitee')]) });
    vi.mocked(confirmTransaction).mockResolvedValue(resultOf(ACCEPT_TX));
    renderPage();
    await loaded();
    const resolved = game(IDS.acceptInvite, 1_000_001n, { state: RESOLVED_BY_B });
    serve(B, { activity: page([item(resolved, 'acceptor', 415n)]), invitations: page([item(resolved, 'invitee', 415n)]) });
    // Transitorio (se reintenta por la política común): la primera relectura de las invitaciones falla una vez.
    vi.mocked(fetchInvitationsPage).mockRejectedValueOnce(new ReadTimeoutError(10_000));
    fireEvent.click(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => {
      expect(within(sectionEl('invitations')).getByText('Reintentando… (intento 2 de 3)')).toBeInTheDocument();
    });
    expect(rowOf(IDS.acceptInvite)).not.toBeNull();
    expect(rowEl(IDS.acceptInvite).querySelector('.game-actions')).not.toBeNull();
    await waitFor(
      () => {
        expect(within(rowEl(IDS.acceptInvite)).getByRole('status')).toHaveTextContent('¡Ganaste!');
      },
      { timeout: 3000 },
    );
    expect(within(sectionEl('invitations')).queryByText(/Reintentando/)).not.toBeInTheDocument();
    expect(rowEl(IDS.acceptInvite)).toHaveTextContent('Resuelta');
  });

  it.each([
    [1, '1 evento ilegible en lo revisado'],
    [3, '3 eventos ilegibles en lo revisado'],
  ])('T5-8 (MINOR-4): %i unreadable invitation events give the note and no row', async (count, text) => {
    serve(B, { invitations: page([], null, { unreadableEvents: count }) });
    renderPage();
    await loaded();
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(document.querySelectorAll('li.my-game-row')).toHaveLength(0);
    expect(sectionEl('invitations')).toHaveTextContent('No tienes invitaciones pendientes');
  });
});

describe('MyGamesPage: lock and unconfirmed (T5-9, T5-11)', () => {
  beforeEach(() => {
    serve(B, { invitations: page([item(game(IDS.acceptInvite, 1_000_001n), 'invitee', 4n, 200n), item(game(IDS.invite, 2_000_002n), 'invitee', 4n, 100n)]) });
  });

  it('T5-9: two clicks in the same tick run once; every row is disabled and IN_FLIGHT_TEXT shows once in the page', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    renderPage();
    await loaded();
    const first = within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' });
    const second = within(rowEl(IDS.invite)).getByRole('button', { name: 'Aceptar' });
    act(() => {
      first.click();
      second.click();
    });
    await waitFor(() => {
      expect(screen.getByText('Confirmando en la red…')).toBeInTheDocument();
    });
    expect(kit.signAndExecuteTransaction).toHaveBeenCalledTimes(1);
    expect(preflightTransaction).toHaveBeenCalledTimes(1);
    for (const row of document.querySelectorAll<HTMLElement>('li.my-game-row')) {
      for (const button of within(row).getAllByRole('button')) expect(button).toBeDisabled();
    }
    const pageEl = document.querySelector<HTMLElement>('section.my-games');
    if (pageEl === null) throw new Error('sin la página');
    expect(countText(pageEl, IN_FLIGHT_TEXT)).toBe(1);
    await act(async () => {
      confirm.resolve(resultOf(ACCEPT_TX));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(within(rowEl(IDS.invite)).getByRole('button', { name: 'Aceptar' })).toBeEnabled();
    });
    expect(countText(pageEl, IN_FLIGHT_TEXT)).toBe(0);
  });

  it('T5-11: an unconfirmed transaction blocks only its row until "Ya la revisé"', async () => {
    vi.mocked(confirmTransaction).mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' }));
    await waitFor(() => {
      expect(within(rowEl(IDS.acceptInvite)).getByRole('alert')).toHaveTextContent('La transacción se envió pero la red no la confirmó todavía');
    });
    expect(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' })).toBeDisabled();
    await waitFor(() => {
      expect(within(rowEl(IDS.invite)).getByRole('button', { name: 'Aceptar' })).toBeEnabled();
    });
    fireEvent.click(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Ya la revisé' }));
    await waitFor(() => {
      expect(within(rowEl(IDS.acceptInvite)).getByRole('button', { name: 'Aceptar' })).toBeEnabled();
    });
  });
});

describe('MyGamesPage: account switch (T5-12, T5-13, MINOR-6)', () => {
  const ownOpen = () => game(IDS.cancelled, 3_000_003n, { opponent: null });

  beforeEach(() => {
    kit.account.current = A;
    serve(A, { activity: page([item(ownOpen(), 'creator')]) });
    serve(B, { invitations: page([]) });
  });

  it('T5-12: A in flight → B (remount, nothing of A) → A still in flight ⇒ the adopted result appears in the row', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.cancelled)).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.getByText('Confirmando en la red…')).toBeInTheDocument();
    });
    switchAccount(B);
    await loaded();
    expect(rowOf(IDS.cancelled)).toBeNull();
    expect(screen.queryByText(/Partida cancelada/)).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmando en la red…')).not.toBeInTheDocument();
    switchAccount(A);
    await waitFor(() => {
      expect(rowOf(IDS.cancelled)).not.toBeNull();
    });
    serve(A, { activity: page([item(game(IDS.cancelled, 3_000_003n, { opponent: null, state: { kind: 'cancelled' } }), 'creator', 133n)]) });
    await act(async () => {
      confirm.resolve(resultOf(fixture.executed.cancel.Transaction));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(within(rowEl(IDS.cancelled)).getByRole('status')).toHaveTextContent('Partida cancelada: se devolvieron 0.003000003 SUI a tu cuenta');
    });
  });

  it('T5-13: A in flight → B → finished while on B → A ⇒ no result; the game with its read state in its natural section', async () => {
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    renderPage();
    await loaded();
    fireEvent.click(within(rowEl(IDS.cancelled)).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.getByText('Confirmando en la red…')).toBeInTheDocument();
    });
    switchAccount(B);
    await loaded();
    serve(A, { activity: page([item(game(IDS.cancelled, 3_000_003n, { opponent: null, state: { kind: 'cancelled' } }), 'creator', 133n)]) });
    await act(async () => {
      confirm.resolve(resultOf(fixture.executed.cancel.Transaction));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(queryClient.isMutating()).toBe(0);
    });
    switchAccount(A);
    await waitFor(() => {
      expect(sectionEl('finished').querySelector(`li.my-game-row[data-game-id="${IDS.cancelled}"]`)).not.toBeNull();
    });
    expect(rowEl(IDS.cancelled).querySelector('.my-game-result')).toHaveTextContent('Cancelada: la apuesta volvió a quien la creó');
    expect(sectionEl('pending').querySelector('li.my-game-row')).toBeNull();
    expect(within(rowEl(IDS.cancelled)).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Partida cancelada: se devolvieron/)).not.toBeInTheDocument();
    expect(screen.queryByText('Confirmando en la red…')).not.toBeInTheDocument();
  });
});

describe('MyGamesPage: acting on an unpinned row during a slow mount refetch (T5-18, H-6)', () => {
  it.each(['confirmation first', 'refetch first'] as const)('keeps the row in "Tus partidas pendientes" with its result (%s)', async (order) => {
    kit.account.current = A;
    const open = game(IDS.cancelled, 3_000_003n, { opponent: null });
    const cancelled = game(IDS.cancelled, 3_000_003n, { opponent: null, state: { kind: 'cancelled' } });
    serve(A, { activity: page([item(open, 'creator')]) });
    renderPage();
    await loaded();
    // Fuera de la página, la caché queda marcada vieja; al volver, la relectura del montaje de la actividad es lenta.
    fireEvent.change(screen.getByLabelText('Abrir partida por ID'), { target: { value: IDS.invite } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toBeInTheDocument();
    });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['sui', 'localnet', 'myGames'] });
    });
    const slow = deferred<Page>();
    vi.mocked(fetchMyActivityPage).mockReturnValueOnce(slow.promise);
    const confirm = deferred<NodeTransactionResult>();
    vi.mocked(confirmTransaction).mockReturnValueOnce(confirm.promise);
    fireEvent.click(screen.getByRole('link', { name: 'Volver a Mis partidas' }));
    await waitFor(() => {
      expect(rowOf(IDS.cancelled)).not.toBeNull();
    });
    // La fila de G sale de la caché y todavía no tiene pin: el usuario cancela.
    fireEvent.click(within(rowEl(IDS.cancelled)).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => {
      expect(screen.getByText('Confirmando en la red…')).toBeInTheDocument();
    });
    serve(A, { activity: page([item(cancelled, 'creator', 4n, 133n)]) });
    const finishConfirm = async () => {
      await act(async () => {
        confirm.resolve(resultOf(fixture.executed.cancel.Transaction));
        await Promise.resolve();
      });
    };
    const finishRefetch = async () => {
      await act(async () => {
        slow.resolve(page([item(cancelled, 'creator', 4n, 133n)]));
        await Promise.resolve();
      });
    };
    if (order === 'confirmation first') {
      await finishConfirm();
      await finishRefetch();
    } else {
      await finishRefetch();
      await waitFor(() => {
        expect(rowEl(IDS.cancelled)).toHaveTextContent('Cancelada');
      });
      expect(sectionEl('pending').contains(rowEl(IDS.cancelled))).toBe(true);
      await finishConfirm();
    }
    await waitFor(() => {
      expect(within(rowEl(IDS.cancelled)).getByRole('status')).toHaveTextContent('Partida cancelada: se devolvieron 0.003000003 SUI a tu cuenta');
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
    expect(sectionEl('pending').contains(rowEl(IDS.cancelled))).toBe(true);
    expect(within(rowEl(IDS.cancelled)).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
    expect(sectionEl('finished').querySelector('li.my-game-row')).toBeNull();
  });
});

describe('MyGamesPage: back to the page (T5-17, H-5)', () => {
  it('regroups an invitation accepted outside the page: back on #/my-games it ends in "Terminadas" with "Aceptaste"', async () => {
    const invite = game(IDS.acceptInvite, 1_000_001n);
    serve(B, { invitations: page([item(invite, 'invitee')]) });
    renderPage();
    await loaded();
    expect(sectionEl('invitations').contains(rowEl(IDS.acceptInvite))).toBe(true);
    // Fuera de la página (en el detalle), la invitación se acepta: la invalidación de DL-7 marca las listas viejas.
    fireEvent.change(screen.getByLabelText('Abrir partida por ID'), { target: { value: IDS.acceptInvite } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/game/${IDS.acceptInvite}`);
    });
    const resolved = game(IDS.acceptInvite, 1_000_001n, { state: RESOLVED_BY_B });
    serve(B, { activity: page([item(resolved, 'acceptor', 415n, 375n)]), invitations: page([item(resolved, 'invitee', 415n)]) });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['sui', 'localnet', 'myGames'] });
    });
    fireEvent.click(screen.getByRole('link', { name: 'Volver a Mis partidas' }));
    await waitFor(() => {
      expect(sectionEl('finished').querySelector(`li.my-game-row[data-game-id="${IDS.acceptInvite}"]`)).not.toBeNull();
    });
    expect(rowEl(IDS.acceptInvite)).toHaveTextContent('Aceptaste');
    expect(rowEl(IDS.acceptInvite).querySelector('.my-game-result')).toHaveTextContent('Ganaste');
    expect(sectionEl('invitations').querySelector('li.my-game-row')).toBeNull();
  });
});

describe('MyGamesPage: helpers (T5-15, DL-15)', () => {
  it('rejects an invalid ID without navigating or reading, and opens a valid short ID normalized', async () => {
    renderPage();
    await loaded();
    const calls = vi.mocked(fetchMyActivityPage).mock.calls.length + vi.mocked(fetchInvitationsPage).mock.calls.length;
    const input = screen.getByLabelText('Abrir partida por ID');
    fireEvent.change(input, { target: { value: 'xyz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('alert')).toHaveTextContent('ID de partida inválido');
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    expect(vi.mocked(fetchMyActivityPage).mock.calls.length + vi.mocked(fetchInvitationsPage).mock.calls.length).toBe(calls);
    fireEvent.change(input, { target: { value: ' 0x6 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/game/0x${'0'.repeat(63)}6`);
    });
  });

  it('links to the account history in the explorer only on testnet', async () => {
    const local = renderPage();
    await loaded();
    expect(screen.queryByRole('link', { name: 'Ver tu historial completo en el explorador' })).not.toBeInTheDocument();
    local.unmount();
    vi.mocked(useAppConfig).mockReturnValue({ ...CONFIG, network: 'testnet', grpcUrl: 'https://fullnode.testnet.sui.io:443', chainId: '4c78adac' });
    renderPage();
    await loaded();
    const link = screen.getByRole('link', { name: 'Ver tu historial completo en el explorador' });
    expect(link).toHaveAttribute('href', `https://suiscan.xyz/testnet/account/${B}`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});
