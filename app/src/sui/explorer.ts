import { isValidSuiAddress, isValidSuiObjectId, isValidTransactionDigest } from '@mysten/sui/utils';
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

/**
 * Link al historial de una cuenta en el explorador ("Ver tu historial completo en el explorador", DL-15 de #13), o
 * `null` si la red no tiene explorador (localnet). Es la salida para lo que ya no cubre la ventana del fullnode
 * (D-20261103-03). Lanza si `address` no es una dirección válida; igual que en `explorerTxUrl`, la validación va antes
 * que la red.
 */
export function explorerAccountUrl(network: Network, address: string): string | null {
  if (!isValidSuiAddress(address)) {
    throw new Error(`Dirección inválida: ${JSON.stringify(address)}`);
  }
  const base = NETWORKS[network].explorerBase;
  return base === null ? null : `${base}/account/${address}`;
}
