import { useCurrentClient } from '@mysten/dapp-kit-react';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { useMutation, type QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import type { Game, GameState } from '../sui/game';
import { fetchInvitationsPage, fetchMyActivityPage, type MyGameItem, type MyGameRole, type MyGamesPage } from '../sui/myGames';
import { PaginationStalledError } from '../sui/readErrors';
import { fetchPublishCheckpoint } from '../sui/transactionInfo';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { deferred } from '../test/txHarness';
import { queryKeys } from './queryKeys';
import { useAccountTxBusy } from './useAccountTxBusy';
import { useAppConfig } from './useAppConfig';
import { useMyGames } from './useMyGames';
import { useWalletAccount } from './useWalletAccount';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('./useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../sui/myGames', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/myGames')>()),
  fetchMyActivityPage: vi.fn(),
  fetchInvitationsPage: vi.fn(),
}));
vi.mock('../sui/transactionInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/transactionInfo')>()),
  fetchPublishCheckpoint: vi.fn(),
}));

const PKG = `0x${'1'.repeat(64)}`;
const ME = `0x${'ab'.repeat(32)}`;
const OTHER = `0x${'cd'.repeat(32)}`;
const CONFIG: AppConfig = {
  network: 'testnet',
  grpcUrl: 'https://fullnode.testnet.sui.io:443',
  chainId: '4c78adac',
  packageId: PKG,
  originalPackageId: PKG,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};
const gid = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;

function game(n: number, { creator = ME, opponent = null, state = { kind: 'pending' } }: { creator?: string; opponent?: string | null; state?: GameState } = {}): Game {
  return {
    id: gid(n),
    version: 1n,
    houseId: CONFIG.houseId,
    creator,
    opponent,
    bet: 1_000_000n,
    stake: state.kind === 'pending' ? 1_000_000n : 0n,
    feeRate: 250,
    state,
  };
}
function item(g: Game, role: MyGameRole, { version = 4n, cp = 100n }: { version?: bigint; cp?: bigint } = {}): MyGameItem {
  return { kind: 'game', game: g, objectVersion: version, role, txDigest: `tx-${g.id.slice(-2)}-${role}`, checkpoint: cp };
}
function page(items: MyGameItem[], next: string | null = null, overrides: Partial<MyGamesPage> = {}): MyGamesPage {
  return {
    items,
    endCursor: next,
    hasNextPage: next !== null,
    lowerBound: { checkpoint: 59n, kind: 'publish' },
    end: next === null ? 'bound' : 'more',
    unreadableEvents: 0,
    ...overrides,
  };
}
// A mayor `n`, evento más viejo (como en una página siguiente del escaneo descendente).
const ownPending = (n: number) => item(game(n), 'creator', { cp: BigInt(1000 - n) });
const invitation = (n: number) => item(game(n, { creator: OTHER, opponent: ME }), 'invitee', { cp: BigInt(1000 - n) });

const activityMock = vi.mocked(fetchMyActivityPage);
const invitationsMock = vi.mocked(fetchInvitationsPage);
const publishMock = vi.mocked(fetchPublishCheckpoint);
const client = { ledgerService: { listEvents: vi.fn(), getServiceInfo: vi.fn() }, getObjects: vi.fn(), getTransaction: vi.fn() };
let queryClient: QueryClient;
let renders = 0;

