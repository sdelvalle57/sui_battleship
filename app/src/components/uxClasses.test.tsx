import { render, screen } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameTarget, TxView } from '../hooks/txSession';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { useClaimTimeout } from '../hooks/useClaimTimeout';
import { useCreateGame } from '../hooks/useCreateGame';
import { catalogOf, useGameCatalog, type GameCatalog } from '../hooks/useGameCatalog';
import { useHouse } from '../hooks/useHouse';
import { useLobby, type UseLobbyResult } from '../hooks/useLobby';
import { useRefundStalled } from '../hooks/useRefundStalled';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useTransactionTime } from '../hooks/useTransactionTime';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import type { House } from '../sui/house';
import { buildGameRegistry, type GameDef, type GameKey } from '../sui/gameRegistry';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { ACCEPTOR, GAME_ID, activeState, duelRow } from '../test/duelRows';
import { Countdown } from './Countdown';
import { CreateGameForm } from './CreateGameForm';
import { asActiveDuel } from './gameTexts';
import { LobbyList } from './LobbyList';
import { TimeoutActions } from './TimeoutActions';

// UX-11 y UX-3 (#73, TASK-8b, N-4 del MID): las clases `duel-action`, `duel-radio`, `duel-select` y `clock-counter` son lo único que
// da los objetivos táctiles de 44 px y los números tabulares. jsdom no calcula el layout, así que se fijan dos cosas: que los
// componentes que las usan las lleven y que `index.css` tenga su regla con el valor que importa. Quitar una de las dos deja de
// pasar en silencio.
vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouse', () => ({ useHouse: vi.fn() }));
vi.mock('../hooks/useSuiBalance', () => ({ useSuiBalance: vi.fn() }));
vi.mock('../hooks/useCreateGame', () => ({ useCreateGame: vi.fn() }));
vi.mock('../hooks/useTxTarget', () => ({ useTxTarget: vi.fn() }));
vi.mock('../hooks/useClaimTimeout', () => ({ useClaimTimeout: vi.fn() }));
vi.mock('../hooks/useRefundStalled', () => ({ useRefundStalled: vi.fn() }));
vi.mock('../hooks/useLobby', () => ({ useLobby: vi.fn() }));
vi.mock('../hooks/useTransactionTime', () => ({ useTransactionTime: vi.fn() }));
vi.mock('../hooks/useCheckpointTime', () => ({ useCheckpointTime: vi.fn() }));
vi.mock('../hooks/useGameCatalog', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../hooks/useGameCatalog')>()),
  useGameCatalog: vi.fn(),
}));

// `import.meta.glob(..., '?raw')` no sirve con un `.css`: Vitest vacía los estilos (devuelve '' aun con `?raw`), así que se lee el
// archivo como texto con `node:fs` (módulo incorporado, sin dependencias nuevas ni tipos de Node: el nombre del módulo va en una
// variable y la forma que se usa se declara acá).
type NodeFs = { readFileSync: (path: string, encoding: 'utf8') => string };
const NODE_FS = 'node:fs';
const fs = (await import(/* @vite-ignore */ NODE_FS)) as NodeFs;
// Bajo Vitest `import.meta.url` es relativo a la raíz de `app/` (la carpeta desde la que corren todos los gates): `src/index.css`.
const CSS = fs.readFileSync(decodeURIComponent(new URL('../index.css', import.meta.url).pathname).replace(/^\//, ''), 'utf8');

/** Las declaraciones de todas las reglas cuyo selector (separado por comas) incluye `selector`, juntas y sin espacios. */
function declarationsOf(selector: string): string {
  const bodies: string[] = [];
  for (const match of CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (match[1] ?? '').split(',').map((part) => part.trim());
    if (selectors.includes(selector)) bodies.push((match[2] ?? '').replace(/\s+/g, ''));
  }
  return bodies.join(';');
}

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
const NEW_SOURCE = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: [{ packageId: UPGRADE }], typeOrigins: TYPE_ORIGINS }));
const COINFLIP = NEW_SOURCE.games[0];
if (COINFLIP === undefined) throw new Error('el registro debe tener el coinflip');
const CLOCK_GAME: GameDef = { ...COINFLIP, key: 'ajedrez' as unknown as GameKey, label: 'Ajedrez', usesClock: true, controlIds: [1, 2, 3, 4, 5, 6, 7] };

