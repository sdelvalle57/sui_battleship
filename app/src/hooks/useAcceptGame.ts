import { useCurrentAccount } from '@mysten/dapp-kit-react';
import type { GameResolvedEvent } from '../sui/events';
import type { Game } from '../sui/game';
import { parseResolvedGame } from '../sui/gameTx';
import { buildAcceptGameTx } from '../sui/transactions/game';
import type { GameTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Aceptar una partida con la máquina común (DL-1, DL-2, DL-3 de #12): iguala la apuesta del `Game` leído y el contrato
 * sortea y paga en la misma transacción. Sin `precheck`: la preflight ya valida estado, versión y House. El valor es el
 * `GameResolved` de **esta** partida con la cuenta como aceptante, leído de la confirmación del nodo (`null` si no
 * está): el ganador nunca se anticipa (SEG-10). La partida es la de `view`.
 */
export function useAcceptGame(
  view: TxView<GameTarget>,
  game: Pick<Game, 'bet'>,
): UseExecuteTransaction<GameResolvedEvent | null> & { accept: () => void } {
  const config = useAppConfig();
  const account = useCurrentAccount();
  const tx = useExecuteTransaction<GameResolvedEvent | null>(view);
  const sender = account?.address ?? null;
  const accept = () => {
    const { gameId } = view.target;
    tx.execute({
      action: { kind: 'accept', gameId },
      build: () => buildAcceptGameTx({ packageId: config.packageId, houseId: config.houseId, gameId, bet: game.bet }),
      interpret: (result) =>
        sender === null ? null : parseResolvedGame(result, { originalPackageId: config.originalPackageId, gameId, acceptor: sender }),
    });
  };
  return { ...tx, accept };
}
