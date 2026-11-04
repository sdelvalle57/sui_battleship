import { normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui/utils';
import type { Network } from '../sui/networks';
import type { TxTarget } from './txSession';

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
  /** Objeto House (comisión y límites): se relee al montar y al foco, y se invalida si cambió (M-2). */
  house: (network: Network, houseId: string) => ['sui', network, 'house', houseId] as const,
  /** Saldo de SUI de una cuenta, con la dirección normalizada (una cuenta, una clave). */
  balance: (network: Network, address: string) => ['sui', network, 'balance', normalizeSuiAddress(address)] as const,
  /** Hora de un checkpoint por número (inmutable). */
  checkpointTime: (network: Network, sequenceNumber: bigint) =>
    ['sui', network, 'checkpointTime', sequenceNumber.toString()] as const,
  /**
   * Clave de **mutación** de todas las transacciones de una cuenta (DL-7 de #12): el candado global (`isMutating` con
   * esta clave parcial) y el "en curso" de cualquier objetivo. Sin cuenta, `'none'`.
   */
  txAccount: (network: Network, address: string | null) =>
    ['sui', network, 'tx', address === null ? 'none' : normalizeSuiAddress(address)] as const,
  /** Clave de **mutación** de un objetivo de la cuenta: crear, o una partida por ID normalizado (M-5). */
  txTarget: (network: Network, address: string | null, target: TxTarget) =>
    target.kind === 'create'
      ? ([...queryKeys.txAccount(network, address), 'create'] as const)
      : ([...queryKeys.txAccount(network, address), 'game', normalizeSuiObjectId(target.gameId)] as const),
};
