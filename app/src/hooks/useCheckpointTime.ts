import { useCurrentClient } from '@mysten/dapp-kit-react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { fetchCheckpointTime } from '../sui/transactionInfo';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/** Hora (ms) de un checkpoint, p. ej. la cota del lobby. Inmutable: `staleTime: Infinity`; sin número no consulta. */
export function useCheckpointTime(sequenceNumber: bigint | null): { timestampMs: number | null; status: ReadStatus } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const query = useQuery({
    queryKey: queryKeys.checkpointTime(config.network, sequenceNumber ?? 0n),
    queryFn: sequenceNumber === null ? skipToken : ({ signal }) => fetchCheckpointTime(client, { sequenceNumber, signal }),
    staleTime: Infinity,
  });
  return { timestampMs: query.data ?? null, status: deriveReadStatus(query) };
}
