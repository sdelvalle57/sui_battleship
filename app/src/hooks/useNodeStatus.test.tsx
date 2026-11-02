import { useCurrentClient } from '@mysten/dapp-kit-react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { NODE_STATUS_REFETCH_MS, NODE_STATUS_TIMEOUT_MS } from '../sui/nodeInfo';
import { useAppConfig } from './useAppConfig';
import { useNodeStatus } from './useNodeStatus';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

const TESTNET_BASE58 = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD';
const MAINNET_BASE58 = '4btiuiMPvEENsttpZC7CZ53DruC3MAgfznDbASZ7DR6S';

const CONFIG: AppConfig = {
  network: 'testnet',
  grpcUrl: 'https://fullnode.testnet.sui.io:443',
  chainId: '4c78adac',
  packageId: `0x${'1'.repeat(64)}`,
  originalPackageId: `0x${'1'.repeat(64)}`,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};

type GetServiceInfo = (input: object, options?: { abort?: AbortSignal }) => Promise<{ response: object }>;

const getServiceInfo = vi.fn<GetServiceInfo>();

function answer(chainId: string) {
  return () => Promise.resolve({ response: { chainId, checkpointHeight: 7n } });
}

/** Nodo colgado: solo rechaza cuando se aborta el intento. */
function hang(_input: object, options?: { abort?: AbortSignal }) {
  return new Promise<{ response: object }>((_resolve, reject) => {
    options?.abort?.addEventListener('abort', () => {
      reject(options.abort?.reason as Error);
    });
  });
}

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/**
 * Avanza los timers falsos `ms` y luego 1 ms más. TanStack Query notifica los cambios de estado en un lote con
 * `setTimeout(0)`; los timers falsos de Vitest (`@sinonjs/fake-timers`) agendan un timer de 0 ms creado durante un
 * avance en `ahora + 1 ms`, así que sin ese milisegundo el resultado del intento nunca llega al hook.
 */
async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  await act(() => vi.advanceTimersByTimeAsync(1));
}

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  getServiceInfo.mockReset();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ ledgerService: { getServiceInfo } } as unknown as SuiGrpcClient);
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe('useNodeStatus', () => {
  it('is loading and then ok after the first successful poll', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58));
    const { result } = renderHook(() => useNodeStatus(), { wrapper });
    expect(result.current).toEqual({ kind: 'loading' });
    await advance(0);
    expect(result.current).toEqual({ kind: 'ok', checkpointHeight: 7n });
  });

  it('goes offline when the next poll fails', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58)).mockRejectedValueOnce(new Error('fetch failed'));
    const { result } = renderHook(() => useNodeStatus(), { wrapper });
    await advance(0);
    expect(result.current.kind).toBe('ok');
    await advance(NODE_STATUS_REFETCH_MS);
    expect(result.current).toEqual({ kind: 'offline', reason: 'fetch failed' });
  });

  it('reports wrong_chain when a later poll returns another chain id', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58)).mockImplementationOnce(answer(MAINNET_BASE58));
    const { result } = renderHook(() => useNodeStatus(), { wrapper });
    await advance(0);
    await advance(NODE_STATUS_REFETCH_MS);
    expect(result.current).toEqual({ kind: 'wrong_chain', expected: '4c78adac', actual: '35834a8a' });
  });

  it('goes offline when a poll returns an invalid base58 chain id', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58)).mockImplementationOnce(answer('0OIl'));
    const { result } = renderHook(() => useNodeStatus(), { wrapper });
    await advance(0);
    await advance(NODE_STATUS_REFETCH_MS);
    expect(result.current.kind).toBe('offline');
  });

  it('goes offline instead of keeping stale ok data when a poll hangs', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58)).mockImplementationOnce(hang);
    const { result } = renderHook(() => useNodeStatus(), { wrapper });
    await advance(0);
    expect(result.current.kind).toBe('ok');
    await advance(NODE_STATUS_REFETCH_MS);
    expect(result.current.kind).toBe('ok');
    await advance(NODE_STATUS_TIMEOUT_MS);
    expect(result.current).toEqual({ kind: 'offline', reason: 'El nodo no respondió en 10 s' });
  });

  it('passes the TanStack Query signal down to the request', async () => {
    getServiceInfo.mockImplementationOnce(answer(TESTNET_BASE58));
    renderHook(() => useNodeStatus(), { wrapper });
    await advance(0);
    expect(getServiceInfo.mock.calls[0]?.[1]?.abort).toBeInstanceOf(AbortSignal);
  });
});
