import { useCurrentClient } from '@mysten/dapp-kit-react';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { Game } from '../sui/game';
import { fetchGame, GAME_REFETCH_MS } from '../sui/gameDetail';
import { parseObjectIdInput } from '../sui/ids';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';

/** Resultado de `useGame`: ID inválido (sin consulta) o la lectura de la partida con su estado. */
export type UseGameResult =
  | { kind: 'invalid_id' }
  | {
      kind: 'read';
      id: string;
      game: Game | null;
      previousTransaction: string | null;
      status: ReadStatus;
      /** La query está pidiendo: para deshabilitar "Reintentar". */
      isFetching: boolean;
      refetch: () => void;
    };

/**
 * Partida por un ID crudo de la URL: se valida y normaliza en el borde (D12, SEG-9); inválido ⇒ `invalid_id` sin
 * consultar. Se refresca cada `GAME_REFETCH_MS` y al volver el foco (DL-4).
 */
export function useGame(rawId: string): UseGameResult {
  const config = useAppConfig();
  const client = useCurrentClient();
  const id = parseObjectIdInput(rawId);
  const query = useQuery({
    queryKey: queryKeys.game(config.network, id ?? ''),
    queryFn:
      id === null
        ? skipToken
        : ({ signal }) => fetchGame(client, { id, originalPackageId: config.originalPackageId, signal }),
    refetchInterval: GAME_REFETCH_MS,
  });
  if (id === null) return { kind: 'invalid_id' };
  return {
    kind: 'read',
    id,
    game: query.data?.game ?? null,
    previousTransaction: query.data?.previousTransaction ?? null,
    status: deriveReadStatus(query),
    isFetching: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}
