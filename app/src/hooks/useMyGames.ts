import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useInfiniteQuery, useQueryClient, type InfiniteData, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type { HistoryLowerBound } from '../sui/eventScan';
import { sameAddress } from '../sui/ids';
import {
  extendPins,
  fetchInvitationsPage,
  fetchMyActivityPage,
  groupMyGames,
  mergeMyGames,
  type MyGamesPage,
  type MyGamesPins,
  type MyGamesSections,
} from '../sui/myGames';
import { PaginationStalledError } from '../sui/readErrors';
import { READ_MAX_RETRIES } from '../sui/readPolicy';
import { deriveReadStatus, type ReadStatus } from '../sui/readStatus';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { usePublishCheckpoint } from './useLobby';
import { useWalletAccount } from './useWalletAccount';

/**
 * Estado de una fuente de "Mis partidas" (DL-16, DL-17). `status` es el de la **primera** carga (o el de la publicación,
 * su cota); con datos ya cargados es siempre `ready`, y una relectura en reintento o fallida va aparte
 * (`refreshRetrying`, `refreshError`) para que la página no cambie las filas por un estado de carga (PROY-16). Los
 * errores de "cargar más" van en `nextPageError` (V-6).
 */
export type MyGamesSource = {
  status: ReadStatus;
  hasData: boolean;
  refreshRetrying: { attempt: number; max: number } | null;
  refreshError: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  nextPageError: unknown;
  stalled: boolean;
  lowerBound: HistoryLowerBound | null;
  end: MyGamesPage['end'] | null;
  loadMore: () => void;
  retry: () => void;
};

/** Lo que dibuja la página: sin cuenta, nada que consultar; con cuenta, las tres secciones y el estado de cada fuente. */
export type UseMyGamesResult =
  | { kind: 'no_account' }
  | {
      kind: 'ready';
      sections: MyGamesSections;
      unreadableEvents: number;
      activity: MyGamesSource;
      invitations: MyGamesSource;
      isFetching: boolean;
      refresh: () => void;
    };

/**
 * Dirección de las claves sin cuenta: las queries quedan deshabilitadas (`enabled: false`) y nunca piden, pero los hooks
 * se llaman siempre (reglas de hooks). La dirección cero no firma transacciones, así que no choca con una cuenta real.
 */
const NO_ACCOUNT_KEY_ADDRESS = '0x0';

/** Pins de una cuenta que todavía no fijó nada. Nunca se muta (`extendPins` devuelve un `Map` nuevo). */
const NO_PINS: MyGamesPins = new Map();

/** Los pins con la cuenta a la que pertenecen (C-2 de la revisión de TASK-4): los de otra cuenta no valen. */
type PinState = { address: string | null; pins: MyGamesPins };

function isSameAccount(a: string | null, b: string | null): boolean {
  return a === null || b === null ? a === b : sameAddress(a, b);
}

/**
 * Estado de una fuente (DL-17) a partir de su query y de la publicación (la cota que espera). `retry` relee la
 * publicación mientras no esté lista (C-1 de la revisión de TASK-4): `refetch` ignora `enabled: false`, y sin la cota
 * escanearía con `publishCheckpoint: null`.
 */
function toSource(query: UseInfiniteQueryResult<InfiniteData<MyGamesPage>>, publish: ReturnType<typeof usePublishCheckpoint>): MyGamesSource {
  const hasData = query.data !== undefined;
  const nextPageError = query.isFetchNextPageError ? query.error : null;
  const stalled = nextPageError instanceof PaginationStalledError;
  let status: ReadStatus;
  if (!publish.isSuccess) status = deriveReadStatus(publish);
  else if (!hasData) status = deriveReadStatus(query);
  else status = { kind: 'ready', refreshing: query.isFetching && !query.isFetchingNextPage };
  const refetching = hasData && query.fetchStatus === 'fetching' && !query.isFetchingNextPage;
  const lastPage = query.data?.pages.at(-1);
  return {
    status,
    hasData,
    refreshRetrying: refetching && query.failureCount > 0 ? { attempt: query.failureCount + 1, max: READ_MAX_RETRIES + 1 } : null,
    refreshError: query.isRefetchError ? query.error : null,
    hasNextPage: query.hasNextPage && !stalled,
    isFetchingNextPage: query.isFetchingNextPage,
    nextPageError,
    stalled,
    lowerBound: lastPage?.lowerBound ?? null,
    end: lastPage?.end ?? null,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage && !stalled) void query.fetchNextPage();
    },
    retry: () => {
      if (publish.isSuccess) void query.refetch();
      else void publish.refetch();
    },
  };
}

