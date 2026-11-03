import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { fetchSuiBalance } from '../sui/account';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/**
 * Saldo de SUI de la cuenta conectada (DL-8), con la política común de lecturas. Sin cuenta no consulta (`skipToken`) y
 * el saldo es `null`. Una transacción propia lo invalida (DL-6).
 */
export function useSuiBalance(): { balance: bigint | null; status: ReadStatus; isFetching: boolean; refetch: () => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const owner = account?.address ?? null;
  const query = useQuery({
    queryKey: queryKeys.balance(config.network, owner ?? '0x0'),
    queryFn: owner === null ? skipToken : ({ signal }) => fetchSuiBalance(client, { owner, signal }),
  });
  return {
    balance: owner === null ? null : (query.data ?? null),
    status: deriveReadStatus(query),
    isFetching: query.isFetching,
    refetch: () => {
      if (owner !== null) void query.refetch();
    },
  };
}
