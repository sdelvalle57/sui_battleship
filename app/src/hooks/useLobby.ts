import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HistoryLowerBound } from '../sui/eventScan';
import type { GameSelection } from '../sui/gameRegistry';
import { sameAddress } from '../sui/ids';
import { fetchLobbyPage, type LobbyItem, type LobbyPage } from '../sui/lobby';
import { PaginationStalledError } from '../sui/readErrors';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { fetchPublishCheckpoint } from '../sui/transactionInfo';
import { rowFromLobbyItem, type ListedRow } from './gameRow';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useGameRegistry } from './useGameRegistry';
import { useWalletAccount } from './useWalletAccount';

/** Fila del lobby de cualquiera de las dos fuentes (con `isMine`: la creó la cuenta conectada), en el orden del lobby. */
export type LobbyEntry = LobbyItem & { isMine: boolean };

/**
 * Lo que el lobby necesita para mostrarse: filas, estado combinado, paginación y acciones. #73 (TASK-8a): `items` son las
 * filas de **las dos fuentes** con el modelo neutral (`ListedRow`; en el lobby, `role: 'creator'` marca las propias).
 */
export type UseLobbyResult = {
  items: ListedRow[];
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
  return item.kind === 'game' ? item.game.id : item.kind === 'duel' ? item.duel.id : item.gameId;
}

/** El creador de una fila legible de cualquiera de las dos fuentes (las ilegibles no tienen). */
function rowCreator(item: LobbyItem): string | null {
  return item.kind === 'game' ? item.game.creator : item.kind === 'duel' ? item.duel.creator : null;
}

/** Lo que devuelve `useLobbyEntries`: lo de `UseLobbyResult` salvo `items`, y todas las filas en `entries`. */
export type UseLobbyEntriesResult = Omit<UseLobbyResult, 'items'> & {
  /** Todas las filas (anteriores, nuevas e ilegibles), deduplicadas y en el orden del lobby. */
  entries: LobbyEntry[];
};

/**
 * Lobby de partidas abiertas de las dos fuentes del coinflip (DL-2, DL-3, DL-4; #73 TASK-7b): páginas descendentes con
 * `fetchLobbyPage` sobre el registro de juegos, cada "cargar más" con el `endCursor` anterior, para "Todos" (por defecto)
 * o un juego (con su propia clave de consulta). Espera a la publicación (su cota) y combina su estado (MINOR-1 de v1.1):
 * mientras no terminó, manda el suyo; si falló, `error` con ese error, nunca "cargando" para siempre. Sin intervalo ni
 * refetch al foco; `refresh` vuelve a pedir la publicación si falló y reinicia el lobby a la primera página. Aplana,
 * deduplica por partida y marca `isMine` con la cuenta conectada.
 */
export function useLobbyEntries(games: GameSelection = 'all'): UseLobbyEntriesResult {
  const config = useAppConfig();
  const registry = useGameRegistry();
  const client = useCurrentClient();
  const queryClient = useQueryClient();
  const { address } = useWalletAccount();
  const publish = usePublishCheckpoint();
  const queryKey = queryKeys.lobby(config.network, config.originalPackageId, games);
  const publishCheckpoint = publish.data ?? null;

  const query = useInfiniteQuery({
    queryKey,
    enabled: publish.isSuccess,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchLobbyPage(client, { registry, games, publishCheckpoint, before: pageParam, signal }),
    getNextPageParam: (page) => (page.hasNextPage ? (page.endCursor ?? undefined) : undefined),
    refetchOnWindowFocus: false,
  });

  const seen = new Set<string>();
  const entries: LobbyEntry[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      const gameId = rowGameId(item);
      if (gameId !== null) {
        if (seen.has(gameId)) continue;
        seen.add(gameId);
      }
      const creator = rowCreator(item);
      const isMine = creator !== null && address !== null && sameAddress(creator, address);
      entries.push({ ...item, isMine });
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
    entries,
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

/**
 * Lobby de "Todos" para los componentes: lo de `useLobbyEntries` con `items` = **todas** las filas (anteriores, nuevas e
 * ilegibles) en el modelo neutral a la fuente (`rowFromLobbyItem`). No filtra nada: una fila de la fuente nueva se dibuja
 * y se acciona como una anterior (TASK-8a; el rótulo, el control de tiempo y el filtro por juego son de 8b).
 */
export function useLobby(): UseLobbyResult {
  const registry = useGameRegistry();
  const { entries, ...rest } = useLobbyEntries('all');
  return { ...rest, items: entries.map((entry) => rowFromLobbyItem(entry, { isMine: entry.isMine, registry })) };
}
