import { cancelledRefund } from '../sui/gameTx';
import { buildCancelGameTx } from '../sui/transactions/game';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Cancelar una partida pendiente propia con la máquina común (DL-10, DL-11). El valor es el reembolso leído del
 * `GameCancelled` de la transacción (`null` si no se pudo leer), nunca supuesto. La partida es la de `view`.
 */
export function useCancelGame(view: TxView<GameTarget>): UseExecuteTransaction<bigint | null> & { cancel: () => void } {
  const config = useAppConfig();
  const tx = useExecuteTransaction<bigint | null>(view);
  const cancel = () => {
    const { gameId } = view.target;
    tx.execute({
      action: { kind: 'cancel', gameId },
      build: () => buildCancelGameTx({ packageId: config.packageId, gameId }),
      interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
    });
  };
  return { ...tx, cancel };
}
