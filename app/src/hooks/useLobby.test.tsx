import { useCurrentClient } from '@mysten/dapp-kit-react';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import type { AppConfig } from '../sui/config';
import type { Game } from '../sui/game';
import { fetchLobbyPage, type LobbyItem, type LobbyPage } from '../sui/lobby';
import { NotYetCheckpointedError, PaginationStalledError } from '../sui/readErrors';
import { fetchPublishCheckpoint } from '../sui/transactionInfo';
import { useAppConfig } from './useAppConfig';
import { queryKeys } from './queryKeys';
import { useLobby, useLobbyEntries } from './useLobby';
import { useWalletAccount } from './useWalletAccount';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('./useWalletAccount', () => ({ useWalletAccount: vi.fn() }));
vi.mock('../sui/lobby', async (importOriginal) => ({ ...(await importOriginal<typeof import('../sui/lobby')>()), fetchLobbyPage: vi.fn() }));
vi.mock('../sui/transactionInfo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sui/transactionInfo')>()),
  fetchPublishCheckpoint: vi.fn(),
}));

const PKG = `0x${'1'.repeat(64)}`;
const CREATOR = `0x${'ab'.repeat(32)}`;
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

function game(n: number, creator = OTHER): Game {
  return {
    id: `0x${n.toString(16).padStart(64, '0')}`,
    version: 1n,
    houseId: CONFIG.houseId,
    creator,
    opponent: null,
    bet: 1_000_000n,
    stake: 1_000_000n,
    feeRate: 250,
    state: { kind: 'pending' },
  };
}
function lobbyPage(games: Game[], next: string | null, overrides: Partial<LobbyPage> = {}): LobbyPage {
  return {
    items: games.map((g) => ({ kind: 'game' as const, game: g, createdTxDigest: `tx-${g.id.slice(-2)}` })),
    endCursor: next,
    hasNextPage: next !== null,
    lowerBound: { checkpoint: 59n, kind: 'publish' },
    end: next === null ? 'bound' : 'more',
    ...overrides,
  };
}

const lobbyMock = vi.mocked(fetchLobbyPage);
const publishMock = vi.mocked(fetchPublishCheckpoint);
let queryClient: QueryClient;
const render = () => renderHook(() => useLobby(), { wrapper: queryWrapper(queryClient) });
const ids = (items: { kind: string; game?: Game }[]) => items.map((i) => i.game?.id);

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  lobbyMock.mockReset();
  publishMock.mockReset();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({} as SuiGrpcClient);
  vi.mocked(useWalletAccount).mockReturnValue({ address: null, short: null });
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe('useLobby: publish checkpoint (M-1, M-4, MINOR-1)', () => {
  it('waits for the publish checkpoint before listing events', async () => {
    let resolve: (v: bigint | null) => void = () => undefined;
    publishMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    lobbyMock.mockResolvedValue(lobbyPage([game(1)], null));
    const { result } = render();
    await advance(0);
    expect(result.current.status).toEqual({ kind: 'loading' });
    expect(lobbyMock).not.toHaveBeenCalled();
    await act(async () => { resolve(59n); await Promise.resolve(); });
    await advance(0);
    expect(lobbyMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ publishCheckpoint: 59n, before: null }));
    expect(result.current.status).toEqual({ kind: 'ready', refreshing: false });
  });

  it('still loads with the node floor when the publish transaction was pruned (null)', async () => {
    publishMock.mockResolvedValue(null);
    lobbyMock.mockResolvedValue(lobbyPage([game(1)], null, { lowerBound: { checkpoint: 17_000n, kind: 'node_floor' } }));
    const { result } = render();
    await advance(0);
    expect(lobbyMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ publishCheckpoint: null }));
    expect(result.current).toMatchObject({ status: { kind: 'ready' }, lowerBound: { kind: 'node_floor' }, end: 'bound' });
  });

  it('shows retrying on NotYetCheckpointedError and then loads', async () => {
    publishMock.mockRejectedValueOnce(new NotYetCheckpointedError(CONFIG.publishTxDigest)).mockResolvedValue(59n);
    lobbyMock.mockResolvedValue(lobbyPage([game(1)], null));
    const { result } = render();
    await advance(0);
    expect(result.current.status).toEqual({ kind: 'retrying', attempt: 2, max: 3 });
    await advance(1000);
    expect(result.current.status.kind).toBe('ready');
    expect(result.current.items).toHaveLength(1);
  });

  it('shows the error of a non-transient publish failure, never loading, without listing events', async () => {
    const invalid = new RpcError('bad digest', 'INVALID_ARGUMENT');
    publishMock.mockRejectedValue(invalid);
    const { result } = render();
    await advance(0);
    expect(result.current.status).toEqual({ kind: 'error', error: invalid });
    expect(publishMock).toHaveBeenCalledTimes(1);
    expect(lobbyMock).not.toHaveBeenCalled();
  });

  it('shows the error after a transient publish failure exhausts its retries, and refresh recovers', async () => {
    const down = new RpcError('node down', 'UNAVAILABLE');
    publishMock.mockRejectedValue(down);
    lobbyMock.mockResolvedValue(lobbyPage([game(1)], null));
    const { result } = render();
    await advance(0);
    await advance(1000);
    await advance(2000);
    expect(result.current.status).toEqual({ kind: 'error', error: down });
    expect(publishMock).toHaveBeenCalledTimes(3);
    expect(lobbyMock).not.toHaveBeenCalled();
    publishMock.mockResolvedValue(59n);
    act(() => { result.current.refresh(); });
    await advance(0);
    await advance(0);
    expect(result.current.status.kind).toBe('ready');
    expect(result.current.items).toHaveLength(1);
  });
});

