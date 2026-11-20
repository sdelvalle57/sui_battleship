import type { ReactNode } from 'react';
import { createScreenClock, type ScreenClock } from '../hooks/screenClock';
import { ScreenClockContext } from '../hooks/screenClockContext';

/**
 * Reloj de pantalla de prueba (ARQ-3, #73 TASK-8b): la hora local y los intervalos son falsos, así que un test avanza el
 * tiempo a mano y cuenta cuántos intervalos hay vivos, sin timers reales. `sample(chainMs)` anota una muestra de la hora de la
 * cadena recibida "ahora"; `advance(ms)` mueve la hora local y dispara cada intervalo vivo una vez por tick de 1 s (o de 1
 * min) que cabe en ese avance.
 */
export function createFakeScreenClock(startLocalMs = 1_000_000) {
  let now = startLocalMs;
  let nextHandle = 1;
  const intervals = new Map<number, { callback: () => void; ms: number; due: number }>();
  let created = 0;
  const clock: ScreenClock = createScreenClock({
    now: () => now,
    setIntervalFn: (callback, ms) => {
      const handle = nextHandle++;
      created += 1;
      intervals.set(handle, { callback, ms, due: now + ms });
      return handle;
    },
    clearIntervalFn: (handle) => {
      intervals.delete(handle as number);
    },
  });
  return {
    clock,
    /** Intervalos vivos ahora. */
    alive: () => intervals.size,
    /** Cuántos intervalos se crearon en total. */
    createdCount: () => created,
    /** Los períodos (ms) de los intervalos vivos. */
    periods: () => [...intervals.values()].map((interval) => interval.ms),
    /** Anota una muestra de la hora de la cadena: `chainMs` es el timestamp de un checkpoint recibido ahora. */
    sample: (chainMs: number) => {
      clock.observe(chainMs, now);
    },
    /**
     * Avanza la hora local `ms`, de a un segundo, y dispara cada intervalo vivo cuando le toca (a su período desde que se
     * creó, como un `setInterval` real); uno que se limpia en medio del avance no se dispara más.
     */
    advance: (ms: number) => {
      const target = now + ms;
      while (now < target) {
        now += Math.min(1_000, target - now);
        for (const [handle, interval] of [...intervals.entries()]) {
          if (intervals.get(handle) === interval && now >= interval.due) {
            interval.due += interval.ms;
            interval.callback();
          }
        }
      }
    },
    /** Hora local actual del reloj falso. */
    localNow: () => now,
  };
}

/** Envuelve un árbol con un reloj de pantalla inyectado. */
export function withScreenClock(clock: ScreenClock, children: ReactNode) {
  return <ScreenClockContext.Provider value={clock}>{children}</ScreenClockContext.Provider>;
}
