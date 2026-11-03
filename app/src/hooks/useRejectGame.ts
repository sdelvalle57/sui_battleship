import { cancelledRefund } from '../sui/gameTx';
import { buildRejectGameTx } from '../sui/transactions/game';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Rechazar una invitación recibida con la máquina común (D-20261102-05, DL-11). El valor es el reembolso **al creador**
 * leído del `GameCancelled` (`null` si no se pudo leer).
 */
export function useRejectGame(): UseExecuteTransaction<bigint | null> & { reject: (gameId: string) => void } {
  const config = useAppConfig();
  const tx = useExecuteTransaction<bigint | null>();
  const reject = (gameId: string) => {
    tx.execute({
      action: { kind: 'reject', gameId },
      build: () => buildRejectGameTx({ packageId: config.packageId, gameId }),
      interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
    });
  };
  return { ...tx, reject };
}
