/**
 * Reloj de pantalla de la cuenta regresiva de las partidas con reloj por jugada (#73, TASK-8b; UX-3 y ARQ-3).
 *
 * Es **estado de presentación**: un único intervalo compartido por todas las filas y vistas que cuentan el tiempo, que solo
 * hace avanzar la hora estimada de la cadena y **nunca pide datos** (PROY-14). La hora de la cadena sale de una muestra (el
 * timestamp de un checkpoint reciente, `observe`) y la hora local solo la hace avanzar entre muestras. Todo es inyectable
 * (hora local, `setInterval` y `clearInterval`) para probarlo con un reloj falso sin timers reales.
 *
 * Propiedades:
 * - **un solo intervalo**: con N cuentas regresivas hay un único `setInterval`; se crea con el primer suscriptor y se limpia
 *   con el último;
 * - **monótono**: la estimación nunca retrocede, ni con una muestra nueva más vieja que lo ya extrapolado (se conserva el
 *   mayor desfase observado entre la cadena y la hora local: cada muestra llega con la edad de su checkpoint, así que el
 *   mayor desfase es el más fresco) ni si la hora local se atrasa;
 * - **se detiene al vencer**: cada suscriptor pide el tick `live` (1 s) mientras cuenta y el `coarse` (1 min) una vez que su
 *   plazo venció, solo para que "venció hace N min" siga avanzando; sin ningún `live` el intervalo baja a 1 min y sin
 *   suscriptores se limpia.
 */

/** Cada cuánto avanza la cuenta regresiva viva. */
export const LIVE_TICK_MS = 1_000;
/** Cada cuánto avanza lo que ya venció (el "venció hace N min"). */
export const COARSE_TICK_MS = 60_000;

/** Qué tick pide un suscriptor: el de cada segundo (cuenta viva) o el de cada minuto (plazo ya vencido). */
export type ClockMode = 'live' | 'coarse';

/** Dependencias sustituibles en test (ARQ-3): la hora local y el par de funciones de intervalo. */
export type ScreenClockDeps = {
  now?: () => number;
  setIntervalFn?: (callback: () => void, ms: number) => unknown;
  clearIntervalFn?: (handle: unknown) => void;
};

/** El reloj de pantalla: suscripción a sus avances, lectura de la hora estimada de la cadena y alta de muestras. */
export type ScreenClock = {
  /** Se suscribe a los avances del reloj con el tick que pide `mode`; devuelve la baja. */
  subscribe: (mode: ClockMode, listener: () => void) => () => void;
  /** Hora estimada de la cadena (ms) al último avance, o `null` mientras no hay ninguna muestra. */
  getSnapshot: () => number | null;
  /** Anota una muestra: el timestamp de un checkpoint (hora de la cadena) recibido cuando la hora local era `receivedAtMs`. */
  observe: (chainMs: number, receivedAtMs: number) => void;
  /** La hora local del reloj inyectado, para armar la marca de una muestra. */
  localNow: () => number;
};

/** Crea un reloj de pantalla. Cada llamada es independiente: los tests inyectan el suyo; la app usa `defaultScreenClock`. */
export function createScreenClock({
  now = () => Date.now(),
  setIntervalFn = (callback, ms) => setInterval(callback, ms),
  clearIntervalFn = (handle) => {
    clearInterval(handle as ReturnType<typeof setInterval>);
  },
}: ScreenClockDeps = {}): ScreenClock {
  const listeners = new Set<() => void>();
  let live = 0;
  let coarse = 0;
  let handle: unknown = null;
  let period = 0;
  /** Mayor desfase observado entre la hora de la cadena y la local (ms); `null` sin muestras. */
  let offsetMs: number | null = null;
  let snapshot: number | null = null;

  /** Recalcula la estimación sin dejarla retroceder; `true` si cambió. */
  const recompute = (): boolean => {
    if (offsetMs === null) return false;
    const estimate = now() + offsetMs;
    const next = snapshot === null ? estimate : Math.max(snapshot, estimate);
    if (next === snapshot) return false;
    snapshot = next;
    return true;
  };
  const emit = () => {
    for (const listener of [...listeners]) listener();
  };
  const tick = () => {
    if (recompute()) emit();
  };
  /** Deja corriendo exactamente el intervalo que piden los suscriptores: ninguno, el de 1 min o el de 1 s. */
  const reconcile = () => {
    const wanted = live > 0 ? LIVE_TICK_MS : coarse > 0 ? COARSE_TICK_MS : 0;
    if (wanted === period) return;
    if (handle !== null) {
      clearIntervalFn(handle);
      handle = null;
    }
    period = wanted;
    if (wanted > 0) handle = setIntervalFn(tick, wanted);
  };

  return {
    subscribe: (mode, listener) => {
      listeners.add(listener);
      if (mode === 'live') live += 1;
      else coarse += 1;
      // Con el reloj quieto la estimación quedó vieja: se refresca al suscribirse (sin avisar: quien se suscribe relee).
      recompute();
      reconcile();
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
        if (mode === 'live') live -= 1;
        else coarse -= 1;
        reconcile();
      };
    },
    getSnapshot: () => snapshot,
    observe: (chainMs, receivedAtMs) => {
      const candidate = chainMs - receivedAtMs;
      if (offsetMs !== null && candidate <= offsetMs) return;
      offsetMs = candidate;
      recompute();
      emit();
    },
    localNow: now,
  };
}

/** El reloj de pantalla de la app (un solo intervalo para toda la aplicación). */
export const defaultScreenClock: ScreenClock = createScreenClock();
