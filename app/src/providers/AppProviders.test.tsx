import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useAppConfig } from '../hooks/useAppConfig';
import type { AppConfig } from '../sui/config';
import type { AppDAppKit } from '../sui/dappKit';
import { readRetryDelay, shouldRetryRead } from '../sui/readPolicy';
import { AppProviders } from './AppProviders';

vi.mock('@mysten/dapp-kit-react', () => ({ DAppKitProvider: ({ children }: { children: ReactNode }) => children }));

const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '1f1f882e',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};

function Probe() {
  const queries = useQueryClient().getDefaultOptions().queries;
  const config = useAppConfig();
  return (
    <p>
      {queries?.retry === shouldRetryRead && queries.retryDelay === readRetryDelay ? 'política común' : 'otra política'} ·{' '}
      {config.network}
    </p>
  );
}

describe('AppProviders', () => {
  it('shares the read retry policy in the QueryClient and provides the config', () => {
    render(
      <AppProviders dAppKit={{} as AppDAppKit} config={CONFIG}>
        <Probe />
      </AppProviders>,
    );
    expect(screen.getByText('política común · localnet')).toBeInTheDocument();
  });
});
