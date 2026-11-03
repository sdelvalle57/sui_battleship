import { SimulationError, type ClientWithCoreApi, type SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { isValidTransactionDigest } from '@mysten/sui/utils';
import { ReadTimeoutError } from './readErrors';
import { isTransientReadError, withReadTimeout } from './readPolicy';

/** Tope de la preflight (simulación propia antes de abrir la wallet, DL-3). */
export const TX_PREFLIGHT_TIMEOUT_MS = 20_000;
/** Tope de la confirmación con el nodo tras la wallet (DL-2). */
export const TX_CONFIRM_TIMEOUT_MS = 30_000;
/** Tope de la espera de indexación antes de invalidar (DL-5). */
export const TX_INDEX_TIMEOUT_MS = 30_000;
/** Pausa entre intentos de `waitForCheckpoint`. */
const CHECKPOINT_POLL_MS = 500;
/** Niveles de `cause` que recorre `digestFromError` (además del error recibido). */
const MAX_CAUSE_DEPTH = 5;

/** Texto de un fallo de red en la preflight (M-3 (a)): no pasa por `errors.ts` porque no es un rechazo del contrato. */
export const PREFLIGHT_NETWORK_MESSAGE = 'No se pudo verificar la transacción (red); intenta de nuevo';

/**
 * La preflight no pudo hablar con el nodo (error transitorio o corte de `TX_PREFLIGHT_TIMEOUT_MS`). No dice nada de la
 * transacción: la wallet no se abre y el usuario puede reintentar.
 */
export class PreflightNetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super(PREFLIGHT_NETWORK_MESSAGE, options);
    this.name = 'PreflightNetworkError';
  }
}

/** Resultado de una transacción leído del nodo con efectos y eventos (lo que necesitan DL-2, DL-9 y DL-10). */
export type NodeTransactionResult = SuiClientTypes.TransactionResult<{ effects: true; events: true }>;

/**
 * Preflight propia (DL-3): simula **una copia** con `sender` y `build({ client })` antes de abrir la wallet, para
 * obtener el abort estructurado con cualquier wallet y no abrirla con una transacción condenada. El `tx` recibido queda
 * intacto (sin `sender`): a la wallet va el original sin construir. `SimulationError` se relanza tal cual (lo mapea
 * `errors.ts`); un error transitorio o el corte se relanzan como `PreflightNetworkError`; cualquier otro, tal cual.
 * `build` no acepta señal: el corte y `signal` cortan la espera, no el pedido en curso.
 */
export async function preflightTransaction(
  client: ClientWithCoreApi,
  tx: Transaction,
  sender: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const copy = Transaction.from(await tx.toJSON());
  copy.setSender(sender);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const stop = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ReadTimeoutError(TX_PREFLIGHT_TIMEOUT_MS));
    }, TX_PREFLIGHT_TIMEOUT_MS);
    if (signal) {
      onAbort = () => {
        reject(new Error('preflight cancelada'));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
  });
  try {
    return await Promise.race([copy.build({ client }), stop]);
  } catch (error) {
    // Cancelada desde afuera: se propaga la razón de `signal`, no se clasifica.
    signal?.throwIfAborted();
    if (error instanceof SimulationError) throw error;
    if (isTransientReadError(error)) throw new PreflightNetworkError({ cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Confirma con el nodo (DL-2): `waitForTransaction` por digest con efectos y eventos, con tope `TX_CONFIRM_TIMEOUT_MS`.
 * El SDK se traga los errores de cada intento (V-8) y rechaza al vencer el tope; ese error se propaga. En el fullnode
 * 1.83 la transacción aparece ya en un checkpoint (S-1 bis de #11), así que el resultado suele traer `checkpoint`.
 */
export async function confirmTransaction(
  client: Pick<SuiGrpcClient, 'waitForTransaction'>,
  { digest, signal }: { digest: string; signal?: AbortSignal },
): Promise<NodeTransactionResult> {
  return client.waitForTransaction({
    digest,
    include: { effects: true, events: true },
    timeout: TX_CONFIRM_TIMEOUT_MS,
    signal,
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Espera a que la transacción esté en un checkpoint antes de invalidar (DL-5): el lobby lee `ListEvents`, que solo ve
 * transacciones con checkpoint, y `getObject` puede devolver la versión vieja justo después de ejecutar (S-1 bis).
 * Repite `getTransaction` (con `withReadTimeout` por intento) cada `CHECKPOINT_POLL_MS`; cualquier error de un intento,
 * incluido el "not found" de una transacción todavía sin indexar, cuenta como intento fallido. `true` al ver
 * `checkpoint`, `false` al vencer `TX_INDEX_TIMEOUT_MS`; `signal` corta con su razón.
 */
export async function waitForCheckpoint(
  client: Pick<SuiGrpcClient, 'getTransaction'>,
  { digest, signal }: { digest: string; signal?: AbortSignal },
): Promise<boolean> {
  const deadline = new AbortController();
  const timer = setTimeout(() => {
    deadline.abort();
  }, TX_INDEX_TIMEOUT_MS);
  const stop = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
  // Función y no lectura directa: el estado cambia entre `await` y TS no lo vería.
  const expired = () => deadline.signal.aborted;
  try {
    for (;;) {
      signal?.throwIfAborted();
      if (expired()) return false;
      try {
        const result = await withReadTimeout(stop, (abort) => client.getTransaction({ digest, signal: abort }));
        const tx = result.Transaction ?? result.FailedTransaction;
        if (tx.checkpoint !== null) return true;
      } catch {
        // Intento fallido (red, corte, "not found" antes de indexar): el tope decide.
      }
      signal?.throwIfAborted();
      if (expired()) return false;
      await sleep(CHECKPOINT_POLL_MS, stop);
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Éxito o fallo según el `status` **del nodo** (DL-2, SEG-10); nunca según lo que diga la wallet. */
export function classifyExecution(
  result: SuiClientTypes.TransactionResult,
): { kind: 'success' } | { kind: 'failure'; error: SuiClientTypes.ExecutionError } {
  const { status } = result.Transaction ?? result.FailedTransaction;
  return status.success ? { kind: 'success' } : { kind: 'failure', error: status.error };
}

/**
 * Digest de transacción que traiga un error (o su `cause`, hasta 5 niveles), p. ej. una wallet que ejecutó y después
 * falló (M-3 (b)): con digest, el resultado se decide leyendo al nodo, nunca por el error. Solo digests válidos.
 */
export function digestFromError(error: unknown): string | null {
  let node: unknown = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && typeof node === 'object' && node !== null; depth++) {
    const { digest, cause } = node as { digest?: unknown; cause?: unknown };
    if (typeof digest === 'string' && isValidTransactionDigest(digest)) return digest;
    node = cause;
  }
  return null;
}

/** Costo de red de una transacción en MIST (DL-13): cómputo + storage − rebate; puede ser negativo si libera storage. */
export function networkCost(gasUsed: SuiClientTypes.GasCostSummary): bigint {
  return BigInt(gasUsed.computationCost) + BigInt(gasUsed.storageCost) - BigInt(gasUsed.storageRebate);
}
