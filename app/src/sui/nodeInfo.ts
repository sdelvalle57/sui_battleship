import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { shortChainId } from './networks';
import { READ_TIMEOUT_MS, withReadTimeout } from './readPolicy';

/** Cada cuánto el indicador de red vuelve a consultar el nodo. */
export const NODE_STATUS_REFETCH_MS = 20_000;
/**
 * Corte por tiempo de cada intento del indicador. Alias de `READ_TIMEOUT_MS` (DL-5: un único corte para toda lectura),
 * conservado para sus usos existentes. Un nodo que acepta la conexión y no responde cuenta como error: sin corte, la
 * query quedaría colgada, `refetchInterval` no lanzaría otra y el indicador seguiría en "nodo OK" con el dato viejo.
 */
export const NODE_STATUS_TIMEOUT_MS = READ_TIMEOUT_MS;

/**
 * Estado del nodo en un intento: chain id corto (8 hex), altura del último checkpoint y piso del historial que conserva
 * (`lowestAvailableCheckpoint`, M-4; un nodo sin poda informa 0 o nada), si los informa.
 */
export type NodeInfo = { chainId: string; checkpointHeight: bigint | null; lowestAvailableCheckpoint: bigint | null };

/**
 * Consulta viva del nodo (no el chain id que el SDK cachea para siempre) con el corte común de lecturas
 * (`withReadTimeout`): `ledgerService.getServiceInfo({}, { abort })`. Lanza si falta el chain id, si no es base58, si
 * `signal` se aborta o si vence el corte (`ReadTimeoutError`, "El nodo no respondió en 10 s"); quien la llama trata
 * cualquier error como un intento fallido.
 */
export async function fetchNodeInfo(client: Pick<SuiGrpcClient, 'ledgerService'>, signal?: AbortSignal): Promise<NodeInfo> {
  const { response } = await withReadTimeout(signal, async (abort) => client.ledgerService.getServiceInfo({}, { abort }));
  if (!response.chainId) {
    throw new Error('El nodo no informó su chain id');
  }
  return {
    chainId: shortChainId(response.chainId),
    checkpointHeight: response.checkpointHeight ?? null,
    lowestAvailableCheckpoint: response.lowestAvailableCheckpoint ?? null,
  };
}

/** Estado que muestra el indicador de red. */
export type NodeStatus =
  | { kind: 'loading' }
  | { kind: 'ok'; checkpointHeight: bigint | null }
  | { kind: 'wrong_chain'; expected: string; actual: string }
  | { kind: 'offline'; reason: string };

/**
 * Deriva el estado del indicador a partir de la query del nodo. Pura. Prioridad: error del último intento → `offline`
 * (aunque haya un dato previo: TanStack Query lo conserva tras un error); pendiente → `loading`; chain id distinto del
 * esperado → `wrong_chain`; si no, `ok`.
 */
export function deriveNodeStatus(
  q: { isPending: boolean; isError: boolean; error: unknown; data: NodeInfo | undefined },
  expectedChainId: string,
): NodeStatus {
  if (q.isError) {
    return { kind: 'offline', reason: q.error instanceof Error ? q.error.message : String(q.error) };
  }
  if (q.isPending || q.data === undefined) {
    return { kind: 'loading' };
  }
  if (q.data.chainId !== expectedChainId) {
    return { kind: 'wrong_chain', expected: expectedChainId, actual: q.data.chainId };
  }
  return { kind: 'ok', checkpointHeight: q.data.checkpointHeight };
}
