import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCreateGame } from '../hooks/useCreateGame';
import { catalogOf, useGameCatalog, type GameCatalog } from '../hooks/useGameCatalog';
import { useHouse } from '../hooks/useHouse';
import { useSuiBalance } from '../hooks/useSuiBalance';
import type { TxView } from '../hooks/txSession';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import type { House } from '../sui/house';
import { buildGameRegistry, type GameDef, type GameKey } from '../sui/gameRegistry';
import { ACCEPTOR } from '../test/duelRows';
import { CreateGameForm } from './CreateGameForm';

// UX-8, UX-9 y UX-15 (#73, TASK-8b): el formulario de crear con la nota de costo de la fuente a la que va "crear", el selector
// de juego (solo con más de uno creable) y los controles de tiempo (solo un juego con reloj).
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../hooks/useCreateGame', () => ({ useCreateGame: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useGameCatalog', async (importOriginal) => ({ ...(await importOriginal<typeof import('../hooks/useGameCatalog')>()), useGameCatalog: vi.fn() }));

const ORIGINAL = `0x${'1'.repeat(64)}`;
const UPGRADE = `0x${'2'.repeat(64)}`;
const TYPE_ORIGINS = (
  [
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
  ] as const
).map(([module, name]) => ({ module, name, definingId: module === 'game' ? ORIGINAL : UPGRADE }));
const LEGACY = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL }));
const NEW_SOURCE = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: [{ packageId: UPGRADE }], typeOrigins: TYPE_ORIGINS }));
const COINFLIP = NEW_SOURCE.games[0];
if (COINFLIP === undefined) throw new Error('el registro debe tener el coinflip');

const HOUSE: House = { id: `0x${'3'.repeat(64)}`, version: 1n, feeRate: 250, feesCollected: 0n, minBet: 1_000_000n, maxBet: 50_000_000_000n };
const READY = { kind: 'ready', refreshing: false } as const;
const VIEW: TxView = { target: { kind: 'create' }, viewId: 1, key: ['tx', 'create'], accountKey: ['tx'], targetHash: '["tx","create"]' };

/** Un juego con reloj (sintético: ninguno de producción lo usa todavía) y otro sin él, para el selector. */
const CLOCK_GAME: GameDef = { ...COINFLIP, key: 'ajedrez' as unknown as GameKey, label: 'Ajedrez', usesClock: true, controlIds: [1, 2, 3, 4, 5, 6, 7] };
const catalogWith = (...games: GameDef[]): GameCatalog => catalogOf(games);

function setup(catalog: GameCatalog) {
  vi.mocked(useWalletAccount).mockReturnValue({ address: ACCEPTOR, short: 'x' });
  vi.mocked(useHouse).mockReturnValue({ house: HOUSE, status: READY, isFetching: false, refetch: vi.fn() });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: READY, isFetching: false, refetch: vi.fn() });
  vi.mocked(useCreateGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), create: vi.fn() });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge: vi.fn() });
  vi.mocked(useGameCatalog).mockReturnValue(catalog);
  const router = createMemoryRouter([{ path: '/', element: <CreateGameForm /> }], { initialEntries: ['/'] });
  return render(<RouterProvider router={router} />);
}
const note = () => screen.getByText(/Además del gas, crear la partida deja un depósito de almacenamiento/);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
});

