import { useIsMutating } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useWalletAccount } from './useWalletAccount';

/**
 * Hay una transacción de la cuenta conectada en curso, de cualquier objetivo (el candado global de DL-7 de #12). Lo usa
 * "Mis partidas" para mostrar el aviso "en curso" una sola vez por página (DL-6 de #13) en vez de uno por fila. Sin
 * cuenta, `false`: una vista sin cuenta no lanza nada que bloquear.
 */
export function useAccountTxBusy(): boolean {
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const pending = useIsMutating({ mutationKey: queryKeys.txAccount(network, address) });
  return address !== null && pending > 0;
}
