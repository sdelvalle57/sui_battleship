import { useMemo } from 'react';
import { buildGameRegistry, type GameRegistry } from '../sui/gameRegistry';
import { useAppConfig } from './useAppConfig';

/**
 * Registro de juegos de la app (#73, TASK-7b): se arma **de la `config` completa** (con `upgrades` y `typeOrigins`), nunca
 * de IDs sueltos, y una sola vez mientras la config no cambia. Ningún componente ni hook arma tags de tipo o de evento: los
 * leen de acá (ARQ-1).
 */
export function useGameRegistry(): GameRegistry {
  const config = useAppConfig();
  return useMemo(() => buildGameRegistry(config), [config]);
}
