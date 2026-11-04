import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useHouseCap, type UseHouseCap } from '../hooks/useHouseCap';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { Header } from './Header';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useNodeStatus', () => ({ useNodeStatus: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../hooks/useHouseCap', () => ({ useHouseCap: vi.fn() }));
// El ConnectButton real es un web component (Lit) que necesita la instancia del kit: se sustituye por un botón.
vi.mock('@mysten/dapp-kit-react/ui', () => ({
  ConnectButton: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
}));

const CONFIG: AppConfig = {
  network: 'testnet',
  grpcUrl: 'https://fullnode.testnet.sui.io:443',
  chainId: '4c78adac',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};

/** El encabezado lleva un `Link` (DL-10 de #13): se dibuja dentro de un router. */
const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );

// #14: el enlace "Administrar House" depende de `useHouseCap`; por defecto, sin cuenta.
beforeEach(() => {
  vi.mocked(useHouseCap).mockReturnValue({ kind: 'no_account' });
});

describe('Header', () => {
  it('renders the title, network badge, connected account and connect button', () => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 1n });
    vi.mocked(useWalletAccount).mockReturnValue({ address: `0x${'ab'.repeat(32)}`, short: '0xabab…abab' });
    renderHeader();
    expect(screen.getByRole('heading', { level: 1, name: 'Sui Battleship' })).toBeInTheDocument();
    expect(screen.getByText('testnet')).toBeInTheDocument();
    expect(screen.getByText('nodo OK')).toBeInTheDocument();
    expect(screen.getByText('0xabab…abab')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar wallet' })).toBeInTheDocument();
  });

  it('links to my games (T5-1)', () => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'loading' });
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    renderHeader();
    expect(screen.getByRole('link', { name: 'Mis partidas' })).toHaveAttribute('href', '/my-games');
  });

  it('renders no account badge when disconnected', () => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'loading' });
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    renderHeader();
    expect(screen.queryByTitle(/^0x/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Conectar wallet' })).toBeInTheDocument();
  });
});

describe('Header: Administrar House (T5-13, D-2 of #14)', () => {
  const ACCOUNT = `0x${'ab'.repeat(32)}`;
  const CAP = { id: `0x${'c'.repeat(64)}`, owner: ACCOUNT };
  const READY = { kind: 'ready', refreshing: false } as const;
  const withAccount = (cap: Extract<UseHouseCap, { kind: 'account' }>['cap'], status: Extract<UseHouseCap, { kind: 'account' }>['status'] = READY): UseHouseCap => ({
    kind: 'account',
    address: ACCOUNT,
    cap,
    status,
    isFetching: false,
    refetch: vi.fn(),
  });

  beforeEach(() => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'loading' });
    vi.mocked(useWalletAccount).mockReturnValue({ address: ACCOUNT, short: '0xabab…abab' });
  });

  it('links to /admin only when the account is known to have the cap', () => {
    vi.mocked(useHouseCap).mockReturnValue(withAccount({ kind: 'known', cap: CAP }));
    renderHeader();
    expect(screen.getByRole('link', { name: 'Administrar House' })).toHaveAttribute('href', '/admin');
  });

  it.each<[string, UseHouseCap]>([
    ['no account', { kind: 'no_account' }],
    ['an unknown cap (loading)', withAccount({ kind: 'unknown' }, { kind: 'loading' })],
    ['an unknown cap (error)', withAccount({ kind: 'unknown' }, { kind: 'error', error: new Error('x') })],
    ['a known null cap', withAccount({ kind: 'known', cap: null })],
  ])('has no admin link with %s', (_name, state) => {
    vi.mocked(useHouseCap).mockReturnValue(state);
    renderHeader();
    expect(screen.queryByRole('link', { name: 'Administrar House' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Mis partidas' })).toBeInTheDocument();
  });

  it('keeps the link with a known cap whose refetch failed', () => {
    vi.mocked(useHouseCap).mockReturnValue(withAccount({ kind: 'known', cap: CAP }, { kind: 'error', error: new Error('x') }));
    renderHeader();
    expect(screen.getByRole('link', { name: 'Administrar House' })).toBeInTheDocument();
  });
});
