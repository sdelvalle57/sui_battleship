import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { houseChangeMessage, houseTermsChanges, type HouseTerms } from '../sui/createGame';
import type { GameCreatedEvent } from '../sui/events';
import { parseCreatedGame } from '../sui/gameTx';
import { fetchHouse } from '../sui/house';
import { buildCreateGameTx } from '../sui/transactions/game';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Lo que se lee de una creación exitosa: la partida creada (DL-9; `null` si no se pudo identificar) y si la comisión
 * guardada difiere de la mostrada (M-2).
 */
export type CreateGameValue = {
  created: GameCreatedEvent | null;
  feeChanged: { from: number; to: number } | null;
};

/** Datos del formulario ya validados (`validateCreateGame`) y los términos de la House que se mostraron. */
export type CreateGameInput = { bet: bigint; opponent: string | null; shown: HouseTerms };

/**
 * Crear una partida con la máquina común (DL-11). Antes de la preflight relee la House (M-2): si la comisión o los
 * límites mostrados cambiaron, se detiene sin abrir la wallet e invalida la House para que el formulario muestre lo
 * nuevo.
 */
export function useCreateGame(): UseExecuteTransaction<CreateGameValue> & { create: (input: CreateGameInput) => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const tx = useExecuteTransaction<CreateGameValue>();
  const sender = account?.address ?? null;

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
      interpret: (result) => {
        const created =
          sender === null ? null : parseCreatedGame(result, { originalPackageId: config.originalPackageId, sender });
        return {
          created,
          feeChanged: created !== null && created.feeRate !== shown.feeRate ? { from: shown.feeRate, to: created.feeRate } : null,
        };
      },
    });
  };

  return { ...tx, create };
}
