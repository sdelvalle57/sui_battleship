import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HistoryLowerBound } from '../sui/eventScan';
import { sameAddress } from '../sui/ids';
import { fetchLobbyPage, type LobbyItem, type LobbyPage } from '../sui/lobby';
import { PaginationStalledError } from '../sui/readErrors';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { fetchPublishCheckpoint } from '../sui/transactionInfo';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useWalletAccount } from './useWalletAccount';

/** Fila del lobby con la marca de si la creó la cuenta conectada. */
export type LobbyRow = LobbyItem & { isMine: boolean };

/** Lo que el lobby necesita para mostrarse: filas, estado combinado, paginación y acciones. */
export type UseLobbyResult = {
  items: LobbyRow[];
  status: ReadStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Alguna de las dos queries (publicación o lobby) está pidiendo: para deshabilitar "Reintentar". */
  isFetching: boolean;
  nextPageError: unknown;
  stalled: boolean;
  lowerBound: HistoryLowerBound | null;
  end: LobbyPage['end'] | null;
  loadMore: () => void;
  refresh: () => void;
};

/**
 * Checkpoint de la publicación original (cota del lobby, M-1). `null` = podada: **no** es un error (M-4, el lobby usa
 * el piso). `NotYetCheckpointedError` se reintenta por la política común. Inmutable: `staleTime: Infinity`.
 */
export function usePublishCheckpoint() {
  const config = useAppConfig();
  const client = useCurrentClient();
  return useQuery({
    queryKey: queryKeys.publishCheckpoint(config.network, config.publishTxDigest),
    queryFn: ({ signal }) => fetchPublishCheckpoint(client, { digest: config.publishTxDigest, signal }),
    staleTime: Infinity,
  });
}

/** Clave de deduplicación de una fila: el ID de la partida, si se conoce. */
function rowGameId(item: LobbyItem): string | null {
  return item.kind === 'game' ? item.game.id : item.gameId;
}

/**
 * Lobby de partidas abiertas (DL-2, DL-3, DL-4): páginas descendentes con `fetchLobbyPage`, cada "cargar más" con el
 * `endCursor` anterior. Espera a la publicación (su cota) y combina su estado (MINOR-1 de v1.1): mientras no terminó,
 * manda el suyo; si falló, `error` con ese error, nunca "cargando" para siempre. Sin intervalo ni refetch al foco;
 * `refresh` vuelve a pedir la publicación si falló y reinicia el lobby a la primera página. Aplana, deduplica por
 * partida y marca `isMine` con la cuenta conectada.
 */
export function useLobby(): UseLobbyResult {
  const config = useAppConfig();
  const client = useCurrentClient();
  const queryClient = useQueryClient();
  const { address } = useWalletAccount();
  const publish = usePublishCheckpoint();
  const queryKey = queryKeys.lobby(config.network, config.originalPackageId);
  const publishCheckpoint = publish.data ?? null;

  const query = useInfiniteQuery({
    queryKey,
    enabled: publish.isSuccess,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchLobbyPage(client, { originalPackageId: config.originalPackageId, publishCheckpoint, before: pageParam, signal }),
    getNextPageParam: (page) => (page.hasNextPage ? (page.endCursor ?? undefined) : undefined),
    refetchOnWindowFocus: false,
  });

  const seen = new Set<string>();
  const items: LobbyRow[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      const gameId = rowGameId(item);
      if (gameId !== null) {
        if (seen.has(gameId)) continue;
        seen.add(gameId);
      }
      const isMine = item.kind === 'game' && address !== null && sameAddress(item.game.creator, address);
      items.push({ ...item, isMine });
    }
  }

  const nextPageError = query.isFetchNextPageError ? query.error : null;
  const stalled = nextPageError instanceof PaginationStalledError;
  let status: ReadStatus;
  if (!publish.isSuccess) {
    status = deriveReadStatus(publish);
  } else if (query.isFetchingNextPage || query.isFetchNextPageError) {
    // "Cargar más" tiene su propio indicador y su propio error: la lista ya cargada sigue lista.
    status = { kind: 'ready', refreshing: false };
  } else {
    status = deriveReadStatus(query);
  }
  const lastPage = query.data?.pages.at(-1);

  return {
    items,
    status,
    hasNextPage: query.hasNextPage && !stalled,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetching: publish.isFetching || query.isFetching,
    nextPageError,
    stalled,
    lowerBound: lastPage?.lowerBound ?? null,
    end: lastPage?.end ?? null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage && !stalled) void query.fetchNextPage();
    },
    refresh: () => {
      if (publish.isError) void publish.refetch();
      void queryClient.resetQueries({ queryKey });
    },
  };
}
