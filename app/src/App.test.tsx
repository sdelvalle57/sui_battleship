import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appRoutes } from './App';
import { useAppConfig } from './hooks/useAppConfig';
import { useNodeStatus } from './hooks/useNodeStatus';
import { useWalletAccount } from './hooks/useWalletAccount';
import type { AppConfig } from './sui/config';

vi.mock('./hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('./hooks/useNodeStatus', () => ({ useNodeStatus: vi.fn() }));
vi.mock('./hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('@mysten/dapp-kit-react/ui', () => ({ ConnectButton: () => <button type="button">Connect Wallet</button> }));

const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '87818ef5',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  burnerWalletEnabled: true,
};

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: [path] })} />);
}

beforeEach(() => {
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 1n });
  vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
});

describe('App routes', () => {
  it('renders the header and the home page at /', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Sui Battleship' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Apuestas 1 vs 1 en Sui' })).toBeInTheDocument();
  });

  it('renders the not found page with a link home for an unknown route', () => {
    renderAt('/no-existe');
    expect(screen.getByRole('heading', { level: 1, name: 'Sui Battleship' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Página no encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });
});
