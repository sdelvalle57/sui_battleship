import { useCurrentClient } from '@mysten/dapp-kit-react';
import { houseChangeMessage, houseTermsChanges, type HouseTerms } from '../sui/createGame';
import type { GameKey } from '../sui/gameRegistry';
import { parseCreatedDuel, parseCreatedGame } from '../sui/gameTx';
import { fetchHouse } from '../sui/house';
import { buildCreateCoinflipTx } from '../sui/transactions/duel';
import { buildCreateGameTx } from '../sui/transactions/game';
import { creatableGameOf, duelSourceOf } from './gameRow';
import { queryKeys } from './queryKeys';
import type { CreateGameValue, CreateTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';
import { useGameRegistry } from './useGameRegistry';

export type { CreateGameValue } from './txSession';

/** Datos del formulario ya validados (`validateCreateGame`) y los términos de la House que se mostraron. */
export type CreateGameInput = { bet: bigint; opponent: string | null; shown: HouseTerms };

/**
 * Crear una partida con la máquina común (DL-11). Antes de la preflight relee la House (M-2): si la comisión o los
 * límites mostrados cambiaron, se detiene sin abrir la wallet e invalida la House para que el formulario muestre lo
 * nuevo. `view` es la de la vista (`useTxTarget({ kind: 'create' })`).
 *
 * #73 (TASK-8a): enruta por `GameDef.createSource` del juego (`gameKey`, por defecto el primero que se puede crear): `legacy`
 * (mientras la config no tenga upgrades) arma `game::create_game` y lee su `GameCreated`; `duel` arma el coinflip nuevo
 * (control 0) y lee su `DuelCreated`, con la fuente del registro. El valor tiene la forma neutral `CreateGameValue`.
 */
export function useCreateGame(
  view: TxView<CreateTarget>,
  gameKey?: GameKey,
): UseExecuteTransaction<CreateGameValue> & { create: (input: CreateGameInput) => void } {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const client = useCurrentClient();
  const tx = useExecuteTransaction<CreateGameValue>(view);

  const create = ({ bet, opponent, shown }: CreateGameInput) => {
    const def = creatableGameOf(registry, gameKey);
    const source = def.createSource === 'duel' ? duelSourceOf(registry, def.key) : null;
    const withFeeChange = (created: CreateGameValue['created']): CreateGameValue => ({
      created,
      feeChanged: created !== null && created.feeRate !== shown.feeRate ? { from: shown.feeRate, to: created.feeRate } : null,
    });
    tx.execute({
      action: { kind: 'create' },
      build: () =>
        source === null
          ? buildCreateGameTx({ packageId: config.packageId, houseId: config.houseId, bet, opponent })
          : buildCreateCoinflipTx({ packageId: config.packageId, houseId: config.houseId, bet, opponent }),
      precheck: async (signal) => {
        const fresh = await fetchHouse(client, { houseId: config.houseId, originalPackageId: config.originalPackageId, signal });
        const change = houseTermsChanges(shown, fresh);
        return change === null
          ? null
          : { stop: houseChangeMessage(change), invalidate: [queryKeys.house(config.network, config.houseId)] };
      },
      // El creador es la cuenta que firmó (DL-11 de #13), no la que esté conectada al terminar.
      interpret: (result, signer) =>
        withFeeChange(
          source === null
            ? parseCreatedGame(result, { originalPackageId: config.originalPackageId, sender: signer })
            : parseCreatedDuel(result, { source, sender: signer }),
        ),
    });
  };

  return { ...tx, create };
}