describe('useLobby: pages', () => {
  beforeEach(() => {
    publishMock.mockResolvedValue(59n);
  });

  it('loads the first page with a null cursor and no window-focus refetch', async () => {
    lobbyMock.mockResolvedValue(lobbyPage([game(1), game(2)], 'cursor-1'));
    const { result } = render();
    await advance(0);
    expect(ids(result.current.items)).toEqual([game(1).id, game(2).id]);
    expect(result.current).toMatchObject({ hasNextPage: true, end: 'more', isFetchingNextPage: false, stalled: false });
    const lobbyQuery = queryClient.getQueryCache().findAll({ queryKey: ['sui', 'testnet', 'lobby'] })[0];
    expect(lobbyQuery?.options).toMatchObject({ refetchOnWindowFocus: false });
    expect(lobbyQuery?.options).not.toHaveProperty('refetchInterval');
  });

  it('sends the previous endCursor on loadMore and deduplicates games', async () => {
    lobbyMock.mockResolvedValueOnce(lobbyPage([game(1), game(2)], 'cursor-1')).mockResolvedValueOnce(lobbyPage([game(2), game(3)], null));
    const { result } = render();
    await advance(0);
    act(() => { result.current.loadMore(); });
    await advance(0);
    expect(lobbyMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ before: 'cursor-1' }));
    expect(ids(result.current.items)).toEqual([game(1).id, game(2).id, game(3).id]);
    expect(result.current).toMatchObject({ hasNextPage: false, end: 'bound' });
  });

  it('refresh goes back to a single first page', async () => {
    lobbyMock.mockResolvedValueOnce(lobbyPage([game(1)], 'cursor-1')).mockResolvedValueOnce(lobbyPage([game(2)], 'cursor-2'));
    const { result } = render();
    await advance(0);
    act(() => { result.current.loadMore(); });
    await advance(0);
    expect(result.current.items).toHaveLength(2);
    lobbyMock.mockResolvedValue(lobbyPage([game(9)], 'cursor-9'));
    act(() => { result.current.refresh(); });
    await advance(0);
    expect(ids(result.current.items)).toEqual([game(9).id]);
    expect(lobbyMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ before: null }));
  });

  it('marks isMine with the connected address in another format', async () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: CREATOR.toUpperCase().replace('0X', '0x'), short: 'x' });
    lobbyMock.mockResolvedValue(lobbyPage([game(1, CREATOR), game(2)], null));
    const { result } = render();
    await advance(0);
    expect(result.current.items.map((i) => i.isMine)).toEqual([true, false]);
  });

  it('marks nothing as mine without a connected account', async () => {
    lobbyMock.mockResolvedValue(lobbyPage([game(1, CREATOR)], null));
    const { result } = render();
    await advance(0);
    expect(result.current.items.map((i) => i.isMine)).toEqual([false]);
  });

  it('keeps unreadable rows', async () => {
    lobbyMock.mockResolvedValue({ ...lobbyPage([game(1)], null), items: [{ kind: 'unreadable', gameId: null, txDigest: 'tx-x' }] });
    const { result } = render();
    await advance(0);
    expect(result.current.items).toEqual([{ kind: 'unreadable', gameId: null, txDigest: 'tx-x', isMine: false }]);
  });

  it('flags a stalled next page and stops offering more pages', async () => {
    lobbyMock.mockResolvedValueOnce(lobbyPage([game(1)], 'cursor-1')).mockRejectedValueOnce(new PaginationStalledError());
    const { result } = render();
    await advance(0);
    act(() => { result.current.loadMore(); });
    await advance(0);
    expect(result.current).toMatchObject({ stalled: true, hasNextPage: false, status: { kind: 'ready' } });
    expect(result.current.nextPageError).toBeInstanceOf(PaginationStalledError);
    expect(result.current.items).toHaveLength(1);
  });
});

