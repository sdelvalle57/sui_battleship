import { useCurrentClient } from '@mysten/dapp-kit-react';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import type { NodeStatus } from '../sui/nodeInfo';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import { useAppConfig } from './useAppConfig';
import { useChainClockSampling } from './useChainClockSampling';
import { useNodeStatus } from './useNodeStatus';

// UX-3 y PROY-14 (#73, TASK-8b): la hora de la cadena sale del último checkpoint que informó el estado del nodo; la muestra se
// anota en el reloj de pantalla dentro del pedido de TanStack Query (no en un efecto) y sin altura no se pide nada.
vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));
vi.mock('./useNodeStatus', () => ({ useNodeStatus: vi.fn() }));

const CONFIG = { network: 'localnet' } as AppConfig;
const getCheckpoint = vi.fn<(input: { checkpointId: { sequenceNumber: bigint } }) => Promise<unknown>>();
let queryClient: QueryClient;

const checkpointAt = (seconds: bigint, nanos = 0) => ({ response: { checkpoint: { summary: { timestamp: { seconds, nanos } } } } });

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  getCheckpoint.mockReset();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ ledgerService: { getCheckpoint } } as unknown as SuiGrpcClient);
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

function mount(status: NodeStatus, fake = createFakeScreenClock()) {
  vi.mocked(useNodeStatus).mockReturnValue(status);
  const wrapper = queryWrapper(queryClient);
  renderHook(
    () => {
      useChainClockSampling();
    },
    { wrapper: ({ children }) => wrapper({ children: withScreenClock(fake.clock, children) }) },
  );
  return fake;
}

describe('useChainClockSampling (UX-3, PROY-14)', () => {
  it('UX-3: asks for the time of the last checkpoint the node status reported and notes it as the chain time', async () => {
    getCheckpoint.mockResolvedValue(checkpointAt(5_000n, 500_000_000));
    const fake = mount({ kind: 'ok', checkpointHeight: 42n });
    await advance(0);
    expect(getCheckpoint).toHaveBeenCalledTimes(1);
    expect(getCheckpoint.mock.calls[0]?.[0]).toMatchObject({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 42n } });
    expect(fake.clock.getSnapshot()).toBe(5_000_500);
  });

  it('UX-3: asks for nothing while the node does not report a height (loading, offline, wrong chain or no height)', async () => {
    for (const status of [
      { kind: 'loading' },
      { kind: 'offline', reason: 'down' },
      { kind: 'wrong_chain', expected: 'a', actual: 'b' },
      { kind: 'ok', checkpointHeight: null },
    ] as NodeStatus[]) {
      const fake = mount(status);
      await advance(0);
      expect(fake.clock.getSnapshot()).toBeNull();
    }
    expect(getCheckpoint).not.toHaveBeenCalled();
  });

  it('PROY-14: reads the checkpoint once per height (immutable) and does not ask again on a re-render', async () => {
    getCheckpoint.mockResolvedValue(checkpointAt(5_000n));
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 42n });
    const fake = createFakeScreenClock();
    const wrapper = queryWrapper(queryClient);
    const { rerender } = renderHook(
      () => {
        useChainClockSampling();
      },
      { wrapper: ({ children }) => wrapper({ children: withScreenClock(fake.clock, children) }) },
    );
    await advance(0);
    rerender();
    rerender();
    await advance(60_000);
    expect(getCheckpoint).toHaveBeenCalledTimes(1);
  });

  it('UX-3: a new height asks for the new checkpoint and the estimate never goes back with an older one', async () => {
    getCheckpoint.mockResolvedValueOnce(checkpointAt(5_000n)).mockResolvedValueOnce(checkpointAt(4_990n));
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 42n });
    const fake = createFakeScreenClock();
    const wrapper = queryWrapper(queryClient);
    const { rerender } = renderHook(
      () => {
        useChainClockSampling();
      },
      { wrapper: ({ children }) => wrapper({ children: withScreenClock(fake.clock, children) }) },
    );
    await advance(0);
    expect(fake.clock.getSnapshot()).toBe(5_000_000);
    vi.mocked(useNodeStatus).mockReturnValue({ kind: 'ok', checkpointHeight: 43n });
    await act(async () => {
      rerender();
      await vi.advanceTimersByTimeAsync(1);
    });
    await advance(0);
    expect(getCheckpoint).toHaveBeenCalledTimes(2);
    expect(fake.clock.getSnapshot()).toBe(5_000_000);
  });

  it('a checkpoint without a timestamp leaves the clock without a sample (no invented time)', async () => {
    getCheckpoint.mockResolvedValue({ response: { checkpoint: { summary: {} } } });
    const fake = mount({ kind: 'ok', checkpointHeight: 42n });
    await advance(0);
    expect(fake.clock.getSnapshot()).toBeNull();
  });
});
