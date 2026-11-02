import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { deriveNodeStatus, fetchNodeInfo, NODE_STATUS_REFETCH_MS, type NodeStatus } from '../sui/nodeInfo';
import { useAppConfig } from './useAppConfig';

/**
 * Estado del nodo de la red activa, consultado cada `NODE_STATUS_REFETCH_MS`. El `signal` de TanStack Query se pasa
 * a `fetchNodeInfo` para cancelar el intento si la query se descarta.
 */
export function useNodeStatus(): NodeStatus {
  const config = useAppConfig();
  const client = useCurrentClient();
  const query = useQuery({
    queryKey: ['sui', config.network, 'nodeInfo'],
    queryFn: ({ signal }) => fetchNodeInfo(client, signal),
    refetchInterval: NODE_STATUS_REFETCH_MS,
  });
  return deriveNodeStatus(query, config.chainId);
}
