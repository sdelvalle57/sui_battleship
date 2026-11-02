import { fromBase58, toHex } from '@mysten/sui/utils';

/** Redes que admite un build de la app (D-20261102-02 (2)): mainnet queda fuera a propósito. */
export type Network = 'localnet' | 'testnet';

/**
 * Endpoints por red: `grpcUrl` para `SuiGrpcClient` (gRPC-web) y `explorerBase` para los links al explorador
 * (Suiscan en testnet; `null` en localnet, que no tiene explorador público — D-20261102-02 (6)).
 */
export const NETWORKS: Record<Network, { grpcUrl: string; explorerBase: string | null }> = {
  localnet: { grpcUrl: 'http://127.0.0.1:9000', explorerBase: null },
  testnet: { grpcUrl: 'https://fullnode.testnet.sui.io:443', explorerBase: 'https://suiscan.xyz/testnet' },
};

/**
 * Indica si `x` es una red admitida. Usa `Object.hasOwn` y no `in` para que claves heredadas del prototipo
 * (`toString`, `constructor`…) no pasen como red.
 */
export function isNetwork(x: string): x is Network {
  return Object.hasOwn(NETWORKS, x);
}

/**
 * Identificador corto de la red: los 8 primeros caracteres hex del chain id (digest base58 del checkpoint génesis),
 * el mismo formato que imprime `sui client chain-identifier`.
 */
export function shortChainId(base58: string): string {
  return toHex(fromBase58(base58)).slice(0, 8);
}
