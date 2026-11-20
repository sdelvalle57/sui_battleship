import { RpcError } from '@mysten/sui/grpc';
import { describe, expect, it } from 'vitest';
import { GAME_REFETCH_MS, gameRefetchInterval } from './gameDetail';
import { GameNotFoundError, NotAGameError, ReadDataError } from './readErrors';

// La lectura por tipo exacto (`fetchGameDetail`) se prueba en `gameDetail.byType.test.ts`; acá, el intervalo de relectura.
describe('gameRefetchInterval', () => {
  it('keeps refetching every 15 s after a success', () => {
    expect(GAME_REFETCH_MS).toBe(15_000);
    expect(gameRefetchInterval({ status: 'success', error: null })).toBe(15_000);
  });

  it('keeps refetching after a transient error (UNAVAILABLE)', () => {
    expect(gameRefetchInterval({ status: 'error', error: new RpcError('down', 'UNAVAILABLE') })).toBe(15_000);
  });

  it.each([
    ['GameNotFoundError', new GameNotFoundError('0x6')],
    ['NotAGameError', new NotAGameError('0x6', '0x2::coin::Coin')],
    ['ReadDataError', new ReadDataError('malformed', 'x')],
  ])('stops refetching after a definitive %s', (_name, error) => {
    expect(gameRefetchInterval({ status: 'error', error })).toBe(false);
  });
});
