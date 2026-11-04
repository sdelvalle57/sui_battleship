import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { skipToken, useQuery } from '@tanstack/react-query';
import { fetchHouseCap, type HouseCap } from '../sui/houseCap';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/**
 * Qué se sabe del `HouseCap` de la cuenta (H-2): `unknown` mientras no hubo una lectura exitosa (cargando, reintentando o
 * con error), así un fallo nunca se ve como "esta cuenta no lo tiene"; `known` con el cap o con `null` (certeza de H-1), y
 * se conserva aunque una relectura posterior falle.
 */
export type CapKnowledge = { kind: 'unknown' } | { kind: 'known'; cap: HouseCap | null };

/** Resultado de `useHouseCap`: sin cuenta no hay nada que leer; con cuenta, el conocimiento del cap y su lectura. */
export type UseHouseCap =
  | { kind: 'no_account' }
  | { kind: 'account'; address: string; cap: CapKnowledge; status: ReadStatus; isFetching: boolean; refetch: () => void };

/**
 * El `HouseCap` de la cuenta conectada (D-1), buscado por tipo en el índice de dueños (`fetchHouseCap`), con la política
 * común de lecturas (DL-5): un error de red se reintenta y, mientras tanto, `cap` sigue `unknown`. Sin `placeholderData`:
 * otra cuenta es otra clave y arranca `unknown`. Sin cuenta, `skipToken` (ningún pedido).
 */
export function useHouseCap(): UseHouseCap {
  const config = useAppConfig();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const address = account === null ? null : normalizeSuiAddress(account.address);
  const query = useQuery({
    queryKey: queryKeys.houseCap(config.network, config.originalPackageId, address ?? '0x0'),
    queryFn:
      address === null
        ? skipToken
        : ({ signal }) => fetchHouseCap(client, { owner: address, originalPackageId: config.originalPackageId, signal }),
  });
  if (address === null) return { kind: 'no_account' };
  return {
    kind: 'account',
    address,
    cap: query.data === undefined ? { kind: 'unknown' } : { kind: 'known', cap: query.data },
    status: deriveReadStatus(query),
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}
