import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { shortChainId } from './networks';

/** Cada cuánto el indicador de red vuelve a consultar el nodo. */
export const NODE_STATUS_REFETCH_MS = 20_000;
/**
 * Corte por tiempo de cada intento: un nodo que acepta la conexión y no responde cuenta como error. Sin él, la query
 * quedaría colgada, `refetchInterval` no lanzaría otra y el indicador seguiría en "nodo OK" con el dato viejo.
 */
export const NODE_STATUS_TIMEOUT_MS = 10_000;

/** Estado del nodo en un intento: chain id corto (8 hex) y altura del último checkpoint, si la informa. */
export type NodeInfo = { chainId: string; checkpointHeight: bigint | null };

/**
 * Consulta viva del nodo (no el chain id que el SDK cachea para siempre) con corte por tiempo:
 * `ledgerService.getServiceInfo({}, { abort })`. Lanza si falta el chain id, si no es base58, si `signal` se aborta o
 * si vence `NODE_STATUS_TIMEOUT_MS`; quien la llama trata cualquier error como un intento fallido.
 *
 * El corte usa `AbortController` + `setTimeout` (limpiado en `finally`) y no `AbortSignal.timeout`: es equivalente,
 * pero `AbortSignal.timeout` no avanza con los timers falsos de Vitest en jsdom y el caso del nodo colgado no se
 * podría probar.
 */
export async function fetchNodeInfo(client: SuiGrpcClient, signal?: AbortSignal): Promise<NodeInfo> {
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    timeout.abort(new Error(`El nodo no respondió en ${String(NODE_STATUS_TIMEOUT_MS / 1000)} s`));
  }, NODE_STATUS_TIMEOUT_MS);
  const abort = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
  try {
    const { response } = await client.ledgerService.getServiceInfo({}, { abort });
    if (!response.chainId) {
      throw new Error('El nodo no informó su chain id');
    }
    return { chainId: shortChainId(response.chainId), checkpointHeight: response.checkpointHeight ?? null };
  } finally {
    clearTimeout(timer);
  }
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
