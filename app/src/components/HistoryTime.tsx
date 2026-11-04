import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { useTransactionTime } from '../hooks/useTransactionTime';
import { formatTimestamp } from '../sui/format';

// Horas de las listas que salen del historial del nodo (el lobby de #10 y "Mis partidas" de #13), en un solo lugar.

/** Hora de una fila: la de su transacción, o "—" mientras carga, si falla o si no hay digest. */
export function CreatedAt({ txDigest, className = 'lobby-time' }: { txDigest: string; className?: string }) {
  const { timestampMs } = useTransactionTime(txDigest);
  return <span className={className}>{timestampMs === null ? '—' : formatTimestamp(timestampMs)}</span>;
}

/** " (desde <fecha>)" del piso de historial del nodo; sin fecha si la hora no llega (nunca "cargando"). */
export function FloorSince({ checkpoint }: { checkpoint: bigint }) {
  const { timestampMs } = useCheckpointTime(checkpoint);
  return timestampMs === null ? null : <> (desde {formatTimestamp(timestampMs)})</>;
}
