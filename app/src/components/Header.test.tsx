import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useNodeStatus } from '../hooks/useNodeStatus';
import { useWalletAccount } from '../hooks/useWalletAccount';
import type { AppConfig } from '../sui/config';
import { Header } from './Header';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useNodeStatus', () => ({ useNodeStatus: vi.fn() }));
vi.mock('../hooks/useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
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

describe('Header', () => {
  it('renders the title, network badge, connected account and connect button', () => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 1n });
    vi.mocked(useWalletAccount).mockReturnValue({ address: `0x${'ab'.repeat(32)}`, short: '0xabab…abab' });
    render(<Header />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sui Battleship' })).toBeInTheDocument();
    expect(screen.getByText('testnet')).toBeInTheDocument();
    expect(screen.getByText('nodo OK')).toBeInTheDocument();
    expect(screen.getByText('0xabab…abab')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conectar wallet' })).toBeInTheDocument();
  });

  it('renders no account badge when disconnected', () => {
    vi.mocked(useAppConfig).mockReturnValue(CONFIG);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'loading' });
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    render(<Header />);
    expect(screen.queryByTitle(/^0x/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Conectar wallet' })).toBeInTheDocument();
  });
});
