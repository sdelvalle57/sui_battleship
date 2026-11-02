import { describe, expect, it } from 'vitest';
import { isNetwork, NETWORKS, shortChainId } from './networks';

describe('NETWORKS', () => {
  it('maps localnet to the local gRPC endpoint without explorer', () => {
    expect(NETWORKS.localnet).toEqual({ grpcUrl: 'http://127.0.0.1:9000', explorerBase: null });
  });

  it('maps testnet to the public fullnode and Suiscan', () => {
    expect(NETWORKS.testnet).toEqual({
      grpcUrl: 'https://fullnode.testnet.sui.io:443',
      explorerBase: 'https://suiscan.xyz/testnet',
    });
  });
});

describe('isNetwork', () => {
  it.each(['localnet', 'testnet'])('accepts %s', (network) => {
    expect(isNetwork(network)).toBe(true);
  });

  it.each(['mainnet', 'devnet', '', 'Testnet', 'toString', 'constructor'])('rejects %j', (value) => {
    expect(isNetwork(value)).toBe(false);
  });
});

describe('shortChainId', () => {
  it('returns the testnet short id', () => {
    expect(shortChainId('69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD')).toBe('4c78adac');
  });

  it('returns the mainnet short id', () => {
    expect(shortChainId('4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S')).toBe('35834a8a');
  });
});