function render() {
  return renderHook(
    () => {
      renders++;
      return useMyGames();
    },
    { wrapper: queryWrapper(queryClient) },
  );
}
type Hook = ReturnType<typeof render>;
/** El resultado con cuenta (falla el test si es `no_account`). */
function ready(hook: Hook) {
  const result = hook.result.current;
  if (result.kind !== 'ready') throw new Error('se esperaba una cuenta');
  return result;
}
const ids = (items: MyGameItem[]) => items.map((i) => (i.kind === 'game' ? i.game.id : i.gameId));
const MY_GAMES = queryKeys.myGames('testnet', PKG, ME);

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  renders = 0;
  activityMock.mockReset();
  invitationsMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue(59n);
  vi.clearAllMocks();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue(client as unknown as SuiGrpcClient);
  vi.mocked(useWalletAccount).mockReturnValue({ address: ME, short: 'me' });
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe('useMyGames: account', () => {
  it('returns no_account without any events or objects request (T4-3)', async () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    const hook = render();
    await advance(0);
    expect(hook.result.current).toEqual({ kind: 'no_account' });
    expect(activityMock).not.toHaveBeenCalled();
    expect(invitationsMock).not.toHaveBeenCalled();
    expect(client.ledgerService.listEvents).not.toHaveBeenCalled();
    expect(client.getObjects).not.toHaveBeenCalled();
  });

  it('switches to the keys and sections of the new account, without items of the previous one (T4-10)', async () => {
    activityMock.mockImplementation((_c, { address }) => Promise.resolve(page(address === ME ? [ownPending(1)] : [item(game(2, { creator: OTHER }), 'creator')])));
    invitationsMock.mockResolvedValue(page([]));
    const hook = render();
    await advance(0);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    vi.mocked(useWalletAccount).mockReturnValue({ address: OTHER, short: 'other' });
    hook.rerender();
    await advance(0);
    expect(activityMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ address: OTHER }));
    expect(ids(ready(hook).sections.pending)).toEqual([gid(2)]);
    expect(queryClient.getQueryCache().find({ queryKey: queryKeys.myActivity('testnet', PKG, ME) })).toBeDefined();
    expect(queryClient.getQueryCache().find({ queryKey: queryKeys.myActivity('testnet', PKG, OTHER) })).toBeDefined();
    expect(queryKeys.myActivity('testnet', PKG, ME)).not.toEqual(queryKeys.myActivity('testnet', PKG, OTHER));
  });
});

describe('useMyGames: first load per source (T4-4, T4-5)', () => {
  it('is loading while the first pages are pending, and waits for the publish checkpoint', async () => {
    const publish = deferred<bigint | null>();
    publishMock.mockReturnValue(publish.promise);
    activityMock.mockReturnValue(new Promise(() => undefined));
    invitationsMock.mockReturnValue(new Promise(() => undefined));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.status).toEqual({ kind: 'loading' });
    expect(activityMock).not.toHaveBeenCalled();
    await act(async () => {
      publish.resolve(59n);
      await Promise.resolve();
    });
    await advance(0);
    expect(activityMock).toHaveBeenCalledWith(client, expect.objectContaining({ address: ME, publishCheckpoint: 59n, before: null }));
    expect(ready(hook).activity).toMatchObject({ status: { kind: 'loading' }, hasData: false });
    expect(ready(hook).invitations).toMatchObject({ status: { kind: 'loading' }, hasData: false });
  });

  it('shows retrying (attempt n of m) and then ready with its items', async () => {
    activityMock.mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE')).mockResolvedValue(page([ownPending(1)]));
    invitationsMock.mockResolvedValue(page([invitation(2)]));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    expect(ready(hook).activity.refreshRetrying).toBeNull();
    await advance(1000);
    expect(ready(hook).activity.status).toEqual({ kind: 'ready', refreshing: false });
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(2)]);
  });

  it('shows the error of one source without hiding the sections of the other', async () => {
    const invalid = new RpcError('bad', 'INVALID_ARGUMENT');
    activityMock.mockRejectedValue(invalid);
    invitationsMock.mockResolvedValue(page([invitation(2)], null, { unreadableEvents: 1 }));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity).toMatchObject({ status: { kind: 'error', error: invalid }, hasData: false, refreshError: null });
    expect(ready(hook).invitations.status).toEqual({ kind: 'ready', refreshing: false });
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(2)]);
    expect(ready(hook).unreadableEvents).toBe(1);
  });

  it('shows the publish error on both sources without listing events', async () => {
    const invalid = new RpcError('bad digest', 'INVALID_ARGUMENT');
    publishMock.mockRejectedValue(invalid);
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.status).toEqual({ kind: 'error', error: invalid });
    expect(ready(hook).invitations.status).toEqual({ kind: 'error', error: invalid });
    expect(activityMock).not.toHaveBeenCalled();
  });
});

