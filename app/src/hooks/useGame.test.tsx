import { useCurrentClient } from '@mysten/dapp-kit-react';
import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import { RpcError, type SuiGrpcClient } from '@mysten/sui/grpc';
import { fromBase64 } from '@mysten/sui/utils';
import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advance, createPolicyQueryClient, queryWrapper } from '../test/queryHarness';
import type { AppConfig } from '../sui/config';
import { READ_TIMEOUT_MS } from '../sui/readPolicy';
import { useAppConfig } from './useAppConfig';
import { useGame } from './useGame';

vi.mock('@mysten/dapp-kit-react', () => ({ useCurrentClient: vi.fn() }));
vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

type FixtureObject = { objectId: string; type: string; owner: SuiClientTypes.ObjectOwner; content: string; previousTransaction: string };
type Fixture = { objects: { pendingOpen: FixtureObject } };
const FIXTURE_PATH = '../../../contracts/fixtures/game-reads.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-reads.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;
const OPEN = fixture.objects.pendingOpen;
const PKG = OPEN.type.split('::')[0] ?? '';

const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '1f1f882e',
  packageId: PKG,
  originalPackageId: PKG,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};

type GetObject = (input: { objectId: string; signal?: AbortSignal }) => Promise<unknown>;
const getObject = vi.fn<GetObject>();
const okObject = (content = fromBase64(OPEN.content)) => () =>
  Promise.resolve({ object: { objectId: OPEN.objectId, type: OPEN.type, owner: OPEN.owner, content, previousTransaction: OPEN.previousTransaction } });
/** SDK colgado: solo rechaza cuando se dispara la señal que recibió. */
const hang: GetObject = ({ signal }) =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => {
      reject(new RpcError('aborted', 'CANCELLED'));
    });
  });

let queryClient: QueryClient;
const render = (rawId: string) => renderHook(() => useGame(rawId), { wrapper: queryWrapper(queryClient) });

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = createPolicyQueryClient();
  getObject.mockReset();
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
  vi.mocked(useCurrentClient).mockReturnValue({ getObject } as unknown as SuiGrpcClient);
});

afterEach(() => {
  queryClient.clear();
  vi.useRealTimers();
});

describe('useGame', () => {
  it('returns invalid_id without calling the client', async () => {
    const { result } = render('no-es-un-id');
    await advance(0);
    expect(result.current).toEqual({ kind: 'invalid_id' });
    expect(getObject).not.toHaveBeenCalled();
  });

  it('queries the normalized id for an uppercase input', async () => {
    getObject.mockImplementation(okObject());
    const { result } = render(OPEN.objectId.toUpperCase().replace('0X', '0x'));
    await advance(0);
    expect(getObject.mock.calls[0]?.[0].objectId).toBe(OPEN.objectId);
    expect(result.current).toMatchObject({ kind: 'read', id: OPEN.objectId, status: { kind: 'ready' } });
  });

  it('shows retrying (attempt 2 of 3) after an UNAVAILABLE error and then ready', async () => {
    getObject.mockRejectedValueOnce(new RpcError('down', 'UNAVAILABLE')).mockImplementation(okObject());
    const { result } = render(OPEN.objectId);
    await advance(0);
    expect(result.current).toMatchObject({ status: { kind: 'retrying', attempt: 2, max: 3 } });
    await advance(1000);
    expect(result.current).toMatchObject({ status: { kind: 'ready' }, game: { id: OPEN.objectId } });
    expect(getObject).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['RpcError NOT_FOUND', () => Promise.reject(new RpcError('x', 'NOT_FOUND'))],
    ['ObjectError notFound (GameNotFoundError)', () => Promise.reject(new ObjectError('notExists', 'x', { reason: 'notFound' }))],
    ['unreadable data (ReadDataError)', okObject(fromBase64(OPEN.content).slice(0, -1))],
  ])('fails with %s without a second call', async (_name, impl) => {
    getObject.mockImplementation(impl);
    const { result } = render(OPEN.objectId);
    await advance(0);
    await advance(5000);
    expect(result.current).toMatchObject({ status: { kind: 'error' } });
    expect(getObject).toHaveBeenCalledTimes(1);
  });

  it('retries after its own timeout', async () => {
    getObject.mockImplementationOnce(hang).mockImplementation(okObject());
    const { result } = render(OPEN.objectId);
    await advance(READ_TIMEOUT_MS);
    expect(result.current).toMatchObject({ status: { kind: 'retrying', attempt: 2 } });
    await advance(1000);
    expect(getObject).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: { kind: 'ready' } });
  });

  it('aborts the SDK request on cancelQueries (LIM-11)', async () => {
    getObject.mockImplementation(hang);
    render(OPEN.objectId);
    await advance(0);
    const signal = getObject.mock.calls[0]?.[0].signal;
    expect(signal?.aborted).toBe(false);
    await act(() => queryClient.cancelQueries());
    expect(signal?.aborted).toBe(true);
  });
});