// #73, TASK-7b: las dos fuentes del coinflip, el filtro por juego y el registro armado de la config completa.
describe('useLobbyEntries and the registry (#73)', () => {
  const duelRow = (n: number, creator = OTHER): LobbyItem => ({
    kind: 'duel',
    gameKey: 'coinflip',
    duel: {
      id: `0x${(0x100 + n).toString(16).padStart(64, '0')}`,
      version: 1n,
      houseId: CONFIG.houseId,
      creator,
      opponent: null,
      bet: 1_000_000n,
      stake: 1_000_000n,
      feeRate: 250,
      turnMs: 0n,
      state: { kind: 'pending' },
    },
    control: { id: 0, turnMs: 0n, label: 'sin reloj' },
    createdTxDigest: `tx-duel-${String(n)}`,
  });
  const mixedPage = (): LobbyPage => ({ ...lobbyPage([game(1)], null), items: [...lobbyPage([game(1)], null).items, duelRow(1, CREATOR), duelRow(2)] });

  beforeEach(() => {
    publishMock.mockResolvedValue(59n);
  });

  it('useLobby keeps showing only the legacy rows (the components of today); the new rows come in useLobbyEntries', async () => {
    lobbyMock.mockResolvedValue(mixedPage());
    const { result } = render();
    await advance(0);
    expect(result.current.items.map((i) => i.kind)).toEqual(['game']);
    const entries = renderHook(() => useLobbyEntries(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(entries.result.current.entries.map((e) => e.kind)).toEqual(['game', 'duel', 'duel']);
  });

  it('marks isMine on the rows of the new source with the connected address, and deduplicates by the id of either source', async () => {
    vi.mocked(useWalletAccount).mockReturnValue({ address: CREATOR, short: 'x' });
    lobbyMock.mockResolvedValue({ ...mixedPage(), items: [...mixedPage().items, duelRow(1, CREATOR)] });
    const { result } = renderHook(() => useLobbyEntries(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    expect(result.current.entries.map((e) => e.isMine)).toEqual([false, true, false]);
  });

  it('passes the registry built from the WHOLE config and the game selection to the page fetch', async () => {
    lobbyMock.mockResolvedValue(lobbyPage([], null));
    renderHook(() => useLobbyEntries('coinflip'), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    const [, args] = lobbyMock.mock.calls[0] ?? [];
    expect(args).toMatchObject({ games: 'coinflip', publishCheckpoint: 59n, before: null });
    expect(args?.registry.map((def) => def.key)).toEqual(['coinflip']);
    expect(args?.registry[0]?.sources.map((source) => source.kind)).toEqual(['legacy']);
  });

  it('with upgrades in the config the registry has the new source too', async () => {
    const upgraded = `0x${'2'.repeat(64)}`;
    const typeOrigins = [
      ...['Game', 'GameCreated', 'GameCancelled', 'GameResolved'].map((name) => ({ module: 'game', name, definingId: PKG })),
      { module: 'coinflip', name: 'Coinflip', definingId: upgraded },
      ...['Duel', 'DuelCreated', 'DuelCancelled', 'DuelActivated', 'DuelTurn', 'DuelResolved', 'DuelTimedOut', 'DuelExpired'].map((name) => ({ module: 'duel', name, definingId: upgraded })),
    ];
    vi.mocked(useAppConfig).mockReturnValue({ ...CONFIG, packageId: upgraded, upgrades: [{ version: 2, packageId: upgraded, txDigest: '11111111111111111111111111111111' }], typeOrigins });
    lobbyMock.mockResolvedValue(lobbyPage([], null));
    renderHook(() => useLobbyEntries(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    const [, args] = lobbyMock.mock.calls[0] ?? [];
    expect(args?.registry[0]?.sources.map((source) => source.kind)).toEqual(['legacy', 'duel']);
  });

  it('each game selection has its own query (the key carries the game dimension) and "Todos" is the base key', async () => {
    lobbyMock.mockResolvedValue(lobbyPage([], null));
    renderHook(() => useLobbyEntries('coinflip'), { wrapper: queryWrapper(queryClient) });
    renderHook(() => useLobbyEntries(), { wrapper: queryWrapper(queryClient) });
    await advance(0);
    const keys = queryClient.getQueryCache().findAll({ queryKey: queryKeys.lobby('testnet', PKG) }).map((q) => q.queryKey);
    expect(keys).toEqual(expect.arrayContaining([queryKeys.lobby('testnet', PKG), queryKeys.lobby('testnet', PKG, 'coinflip')]));
    expect(keys).toHaveLength(2);
  });
});
