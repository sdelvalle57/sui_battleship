import { ObjectError, TransactionError } from '@mysten/sui/client';
import { RpcError } from '@mysten/sui/grpc';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GameNotFoundError,
  HistoryPrunedError,
  NotAGameError,
  NotYetCheckpointedError,
  PaginationStalledError,
  ReadDataError,
  ReadTimeoutError,
} from './readErrors';
import {
  READ_MAX_RETRIES,
  READ_TIMEOUT_MS,
  readRetryDelay,
  shouldRetryRead,
  withReadTimeout,
} from './readPolicy';

/** Llamada colgada: solo termina cuando se dispara su `abort`, rechazando como el transporte. */
function hangingCall(onAbort: (abort: AbortSignal) => Error) {
  return (abort: AbortSignal) =>
    new Promise<never>((_resolve, reject) => {
      abort.addEventListener('abort', () => {
        reject(onAbort(abort));
      });
    });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('withReadTimeout', () => {
  it('returns the value and leaves no pending timer', async () => {
    vi.useFakeTimers();
    await expect(withReadTimeout(undefined, () => Promise.resolve(42))).resolves.toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('throws a retryable ReadTimeoutError with the original error as cause after READ_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    const original = new RpcError('aborted by own timeout', 'INTERNAL');
    const promise = withReadTimeout(undefined, hangingCall(() => original));
    const assertion = expect(promise).rejects.toBeInstanceOf(ReadTimeoutError);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    await assertion;
    const error = await promise.catch((e: unknown) => e);
    expect(error).toMatchObject({ message: 'El nodo no respondió en 10 s', cause: original });
    expect(shouldRetryRead(0, error)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not time out before READ_TIMEOUT_MS', async () => {
    vi.useFakeTimers();
    let settled = false;
    const assertion = expect(
      withReadTimeout(undefined, hangingCall(() => new Error('x'))).finally(() => {
        settled = true;
      }),
    ).rejects.toBeInstanceOf(ReadTimeoutError);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });

  it('rethrows the original error, not retryable, when the external signal aborts', async () => {
    const controller = new AbortController();
    const cancelled = new RpcError('cancelled', 'CANCELLED');
    const promise = withReadTimeout(controller.signal, hangingCall(() => cancelled));
    controller.abort();
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBe(cancelled);
    expect(shouldRetryRead(0, error)).toBe(false);
  });

  it('passes a signal that follows the external one', async () => {
    const controller = new AbortController();
    controller.abort(new Error('ya abortada'));
    await expect(withReadTimeout(controller.signal, (abort) => Promise.resolve(abort.aborted))).resolves.toBe(true);
  });
});

describe('shouldRetryRead', () => {
  it.each([
    ['UNAVAILABLE', true],
    ['INTERNAL', true],
    ['DEADLINE_EXCEEDED', true],
    ['RESOURCE_EXHAUSTED', true],
    ['UNKNOWN', true],
    ['ABORTED', true],
    ['CANCELLED', false],
    ['NOT_FOUND', false],
    ['INVALID_ARGUMENT', false],
    ['OUT_OF_RANGE', false],
    ['PERMISSION_DENIED', false],
  ])('RpcError %s ⇒ %s', (code, expected) => {
    expect(shouldRetryRead(0, new RpcError('x', code))).toBe(expected);
  });

  it.each([
    ['ReadTimeoutError', new ReadTimeoutError(READ_TIMEOUT_MS), true],
    ['NotYetCheckpointedError', new NotYetCheckpointedError('d'), true],
    ['ReadDataError', new ReadDataError('malformed', 'x'), false],
    ['GameNotFoundError', new GameNotFoundError('0x1'), false],
    ['NotAGameError', new NotAGameError('0x1', 'T'), false],
    ['PaginationStalledError', new PaginationStalledError(), false],
    ['HistoryPrunedError', new HistoryPrunedError('x'), false],
    ['ObjectError', new ObjectError('notExists', 'x', { reason: 'notFound' }), false],
    ['TransactionError', new TransactionError('notFound', 'd'), false],
    ['plain Error', new Error('x'), false],
    ['non-Error value', 'x', false],
  ])('%s ⇒ %s', (_name, error, expected) => {
    expect(shouldRetryRead(0, error)).toBe(expected);
  });

  it('stops after READ_MAX_RETRIES retries even for transient errors', () => {
    const transient = new RpcError('x', 'UNAVAILABLE');
    expect(shouldRetryRead(READ_MAX_RETRIES - 1, transient)).toBe(true);
    expect(shouldRetryRead(READ_MAX_RETRIES, transient)).toBe(false);
  });
});

describe('readRetryDelay', () => {
  it.each([
    [0, 1000],
    [1, 2000],
    [2, 4000],
    [3, 4000],
  ])('attempt %i ⇒ %i ms', (attempt, ms) => {
    expect(readRetryDelay(attempt)).toBe(ms);
  });
});
