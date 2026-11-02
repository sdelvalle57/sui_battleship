import { RpcError } from '@mysten/sui/grpc';
import { describe, expect, it } from 'vitest';
import {
  GameNotFoundError,
  HistoryPrunedError,
  NotAGameError,
  NotYetCheckpointedError,
  PaginationStalledError,
  ReadDataError,
  ReadTimeoutError,
  readErrorMessage,
} from './readErrors';

const ID = `0x${'1'.repeat(64)}`;

describe('readErrorMessage', () => {
  it.each([
    [new ReadDataError('malformed', 'bytes truncados'), 'El nodo devolvió datos que la app no reconoce'],
    [new GameNotFoundError(ID), 'No existe una partida con ese ID en testnet'],
    [new NotAGameError(ID, '0x2::coin::Coin<0x2::sui::SUI>'), 'Ese objeto no es una partida de Sui Battleship'],
    [new PaginationStalledError(), 'La búsqueda no avanzó: el nodo repitió la posición. Prueba «Actualizar»'],
    [new ReadTimeoutError(10_000), 'El nodo no respondió en 10 s'],
    [new NotYetCheckpointedError('11111111111111111111111111111111'), 'La transacción todavía no está en un checkpoint; se reintenta'],
    [new HistoryPrunedError('OUT_OF_RANGE'), 'El nodo ya no conserva esa parte del historial'],
    [new RpcError('Failed to fetch', 'INTERNAL'), 'No se pudo leer la red (Failed to fetch)'],
    [new Error('otra cosa'), 'otra cosa'],
    ['texto suelto', 'texto suelto'],
  ])('maps %o to its message', (error, message) => {
    expect(readErrorMessage(error, 'testnet')).toBe(message);
  });

  it('names the network in GameNotFoundError', () => {
    expect(readErrorMessage(new GameNotFoundError(ID), 'localnet')).toBe('No existe una partida con ese ID en localnet');
  });
});

describe('read error classes', () => {
  it('keep their data and names', () => {
    const data = new ReadDataError('invariant', 'stake ≠ bet');
    expect(data).toBeInstanceOf(Error);
    expect(data.reason).toBe('invariant');
    expect(data.name).toBe('ReadDataError');
    expect(new GameNotFoundError(ID).id).toBe(ID);
    expect(new NotAGameError(ID, 'T').type).toBe('T');
    expect(new ReadTimeoutError(10_000).timeoutMs).toBe(10_000);
    expect(new NotYetCheckpointedError('d').digest).toBe('d');
    expect(new HistoryPrunedError('x').name).toBe('HistoryPrunedError');
    expect(new PaginationStalledError().name).toBe('PaginationStalledError');
  });

  it('keep the original error as cause', () => {
    const e = new Error('abortado');
    expect(new ReadTimeoutError(10_000, { cause: e }).cause).toBe(e);
    expect(new HistoryPrunedError('OUT_OF_RANGE', { cause: e }).cause).toBe(e);
    expect(new ReadDataError('malformed', 'x', { cause: e }).cause).toBe(e);
    expect(new ReadTimeoutError(10_000).cause).toBeUndefined();
  });
});
