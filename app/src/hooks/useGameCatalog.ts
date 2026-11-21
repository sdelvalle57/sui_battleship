import { useMemo } from 'react';
import type { GameRegistry } from '../sui/gameRegistry';
import { useGameRegistry } from './useGameRegistry';

/**
 * Lo que las pantallas necesitan saber del registro de juegos (#73, TASK-8b): qué juegos hay, cuáles se pueden crear y si
 * conviven las dos fuentes.
 */
export type GameCatalog = {
  /** Todos los juegos del registro, en el orden en que se listan (el filtro del lobby). */
  games: GameRegistry;
  /** Los que la app puede crear (el selector de juego del formulario aparece solo con más de uno). */
  creatable: GameRegistry;
  /**
   * El registro tiene la fuente nueva (`Duel<G>`): recién entonces —tras el upgrade— la app rotula las filas "anterior" y
   * "nueva", muestra el control de tiempo en el lobby y ofrece el filtro por juego. Con el `testnet.json` de hoy
   * (`packageVersion` 1, solo la fuente anterior) las pantallas son las de siempre.
   */
  multiSource: boolean;
};

/** Deriva el catálogo de un registro. Pura. */
export function catalogOf(registry: GameRegistry): GameCatalog {
  return {
    games: registry,
    creatable: registry.filter((game) => game.creatable),
    multiSource: registry.some((game) => game.sources.some((source) => source.kind === 'duel')),
  };
}

/** El catálogo de juegos de la app, armado una sola vez mientras la config no cambia. */
export function useGameCatalog(): GameCatalog {
  const registry = useGameRegistry();
  return useMemo(() => catalogOf(registry), [registry]);
}
