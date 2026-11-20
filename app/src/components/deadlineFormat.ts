import { formatTimestamp } from '../sui/format';

/**
 * Formato del plazo de una partida con reloj por jugada (#73, TASK-8b; UX-2): funciones puras, sin dependencias de fechas,
 * en español y con granularidad decreciente. El plazo restante se escribe "quedan 2 días 3 h", "quedan 5 h 12 min",
 * "quedan 9 min 30 s" o "quedan 45 s", y vencido, "venció hace 5 min" (sin segundos desde el minuto, porque lo vencido
 * avanza de a un minuto). Nunca dice "0 s" mientras falte tiempo: el último segundo se redondea hacia arriba.
 */

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

function plural(amount: number, singular: string, many: string): string {
  return `${String(amount)} ${amount === 1 ? singular : many}`;
}
const days = (n: number) => plural(n, 'día', 'días');
const hours = (n: number) => `${String(n)} h`;
const minutes = (n: number) => `${String(n)} min`;
const seconds = (n: number) => `${String(n)} s`;

/** Une la unidad mayor con la menor solo si la menor no es cero ("2 días 3 h", "1 día"). */
function pair(major: string, minor: string, minorAmount: number): string {
  return minorAmount === 0 ? major : `${major} ${minor}`;
}

/** Tiempo que falta, en segundos enteros (≥ 1), con las dos unidades mayores que lo componen. */
function remainingText(totalSeconds: number): string {
  if (totalSeconds >= SECONDS_PER_DAY) {
    const d = Math.floor(totalSeconds / SECONDS_PER_DAY);
    const h = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    return pair(days(d), hours(h), h);
  }
  if (totalSeconds >= SECONDS_PER_HOUR) {
    const h = Math.floor(totalSeconds / SECONDS_PER_HOUR);
    const m = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return pair(hours(h), minutes(m), m);
  }
  if (totalSeconds >= SECONDS_PER_MINUTE) {
    const m = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const s = totalSeconds % SECONDS_PER_MINUTE;
    return pair(minutes(m), seconds(s), s);
  }
  return seconds(totalSeconds);
}

/** Tiempo que pasó desde el vencimiento, en segundos enteros (≥ 1): sin segundos desde el minuto. */
function overdueText(totalSeconds: number): string {
  if (totalSeconds >= SECONDS_PER_DAY) {
    const d = Math.floor(totalSeconds / SECONDS_PER_DAY);
    const h = Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    return pair(days(d), hours(h), h);
  }
  if (totalSeconds >= SECONDS_PER_HOUR) {
    const h = Math.floor(totalSeconds / SECONDS_PER_HOUR);
    const m = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return pair(hours(h), minutes(m), m);
  }
  if (totalSeconds >= SECONDS_PER_MINUTE) return minutes(Math.floor(totalSeconds / SECONDS_PER_MINUTE));
  return seconds(totalSeconds);
}

/**
 * El tiempo que falta (o que pasó) hasta un plazo, sin el verbo: `remainingMs` = plazo − ahora (ms). Con tiempo por delante,
 * "2 días 3 h", "5 h 12 min", "9 min 30 s" o "45 s" (el último segundo, hacia arriba: 999 ms ⇒ "1 s"); vencido, el tiempo
 * transcurrido ("5 min"); en el instante exacto del plazo, `null`.
 */
export function formatSpan(remainingMs: number): string | null {
  if (remainingMs > 0) return remainingText(Math.ceil(remainingMs / MS_PER_SECOND));
  const overdueSeconds = Math.floor(-remainingMs / MS_PER_SECOND);
  return overdueSeconds === 0 ? null : overdueText(overdueSeconds);
}

/**
 * Plazo legible: "quedan 5 h 12 min" con tiempo por delante, "venció hace 5 min" una vez vencido y "venció ahora" en el
 * instante del plazo y durante el primer segundo posterior.
 */
export function formatDeadline(remainingMs: number): string {
  const span = formatSpan(remainingMs);
  if (remainingMs > 0) return `quedan ${span ?? ''}`;
  return span === null ? 'venció ahora' : `venció hace ${span}`;
}

/** Fecha y hora absolutas del plazo (la misma forma que el resto de la app), para el `<time>` y su `title`. */
export function formatDeadlineMoment(deadlineMs: bigint): string {
  return formatTimestamp(Number(deadlineMs));
}

/** `dateTime` del `<time>`: ISO 8601 en UTC del plazo. */
export function deadlineIso(deadlineMs: bigint): string {
  return new Date(Number(deadlineMs)).toISOString();
}
