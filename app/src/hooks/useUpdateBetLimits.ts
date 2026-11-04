import { useCurrentClient } from '@mysten/dapp-kit-react';
import { parseBetLimitsUpdated, type BetLimitsUpdatedEvent } from '../sui/houseAdmin';
import { buildUpdateBetLimitsTx } from '../sui/transactions/house';
import { houseCapPrecheck } from './houseAdminTx';
import type { HouseTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/** Datos de `useUpdateBetLimits().update`: el cap y los límites nuevos ya validados (`validateBetLimits`), en MIST. */
export type UpdateBetLimitsInput = { capId: string; minBet: bigint; maxBet: bigint };

/**
 * Cambiar los límites de apuesta de la House con la máquina común (D-5, D-6). `precheck` del `HouseCap` (H-3); el valor
 * es el `BetLimitsUpdated` de la transacción (`null` si no se pudo leer). `view` es la del panel.
 */
export function useUpdateBetLimits(
  view: TxView<HouseTarget>,
): UseExecuteTransaction<BetLimitsUpdatedEvent | null> & { update: (input: UpdateBetLimitsInput) => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const tx = useExecuteTransaction<BetLimitsUpdatedEvent | null>(view);
  const update = ({ capId, minBet, maxBet }: UpdateBetLimitsInput) => {
    tx.execute({
      action: { kind: 'updateBetLimits' },
      build: () => buildUpdateBetLimitsTx({ packageId: config.packageId, houseId: config.houseId, capId, minBet, maxBet }),
      precheck: houseCapPrecheck({ client, network: config.network, originalPackageId: config.originalPackageId, capId }),
      interpret: (result) => parseBetLimitsUpdated(result, { originalPackageId: config.originalPackageId, houseId: config.houseId }),
    });
  };
  return { ...tx, update };
}
