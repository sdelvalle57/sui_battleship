import { describe, expect, it } from 'vitest';
import { buildGameRegistry, type TypeOrigin } from '../sui/gameRegistry';
import { catalogOf } from './useGameCatalog';

// #73 (TASK-8b): qué muestran las pantallas según el registro. Con el `testnet.json` de hoy (una sola fuente), las pantallas
// son las de siempre; con la fuente nueva aparecen el rótulo de fuente, el control de tiempo y el filtro por juego.
const ORIGINAL = `0x${'1'.repeat(64)}`;
const UPGRADE = `0x${'2'.repeat(64)}`;
const TYPE_ORIGINS: TypeOrigin[] = [
  ...['Game', 'GameCreated', 'GameCancelled', 'GameResolved'].map((name) => ({ module: 'game', name, definingId: ORIGINAL })),
  ...['Duel', 'DuelCreated', 'DuelCancelled', 'DuelActivated', 'DuelTurn', 'DuelResolved', 'DuelTimedOut', 'DuelExpired'].map((name) => ({
    module: 'duel',
    name,
    definingId: UPGRADE,
  })),
  { module: 'coinflip', name: 'Coinflip', definingId: UPGRADE },
];

describe('catalogOf', () => {
  it('with only the previous source (packageVersion 1) the multi-source UI is off and the coinflip is creatable', () => {
    const catalog = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL }));
    expect(catalog.multiSource).toBe(false);
    expect(catalog.games.map((game) => game.key)).toEqual(['coinflip']);
    expect(catalog.creatable.map((game) => game.key)).toEqual(['coinflip']);
    expect(catalog.creatable[0]?.createSource).toBe('legacy');
  });

  it('with the new source (after the upgrade) the multi-source UI is on and "crear" goes to the new source', () => {
    const catalog = catalogOf(buildGameRegistry({ originalPackageId: ORIGINAL, upgrades: [{ packageId: UPGRADE }], typeOrigins: TYPE_ORIGINS }));
    expect(catalog.multiSource).toBe(true);
    expect(catalog.creatable[0]?.createSource).toBe('duel');
  });

  it('lists only the games the app can create as creatable, and all of them as games', () => {
    const [coinflip] = buildGameRegistry({ originalPackageId: ORIGINAL });
    if (coinflip === undefined) throw new Error('el registro debe tener el coinflip');
    const catalog = catalogOf([coinflip, { ...coinflip, creatable: false }]);
    expect(catalog.games).toHaveLength(2);
    expect(catalog.creatable).toHaveLength(1);
  });
});
