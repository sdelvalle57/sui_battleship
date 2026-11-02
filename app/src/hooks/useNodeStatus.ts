import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { deriveNodeStatus, fetchNodeInfo, NODE_STATUS_REFETCH_MS, type NodeStatus } from '../sui/nodeInfo';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/**
 * Estado del nodo de la red activa, consultado cada `NODE_STATUS_REFETCH_MS` con la política común de reintentos del
 * `QueryClient` (pasa por `retrying` antes de `offline`). El `signal` de TanStack Query se pasa a `fetchNodeInfo` para
 * cancelar el intento si la query se descarta.
 */
export function useNodeStatus(): NodeStatus {
  const config = useAppConfig();
  const client = useCurrentClient();
  const query = useQuery({
    queryKey: queryKeys.nodeInfo(config.network),
    queryFn: ({ signal }) => fetchNodeInfo(client, signal),
    refetchInterval: NODE_STATUS_REFETCH_MS,
  });
  return deriveNodeStatus(query, config.chainId);
}
