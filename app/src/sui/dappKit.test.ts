import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from './config';
import { createAppDAppKit } from './dappKit';

vi.mock('@mysten/dapp-kit-core', () => ({ createDAppKit: vi.fn(() => ({})) }));
vi.mock('@mysten/sui/grpc', () => ({
  SuiGrpcClient: vi.fn(
    class {
      constructor(readonly options: unknown) {}
    },
  ),
}));

const IDS = {
  chainId: '4c78adac',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
};
const LOCALNET: AppConfig = {
  ...IDS,
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  burnerWalletEnabled: true,
};
const TESTNET: AppConfig = {
  ...IDS,
  network: 'testnet',
  grpcUrl: 'https://fullnode.testnet.sui.io:443',
  burnerWalletEnabled: false,
};

function optionsOf(config: AppConfig) {
  createAppDAppKit(config);
  const options = vi.mocked(createDAppKit).mock.calls.at(-1)?.[0];
  if (options === undefined) {
    throw new Error('createDAppKit no se llamó');
  }
  return options;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createAppDAppKit', () => {
  it('configures localnet with the burner wallet and without Slush', () => {
    const options = optionsOf(LOCALNET);
    expect(options.networks).toEqual(['localnet']);
    expect(options.enableBurnerWallet).toBe(true);
    expect(options).toHaveProperty('slushWalletConfig', null);
  });

  it('keeps the burner wallet off on localnet when the config disables it', () => {
    expect(optionsOf({ ...LOCALNET, burnerWalletEnabled: false }).enableBurnerWallet).toBe(false);
  });

  it('configures testnet without the burner wallet and with the default Slush config', () => {
    const options = optionsOf(TESTNET);
    expect(options.networks).toEqual(['testnet']);
    expect(options.enableBurnerWallet).toBe(false);
    expect(options).not.toHaveProperty('slushWalletConfig');
  });

  it.each([LOCALNET, TESTNET])('creates a SuiGrpcClient for $network with config.grpcUrl', (config) => {
    const client = optionsOf(config).createClient(config.network);
    expect(client).toBeInstanceOf(SuiGrpcClient);
    expect(SuiGrpcClient).toHaveBeenCalledWith({ network: config.network, baseUrl: config.grpcUrl });
  });
});
