import { TransactionError } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { NotYetCheckpointedError } from './readErrors';
import { withReadTimeout } from './readPolicy';

/** Paths del `readMask` de `getCheckpoint` con la hora (confirmados en la sonda P7 de #10). */
const CHECKPOINT_TIME_PATHS = ['sequence_number', 'summary.timestamp'];
const MS_PER_SECOND = 1_000;
const NANOS_PER_MS = 1_000_000;

/**
 * Hora y checkpoint de una transacción (DL-6), exitosa o fallida. `TransactionError` (no existe o podada) se relanza:
 * no es transitorio.
 */
export async function fetchTransactionInfo(
  client: Pick<SuiGrpcClient, 'getTransaction'>,
  { digest, signal }: { digest: string; signal?: AbortSignal },
): Promise<{ timestampMs: number | null; checkpoint: bigint | null }> {
  const result = await withReadTimeout(signal, (abort) => client.getTransaction({ digest, signal: abort }));
  const tx = result.Transaction ?? result.FailedTransaction;
  return { timestampMs: tx.timestampMs, checkpoint: tx.checkpoint === null ? null : BigInt(tx.checkpoint) };
}

/**
 * Checkpoint de la publicación original del paquete, cota inferior del lobby (M-1). `null` si el nodo ya podó esa
 * transacción (M-4: la cota pasa a ser solo el piso). Una transacción que todavía no está en un checkpoint lanza
 * `NotYetCheckpointedError`, transitorio (NIT-2).
 */
export async function fetchPublishCheckpoint(
  client: Pick<SuiGrpcClient, 'getTransaction'>,
  { digest, signal }: { digest: string; signal?: AbortSignal },
): Promise<bigint | null> {
  let info: { checkpoint: bigint | null };
  try {
    info = await fetchTransactionInfo(client, { digest, signal });
  } catch (error) {
    // En @mysten/sui 2.37 `TransactionError` solo tiene `reason: 'notFound'` (inexistente o podada).
    if (error instanceof TransactionError) return null;
    throw error;
  }
  if (info.checkpoint === null) throw new NotYetCheckpointedError(digest);
  return info.checkpoint;
}

/** Hora (ms) de un checkpoint por número, con el `getCheckpoint` crudo (el core del SDK no lo envuelve); `null` sin hora. */
export async function fetchCheckpointTime(
  client: Pick<SuiGrpcClient, 'ledgerService'>,
  { sequenceNumber, signal }: { sequenceNumber: bigint; signal?: AbortSignal },
): Promise<number | null> {
  // `UnaryCall` es thenable pero no `Promise`: el `async` lo convierte para `withReadTimeout`.
  const { response } = await withReadTimeout(signal, async (abort) =>
    client.ledgerService.getCheckpoint(
      { checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber }, readMask: { paths: CHECKPOINT_TIME_PATHS } },
      { abort },
    ),
  );
  const timestamp = response.checkpoint?.summary?.timestamp;
  if (timestamp === undefined) return null;
  return Number(timestamp.seconds) * MS_PER_SECOND + Math.floor(timestamp.nanos / NANOS_PER_MS);
}
