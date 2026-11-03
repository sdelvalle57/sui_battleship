import { cancelledRefund } from '../sui/gameTx';
import { buildCancelGameTx } from '../sui/transactions/game';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Cancelar una partida pendiente propia con la máquina común (DL-10, DL-11). El valor es el reembolso leído del
 * `GameCancelled` de la transacción (`null` si no se pudo leer), nunca supuesto.
 */
export function useCancelGame(): UseExecuteTransaction<bigint | null> & { cancel: (gameId: string) => void } {
  const config = useAppConfig();
  const tx = useExecuteTransaction<bigint | null>();
  const cancel = (gameId: string) => {
    tx.execute({
      action: { kind: 'cancel', gameId },
      build: () => buildCancelGameTx({ packageId: config.packageId, gameId }),
      interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
    });
  };
  return { ...tx, cancel };
}