describe('useMyGames: retry of a failed publish checkpoint (T4-12, C-1)', () => {
  it('retry re-reads the publish checkpoint without scanning, and both sources load with its bound once it answers', async () => {
    const invalid = new RpcError('bad digest', 'INVALID_ARGUMENT');
    publishMock.mockRejectedValueOnce(invalid).mockRejectedValueOnce(invalid).mockResolvedValue(59n);
    activityMock.mockResolvedValue(page([ownPending(1)]));
    invitationsMock.mockResolvedValue(page([invitation(2)]));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.status).toEqual({ kind: 'error', error: invalid });
    expect(publishMock).toHaveBeenCalledTimes(1);
    act(() => {
      ready(hook).activity.retry();
    });
    await advance(0);
    expect(publishMock).toHaveBeenCalledTimes(2);
    expect(ready(hook).invitations.status).toEqual({ kind: 'error', error: invalid });
    expect(activityMock).not.toHaveBeenCalled();
    expect(invitationsMock).not.toHaveBeenCalled();
    expect(client.ledgerService.listEvents).not.toHaveBeenCalled();
    act(() => {
      ready(hook).invitations.retry();
    });
    await advance(0);
    await advance(0);
    expect(publishMock).toHaveBeenCalledTimes(3);
    expect(activityMock).toHaveBeenCalledWith(client, expect.objectContaining({ publishCheckpoint: 59n, before: null }));
    expect(invitationsMock).toHaveBeenCalledWith(client, expect.objectContaining({ publishCheckpoint: 59n, before: null }));
    for (const call of [...activityMock.mock.calls, ...invitationsMock.mock.calls]) expect(call[1].publishCheckpoint).toBe(59n);
    expect(ready(hook).activity.status.kind).toBe('ready');
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(2)]);
  });
});

describe('useMyGames: refetch with data (T4-6, DL-17)', () => {
  beforeEach(() => {
    activityMock.mockResolvedValue(page([ownPending(1)]));
    invitationsMock.mockResolvedValue(page([invitation(2)]));
  });

  it('keeps status ready and the sections while a refetch retries, with the attempt', async () => {
    const hook = render();
    await advance(0);
    activityMock.mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE'));
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    expect(ready(hook).activity).toMatchObject({ status: { kind: 'ready', refreshing: true }, refreshRetrying: { attempt: 2, max: 3 }, refreshError: null });
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(2)]);
    await advance(1000);
    expect(ready(hook).activity).toMatchObject({ status: { kind: 'ready', refreshing: false }, refreshRetrying: null });
  });

  it('keeps the sections with refreshError when a refetch fails, and retry refetches only that source', async () => {
    const hook = render();
    await advance(0);
    const invalid = new RpcError('bad', 'INVALID_ARGUMENT');
    activityMock.mockRejectedValueOnce(invalid);
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    expect(ready(hook).activity).toMatchObject({ status: { kind: 'ready', refreshing: false }, hasData: true, refreshError: invalid, nextPageError: null });
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    const invitationCalls = invitationsMock.mock.calls.length;
    act(() => {
      ready(hook).activity.retry();
    });
    await advance(0);
    expect(ready(hook).activity.refreshError).toBeNull();
    expect(invitationsMock).toHaveBeenCalledTimes(invitationCalls);
  });
});

