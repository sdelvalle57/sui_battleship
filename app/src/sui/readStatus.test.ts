import { describe, expect, it } from 'vitest';
import { deriveReadStatus } from './readStatus';

const base = { status: 'success' as const, fetchStatus: 'idle' as const, failureCount: 0, error: null };

describe('deriveReadStatus', () => {
  it('is loading on the first fetch', () => {
    expect(deriveReadStatus({ ...base, status: 'pending', fetchStatus: 'fetching' })).toEqual({ kind: 'loading' });
  });

  it.each([
    [1, 2],
    [2, 3],
  ])('is retrying attempt %#: failureCount %i ⇒ attempt %i of 3', (failureCount, attempt) => {
    expect(deriveReadStatus({ ...base, status: 'pending', fetchStatus: 'fetching', failureCount })).toEqual({
      kind: 'retrying',
      attempt,
      max: 3,
    });
  });

  it('is paused without browser network', () => {
    expect(deriveReadStatus({ ...base, status: 'pending', fetchStatus: 'paused' })).toEqual({ kind: 'paused' });
  });

  it('is error with the error once fetching stopped', () => {
    const error = new Error('x');
    expect(deriveReadStatus({ ...base, status: 'error', failureCount: 3, error })).toEqual({ kind: 'error', error });
  });

  it('is ready and not refreshing when idle', () => {
    expect(deriveReadStatus(base)).toEqual({ kind: 'ready', refreshing: false });
  });

  it('is ready and refreshing while refetching with data', () => {
    expect(deriveReadStatus({ ...base, fetchStatus: 'fetching' })).toEqual({ kind: 'ready', refreshing: true });
  });

  it('shows retrying over a previous error while a retry is in flight', () => {
    expect(deriveReadStatus({ ...base, status: 'error', fetchStatus: 'fetching', failureCount: 1 })).toMatchObject({ kind: 'retrying' });
  });
});
