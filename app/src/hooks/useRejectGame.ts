import { cancelledRefund } from '../sui/gameTx';
import { buildRejectGameTx } from '../sui/transactions/game';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Rechazar una invitación recibida con la máquina común (D-20261102-05, DL-11). El valor es el reembolso **al creador**
 * leído del `GameCancelled` (`null` si no se pudo leer). La partida es la de `view`.
 */
export function useRejectGame(view: TxView<GameTarget>): UseExecuteTransaction<bigint | null> & { reject: () => void } {
  const config = useAppConfig();
  const tx = useExecuteTransaction<bigint | null>(view);
  const reject = () => {
    const { gameId } = view.target;
    tx.execute({
      action: { kind: 'reject', gameId },
      build: () => buildRejectGameTx({ packageId: config.packageId, gameId }),
      interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
    });
  };
  return { ...tx, reject };
}
