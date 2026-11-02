import { useCurrentClient } from '@mysten/dapp-kit-react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { fetchTransactionInfo } from '../sui/transactionInfo';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/**
 * Hora de una transacción (la de creación de una partida, DL-6). Dato inmutable: `staleTime: Infinity`. Sin digest
 * (`null` o vacío: un frame del nodo sin digest) no consulta. Una transacción podada falla sin reintentos
 * (`TransactionError` no es transitorio) y la fila muestra "—".
 */
export function useTransactionTime(digest: string | null): { timestampMs: number | null; status: ReadStatus } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const query = useQuery({
    queryKey: queryKeys.txInfo(config.network, digest ?? ''),
    queryFn: digest === null || digest === '' ? skipToken : ({ signal }) => fetchTransactionInfo(client, { digest, signal }),
    staleTime: Infinity,
  });
  return { timestampMs: query.data?.timestampMs ?? null, status: deriveReadStatus(query) };
}
