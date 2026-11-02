import { RpcError } from '@mysten/sui/grpc';
import { NotYetCheckpointedError, ReadTimeoutError } from './readErrors';

/** Corte por tiempo de cada intento de lectura (DL-5): un nodo colgado cuenta como error transitorio. */
export const READ_TIMEOUT_MS = 10_000;
/** Reintentos de una lectura transitoria: 2 reintentos = 3 intentos en total (DL-5). */
export const READ_MAX_RETRIES = 2;
/** Espera antes del primer reintento; se duplica en cada uno (1 s, 2 s). */
export const READ_RETRY_BASE_MS = 1_000;
/** Tope de la espera entre reintentos. */
export const READ_RETRY_MAX_MS = 4_000;

/**
 * Códigos gRPC que pueden mejorar reintentando (nodo caído o saturado, red cortada). `CANCELLED` queda fuera: es la
 * cancelación de TanStack (`cancelQueries`, desmontaje). `NOT_FOUND`, `INVALID_ARGUMENT` y `OUT_OF_RANGE` no cambian
 * reintentando.
 */
const TRANSIENT_RPC_CODES = new Set(['UNAVAILABLE', 'INTERNAL', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED', 'UNKNOWN', 'ABORTED']);

/**
 * Ejecuta una lectura con corte por tiempo propio, combinado con la señal de TanStack. Decide por la **señal que se
 * disparó**, no por el código del error (el transporte convierte un abort con razón propia en `INTERNAL`): si venció el
 * corte, lanza `ReadTimeoutError` (transitorio, con el error original como `cause`); si abortó `signal`, relanza el error
 * original (no transitorio). El corte usa `AbortController` + `setTimeout` limpiado en `finally`, no
 * `AbortSignal.timeout`, porque este no avanza con los timers falsos de Vitest en jsdom.
 */
export async function withReadTimeout<T>(signal: AbortSignal | undefined, call: (abort: AbortSignal) => Promise<T>): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => {
    timeout.abort(new ReadTimeoutError(READ_TIMEOUT_MS));
  }, READ_TIMEOUT_MS);
  const abort = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
  try {
    return await call(abort);
  } catch (error) {
    if (timeout.signal.aborted && signal?.aborted !== true) {
      throw new ReadTimeoutError(READ_TIMEOUT_MS, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Indica si un error de lectura puede resolverse reintentando: el corte propio, una transacción todavía sin checkpoint o
 * un `RpcError` con código transitorio. Nada más: los datos inválidos, "no existe", el historial podado y la cancelación
 * no mejoran reintentando.
 */
export function isTransientReadError(error: unknown): boolean {
  if (error instanceof ReadTimeoutError || error instanceof NotYetCheckpointedError) return true;
  return error instanceof RpcError && TRANSIENT_RPC_CODES.has(error.code);
}

/** Política de reintento de TanStack Query: solo errores transitorios y hasta `READ_MAX_RETRIES` reintentos. */
export function shouldRetryRead(failureCount: number, error: unknown): boolean {
  return failureCount < READ_MAX_RETRIES && isTransientReadError(error);
}

/** Espera antes del reintento `attempt` (desde 0): 1 s, 2 s, con tope en `READ_RETRY_MAX_MS`. */
export function readRetryDelay(attempt: number): number {
  return Math.min(READ_RETRY_BASE_MS * 2 ** attempt, READ_RETRY_MAX_MS);
}