const READY = { kind: 'ready', refreshing: false } as const;
const HOUSE: House = { id: `0x${'3'.repeat(64)}`, version: 1n, feeRate: 250, feesCollected: 0n, minBet: 1_000_000n, maxBet: 50_000_000_000n };
const VIEW: TxView<GameTarget> = { target: { kind: 'game', gameId: GAME_ID }, viewId: 1, key: ['tx'], accountKey: ['tx'], targetHash: '' };
const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 60_000);

function lobby(): UseLobbyResult {
  return {
    items: [],
    status: READY,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetching: false,
    nextPageError: null,
    stalled: false,
    lowerBound: { checkpoint: 59n, kind: 'publish' },
    end: 'bound',
    loadMore: vi.fn(),
    refresh: vi.fn(),
  };
}

function mockHooks(catalog: GameCatalog) {
  vi.mocked(useWalletAccount).mockReturnValue({ address: ACCEPTOR, short: 'x' });
  vi.mocked(useHouse).mockReturnValue({ house: HOUSE, status: READY, isFetching: false, refetch: vi.fn() });
  vi.mocked(useSuiBalance).mockReturnValue({ balance: 10n ** 12n, status: READY, isFetching: false, refetch: vi.fn() });
  vi.mocked(useCreateGame).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), create: vi.fn() });
  vi.mocked(useTxTarget).mockReturnValue({ view: VIEW, busy: false, notice: null, unconfirmed: null, acknowledge: vi.fn() });
  vi.mocked(useClaimTimeout).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), claim: vi.fn() });
  vi.mocked(useRefundStalled).mockReturnValue({ stage: 'idle', outcome: null, execute: vi.fn(), refund: vi.fn() });
  vi.mocked(useLobby).mockReturnValue(lobby());
  vi.mocked(useGameCatalog).mockReturnValue(catalog);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue({ network: 'localnet' } as AppConfig);
  vi.mocked(useTransactionTime).mockReturnValue({ timestampMs: null, status: READY });
  vi.mocked(useCheckpointTime).mockReturnValue({ timestampMs: null, status: READY });
});

describe('the classes that give the touch targets and the tabular numbers (UX-11, UX-3)', () => {
  it('UX-11: the claim and refund buttons of the time actions carry duel-action', () => {
    mockHooks(NEW_SOURCE);
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    const active = asActiveDuel(duelRow(activeState(3, DEADLINE)));
    if (active === null) throw new Error('debe ser una partida activa');
    render(withScreenClock(fake.clock, <TimeoutActions game={active} view={VIEW} address={ACCEPTOR} busy={false} unconfirmed={false} adoptedDone={false} variant="detail" />));
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toHaveClass('duel-action');
  });

  it('UX-11: every radio of the time controls sits in a label with duel-radio', () => {
    mockHooks(catalogOf([CLOCK_GAME]));
    const router = createMemoryRouter([{ path: '/', element: <CreateGameForm /> }], { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(7);
    for (const radio of radios) expect(radio.closest('label')).toHaveClass('duel-radio');
  });

  it('UX-11: the game filter select of the lobby carries duel-select', () => {
    mockHooks(NEW_SOURCE);
    render(
      <MemoryRouter>
        <LobbyList />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Juego')).toHaveClass('duel-select');
  });

  it('UX-3: the visible counter carries clock-counter', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    render(withScreenClock(fake.clock, <Countdown deadlineMs={DEADLINE} />));
    expect(screen.getByRole('timer')).toHaveClass('clock-counter');
  });

  it.each(['.duel-action', '.duel-radio', '.duel-select'])('UX-11: index.css has a rule for %s with min-height and min-width of 44px', (selector) => {
    const declarations = declarationsOf(selector);
    expect(declarations, `falta la regla de ${selector}`).not.toBe('');
    expect(declarations).toContain('min-height:44px');
    expect(declarations).toContain('min-width:44px');
  });

  it('UX-3: index.css has a rule for .clock-counter with font-variant-numeric: tabular-nums', () => {
    const declarations = declarationsOf('.clock-counter');
    expect(declarations, 'falta la regla de .clock-counter').not.toBe('');
    expect(declarations).toContain('font-variant-numeric:tabular-nums');
  });
});
