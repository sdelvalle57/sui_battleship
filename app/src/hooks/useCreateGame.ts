import { useCurrentClient } from '@mysten/dapp-kit-react';
import { houseChangeMessage, houseTermsChanges, type HouseTerms } from '../sui/createGame';
import { parseCreatedGame } from '../sui/gameTx';
import { fetchHouse } from '../sui/house';
import { buildCreateGameTx } from '../sui/transactions/game';
import { queryKeys } from './queryKeys';
import type { CreateGameValue, CreateTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

export type { CreateGameValue } from './txSession';

/** Datos del formulario ya validados (`validateCreateGame`) y los términos de la House que se mostraron. */
export type CreateGameInput = { bet: bigint; opponent: string | null; shown: HouseTerms };

/**
 * Crear una partida con la máquina común (DL-11). Antes de la preflight relee la House (M-2): si la comisión o los
 * límites mostrados cambiaron, se detiene sin abrir la wallet e invalida la House para que el formulario muestre lo
 * nuevo. `view` es la de la vista (`useTxTarget({ kind: 'create' })`).
 */
export function useCreateGame(
  view: TxView<CreateTarget>,
): UseExecuteTransaction<CreateGameValue> & { create: (input: CreateGameInput) => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const tx = useExecuteTransaction<CreateGameValue>(view);

  const create = ({ bet, opponent, shown }: CreateGameInput) => {
    tx.execute({
      action: { kind: 'create' },
      build: () => buildCreateGameTx({ packageId: config.packageId, houseId: config.houseId, bet, opponent }),
      precheck: async (signal) => {
        const fresh = await fetchHouse(client, { houseId: config.houseId, originalPackageId: config.originalPackageId, signal });
        const change = houseTermsChanges(shown, fresh);
        return change === null
          ? null
          : { stop: houseChangeMessage(change), invalidate: [queryKeys.house(config.network, config.houseId)] };
      },
      // El creador es la cuenta que firmó (DL-11 de #13), no la que esté conectada al terminar.
      interpret: (result, signer) => {
        const created = parseCreatedGame(result, { originalPackageId: config.originalPackageId, sender: signer });
        return {
          created,
          feeChanged: created !== null && created.feeRate !== shown.feeRate ? { from: shown.feeRate, to: created.feeRate } : null,
        };
      },
    });
  };

  return { ...tx, create };
}
