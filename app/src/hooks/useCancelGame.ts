import { cancelledRefund, duelCancelledRefund } from '../sui/gameTx';
import { buildCancelDuelTx } from '../sui/transactions/duel';
import { buildCancelGameTx } from '../sui/transactions/game';
import { duelSourceOf, type RoutedGame } from './gameRow';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

/**
 * Cancelar una partida pendiente propia con la máquina común (DL-10, DL-11). El valor es el reembolso leído del evento de
 * cancelación de la transacción (`null` si no se pudo leer), nunca supuesto. La partida es la de `view`. #73 (TASK-8a):
 * enruta por la fuente del objeto (`game.source`): `game::*` para la anterior; para la nueva, el builder genérico con el
 * tag del juego del registro y el `DuelCancelled`.
 */
export function useCancelGame(view: TxView<GameTarget>, game: RoutedGame): UseExecuteTransaction<bigint | null> & { cancel: () => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const tx = useExecuteTransaction<bigint | null>(view);
  const cancel = () => {
    const { gameId } = view.target;
    if (game.source === 'legacy') {
      tx.execute({
        action: { kind: 'cancel', gameId },
        build: () => buildCancelGameTx({ packageId: config.packageId, gameId }),
        interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
      });
      return;
    }
    const source = duelSourceOf(registry, game.gameKey);
    tx.execute({
      action: { kind: 'cancel', gameId },
      build: () => buildCancelDuelTx({ packageId: config.packageId, gameTag: source.gameTag, duelId: gameId }),
      interpret: (result) => duelCancelledRefund(result, { source, duelId: gameId }),
    });
  };
  return { ...tx, cancel };
}