describe('useMyGames: load more (T4-7)', () => {
  it('loads more of each source separately with its own cursor', async () => {
    activityMock.mockResolvedValueOnce(page([ownPending(1)], 'a1')).mockResolvedValueOnce(page([ownPending(3)]));
    invitationsMock.mockResolvedValueOnce(page([invitation(2)], 'i1')).mockResolvedValueOnce(page([invitation(4)]));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.hasNextPage).toBe(true);
    act(() => {
      ready(hook).activity.loadMore();
    });
    await advance(0);
    expect(activityMock).toHaveBeenLastCalledWith(client, expect.objectContaining({ before: 'a1' }));
    expect(invitationsMock).toHaveBeenCalledTimes(1);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1), gid(3)]);
    act(() => {
      ready(hook).invitations.loadMore();
    });
    await advance(0);
    expect(invitationsMock).toHaveBeenLastCalledWith(client, expect.objectContaining({ before: 'i1' }));
    expect(activityMock).toHaveBeenCalledTimes(2);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(2), gid(4)]);
  });

  it('keeps hasNextPage with a load-more error that is not stalled, and status ready', async () => {
    const invalid = new RpcError('bad', 'INVALID_ARGUMENT');
    activityMock.mockResolvedValueOnce(page([ownPending(1)], 'a1')).mockRejectedValueOnce(invalid);
    invitationsMock.mockResolvedValue(page([]));
    const hook = render();
    await advance(0);
    act(() => {
      ready(hook).activity.loadMore();
    });
    await advance(0);
    expect(ready(hook).activity).toMatchObject({ nextPageError: invalid, stalled: false, hasNextPage: true, refreshError: null, status: { kind: 'ready' } });
  });

  it('marks stalled and no more pages on PaginationStalledError', async () => {
    activityMock.mockResolvedValueOnce(page([ownPending(1)], 'a1')).mockRejectedValueOnce(new PaginationStalledError());
    invitationsMock.mockResolvedValue(page([]));
    const hook = render();
    await advance(0);
    act(() => {
      ready(hook).activity.loadMore();
    });
    await advance(0);
    expect(ready(hook).activity).toMatchObject({ stalled: true, hasNextPage: false });
    expect(ready(hook).activity.nextPageError).toBeInstanceOf(PaginationStalledError);
  });

  it('takes end and lowerBound from the last page (history_pruned)', async () => {
    activityMock.mockResolvedValue(page([]));
    invitationsMock
      .mockResolvedValueOnce(page([invitation(2)], 'i1'))
      .mockResolvedValueOnce(page([], null, { end: 'history_pruned', lowerBound: { checkpoint: 17_000n, kind: 'node_floor' } }));
    const hook = render();
    await advance(0);
    act(() => {
      ready(hook).invitations.loadMore();
    });
    await advance(0);
    expect(ready(hook).invitations).toMatchObject({ end: 'history_pruned', lowerBound: { checkpoint: 17_000n, kind: 'node_floor' }, hasNextPage: false });
  });
});

