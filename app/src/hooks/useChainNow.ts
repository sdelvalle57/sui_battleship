import { useCallback, useContext, useSyncExternalStore } from 'react';
import { CLAIM_GRACE_MS } from '../sui/gameRegistry';
import type { ClockMode, ScreenClock } from './screenClock';
import { ScreenClockContext } from './screenClockContext';

/**
 * Dónde está un plazo respecto de la hora de la cadena: `unknown` (todavía no hay una muestra de la hora de la cadena),
 * `running` (falta tiempo), `expired` (venció: ya se puede reclamar) y `stalled` (pasó además la gracia de `CLAIM_GRACE_MS`:
 * ya se puede reembolsar aunque quede un solo jugador pendiente).
 */
export type DeadlinePhase = 'unknown' | 'running' | 'expired' | 'stalled';

/** Fase de un plazo (`deadline_ms`, ms absolutos del reloj de la cadena) a la hora `nowMs` de la cadena. Pura. */
export function deadlinePhase(nowMs: number | null, deadlineMs: bigint): DeadlinePhase {
  if (nowMs === null) return 'unknown';
  const deadline = Number(deadlineMs);
  if (nowMs < deadline) return 'running';
  return nowMs < deadline + Number(CLAIM_GRACE_MS) ? 'expired' : 'stalled';
}

/** Qué tick pide una fase: solo la cuenta viva pide el de 1 s; lo vencido y lo desconocido, el de 1 min. */
function modeOf(phase: DeadlinePhase): ClockMode {
  return phase === 'running' ? 'live' : 'coarse';
}

/** El reloj de pantalla del contexto (el de la app, o el inyectado por un test). */
export function useScreenClock(): ScreenClock {
  return useContext(ScreenClockContext);
}

/**
 * Se suscribe al reloj de pantalla con el tick que corresponde a la fase del plazo y devuelve `select` de la hora estimada de
 * la cadena. Con un `select` que devuelve un valor primitivo, React solo vuelve a renderizar quien lo usa cuando ese valor
 * cambia (p. ej. la fase, no cada segundo).
 */
function useClockSelector<T extends number | string | null>(deadlineMs: bigint, select: (nowMs: number | null) => T): T {
  const clock = useScreenClock();
  const mode = modeOf(deadlinePhase(clock.getSnapshot(), deadlineMs));
  const subscribe = useCallback((listener: () => void) => clock.subscribe(mode, listener), [clock, mode]);
  const getSelected = useCallback(() => select(clock.getSnapshot()), [clock, select]);
  return useSyncExternalStore(subscribe, getSelected, getSelected);
}

const selectNow = (nowMs: number | null): number | null => nowMs;

/**
 * Hora estimada de la cadena (ms) para la cuenta regresiva de un plazo, o `null` sin muestra. Avanza cada segundo mientras
 * el plazo corre y cada minuto una vez vencido (UX-3); varias cuentas regresivas comparten **un solo** intervalo.
 */
export function useChainNow(deadlineMs: bigint): number | null {
  return useClockSelector(deadlineMs, selectNow);
}

/**
 * Fase de un plazo: solo vuelve a renderizar a quien la usa cuando la fase **cambia** (la vista y sus botones no se
 * renderizan en cada tick, UX-3).
 */
export function useDeadlinePhase(deadlineMs: bigint): DeadlinePhase {
  const select = useCallback((nowMs: number | null) => deadlinePhase(nowMs, deadlineMs), [deadlineMs]);
  return useClockSelector(deadlineMs, select);
}
