import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deriveNodeStatus, fetchNodeInfo, NODE_STATUS_TIMEOUT_MS, type NodeInfo } from './nodeInfo';

const TESTNET_CHAIN_ID_BASE58 = '69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD';

type GetServiceInfo = (input: object, options?: { abort?: AbortSignal }) => Promise<{ response: object }>;

/** Cliente falso: solo `ledgerService.getServiceInfo`, que es lo único que usa `fetchNodeInfo`. */
function fakeClient(getServiceInfo: GetServiceInfo) {
  return { ledgerService: { getServiceInfo } } as unknown as SuiGrpcClient;
}

/** `getServiceInfo` de un nodo colgado: nunca resuelve por sí solo y rechaza cuando se dispara `options.abort`. */
function hangingGetServiceInfo() {
  return vi.fn<GetServiceInfo>(
    (_input, options) =>
      new Promise((_resolve, reject) => {
        const abort = options?.abort;
        if (abort === undefined) {
          return;
        }
        if (abort.aborted) {
          reject(abort.reason as Error);
          return;
        }
        abort.addEventListener('abort', () => {
          reject(abort.reason as Error);
        });
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchNodeInfo', () => {
  it('returns the short chain id and the checkpoint height', async () => {
    const getServiceInfo = vi.fn<GetServiceInfo>(() =>
      Promise.resolve({ response: { chainId: TESTNET_CHAIN_ID_BASE58, checkpointHeight: 1234n } }),
    );
    await expect(fetchNodeInfo(fakeClient(getServiceInfo))).resolves.toEqual({
      chainId: '4c78adac',
      checkpointHeight: 1234n,
      lowestAvailableCheckpoint: null,
    });
    expect(getServiceInfo).toHaveBeenCalledWith({}, { abort: expect.any(AbortSignal) as AbortSignal });
  });

  it('returns a null checkpoint height when the node does not report it', async () => {
    const client = fakeClient(() => Promise.resolve({ response: { chainId: TESTNET_CHAIN_ID_BASE58 } }));
    await expect(fetchNodeInfo(client)).resolves.toEqual({
      chainId: '4c78adac',
      checkpointHeight: null,
      lowestAvailableCheckpoint: null,
    });
  });

  it('returns the lowest available checkpoint (history floor) when the node reports it', async () => {
    const client = fakeClient(() =>
      Promise.resolve({ response: { chainId: TESTNET_CHAIN_ID_BASE58, checkpointHeight: 402_087_595n, lowestAvailableCheckpoint: 396_603_024n } }),
    );
    await expect(fetchNodeInfo(client)).resolves.toMatchObject({ lowestAvailableCheckpoint: 396_603_024n });
  });

  it('rejects when the node does not report a chain id', async () => {
    const client = fakeClient(() => Promise.resolve({ response: {} }));
    await expect(fetchNodeInfo(client)).rejects.toThrow('El nodo no informó su chain id');
  });

  it('rejects an invalid base58 chain id', async () => {
    const client = fakeClient(() => Promise.resolve({ response: { chainId: '0OIl' } }));
    await expect(fetchNodeInfo(client)).rejects.toThrow();
  });

  it('rejects a hung node after NODE_STATUS_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const getServiceInfo = hangingGetServiceInfo();
    const assertion = expect(fetchNodeInfo(fakeClient(getServiceInfo))).rejects.toThrow('El nodo no respondió en 10 s');
    await vi.advanceTimersByTimeAsync(NODE_STATUS_TIMEOUT_MS);
    await assertion;
    expect(getServiceInfo.mock.calls[0]?.[1]?.abort).toBeInstanceOf(AbortSignal);
  });

  it('does not reject a hung node before the timeout', async () => {
    vi.useFakeTimers();
    let settled = false;
    const assertion = expect(
      fetchNodeInfo(fakeClient(hangingGetServiceInfo())).finally(() => {
        settled = true;
      }),
    ).rejects.toThrow('El nodo no respondió en 10 s');
    await vi.advanceTimersByTimeAsync(NODE_STATUS_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it('clears the timeout timer when the node answers', async () => {
    vi.useFakeTimers();
    const client = fakeClient(() => Promise.resolve({ response: { chainId: TESTNET_CHAIN_ID_BASE58 } }));
    await fetchNodeInfo(client);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects when the external signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('consulta descartada'));
    const client = fakeClient(hangingGetServiceInfo());
    await expect(fetchNodeInfo(client, controller.signal)).rejects.toThrow('consulta descartada');
  });
});

describe('deriveNodeStatus', () => {
  const data: NodeInfo = { chainId: '4c78adac', checkpointHeight: 42n, lowestAvailableCheckpoint: null };
  const base = { isPending: false, isError: false, error: null, data, fetchStatus: 'idle' as const, failureCount: 0 };

  it('is loading while the first attempt is pending', () => {
    expect(deriveNodeStatus({ ...base, isPending: true, data: undefined }, '4c78adac')).toEqual({ kind: 'loading' });
  });

  it('is ok when the chain id matches', () => {
    expect(deriveNodeStatus(base, '4c78adac')).toEqual({ kind: 'ok', checkpointHeight: 42n });
  });

  it('is wrong_chain with expected and actual when the chain id differs', () => {
    expect(deriveNodeStatus(base, '35834a8a')).toEqual({
      kind: 'wrong_chain',
      expected: '35834a8a',
      actual: '4c78adac',
    });
  });

  it('is offline with the error message as reason', () => {
    const error = new Error('fetch failed');
    expect(deriveNodeStatus({ ...base, isError: true, error, data: undefined }, '4c78adac')).toEqual({
      kind: 'offline',
      reason: 'fetch failed',
    });
  });

  it('is offline even with previous data after an error', () => {
    const error = new Error('timeout');
    expect(deriveNodeStatus({ ...base, isError: true, error }, '4c78adac')).toEqual({
      kind: 'offline',
      reason: 'timeout',
    });
  });

  it.each([
    [1, 2],
    [2, 3],
  ])('is retrying while a retry is in flight (failureCount %i ⇒ attempt %i of 3), even with data', (failureCount, attempt) => {
    expect(deriveNodeStatus({ ...base, fetchStatus: 'fetching', failureCount }, '4c78adac')).toEqual({ kind: 'retrying', attempt, max: 3 });
  });

  it('shows retrying over a previous error while retrying', () => {
    expect(deriveNodeStatus({ ...base, isError: true, error: new Error('x'), fetchStatus: 'fetching', failureCount: 1 }, '4c78adac').kind).toBe('retrying');
  });

  it('is not retrying on a normal refetch without failures', () => {
    expect(deriveNodeStatus({ ...base, fetchStatus: 'fetching' }, '4c78adac').kind).toBe('ok');
  });

  it('stringifies a non-Error reason', () => {
    expect(deriveNodeStatus({ ...base, isError: true, error: 'boom' }, '4c78adac')).toEqual({
      kind: 'offline',
      reason: 'boom',
    });
  });
});
