import { useChainNow } from '../hooks/useChainNow';
import { deadlineIso, formatDeadline, formatDeadlineMoment } from './deadlineFormat';

/** Texto mientras no hay una muestra de la hora de la cadena: nunca un tiempo inventado con la hora local. */
export const NO_CHAIN_TIME_TEXT = 'calculando el tiempo restante…';

/**
 * Cuenta regresiva de un plazo (`deadline_ms`) con la hora de la cadena como referencia (#73, TASK-8b; UX-2 a UX-4).
 * `role="timer"` con `aria-live` apagado: un lector de pantalla **no** la lee cada segundo (los cambios de estado se anuncian
 * aparte, una sola vez). Los números van en tabulares (`clock-counter`) para que el ancho no cambie. Con `withMoment`, la
 * fecha y hora absolutas van en un `<time dateTime>` (y como `title`). Es el único nodo que se vuelve a renderizar con el
 * tick: el resto de la fila no lo nota.
 */
export function Countdown({ deadlineMs, withMoment = true }: { deadlineMs: bigint; withMoment?: boolean }) {
  const nowMs = useChainNow(deadlineMs);
  const moment = formatDeadlineMoment(deadlineMs);
  return (
    <span className="clock-countdown">
      <span role="timer" aria-live="off" className="clock-counter">
        {nowMs === null ? NO_CHAIN_TIME_TEXT : formatDeadline(Number(deadlineMs) - nowMs)}
      </span>
      {withMoment && (
        <>
          {' '}
          (vence el{' '}
          <time dateTime={deadlineIso(deadlineMs)} title={moment}>
            {moment}
          </time>
          )
        </>
      )}
    </span>
  );
}
