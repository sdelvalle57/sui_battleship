import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { checkHouseCapOwnership, HOUSE_CAP_LOST_MESSAGE } from '../sui/houseCap';
import type { Network } from '../sui/networks';
import { queryKeys } from './queryKeys';
import type { TxPrecheckStop } from './txSession';

/**
 * `precheck` común de las tres acciones de la House (H-3, LIM-5): antes de la preflight confirma por `getObject` (el store
 * de objetos, que va por delante del índice de dueños, V-12) que el cap sigue siendo de la cuenta que firma. Si no, corta
 * sin abrir la wallet con `HOUSE_CAP_LOST_MESSAGE` e invalida el `HouseCap` de esa cuenta, así el panel vuelve a buscarlo.
 * Un error de lectura se relanza: la máquina lo muestra como texto de red o "No se pudo preparar la transacción: …" (V-7).
 */
export function houseCapPrecheck({
  client,
  network,
  originalPackageId,
  capId,
}: {
  client: Pick<SuiGrpcClient, 'getObject'>;
  network: Network;
  originalPackageId: string;
  capId: string;
}): (signal: AbortSignal, sender: string) => Promise<TxPrecheckStop | null> {
  return async (signal, sender) => {
    const ownership = await checkHouseCapOwnership(client, { capId, owner: sender, originalPackageId, signal });
    return ownership === 'owned'
      ? null
      : { stop: HOUSE_CAP_LOST_MESSAGE, invalidate: [queryKeys.houseCap(network, originalPackageId, sender)] };
  };
}
