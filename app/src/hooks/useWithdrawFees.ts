import { useCurrentClient } from '@mysten/dapp-kit-react';
import { parseFeesWithdrawn } from '../sui/houseAdmin';
import { buildWithdrawFeesTx } from '../sui/transactions/house';
import { houseCapPrecheck } from './houseAdminTx';
import type { HouseTarget, TxView } from './txSession';
import { useAppConfig } from './useAppConfig';
import { useExecuteTransaction, type UseExecuteTransaction } from './useExecuteTransaction';

/**
 * Retirar todas las comisiones de la House con la máquina común (D-5, D-6). El destino es la cuenta que firma **por
 * construcción** (N-2, D-20261104-02 (5)): `build` recibe la cuenta capturada en el clic y la usa como `recipient`, sin
 * campo de destino ni monto parcial. `precheck` del `HouseCap` (H-3); el valor es el monto del `FeesWithdrawn` (lo
 * retirado al ejecutarse, `null` si no se pudo leer).
 */
export function useWithdrawFees(view: TxView<HouseTarget>): UseExecuteTransaction<bigint | null> & { withdraw: (input: { capId: string }) => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const tx = useExecuteTransaction<bigint | null>(view);
  const withdraw = ({ capId }: { capId: string }) => {
    tx.execute({
      action: { kind: 'withdrawFees' },
      build: (sender) => buildWithdrawFeesTx({ packageId: config.packageId, houseId: config.houseId, capId, recipient: sender }),
      precheck: houseCapPrecheck({ client, network: config.network, originalPackageId: config.originalPackageId, capId }),
      interpret: (result) => parseFeesWithdrawn(result, { originalPackageId: config.originalPackageId, houseId: config.houseId }),
    });
  };
  return { ...tx, withdraw };
}
