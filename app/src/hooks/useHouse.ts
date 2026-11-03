import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { fetchHouse, type House } from '../sui/house';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/**
 * La House de la config (DL-8): comisión y límites del formulario. Sin intervalo: se relee al montar y al volver el foco
 * (por defecto de TanStack), y la preflight la vuelve a leer antes de firmar (M-2). Política común de lecturas.
 */
export function useHouse(): { house: House | null; status: ReadStatus; isFetching: boolean; refetch: () => void } {
  const config = useAppConfig();
  const client = useCurrentClient();
  const query = useQuery({
    queryKey: queryKeys.house(config.network, config.houseId),
    queryFn: ({ signal }) =>
      fetchHouse(client, { houseId: config.houseId, originalPackageId: config.originalPackageId, signal }),
  });
  return {
    house: query.data ?? null,
    status: deriveReadStatus(query),
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}
