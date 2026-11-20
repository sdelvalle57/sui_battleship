import { parseTimedOutDuel, type TimedOutGame } from '../sui/gameTx';
import { buildClaimTimeoutTx } from '../sui/transactions/duel';
import { duelSourceOf, type DuelGameRow } from './gameRow';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

/**
 * Reclamar la victoria por tiempo agotado de una partida de la fuente nueva con la máquina común (#73, TASK-8a): cualquiera
 * puede ejecutarlo y el pozo menos la comisión va al **rival** del que debía mover, nunca a quien llama. Lleva la House (cobra
 * la comisión). El valor es el `DuelTimedOut` de **esta** partida con la cuenta como quien reclamó, leído de la confirmación
 * del nodo (`null` si no está). Sin `precheck`: la elegibilidad (`ENotExpired`, `ENotActive`, `EBothPending`) la decide la
 * cadena en la preflight y se muestra con su mensaje. La partida es la de `view`.
 */
export function useClaimTimeout(
  view: TxView<GameTarget>,
  game: Pick<DuelGameRow, 'gameKey' | 'source'>,
): UseExecuteTransaction<TimedOutGame | null> & { claim: () => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const tx = useExecuteTransaction<TimedOutGame | null>(view);
  const claim = () => {
    const { gameId } = view.target;
    const source = duelSourceOf(registry, game.gameKey);
    tx.execute({
      action: { kind: 'claim', gameId },
      build: () => buildClaimTimeoutTx({ packageId: config.packageId, gameTag: source.gameTag, houseId: config.houseId, duelId: gameId }),
      // Quien reclama es la cuenta que firmó (DL-11 de #13), no la que esté conectada al terminar.
      interpret: (result, signer) => parseTimedOutDuel(result, { source, duelId: gameId, claimedBy: signer }),
    });
  };
  return { ...tx, claim };
}