/**
 * "Mis partidas" de la cuenta conectada (DL-1, DL-5, DL-8, DL-13, DL-16, DL-17): dos `useInfiniteQuery` (la actividad
 * propia y el escaneo de invitaciones) con la cota de la publicación, sin refresco automático ni al foco. Sin cuenta no
 * hay consultas. Las filas se deduplican y agrupan con las reglas puras de `sui/myGames.ts`; cada partida queda fijada en
 * la sección donde apareció (DL-5) hasta "Actualizar" (`refresh`) o hasta que cambia la cuenta: los pins guardan su
 * cuenta y los de otra se descartan, aunque la vista no se remonte (DL-9; C-2 de la revisión de TASK-4). El fijado se
 * ajusta durante el render (V-7), sin `useEffect` (PROY-14).
 */
export function useMyGames(): UseMyGamesResult {
  const config = useAppConfig();
  const client = useCurrentClient();
  const queryClient = useQueryClient();
  const { address } = useWalletAccount();
  const publish = usePublishCheckpoint();
  const [pinState, setPinState] = useState<PinState>(() => ({ address, pins: new Map() }));

  const keyAddress = address ?? NO_ACCOUNT_KEY_ADDRESS;
  const publishCheckpoint = publish.data ?? null;
  const enabled = publish.isSuccess && address !== null;
  const pageArgs = (before: string | null, signal: AbortSignal) => ({
    originalPackageId: config.originalPackageId,
    address: keyAddress,
    publishCheckpoint,
    before,
    signal,
  });
  const getNextPageParam = (page: MyGamesPage) => (page.hasNextPage ? (page.endCursor ?? undefined) : undefined);

  const activityQuery = useInfiniteQuery({
    queryKey: queryKeys.myActivity(config.network, config.originalPackageId, keyAddress),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchMyActivityPage(client, pageArgs(pageParam, signal)),
    getNextPageParam,
    refetchOnWindowFocus: false,
  });
  const invitationsQuery = useInfiniteQuery({
    queryKey: queryKeys.myInvitations(config.network, config.originalPackageId, keyAddress),
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => fetchInvitationsPage(client, pageArgs(pageParam, signal)),
    getNextPageParam,
    refetchOnWindowFocus: false,
  });

  const activityItems = activityQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const invitationItems = invitationsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  // MINOR-1 del handoff v1: el pin sale de la lectura ganadora de H-2 (las mismas listas que deduplica `groupMyGames`).
  // Un solo `setState` condicional (V-7) que converge: guardado `{ address, pins: next }`, el render siguiente ve la misma
  // cuenta y `extendPins` devuelve la misma instancia (sin IDs nuevos).
  const merged = mergeMyGames(activityItems, invitationItems);
  const sameAccount = isSameAccount(pinState.address, address);
  const pins = sameAccount ? pinState.pins : NO_PINS;
  const next = address === null ? pins : extendPins(pins, merged, address);
  if (!sameAccount || next !== pinState.pins) setPinState({ address, pins: next });

  if (address === null) return { kind: 'no_account' };

  return {
    kind: 'ready',
    sections: groupMyGames({ activity: activityItems, invitations: invitationItems, address, pins: next }),
    unreadableEvents: (invitationsQuery.data?.pages ?? []).reduce((total, page) => total + page.unreadableEvents, 0),
    activity: toSource(activityQuery, publish),
    invitations: toSource(invitationsQuery, publish),
    isFetching: publish.isFetching || activityQuery.isFetching || invitationsQuery.isFetching,
    refresh: () => {
      setPinState({ address, pins: new Map() });
      if (publish.isError) void publish.refetch();
      void queryClient.resetQueries({ queryKey: queryKeys.myGames(config.network, config.originalPackageId, address) });
    },
  };
}
