import { cancelledRefund, duelCancelledRefund } from '../sui/gameTx';
import { buildRejectDuelTx } from '../sui/transactions/duel';
import { buildRejectGameTx } from '../sui/transactions/game';
import { duelSourceOf, type RoutedGame } from './gameRow';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

/**
 * Rechazar una invitación recibida con la máquina común (D-20261102-05, DL-11). El valor es el reembolso **al creador**
 * leído del evento de cancelación (`null` si no se pudo leer). La partida es la de `view`. #73 (TASK-8a): enruta por la
 * fuente del objeto (`game.source`), como `useCancelGame`.
 */
export function useRejectGame(view: TxView<GameTarget>, game: RoutedGame): UseExecuteTransaction<bigint | null> & { reject: () => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const tx = useExecuteTransaction<bigint | null>(view);
  const reject = () => {
    const { gameId } = view.target;
    if (game.source === 'legacy') {
      tx.execute({
        action: { kind: 'reject', gameId },
        build: () => buildRejectGameTx({ packageId: config.packageId, gameId }),
        interpret: (result) => cancelledRefund(result, { originalPackageId: config.originalPackageId, gameId }),
      });
      return;
    }
    const source = duelSourceOf(registry, game.gameKey);
    tx.execute({
      action: { kind: 'reject', gameId },
      build: () => buildRejectDuelTx({ packageId: config.packageId, gameTag: source.gameTag, duelId: gameId }),
      interpret: (result) => duelCancelledRefund(result, { source, duelId: gameId }),
    });
  };
  return { ...tx, reject };
}
