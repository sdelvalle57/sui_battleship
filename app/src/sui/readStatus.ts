import { READ_MAX_RETRIES } from './readPolicy';

/** Estado visible de una lectura: cargando, reintentando (intento n de m), en pausa sin red, error o lista. */
export type ReadStatus =
  | { kind: 'loading' }
  | { kind: 'retrying'; attempt: number; max: number }
  | { kind: 'paused' }
  | { kind: 'error'; error: unknown }
  | { kind: 'ready'; refreshing: boolean };

/**
 * Deriva el estado visible de una query de TanStack. Pura. Prioridad: sin red del navegador (`paused`); reintentando
 * (`fetching` con fallos previos: intento `failureCount + 1` de `READ_MAX_RETRIES + 1`); error; primera carga; lista
 * (`refreshing` si está volviendo a pedir en segundo plano).
 */
export function deriveReadStatus(q: {
  status: 'pending' | 'error' | 'success';
  fetchStatus: 'fetching' | 'paused' | 'idle';
  failureCount: number;
  error: unknown;
}): ReadStatus {
  if (q.fetchStatus === 'paused') return { kind: 'paused' };
  if (q.fetchStatus === 'fetching' && q.failureCount > 0) {
    return { kind: 'retrying', attempt: q.failureCount + 1, max: READ_MAX_RETRIES + 1 };
  }
  if (q.status === 'error') return { kind: 'error', error: q.error };
  if (q.status === 'pending') return { kind: 'loading' };
  return { kind: 'ready', refreshing: q.fetchStatus === 'fetching' };
}
