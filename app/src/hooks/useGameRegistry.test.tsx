import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../sui/config';
import { useAppConfig } from './useAppConfig';
import { useGameRegistry } from './useGameRegistry';

vi.mock('./useAppConfig', () => ({ useAppConfig: vi.fn() }));

const ORIGINAL = `0x${'1'.repeat(64)}`;
const UPGRADE = `0x${'2'.repeat(64)}`;
const CONFIG: AppConfig = {
  network: 'localnet',
  grpcUrl: 'http://127.0.0.1:9000',
  chainId: '90e16b92',
  packageId: ORIGINAL,
  originalPackageId: ORIGINAL,
  houseId: `0x${'3'.repeat(64)}`,
  publishTxDigest: '11111111111111111111111111111111',
  burnerWalletEnabled: false,
};
const UPGRADED: AppConfig = {
  ...CONFIG,
  packageId: UPGRADE,
  upgrades: [{ version: 2, packageId: UPGRADE, txDigest: '11111111111111111111111111111111' }],
  typeOrigins: [
    ...['Game', 'GameCreated', 'GameCancelled', 'GameResolved'].map((name) => ({ module: 'game', name, definingId: ORIGINAL })),
    { module: 'coinflip', name: 'Coinflip', definingId: UPGRADE },
    ...['Duel', 'DuelCreated', 'DuelCancelled', 'DuelActivated', 'DuelTurn', 'DuelResolved', 'DuelTimedOut', 'DuelExpired'].map((name) => ({
      module: 'duel',
      name,
      definingId: UPGRADE,
    })),
  ],
};

beforeEach(() => {
  vi.mocked(useAppConfig).mockReturnValue(CONFIG);
});

describe('useGameRegistry', () => {
  it('without upgrades the registry has only the legacy source', () => {
    const { result } = renderHook(() => useGameRegistry());
    expect(result.current.map((game) => game.sources.map((source) => source.kind))).toEqual([['legacy']]);
  });

  it('with upgrades in the config it has the legacy and the duel source, with createSource duel', () => {
    vi.mocked(useAppConfig).mockReturnValue(UPGRADED);
    const { result } = renderHook(() => useGameRegistry());
    expect(result.current[0]?.sources.map((source) => source.kind)).toEqual(['legacy', 'duel']);
    expect(result.current[0]?.createSource).toBe('duel');
  });

  it('builds the registry once while the config does not change', () => {
    const { result, rerender } = renderHook(() => useGameRegistry());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('rebuilds it when the config changes', () => {
    const { result, rerender } = renderHook(() => useGameRegistry());
    const first = result.current;
    vi.mocked(useAppConfig).mockReturnValue(UPGRADED);
    rerender();
    expect(result.current).not.toBe(first);
  });
});