describe('useMyGames: pins (DL-5)', () => {
  const invite = game(7, { creator: OTHER, opponent: ME });
  const accepted = game(7, { creator: OTHER, opponent: ME, state: { kind: 'resolved', acceptor: ME, winner: ME } });

  it('pins a game read differently by the two sources in the same render in the section of the H-2 winner (T4-8)', async () => {
    const activity = deferred<MyGamesPage>();
    const invitations = deferred<MyGamesPage>();
    activityMock.mockReturnValueOnce(activity.promise).mockResolvedValue(page([]));
    invitationsMock.mockReturnValueOnce(invitations.promise).mockResolvedValue(page([item(invite, 'invitee', { version: 4n, cp: 393n })]));
    const hook = render();
    await advance(0);
    await act(async () => {
      activity.resolve(page([item(accepted, 'acceptor', { version: 415n, cp: 1001n })]));
      invitations.resolve(page([item(invite, 'invitee', { version: 4n, cp: 393n })]));
      await Promise.resolve();
    });
    await advance(0);
    expect(ids(ready(hook).sections.finished)).toEqual([gid(7)]);
    expect(ready(hook).sections.invitations).toEqual([]);
    // Fijada en `finished`: aunque una relectura solo la traiga como invitación pendiente, no vuelve a "Invitaciones".
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    expect(ids(ready(hook).sections.finished)).toEqual([gid(7)]);
    expect(ready(hook).sections.invitations).toEqual([]);
  });

  it('keeps a pending invitation in invitations after it is resolved and refetched, and refresh moves it to finished (T4-8 bis)', async () => {
    activityMock.mockResolvedValueOnce(page([]));
    invitationsMock.mockResolvedValueOnce(page([item(invite, 'invitee')]));
    const hook = render();
    await advance(0);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(7)]);
    activityMock.mockResolvedValue(page([item(accepted, 'acceptor', { version: 415n, cp: 1001n })]));
    invitationsMock.mockResolvedValue(page([item(accepted, 'invitee', { version: 415n })]));
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    const pinned = ready(hook).sections.invitations;
    expect(ids(pinned)).toEqual([gid(7)]);
    expect(pinned[0]).toMatchObject({ kind: 'game', role: 'acceptor', game: { state: { kind: 'resolved' } } });
    expect(ready(hook).sections.finished).toEqual([]);
    act(() => {
      ready(hook).refresh();
    });
    await advance(0);
    expect(ids(ready(hook).sections.finished)).toEqual([gid(7)]);
    expect(ready(hook).sections.invitations).toEqual([]);
  });

  it("drops the pins of the previous account when switching without remounting (T4-13, C-2)", async () => {
    const shared = game(9, { creator: ME, opponent: OTHER });
    activityMock.mockImplementation((_c, { address }) => Promise.resolve(page(address.toLowerCase() === ME ? [item(shared, 'creator')] : [])));
    invitationsMock.mockImplementation((_c, { address }) => Promise.resolve(page(address.toLowerCase() === OTHER ? [item(shared, 'invitee')] : [])));
    const hook = render();
    await advance(0);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(9)]);
    vi.mocked(useWalletAccount).mockReturnValue({ address: OTHER, short: 'other' });
    hook.rerender();
    await advance(0);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(9)]);
    expect(ready(hook).sections.pending).toEqual([]);
    const before = renders;
    await advance(0);
    expect(renders - before).toBe(0);
    // Y al volver a la primera cuenta, la partida vuelve a su sección natural para ella.
    vi.mocked(useWalletAccount).mockReturnValue({ address: ME.toUpperCase().replace('0X', '0x'), short: 'me' });
    hook.rerender();
    await advance(0);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(9)]);
    expect(ready(hook).sections.invitations).toEqual([]);
  });

  it('pins with the fresh refetch, not with a stale cache, when a new instance mounts (T4-14, H-5)', async () => {
    const open = game(8);
    const cancelled = game(8, { state: { kind: 'cancelled' } });
    activityMock.mockResolvedValue(page([item(open, 'creator')]));
    invitationsMock.mockResolvedValue(page([]));
    const first = render();
    await advance(0);
    expect(ids(ready(first).sections.pending)).toEqual([gid(8)]);
    first.unmount();
    // Con el hook desmontado: la invalidación de una acción marca la caché vieja sin releerla.
    activityMock.mockResolvedValue(page([item(cancelled, 'creator')]));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    const second = render();
    // Primer render: la caché vieja, con G en su sección natural de entonces y sin pin.
    expect(ids(ready(second).sections.pending)).toEqual([gid(8)]);
    await advance(0);
    expect(ids(ready(second).sections.finished)).toEqual([gid(8)]);
    expect(ready(second).sections.pending).toEqual([]);
    const before = renders;
    await advance(0);
    expect(renders - before).toBe(0);
    // Fijada en `finished`: una lectura posterior que la trajera `Pending` no la devuelve a "pendientes".
    activityMock.mockResolvedValue(page([item(open, 'creator')]));
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    expect(ids(ready(second).sections.finished)).toEqual([gid(8)]);
  });

  it('pins at once a game with a live transaction of the account, with the stale cache (T4-17, H-6)', async () => {
    const open = game(8);
    activityMock.mockResolvedValue(page([item(open, 'creator')]));
    invitationsMock.mockResolvedValue(page([]));
    const first = render();
    await advance(0);
    first.unmount();
    // Un `cancel` de G en curso (la variable con la forma de la app) y la caché marcada vieja por su invalidación.
    const pending = deferred<null>();
    const tx = renderHook(
      () => useMutation({ mutationKey: [...queryKeys.txAccount('testnet', ME), 'game', gid(8)], mutationFn: (variables: unknown) => pending.promise.then(() => variables) }),
      { wrapper: queryWrapper(queryClient) },
    );
    act(() => {
      tx.result.current.mutate({ input: {}, viewId: 1, runId: 1, action: { kind: 'cancel', gameId: gid(8) }, account: null, targetHash: '' });
    });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    const slow = deferred<MyGamesPage>();
    activityMock.mockReturnValueOnce(slow.promise);
    const second = render();
    expect(ids(ready(second).sections.pending)).toEqual([gid(8)]);
    await advance(0);
    await act(async () => {
      slow.resolve(page([item(game(8, { state: { kind: 'cancelled' } }), 'creator')]));
      await Promise.resolve();
    });
    await advance(0);
    expect(ids(ready(second).sections.pending)).toEqual([gid(8)]);
    expect(ready(second).sections.pending[0]).toMatchObject({ kind: 'game', game: { state: { kind: 'cancelled' } } });
    expect(ready(second).sections.finished).toEqual([]);
  });

  it('does not pin a new row while a source is fetching, and keeps the pinned ones (T4-15, H-5)', async () => {
    const invite = item(game(7, { creator: OTHER, opponent: ME }), 'invitee');
    activityMock.mockResolvedValueOnce(page([]));
    invitationsMock.mockResolvedValueOnce(page([invite]));
    const hook = render();
    await advance(0);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(7)]);
    const slowInvitations = deferred<MyGamesPage>();
    const accepted = item(game(7, { creator: OTHER, opponent: ME, state: { kind: 'resolved', acceptor: ME, winner: ME } }), 'acceptor', { version: 415n, cp: 1001n });
    const fresh = item(game(9), 'creator', { cp: 900n });
    activityMock.mockResolvedValueOnce(page([accepted, fresh]));
    invitationsMock.mockReturnValueOnce(slowInvitations.promise);
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    // La actividad ya llegó y las invitaciones siguen pidiendo: H sin pin en su sección natural; G sigue fijada.
    expect(ready(hook).invitations.status).toEqual({ kind: 'ready', refreshing: true });
    expect(ids(ready(hook).sections.pending)).toEqual([gid(9)]);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(7)]);
    await act(async () => {
      slowInvitations.resolve(page([item(game(7, { creator: OTHER, opponent: ME, state: { kind: 'resolved', acceptor: ME, winner: ME } }), 'invitee', { version: 415n })]));
      await Promise.resolve();
    });
    await advance(0);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(9)]);
    expect(ids(ready(hook).sections.invitations)).toEqual([gid(7)]);
    // H quedó fijada en `pending`: cancelada después, no pasa a "Terminadas".
    activityMock.mockResolvedValue(page([accepted, item(game(9, { state: { kind: 'cancelled' } }), 'creator', { cp: 900n })]));
    invitationsMock.mockResolvedValue(page([]));
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(9)]);
    expect(ready(hook).sections.pending[0]).toMatchObject({ kind: 'game', game: { state: { kind: 'cancelled' } } });
    expect(ready(hook).sections.finished).toEqual([]);
  });

  it('settles in at most 2 extra renders when new rows get pinned, without a render loop (T4-9)', async () => {
    activityMock.mockResolvedValue(page([ownPending(1)]));
    invitationsMock.mockResolvedValue(page([]));
    const hook = render();
    await advance(0);
    // Referencia: una relectura que no trae IDs nuevos (sin `setPins`).
    let before = renders;
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    const withoutNewPins = renders - before;
    // La misma relectura con dos IDs nuevos, uno por fuente.
    activityMock.mockResolvedValue(page([ownPending(1), ownPending(3)]));
    invitationsMock.mockResolvedValue(page([invitation(4)]));
    before = renders;
    act(() => {
      void queryClient.invalidateQueries({ queryKey: MY_GAMES });
    });
    await advance(0);
    const withNewPins = renders - before;
    expect(withNewPins - withoutNewPins).toBeLessThanOrEqual(2);
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1), gid(3)]);
    before = renders;
    await advance(0);
    expect(renders - before).toBe(0);
  });

  it('refresh resets both sources to their first page and refetches a failed publish checkpoint', async () => {
    const down = new RpcError('bad digest', 'INVALID_ARGUMENT');
    publishMock.mockRejectedValueOnce(down).mockResolvedValue(59n);
    activityMock.mockResolvedValue(page([ownPending(1)]));
    invitationsMock.mockResolvedValue(page([]));
    const hook = render();
    await advance(0);
    expect(ready(hook).activity.status).toEqual({ kind: 'error', error: down });
    act(() => {
      ready(hook).refresh();
    });
    await advance(0);
    await advance(0);
    expect(ready(hook).activity.status.kind).toBe('ready');
    expect(ids(ready(hook).sections.pending)).toEqual([gid(1)]);
    expect(activityMock).toHaveBeenLastCalledWith(client, expect.objectContaining({ before: null }));
  });

  it('does not refetch on window focus', async () => {
    activityMock.mockResolvedValue(page([]));
    invitationsMock.mockResolvedValue(page([]));
    render();
    await advance(0);
    for (const key of [queryKeys.myActivity('testnet', PKG, ME), queryKeys.myInvitations('testnet', PKG, ME)]) {
      expect(queryClient.getQueryCache().find({ queryKey: key })?.options).toMatchObject({ refetchOnWindowFocus: false });
    }
  });
});

