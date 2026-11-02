import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import { useNodeStatus } from '../hooks/useNodeStatus';
import type { AppConfig } from '../sui/config';
import type { Network } from '../sui/networks';
import type { NodeStatus } from '../sui/nodeInfo';
import { NetworkBadge } from './NetworkBadge';

vi.mock('../hooks/useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('../hooks/useNodeStatus', () => ({ useNodeStatus: vi.fn() }));

function configFor(network: Network): AppConfig {
  return {
    network,
    grpcUrl: 'http://127.0.0.1:9000',
    chainId: '4c78adac',
    packageId: `0x${'1'.repeat(64)}`,
    originalPackageId: `0x${'1'.repeat(64)}`,
    houseId: `0x${'3'.repeat(64)}`,
    publishTxDigest: '11111111111111111111111111111111',
    burnerWalletEnabled: false,
  };
}

function renderWith(network: Network, status: NodeStatus) {
  vi.mocked(useAppConfig).mockReturnValue(configFor(network));
  vi.mocked(useNodeStatus).mockReturnValue(status);
  return render(<NetworkBadge />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NetworkBadge', () => {
  it.each<Network>(['localnet', 'testnet'])('always shows the network name (%s)', (network) => {
    renderWith(network, { kind: 'loading' });
    expect(screen.getByText(network)).toBeInTheDocument();
  });

  it('shows connecting while loading', () => {
    renderWith('testnet', { kind: 'loading' });
    expect(screen.getByText('conectando…')).toBeInTheDocument();
  });

  it('shows reconnecting with the attempt while retrying, never node OK nor empty', () => {
    renderWith('testnet', { kind: 'retrying', attempt: 2, max: 3 });
    expect(screen.getByText('reconectando… (intento 2 de 3)')).toBeInTheDocument();
    expect(screen.queryByText('nodo OK')).toBeNull();
  });

  it('shows node OK', () => {
    renderWith('testnet', { kind: 'ok', checkpointHeight: 10n });
    expect(screen.getByText('nodo OK')).toBeInTheDocument();
  });

  it('shows the expected and actual chain ids on wrong_chain', () => {
    renderWith('localnet', { kind: 'wrong_chain', expected: '87818ef5', actual: '9a65bf10' });
    expect(screen.getByText('red equivocada (esperada 87818ef5, nodo 9a65bf10)')).toBeInTheDocument();
  });

  it('shows offline with the visible reason', () => {
    renderWith('testnet', { kind: 'offline', reason: 'El nodo no respondió en 10 s' });
    expect(screen.getByText(/sin conexión/)).toHaveAttribute('title', 'El nodo no respondió en 10 s');
    expect(screen.getByText('(El nodo no respondió en 10 s)')).toBeInTheDocument();
  });
});
