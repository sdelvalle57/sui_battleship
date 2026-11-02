import { extractStatusFromEffectsBcs, formatMoveAbortMessage, SimulationError, type SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import { ABORT_MESSAGES, abortCodeSuffix, findMoveAbort, transactionErrorMessage, type MoveAbortInfo } from './errors';

type FixtureSimulation = { sender: string; message: string; executionError: SuiClientTypes.ExecutionError };
type FixtureTx = { digest: string; status: SuiClientTypes.ExecutionStatus; effects: { bcs: string } };
type Fixture = {
  ids: { packageId: string; originalPackageId: string };
  simulationErrors: Record<string, FixtureSimulation>;
  executed: { cancelNotCreatorExecuted: { $kind: 'FailedTransaction'; FailedTransaction: FixtureTx } };
  cliErrorText: string;
};
const FIXTURE_PATH = '../../../contracts/fixtures/game-tx.localnet.json';
const fixture = import.meta.glob<Fixture>('../../../contracts/fixtures/game-tx.localnet.json', {
  eager: true,
  import: 'default',
})[FIXTURE_PATH] as Fixture;

const PKG = fixture.ids.originalPackageId;
const IDS = { packageId: fixture.ids.packageId, originalPackageId: PKG };
const OTHER_PKG = `0x${'e'.repeat(64)}`;

/** `ExecutionError` `MoveAbort` con la forma de la fixture (TASK-1), cambiando paquete, módulo y código. */
function moveAbort(module: string, code: number | string, pkg: string = PKG): SuiClientTypes.ExecutionError {
  const location = { package: pkg, module, function: 1, instruction: 16, functionName: 'cancel_game' };
  return {
    $kind: 'MoveAbort',
    message: formatMoveAbortMessage({ command: 0, location, abortCode: String(code) }),
    command: 0,
    MoveAbort: { abortCode: String(code), location },
  };
}

const CASES: [string, 'game' | 'house', number][] = [
  ['createBetTooLow', 'game', 0],
  ['createBetTooHigh', 'game', 1],
  ['createSelfInvite', 'game', 2],
  ['cancelNotCreator', 'game', 3],
  ['cancelNotPending', 'game', 4],
  ['rejectNotInvited', 'game', 5],
  ['rejectNoInvitation', 'game', 6],
];

describe('ABORT_MESSAGES via transactionErrorMessage', () => {
  it.each([
    [0, 'La apuesta es menor que el mínimo de la House.'],
    [1, 'La apuesta supera el máximo de la House.'],
    [2, 'No puedes invitarte a ti mismo.'],
    [3, 'Solo quien creó la partida puede cancelarla.'],
    [4, 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes.'],
    [5, 'Esta invitación es para otra dirección.'],
    [6, 'La partida es abierta: no hay invitación que rechazar.'],
    [7, 'La partida es de otra versión del juego: solo se puede cancelar o rechazar.'],
    [8, 'La partida pertenece a otra House.'],
    [9, 'No puedes aceptar tu propia partida.'],
    [10, 'El pago tiene que igualar exactamente la apuesta.'],
  ])('maps game/%i to its message with the diagnostic suffix', (code, text) => {
    expect(transactionErrorMessage(moveAbort('game', code), IDS)).toBe(`${text} (código game/${String(code)})`);
  });

  it.each([
    [0, 'La comisión supera el máximo que permite el contrato.'],
    [1, 'Límites inválidos: el mínimo tiene que ser mayor que 0 y no superar el máximo.'],
    [2, 'No hay comisiones para retirar.'],
    [3, 'La House está en una versión distinta de la de esta app: hay que actualizar la app.'],
    [4, 'La House ya está en la versión de este paquete.'],
  ])('maps house/%i to its message with the diagnostic suffix', (code, text) => {
    expect(transactionErrorMessage(moveAbort('house', code), IDS)).toBe(`${text} (código house/${String(code)})`);
  });

  it('tells house/3 apart from game/3', () => {
    expect(transactionErrorMessage(moveAbort('house', 3), IDS)).not.toBe(transactionErrorMessage(moveAbort('game', 3), IDS));
    expect(transactionErrorMessage(moveAbort('house', 3), IDS)).toBe(`${ABORT_MESSAGES.house[3] ?? ''} (código house/3)`);
  });

  it('covers exactly game 0-10 and house 0-4', () => {
    expect(Object.keys(ABORT_MESSAGES.game).map(Number)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(Object.keys(ABORT_MESSAGES.house).map(Number)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('abortCodeSuffix (M-5)', () => {
  it('has the fixed format (código <module>/<n>)', () => {
    expect(abortCodeSuffix({ packageId: PKG, module: 'game', code: '3' })).toBe('(código game/3)');
  });

  it('produces the exact full message for game/3', () => {
    expect(transactionErrorMessage(moveAbort('game', 3), IDS)).toBe('Solo quien creó la partida puede cancelarla. (código game/3)');
  });
});

describe('real SimulationError from the fixture', () => {
  it('has the 7 captured cases', () => {
    expect(Object.keys(fixture.simulationErrors).sort()).toEqual(CASES.map(([name]) => name).sort());
  });

  it.each(CASES)('maps %s (structured) to %s/%i', (name, module, code) => {
    const sim = fixture.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    expect(findMoveAbort(error)).toEqual({ packageId: PKG, module, code: String(code) });
    expect(transactionErrorMessage(error, IDS)).toBe(`${ABORT_MESSAGES[module][code] ?? ''} (código ${module}/${String(code)})`);
  });

  it.each(CASES)('maps %s by its message alone (a wallet that serializes the error) to %s/%i', (name, module, code) => {
    const sim = fixture.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    expect(findMoveAbort(new Error(sim.message))).toEqual({ packageId: PKG, module, code: String(code) });
  });
});

describe('real executed failure (cancel_game by a non-creator)', () => {
  const failed = fixture.executed.cancelNotCreatorExecuted;
  const expected: MoveAbortInfo = { packageId: PKG, module: 'game', code: '3' };

  it('is recognized from the gRPC getTransaction result and from its status.error', () => {
    expect(findMoveAbort(failed)).toEqual(expected);
    expect(findMoveAbort(failed.FailedTransaction)).toEqual(expected);
    expect(findMoveAbort(failed.FailedTransaction.status)).toEqual(expected);
  });

  it('is recognized from extractStatusFromEffectsBcs of the real effects BCS (the wallet path)', () => {
    const status = extractStatusFromEffectsBcs(fromBase64(failed.FailedTransaction.effects.bcs));
    expect(status.success).toBe(false);
    expect(findMoveAbort(status.error)).toEqual(expected);
    expect(transactionErrorMessage(status.error, IDS)).toBe('Solo quien creó la partida puede cancelarla. (código game/3)');
  });

  it('recognizes the node cliErrorText (Rust format) as game/3 with the normalized packageId', () => {
    expect(fixture.cliErrorText).toContain('MoveAbort(MoveLocation');
    expect(findMoveAbort(new Error(fixture.cliErrorText))).toEqual(expected);
    expect(findMoveAbort(fixture.cliErrorText)).toEqual(expected);
  });

  it('does not recognize how the CLI presents an abort (R-1): falls back to the wallet message', () => {
    const text = `Error executing transaction '${failed.FailedTransaction.digest}': 1st command aborted within function '${PKG}::game::cancel_game' at instruction 16 with code 3`;
    expect(findMoveAbort(new Error(text))).toBeNull();
    expect(transactionErrorMessage(new Error(text), IDS)).toBe(`La wallet no completó la operación: ${text}`);
  });
});

describe('findMoveAbort', () => {
  it('reads the SDK text produced by formatMoveAbortMessage', () => {
    const text = formatMoveAbortMessage({
      command: 1,
      location: { package: PKG, module: 'game', functionName: 'create_game', instruction: 22 },
      abortCode: '0',
    });
    expect(findMoveAbort(new Error(`Transaction resolution failed: ${text}`))).toEqual({ packageId: PKG, module: 'game', code: '0' });
  });

  it('follows cause up to 5 levels and stops at the 6th', () => {
    const nest = (levels: number) => {
      let error: Error = new SimulationError('x', { executionError: moveAbort('game', 4) });
      for (let i = 0; i < levels; i++) error = new Error(`wrapper ${String(i)}`, { cause: error });
      return error;
    };
    expect(findMoveAbort(nest(2))).toEqual({ packageId: PKG, module: 'game', code: '4' });
    expect(findMoveAbort(nest(5))).toEqual({ packageId: PKG, module: 'game', code: '4' });
    expect(findMoveAbort(nest(6))).toBeNull();
  });

  it('normalizes a short or uppercase package', () => {
    const shortPkg = normalizeSuiAddress('0xabc');
    expect(findMoveAbort(moveAbort('game', 3, '0xABC'))).toEqual({ packageId: shortPkg, module: 'game', code: '3' });
    expect(transactionErrorMessage(moveAbort('game', 3, '0xABC'), { packageId: shortPkg, originalPackageId: shortPkg })).toBe(
      'Solo quien creó la partida puede cancelarla. (código game/3)',
    );
    expect(findMoveAbort(moveAbort('game', 3, PKG.toUpperCase().replace('0X', '0x')))).toEqual({ packageId: PKG, module: 'game', code: '3' });
  });

  it('returns null for errors without an abort', () => {
    expect(findMoveAbort(new Error('Rejected from user'))).toBeNull();
    expect(findMoveAbort(undefined)).toBeNull();
    expect(findMoveAbort({ $kind: 'Unknown', message: 'x', Unknown: null })).toBeNull();
  });
});

describe('transactionErrorMessage', () => {
  it('accepts aborts from the current packageId and from the originalPackageId when they differ', () => {
    const ids = { packageId: OTHER_PKG, originalPackageId: PKG };
    expect(transactionErrorMessage(moveAbort('game', 5, PKG), ids)).toBe('Esta invitación es para otra dirección. (código game/5)');
    expect(transactionErrorMessage(moveAbort('game', 5, OTHER_PKG), ids)).toBe('Esta invitación es para otra dirección. (código game/5)');
  });

  it('reports an unknown code of our modules with the raw code', () => {
    expect(transactionErrorMessage(moveAbort('game', 99), IDS)).toBe('El contrato rechazó la operación (código game/99)');
  });

  it('reports an abort of another package without translating it', () => {
    expect(transactionErrorMessage(moveAbort('balance', 2, '0x2'), IDS)).toBe(
      `La transacción abortó en 0x0000…0002::balance (código 2)`,
    );
  });

  it.each([
    [{ $kind: 'Unknown', message: 'ExecutionCancelledDueToRandomnessUnavailable', Unknown: null }],
    [{ $kind: 'CongestedObjects', message: 'ExecutionCancelledDueToSharedObjectCongestion', CongestedObjects: { name: 'Congested', objects: [] } }],
  ] as SuiClientTypes.ExecutionError[][])('reports a failure without abort as the network not executing it', (error) => {
    expect(transactionErrorMessage(error, IDS)).toBe(`La red no ejecutó la transacción: ${error.message}`);
    expect(transactionErrorMessage({ success: false, error }, IDS)).toBe(`La red no ejecutó la transacción: ${error.message}`);
  });

  it('reports a wallet error without abort with its own message', () => {
    expect(transactionErrorMessage(new Error('User rejected the request.'), IDS)).toBe(
      'La wallet no completó la operación: User rejected the request.',
    );
    expect(transactionErrorMessage('closed', IDS)).toBe('La wallet no completó la operación: closed');
    expect(transactionErrorMessage(new Error('User rejected'), IDS)).toBe('La wallet no completó la operación: User rejected');
  });

  it('says there is no detail when the wallet error has no message', () => {
    expect(transactionErrorMessage({ code: 4001 }, IDS)).toBe('La wallet no completó la operación (sin detalle del error)');
    expect(transactionErrorMessage(undefined, IDS)).toBe('La wallet no completó la operación (sin detalle del error)');
    expect(transactionErrorMessage(new Error(''), IDS)).toBe('La wallet no completó la operación (sin detalle del error)');
  });
});
