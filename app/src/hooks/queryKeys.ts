import type { Network } from '../sui/networks';

/**
 * Claves de TanStack Query de toda la app (DL-13): `'sui'`, la red y el recurso. Así una clave nunca mezcla datos de dos
 * redes y `invalidateQueries({ queryKey: ['sui', network] })` alcanza todo lo de una red. Los `bigint` van como string:
 * TanStack serializa las claves con `JSON.stringify`, que no acepta `bigint`.
 */
export const queryKeys = {
  /** Estado del nodo para el indicador de red. */
  nodeInfo: (network: Network) => ['sui', network, 'nodeInfo'] as const,
  /** Páginas del lobby de partidas abiertas del paquete. */
  lobby: (network: Network, originalPackageId: string) => ['sui', network, 'lobby', originalPackageId] as const,
  /** Detalle de una partida por ID normalizado. */
  game: (network: Network, id: string) => ['sui', network, 'game', id] as const,
  /** Hora y checkpoint de una transacción (inmutable). */
  txInfo: (network: Network, digest: string) => ['sui', network, 'txInfo', digest] as const,
  /**
   * Checkpoint de la publicación (cota del lobby). Clave propia y no `txInfo`: su `queryFn` devuelve otro dato
   * (`bigint | null`, `null` = podada) y compartir la clave mezclaría los dos en la caché.
   */
  publishCheckpoint: (network: Network, digest: string) => ['sui', network, 'publishCheckpoint', digest] as const,
  /** Hora de un checkpoint por número (inmutable). */
  checkpointTime: (network: Network, sequenceNumber: bigint) =>
    ['sui', network, 'checkpointTime', sequenceNumber.toString()] as const,
};
