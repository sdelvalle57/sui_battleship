import { createContext } from 'react';
import { defaultScreenClock, type ScreenClock } from './screenClock';

/**
 * El reloj de pantalla que usan las cuentas regresivas (ARQ-3): por defecto el de la app (un solo intervalo para toda ella);
 * un test o una vista aislada lo sustituye con un `ScreenClockContext.Provider` con su propio reloj inyectable.
 */
export const ScreenClockContext = createContext<ScreenClock>(defaultScreenClock);
