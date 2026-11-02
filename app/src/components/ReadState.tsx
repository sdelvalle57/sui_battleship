import { useAppConfig } from '../hooks/useAppConfig';
import { readErrorMessage } from '../sui/readErrors';
import type { ReadStatus } from '../sui/readStatus';

/**
 * Estado de una lectura mientras no está lista: cargando, reintentando (intento n de m), en pausa sin red o error con
 * su mensaje y "Reintentar" (deshabilitado mientras ya está pidiendo). Con `ready` no muestra nada.
 */
export function ReadState({ status, onRetry, busy = false }: { status: ReadStatus; onRetry: () => void; busy?: boolean }) {
  const { network } = useAppConfig();
  switch (status.kind) {
    case 'ready':
      return null;
    case 'loading':
      return <p role="status">Cargando…</p>;
    case 'retrying':
      return (
        <p role="status">
          Reintentando… (intento {status.attempt} de {status.max})
        </p>
      );
    case 'paused':
      return <p role="status">Sin conexión a internet: se reintentará al volver</p>;
    case 'error':
      return (
        <div role="alert" className="read-error">
          <p>{readErrorMessage(status.error, network)}</p>
          <button type="button" onClick={onRetry} disabled={busy}>
            Reintentar
          </button>
        </div>
      );
  }
}