describe('useAccountTxBusy (T4-11)', () => {
  function renderBusy(mutationAddress: string) {
    const pending = deferred<null>();
    const hook = renderHook(
      () => ({
        busy: useAccountTxBusy(),
        mutation: useMutation({ mutationKey: [...queryKeys.txAccount('testnet', mutationAddress), 'create'], mutationFn: () => pending.promise }),
      }),
      { wrapper: queryWrapper(queryClient) },
    );
    return { hook, pending };
  }

  it('is true with a pending mutation of the connected account and false after it ends', async () => {
    const { hook, pending } = renderBusy(ME);
    expect(hook.result.current.busy).toBe(false);
    act(() => {
      hook.result.current.mutation.mutate();
    });
    await advance(0);
    expect(hook.result.current.busy).toBe(true);
    await act(async () => {
      pending.resolve(null);
      await Promise.resolve();
    });
    await advance(0);
    expect(hook.result.current.busy).toBe(false);
  });

  it('is false with a pending mutation of another account, and without account', async () => {
    const { hook } = renderBusy(OTHER);
    act(() => {
      hook.result.current.mutation.mutate();
    });
    await advance(0);
    expect(hook.result.current.busy).toBe(false);
    vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
    hook.rerender();
    expect(hook.result.current.busy).toBe(false);
    vi.mocked(useWalletAccount).mockReturnValue({ address: OTHER.toUpperCase().replace('0X', '0x'), short: 'other' });
    hook.rerender();
    expect(hook.result.current.busy).toBe(true);
  });
});
