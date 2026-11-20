import { parseExpiredDuel, type ExpiredGame } from '../sui/gameTx';
import { buildRefundStalledTx } from '../sui/transactions/duel';
import { duelSourceOf, type DuelGameRow } from './gameRow';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

/**
 * Reembolsar una partida estancada de la fuente nueva con la máquina común (#73, TASK-8a): ambos jugadores pendientes tras el
 * plazo, o uno pendiente pasada la gracia; cada jugador recupera su apuesta, sin comisión y sin tocar la House. Cualquiera
 * puede ejecutarlo. El valor es el `DuelExpired` de **esta** partida, leído de la confirmación del nodo (`null` si no está).
 * Sin `precheck`: la elegibilidad (`ENotStalled`, `ENotActive`) la decide la cadena en la preflight. La partida es la de
 * `view`.
 */
export function useRefundStalled(
  view: TxView<GameTarget>,
  game: Pick<DuelGameRow, 'gameKey' | 'source'>,
): UseExecuteTransaction<ExpiredGame | null> & { refund: () => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const tx = useExecuteTransaction<ExpiredGame | null>(view);
  const refund = () => {
    const { gameId } = view.target;
    const source = duelSourceOf(registry, game.gameKey);
    tx.execute({
      action: { kind: 'refundStalled', gameId },
      build: () => buildRefundStalledTx({ packageId: config.packageId, gameTag: source.gameTag, duelId: gameId }),
      interpret: (result) => parseExpiredDuel(result, { source, duelId: gameId }),
    });
  };
  return { ...tx, refund };
}
