import { isValidSuiObjectId, isValidTransactionDigest } from '@mysten/sui/utils';
import { NETWORKS, type Network } from './networks';

/**
 * Link al explorador de una transacción, o `null` si la red no tiene explorador (localnet). Lanza si `digest` no es
 * un digest válido: la validación va antes que la red para que un dato corrupto falle igual en cualquier red.
 */
export function explorerTxUrl(network: Network, digest: string): string | null {
  if (!isValidTransactionDigest(digest)) {
    throw new Error(`Digest de transacción inválido: ${JSON.stringify(digest)}`);
  }
  const base = NETWORKS[network].explorerBase;
  return base === null ? null : `${base}/tx/${digest}`;
}

/**
 * Link al explorador de un objeto, o `null` si la red no tiene explorador (localnet). Lanza si `id` no es un ID de
 * objeto válido; igual que en `explorerTxUrl`, la validación va antes que la red.
 */
export function explorerObjectUrl(network: Network, id: string): string | null {
  if (!isValidSuiObjectId(id)) {
    throw new Error(`ID de objeto inválido: ${JSON.stringify(id)}`);
  }
  const base = NETWORKS[network].explorerBase;
  return base === null ? null : `${base}/object/${id}`;
}
