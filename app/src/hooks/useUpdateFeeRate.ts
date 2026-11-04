import { useCurrentClient } from '@mysten/dapp-kit-react';
import { parseFeeRateUpdated, type FeeRateUpdatedEvent } from '../sui/houseAdmin';
import { buildUpdateFeeRateTx } from '../sui/transactions/house';
import { houseCapPrecheck } from './houseAdminTx';
import type { HouseTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Cambiar la comisión de la House con la máquina común (D-5, D-6). `precheck` del `HouseCap` (H-3); el valor es el
 * `FeeRateUpdated` de la transacción (`null` si no se pudo leer), nunca supuesto (SEG-10). `view` es la del panel.
 */
export function useUpdateFeeRate(
  view: TxView<HouseTarget>,
): UseExecuteTransaction<FeeRateUpdatedEvent | null> & { update: (input: { capId: string; feeRate: number }) => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const tx = useExecuteTransaction<FeeRateUpdatedEvent | null>(view);
  const update = ({ capId, feeRate }: { capId: string; feeRate: number }) => {
    tx.execute({
      action: { kind: 'updateFeeRate' },
      build: () => buildUpdateFeeRateTx({ packageId: config.packageId, houseId: config.houseId, capId, feeRate }),
      precheck: houseCapPrecheck({ client, network: config.network, originalPackageId: config.originalPackageId, capId }),
      interpret: (result) => parseFeeRateUpdated(result, { originalPackageId: config.originalPackageId, houseId: config.houseId }),
    });
  };
  return { ...tx, update };
}
