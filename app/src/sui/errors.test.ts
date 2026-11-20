import { extractStatusFromEffectsBcs, formatMoveAbortMessage, SimulationError, type SuiClientTypes } from '@mysten/sui/client';
import { fromBase64, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';
import {
  ABORT_MESSAGES,
  abortCodeSuffix,
  findMoveAbort,
  RUNTIME_CANCELLED_MESSAGES,
  runtimeCancellation,
  transactionErrorMessage,
  type MoveAbortInfo,
} from './errors';
import { shortAddress } from './format';

type FixtureSimulation = { sender: string; message: string; executionError: SuiClientTypes.ExecutionError };
type FixtureTx = { digest: string; status: SuiClientTypes.ExecutionStatus; effects: { bcs: string } };
type FixtureFailed = { $kind: 'FailedTransaction'; FailedTransaction: FixtureTx };
type Fixture = {
  ids: { packageId: string; originalPackageId: string };
  simulationErrors: Record<string, FixtureSimulation>;
  executed: {
    cancelNotCreatorExecuted: FixtureFailed;
    acceptNotPendingExecuted: FixtureFailed;
    createOpen: { $kind: 'Transaction'; Transaction: FixtureTx };
  };
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
  ['acceptSelfPlay', 'game', 9],
  ['acceptNotInvited', 'game', 5],
  ['acceptNotPending', 'game', 4],
  ['acceptWrongStake', 'game', 10],
];
const ACCEPT_CASES = CASES.filter(([name]) => name.startsWith('accept'));

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
  it('has the 11 captured cases', () => {
    expect(Object.keys(fixture.simulationErrors).sort()).toEqual(CASES.map(([name]) => name).sort());
  });

  it.each(ACCEPT_CASES)('locates the accept abort %s in game::assert_acceptable', (name) => {
    const sim = fixture.simulationErrors[name];
    expect(sim?.executionError.$kind).toBe('MoveAbort');
    expect(sim?.executionError.MoveAbort?.location?.functionName).toBe('assert_acceptable');
  });

  it('maps acceptNotInvited to game/5, the text of the invitation for another address (D-20261103-02)', () => {
    const sim = fixture.simulationErrors.acceptNotInvited;
    if (sim === undefined) throw new Error('falta acceptNotInvited');
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    expect(transactionErrorMessage(error, IDS)).toBe('Esta invitación es para otra dirección. (código game/5)');
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

describe('real executed failure (accept_game on a resolved game)', () => {
  const failed = fixture.executed.acceptNotPendingExecuted;
  const expected: MoveAbortInfo = { packageId: PKG, module: 'game', code: '4' };
  const text = 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)';

  it('is recognized from the gRPC getTransaction result and its status.error', () => {
    expect(findMoveAbort(failed)).toEqual(expected);
    expect(findMoveAbort(failed.FailedTransaction.status)).toEqual(expected);
    expect(transactionErrorMessage(failed, IDS)).toBe(text);
  });

  it('is recognized from extractStatusFromEffectsBcs of the real effects BCS (the wallet path)', () => {
    const status = extractStatusFromEffectsBcs(fromBase64(failed.FailedTransaction.effects.bcs));
    expect(status.success).toBe(false);
    expect(findMoveAbort(status.error)).toEqual(expected);
    expect(transactionErrorMessage(status.error, IDS)).toBe(text);
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
    [{ $kind: 'Unknown', message: 'InsufficientCoinBalance in command 0', command: 0, Unknown: null }],
    [{ $kind: 'Unknown', message: 'InsufficientGas', Unknown: null }],
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

describe('runtime cancellations (DL-11)', () => {
  const RANDOMNESS = { $kind: 'Unknown', message: 'ExecutionCancelledDueToRandomnessUnavailable', Unknown: null } as SuiClientTypes.ExecutionError;
  const RANDOMNESS_RUST = {
    $kind: 'Unknown',
    message: 'Certificate is cancelled because RANDOMNESS could not be generated this epoch',
    Unknown: null,
  } as SuiClientTypes.ExecutionError;
  const CONGESTION = {
    $kind: 'CongestedObjects',
    message: 'ExecutionCancelledDueToSharedObjectCongestion',
    CongestedObjects: { name: 'Congested', objects: [] },
  } as unknown as SuiClientTypes.ExecutionError;
  /** Un resultado real de la fixture con el estado reemplazado por un fallo con `error`. */
  const failedLike = (entry: { digest: string }, error: SuiClientTypes.ExecutionError) => ({
    $kind: 'FailedTransaction',
    FailedTransaction: { ...entry, status: { success: false, error } },
  });

  it('maps CongestedObjects to the congestion text', () => {
    expect(runtimeCancellation(CONGESTION)).toBe('congestion');
    expect(transactionErrorMessage({ success: false, error: CONGESTION }, IDS)).toBe(RUNTIME_CANCELLED_MESSAGES.congestion);
    expect(RUNTIME_CANCELLED_MESSAGES.congestion).toBe(
      'La red canceló la transacción sin ejecutarla (hay congestión en un objeto compartido): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos',
    );
  });

  it('maps Unknown with the variant name or the Rust text (any case) to the randomness text', () => {
    expect(runtimeCancellation(RANDOMNESS)).toBe('randomness');
    expect(runtimeCancellation(RANDOMNESS_RUST)).toBe('randomness');
    expect(transactionErrorMessage(RANDOMNESS, IDS)).toBe(RUNTIME_CANCELLED_MESSAGES.randomness);
    expect(transactionErrorMessage(RANDOMNESS_RUST, IDS)).toBe(RUNTIME_CANCELLED_MESSAGES.randomness);
    expect(RUNTIME_CANCELLED_MESSAGES.randomness).toBe(
      'La red canceló la transacción sin ejecutarla (la aleatoriedad de la red todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos',
    );
  });

  it('gives the same text for a create and an accept failure (neutral to the action)', () => {
    const create = failedLike(fixture.executed.createOpen.Transaction, RANDOMNESS);
    const accept = failedLike(fixture.executed.acceptNotPendingExecuted.FailedTransaction, RANDOMNESS);
    expect(transactionErrorMessage(create, IDS)).toBe(RUNTIME_CANCELLED_MESSAGES.randomness);
    expect(transactionErrorMessage(accept, IDS)).toBe(RUNTIME_CANCELLED_MESSAGES.randomness);
    expect(transactionErrorMessage(failedLike(fixture.executed.createOpen.Transaction, CONGESTION), IDS)).toBe(
      RUNTIME_CANCELLED_MESSAGES.congestion,
    );
  });

  it('is not a cancellation for another Unknown, such as InsufficientCoinBalance of S-6 bis', () => {
    const insufficient = { $kind: 'Unknown', message: 'InsufficientCoinBalance in command 0', command: 0, Unknown: null } as SuiClientTypes.ExecutionError;
    const sim = new SimulationError('Transaction resolution failed: InsufficientCoinBalance in command 0', { executionError: insufficient });
    expect(runtimeCancellation(sim)).toBeNull();
    expect(transactionErrorMessage(sim, IDS)).toBe('La red no ejecutó la transacción: InsufficientCoinBalance in command 0');
    expect(runtimeCancellation(new Error('randomness could not be generated'))).toBeNull();
  });

  it('lets an own abort win over a cancellation text in the chain', () => {
    const abort = new SimulationError('Transaction resolution failed', { executionError: moveAbort('game', 4) });
    const wrapped = { ...RANDOMNESS, cause: abort };
    expect(transactionErrorMessage(wrapped, IDS)).toBe(
      'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código game/4)',
    );
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// #73 (TASK-7a): módulo `duel`, números repetidos entre módulos e IDs de `upgrades[]`
// ---------------------------------------------------------------------------------------------------------------------

/** Textos de `duel` por código (R.3 del handoff, 0-25): uno por código, escritos en el test y no leídos de la tabla. */
const DUEL_MESSAGES: [number, string][] = [
  [0, 'La apuesta es menor que el mínimo de la House.'],
  [1, 'La apuesta supera el máximo de la House.'],
  [2, 'No puedes invitarte a ti mismo.'],
  [3, 'Solo quien creó la partida puede cancelarla.'],
  [4, 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes.'],
  [5, 'Esta invitación es para otra dirección.'],
  [6, 'La partida es abierta: no hay invitación que rechazar.'],
  [7, 'La partida se creó con otra versión de la House: solo se puede cancelar, rechazar o reembolsar.'],
  [8, 'La partida pertenece a otra House.'],
  [9, 'No puedes aceptar tu propia partida.'],
  [10, 'El pago tiene que igualar exactamente la apuesta.'],
  [11, 'La partida no está en juego: todavía no se aceptó o ya terminó.'],
  [12, 'El cobro no corresponde a esta partida.'],
  [13, 'El índice del ganador es inválido: solo puede ser 0 o 1.'],
  [14, 'El plazo del jugador en turno todavía no venció: aún no se puede reclamar por tiempo.'],
  [15, 'El pozo de la partida no es el doble de la apuesta: la operación se bloquea por seguridad.'],
  [16, 'El control de tiempo elegido no existe.'],
  [17, 'La partida no tiene reloj: no admite esta operación.'],
  [18, 'La partida tiene reloj: no se puede resolver en una sola transacción.'],
  [19, 'El turno indicado es inválido: solo puede ser 1, 2 o 3.'],
  [20, 'No es tu turno.'],
  [21, 'El plazo venció: ya solo se puede reclamar por tiempo.'],
  [22, 'Ninguno de los dos jugó: no hay ganador por tiempo y la partida se reembolsa a cada jugador.'],
  [23, 'Todavía no se puede reembolsar: no pasó el plazo ni, con un solo jugador pendiente, la gracia de reclamo.'],
  [24, 'Solo los jugadores de la partida pueden hacer esto.'],
  [25, 'La jugada no corresponde a la fase simultánea en curso.'],
];

describe('ABORT_MESSAGES: module duel (R.3, codes 0-25)', () => {
  it.each(DUEL_MESSAGES)('maps duel/%i to its message with the diagnostic suffix', (code, text) => {
    expect(transactionErrorMessage(moveAbort('duel', code), IDS)).toBe(`${text} (código duel/${String(code)})`);
  });

  it('covers exactly the codes 0-25, each with its own message', () => {
    expect(Object.keys(ABORT_MESSAGES.duel).map(Number)).toEqual(Array.from({ length: 26 }, (_, i) => i));
    expect(new Set(Object.values(ABORT_MESSAGES.duel)).size).toBe(26);
  });

  it('tells apart house/3, game/3 and duel/3: the number alone does not identify the cause', () => {
    const messages = [moveAbort('house', 3), moveAbort('game', 3), moveAbort('duel', 3)].map((error) => transactionErrorMessage(error, IDS));
    expect(messages).toEqual([
      'La House está en una versión distinta de la de esta app: hay que actualizar la app. (código house/3)',
      'Solo quien creó la partida puede cancelarla. (código game/3)',
      'Solo quien creó la partida puede cancelarla. (código duel/3)',
    ]);
  });

  it('keeps coinflip without codes of its own: an abort of that module is reported with the raw code', () => {
    expect(transactionErrorMessage(moveAbort('coinflip', 0), IDS)).toBe('El contrato rechazó la operación (código coinflip/0)');
  });

  it('reports an unknown code of duel with the raw code', () => {
    expect(transactionErrorMessage(moveAbort('duel', 26), IDS)).toBe('El contrato rechazó la operación (código duel/26)');
  });
});

describe('transactionErrorMessage accepts every package id of upgrades[] (V-5/H-j: the abort reports the executed version)', () => {
  const V1 = `0x${'1'.repeat(64)}`;
  const V2 = `0x${'2'.repeat(64)}`;
  const V3 = `0x${'3'.repeat(64)}`;
  const V4 = `0x${'4'.repeat(64)}`;
  const UPGRADED_IDS = {
    packageId: V4,
    originalPackageId: V1,
    upgrades: [{ packageId: V2 }, { packageId: V3 }, { packageId: V4 }],
  };

  it.each([
    ['the original id', V1],
    ['the first upgrade', V2],
    ['the second upgrade', V3],
    ['the current id', V4],
  ])('translates a duel abort whose location.package is %s', (_label, pkg) => {
    expect(transactionErrorMessage(moveAbort('duel', 20, pkg), UPGRADED_IDS)).toBe('No es tu turno. (código duel/20)');
  });

  it.each([
    ['the original id', V1],
    ['the first upgrade', V2],
    ['the second upgrade', V3],
    ['the current id', V4],
  ])('translates a house abort whose location.package is %s', (_label, pkg) => {
    expect(transactionErrorMessage(moveAbort('house', 3, pkg), UPGRADED_IDS)).toBe(
      'La House está en una versión distinta de la de esta app: hay que actualizar la app. (código house/3)',
    );
  });

  it('does not translate an abort of a package that is none of ours, even with the code of one of our modules', () => {
    expect(transactionErrorMessage(moveAbort('duel', 20, `0x${'5'.repeat(64)}`), UPGRADED_IDS)).toBe(
      `La transacción abortó en ${shortAddress(`0x${'5'.repeat(64)}`)}::duel (código 20)`,
    );
  });

  it('accepts only packageId and originalPackageId when there are no upgrades (packageVersion 1)', () => {
    const noUpgrades = { packageId: V1, originalPackageId: V1 };
    expect(transactionErrorMessage(moveAbort('game', 3, V1), noUpgrades)).toBe('Solo quien creó la partida puede cancelarla. (código game/3)');
    expect(transactionErrorMessage(moveAbort('game', 3, V2), noUpgrades)).toBe(`La transacción abortó en ${shortAddress(V2)}::game (código 3)`);
  });

  it('accepts a whole AppConfig-like object, so the hooks can pass the config as it is', () => {
    const config = { ...UPGRADED_IDS, network: 'localnet', houseId: V1 };
    expect(transactionErrorMessage(moveAbort('duel', 4, V3), config)).toBe(`${ABORT_MESSAGES.duel[4] ?? ''} (código duel/4)`);
  });

  it('keeps ignoring the upgrade ids when the abort comes from a wallet text in the SDK format', () => {
    const text = formatMoveAbortMessage({
      command: 0,
      location: { package: V3, module: 'duel', functionName: 'cancel', instruction: 16 },
      abortCode: '3',
    });
    expect(transactionErrorMessage(new Error(text), UPGRADED_IDS)).toBe('Solo quien creó la partida puede cancelarla. (código duel/3)');
  });
});

type DuelTxFixture = {
  ids: { packageId: string; originalPackageId: string };
  simulationErrors: Record<string, FixtureSimulation>;
  executed: { cancelNotCreatorExecuted: FixtureFailed; acceptNotPendingExecuted: FixtureFailed };
  cliErrorText: string;
};
const DUEL_TX_PATH = '../../../contracts/fixtures/duel-tx.localnet.json';
const duelTx = import.meta.glob<DuelTxFixture>('../../../contracts/fixtures/duel-tx.localnet.json', {
  eager: true,
  import: 'default',
})[DUEL_TX_PATH] as DuelTxFixture;
const DUEL_IDS = { packageId: duelTx.ids.packageId, originalPackageId: duelTx.ids.originalPackageId };

describe('real SimulationError of the coinflip on the base duel (production, duel-tx.localnet.json)', () => {
  const DUEL_CASES: [string, number][] = [
    ['createBetTooLow', 0],
    ['createBetTooHigh', 1],
    ['createSelfInvite', 2],
    ['cancelNotCreator', 3],
    ['cancelNotPending', 4],
    ['rejectNotInvited', 5],
    ['rejectNoInvitation', 6],
    ['acceptSelfPlay', 9],
    ['acceptNotInvited', 5],
    ['acceptNotPending', 4],
    ['acceptWrongStake', 10],
  ];

  it('has the 11 captured cases', () => {
    expect(Object.keys(duelTx.simulationErrors).sort()).toEqual(DUEL_CASES.map(([name]) => name).sort());
  });

  it('reports the abort with the package of the upgrade: the version that ran (V-5)', () => {
    expect(duelTx.ids.packageId).not.toBe(duelTx.ids.originalPackageId);
    for (const sim of Object.values(duelTx.simulationErrors)) {
      expect(sim.executionError.MoveAbort?.location?.package).toBe(duelTx.ids.packageId);
      expect(sim.executionError.MoveAbort?.location?.module).toBe('duel');
    }
  });

  it.each(DUEL_CASES)('maps %s (structured) to duel/%i', (name, code) => {
    const sim = duelTx.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    expect(findMoveAbort(error)).toEqual({ packageId: duelTx.ids.packageId, module: 'duel', code: String(code) });
    expect(transactionErrorMessage(error, DUEL_IDS)).toBe(`${ABORT_MESSAGES.duel[code] ?? ''} (código duel/${String(code)})`);
  });

  it.each(DUEL_CASES)('maps %s by its message alone (a wallet that serializes the error) to duel/%i', (name, code) => {
    const sim = duelTx.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    expect(findMoveAbort(new Error(sim.message))).toEqual({ packageId: duelTx.ids.packageId, module: 'duel', code: String(code) });
  });

  it('reports the abort of an upgrade as foreign while the config does not list that upgrade, and as own once upgrades[] does', () => {
    const sim = duelTx.simulationErrors.cancelNotCreator;
    if (sim === undefined) throw new Error('falta cancelNotCreator');
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    const onlyOriginal = { packageId: duelTx.ids.originalPackageId, originalPackageId: duelTx.ids.originalPackageId };
    expect(transactionErrorMessage(error, onlyOriginal)).toBe(
      `La transacción abortó en ${shortAddress(duelTx.ids.packageId)}::duel (código 3)`,
    );
    expect(transactionErrorMessage(error, { ...onlyOriginal, upgrades: [{ packageId: duelTx.ids.packageId }] })).toBe(
      'Solo quien creó la partida puede cancelarla. (código duel/3)',
    );
  });
});

describe('real executed failures of duel (production)', () => {
  it('recognizes cancel by a non-creator from the real effects BCS (the wallet path) as duel/3', () => {
    const failed = duelTx.executed.cancelNotCreatorExecuted;
    const expected: MoveAbortInfo = { packageId: duelTx.ids.packageId, module: 'duel', code: '3' };
    expect(findMoveAbort(failed)).toEqual(expected);
    const status = extractStatusFromEffectsBcs(fromBase64(failed.FailedTransaction.effects.bcs));
    expect(status.success).toBe(false);
    expect(findMoveAbort(status.error)).toEqual(expected);
    expect(transactionErrorMessage(status.error, DUEL_IDS)).toBe('Solo quien creó la partida puede cancelarla. (código duel/3)');
  });

  it('recognizes an accept on a resolved duel as duel/4', () => {
    const failed = duelTx.executed.acceptNotPendingExecuted;
    expect(transactionErrorMessage(failed, DUEL_IDS)).toBe(
      'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código duel/4)',
    );
    const status = extractStatusFromEffectsBcs(fromBase64(failed.FailedTransaction.effects.bcs));
    expect(transactionErrorMessage(status.error, DUEL_IDS)).toBe(
      'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes. (código duel/4)',
    );
  });

  it('recognizes the node cliErrorText (Rust format) as duel/3 with the normalized packageId', () => {
    expect(findMoveAbort(new Error(duelTx.cliErrorText))).toEqual({ packageId: duelTx.ids.packageId, module: 'duel', code: '3' });
  });
});

describe('real failures of the clock fixture (sandbox: the executed version is another upgrade id)', () => {
  type ClockTxFixture = {
    _meta: { sandbox: boolean };
    ids: Record<string, unknown>;
    simulationErrors: Record<string, { executionError: SuiClientTypes.ExecutionError; message: string }>;
    executed: { cancelUnknownTypeArgumentExecuted: FixtureFailed; claimNotExpiredExecuted: FixtureFailed };
  };
  const CLOCK_PATH = '../../../contracts/fixtures/duel-clock.localnet.json';
  const clockTx = import.meta.glob<ClockTxFixture>('../../../contracts/fixtures/duel-clock.localnet.json', {
    eager: true,
    import: 'default',
  })[CLOCK_PATH] as ClockTxFixture;
  /** El ID del paquete que ejecutó, tomado del abort real de la fixture (la versión de ensayo no es la de producción). */
  const EXECUTED_PKG = clockTx.executed.claimNotExpiredExecuted.FailedTransaction.status.error?.MoveAbort?.location?.package ?? '';
  const CLOCK_IDS = { packageId: duelTx.ids.packageId, originalPackageId: duelTx.ids.originalPackageId, upgrades: [{ packageId: EXECUTED_PKG }] };

  it('comes from the sandbox and executed in a version that is not the production one', () => {
    expect(clockTx._meta.sandbox).toBe(true);
    expect(EXECUTED_PKG).toMatch(/^0x[0-9a-f]{64}$/);
    expect([duelTx.ids.packageId, duelTx.ids.originalPackageId]).not.toContain(EXECUTED_PKG);
  });

  it.each([
    ['createBadControl', 16],
    ['claimNotExpired', 14],
    ['claimBothPending', 22],
    ['refundNotStalled', 23],
    ['recordMoveAfterDeadline', 21],
    ['recordMoveNotYourTurn', 20],
    ['collectNotPlayer', 24],
  ])('maps %s to duel/%i only when the executed version is in upgrades[]', (name, code) => {
    const sim = clockTx.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    expect(transactionErrorMessage(error, CLOCK_IDS)).toBe(`${ABORT_MESSAGES.duel[code] ?? ''} (código duel/${String(code)})`);
    expect(transactionErrorMessage(error, DUEL_IDS)).toBe(`La transacción abortó en ${shortAddress(EXECUTED_PKG)}::duel (código ${String(code)})`);
  });

  it('maps the executed claim_timeout before the deadline (duel/14) from the effects BCS', () => {
    const failed = clockTx.executed.claimNotExpiredExecuted;
    const status = extractStatusFromEffectsBcs(fromBase64(failed.FailedTransaction.effects.bcs));
    expect(transactionErrorMessage(status.error, CLOCK_IDS)).toBe(`${ABORT_MESSAGES.duel[14] ?? ''} (código duel/14)`);
  });

  it('does not take a TypeArgumentError (a type id older than the definition) for an abort of the contract', () => {
    const failed = clockTx.executed.cancelUnknownTypeArgumentExecuted;
    expect(findMoveAbort(failed)).toBeNull();
    expect(transactionErrorMessage(failed, CLOCK_IDS)).toBe(
      'La red no ejecutó la transacción: TypeArgumentError { argument_idx: 0, kind: TypeNotFound } in command 0',
    );
  });
});

describe('real SimulationError of the house admin actions (#14, house-admin.localnet.json)', () => {
  type HouseFixture = { ids: { packageId: string; originalPackageId: string }; simulationErrors: Record<string, FixtureSimulation> };
  const HOUSE_FIXTURE_PATH = '../../../contracts/fixtures/house-admin.localnet.json';
  const houseFixture = import.meta.glob<HouseFixture>('../../../contracts/fixtures/house-admin.localnet.json', {
    eager: true,
    import: 'default',
  })[HOUSE_FIXTURE_PATH] as HouseFixture;
  const HOUSE_PKG = houseFixture.ids.originalPackageId;
  const HOUSE_IDS = { packageId: houseFixture.ids.packageId, originalPackageId: HOUSE_PKG };
  const HOUSE_CASES: [string, number][] = [
    ['feeTooHigh', 0],
    ['limitsZeroMin', 1],
    ['limitsMinAboveMax', 1],
    ['withdrawNoFees', 2],
  ];

  it.each(HOUSE_CASES)('maps %s (structured) to house/%i with the diagnostic suffix', (name, code) => {
    const sim = houseFixture.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    const error = new SimulationError(sim.message, { executionError: sim.executionError });
    expect(findMoveAbort(error)).toEqual({ packageId: HOUSE_PKG, module: 'house', code: String(code) });
    expect(transactionErrorMessage(error, HOUSE_IDS)).toBe(`${ABORT_MESSAGES.house[code] ?? ''} (código house/${String(code)})`);
  });

  it.each(HOUSE_CASES)('maps %s by its message alone to house/%i', (name, code) => {
    const sim = houseFixture.simulationErrors[name];
    if (sim === undefined) throw new Error(`falta ${name}`);
    expect(findMoveAbort(new Error(sim.message))).toEqual({ packageId: HOUSE_PKG, module: 'house', code: String(code) });
  });
});