describe('CreateGameForm: the cost note of the source "crear" goes to (UX-8, UX-15)', () => {
  it('UX-8: with the previous source (today\'s testnet.json) the note is exactly the one from before 8b', () => {
    setup(LEGACY);
    expect(note()).toHaveTextContent(
      'Además del gas, crear la partida deja un depósito de almacenamiento (≈ 0.0019532 SUI abierta, ≈ 0.0021964 SUI con invitación, al precio actual de testnet) que no se recupera. El saldo tiene que cubrir la apuesta más ≈ 0.01 SUI de reserva para el gas.',
    );
    expect(useCreateGame).toHaveBeenLastCalledWith(VIEW, 'coinflip');
  });

  it('UX-8: with the new source the note uses the storage deposit of the Duel (2 409 200 / 2 652 400 MIST), in the same format', () => {
    setup(NEW_SOURCE);
    expect(note()).toHaveTextContent(
      'Además del gas, crear la partida deja un depósito de almacenamiento (≈ 0.0024092 SUI abierta, ≈ 0.0026524 SUI con invitación, al precio actual de testnet) que no se recupera. El saldo tiene que cubrir la apuesta más ≈ 0.01 SUI de reserva para el gas.',
    );
  });

  it('UX-15: the cost note comes BEFORE the button that creates the game', () => {
    setup(NEW_SOURCE);
    const submit = screen.getByRole('button', { name: 'Crear partida' });
    expect(note().compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('CreateGameForm: the coinflip has no time option and no game selector (UX-15)', () => {
  it.each([
    ['previous source', LEGACY],
    ['new source', NEW_SOURCE],
  ])('UX-15: with the coinflip (%s) there is no fieldset, no radio and no game select', (_name, catalog) => {
    setup(catalog);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Juego')).not.toBeInTheDocument();
    expect(screen.queryByText(/por jugada/)).not.toBeInTheDocument();
  });
});

describe('CreateGameForm: a game with a clock (UX-15, UX-11)', () => {
  it('UX-15: offers the 7 time controls as radios in a fieldset with a legend, with readable names and a declared default', () => {
    setup(catalogWith(CLOCK_GAME));
    const group = screen.getByRole('group', { name: 'Tiempo por jugada' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.querySelector('legend')).toHaveTextContent('Tiempo por jugada');
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.closest('label')?.textContent.trim())).toEqual([
      '10 min por jugada',
      '20 min por jugada',
      '30 min por jugada',
      '60 min por jugada',
      '1 día por jugada',
      '3 días por jugada',
      '7 días por jugada',
    ]);
    expect(radios[0]).toBeChecked();
    expect(radios.slice(1).every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(group).toHaveTextContent('Por defecto: 10 min por jugada.');
    expect(within(group).queryByText('sin reloj')).not.toBeInTheDocument();
  });

  it('UX-15: choosing another control moves the selection (one radio group, one value)', () => {
    setup(catalogWith(CLOCK_GAME));
    fireEvent.click(screen.getByRole('radio', { name: '3 días por jugada' }));
    expect(screen.getByRole('radio', { name: '3 días por jugada' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '10 min por jugada' })).not.toBeChecked();
    expect(new Set(screen.getAllByRole('radio').map((radio) => radio.getAttribute('name'))).size).toBe(1);
  });

  it('UX-9: it does not offer to create a game that has no creation builder yet, and says why next to the button', () => {
    setup(catalogWith(CLOCK_GAME));
    fireEvent.change(screen.getByLabelText(/Apuesta \(SUI\)/), { target: { value: '0.01' } });
    const submit = screen.getByRole('button', { name: 'Crear partida' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAccessibleDescription('Este juego todavía no se puede crear desde la app');
    expect(document.querySelector('.duel-reason')).toHaveTextContent('Este juego todavía no se puede crear desde la app');
  });

  it('UX-6: no time control text has contract jargon', () => {
    setup(catalogWith(CLOCK_GAME));
    expect(document.body.textContent).not.toMatch(/claim_timeout|refund_stalled|to_move|deadline_ms|TimedOut|Expired|DuelState/);
  });
});

describe('CreateGameForm: the game selector (UX-15)', () => {
  it('UX-15: appears only with more than one creatable game and routes the creation to the chosen one', () => {
    setup(catalogWith(COINFLIP, CLOCK_GAME));
    const select = screen.getByLabelText('Juego');
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Coinflip', 'Ajedrez']);
    expect(select).toHaveDisplayValue('Coinflip');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'ajedrez' } });
    expect(useCreateGame).toHaveBeenLastCalledWith(VIEW, 'ajedrez');
    expect(screen.getAllByRole('radio')).toHaveLength(7);
  });

  it('UX-15: a game that cannot be created is not offered in the selector', () => {
    setup(catalogWith(COINFLIP, { ...CLOCK_GAME, creatable: false }));
    expect(screen.queryByLabelText('Juego')).not.toBeInTheDocument();
  });
});
