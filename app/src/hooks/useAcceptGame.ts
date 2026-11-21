import { parseResolvedDuel, parseResolvedGame, type ResolvedGame } from '../sui/gameTx';
import { buildAcceptCoinflipTx } from '../sui/transactions/duel';
import { buildAcceptGameTx } from '../sui/transactions/game';
import { duelSourceOf, type GameRow } from './gameRow';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

/**
 * Aceptar una partida con la máquina común (DL-1, DL-2, DL-3 de #12): iguala la apuesta de la partida leída y el contrato
 * sortea y paga en la misma transacción. Sin `precheck`: la preflight ya valida estado, versión y House. El valor es el
 * resultado de **esta** partida con la cuenta como aceptante, leído de la confirmación del nodo (`null` si no está): el
 * ganador nunca se anticipa (SEG-10). La partida es la de `view`.
 *
 * #73 (TASK-8a): enruta por la **fuente del objeto** (`game.source`, la del tipo exacto que devolvió el detalle o la fila): la
 * anterior usa el builder y el intérprete de `game::*`; la nueva, los del coinflip nuevo con la fuente del registro (el
 * `DuelResolved` de la misma transacción es el resultado; el `DuelActivated` no).
 */
export function useAcceptGame(
  view: TxView<GameTarget>,
  game: Pick<GameRow, 'bet' | 'gameKey' | 'source'>,
): UseExecuteTransaction<ResolvedGame | null> & { accept: () => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const tx = useExecuteTransaction<ResolvedGame | null>(view);
  const accept = () => {
    const { gameId } = view.target;
    if (game.source === 'legacy') {
      tx.execute({
        action: { kind: 'accept', gameId },
        build: () => buildAcceptGameTx({ packageId: config.packageId, houseId: config.houseId, gameId, bet: game.bet }),
        // El aceptante es la cuenta que firmó (DL-11 de #13), no la que esté conectada al terminar.
        interpret: (result, signer) =>
          parseResolvedGame(result, { originalPackageId: config.originalPackageId, gameId, acceptor: signer }),
      });
      return;
    }
    const source = duelSourceOf(registry, game.gameKey);
    tx.execute({
      action: { kind: 'accept', gameId },
      build: () => buildAcceptCoinflipTx({ packageId: config.packageId, houseId: config.houseId, duelId: gameId, bet: game.bet }),
      interpret: (result, signer) => parseResolvedDuel(result, { source, duelId: gameId, acceptor: signer }),
    });
  };
  return { ...tx, accept };
}
