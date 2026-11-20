import { useChainClockSampling } from '../hooks/useChainClockSampling';

/**
 * Monta la lectura de la hora de la cadena que usan las cuentas regresivas (#73, TASK-8b). No dibuja nada: la página que
 * muestra una partida activa con reloj lo monta **una sola vez** (no por fila, para no sumar observadores del estado del
 * nodo) y solo mientras haya un plazo que contar, así que sin partidas con reloj no hace ningún pedido de más.
 */
export function ChainClockSampler() {
  useChainClockSampling();
  return null;
}
