// Captura las fixtures reales de transacciones (#11, DL-15; aceptar en #12) desde la localnet aislada de `agents.md` §3:
// errores de simulación (`SimulationError` de `build({ client })`), transacciones ejecutadas (éxitos y fallos
// `MoveAbort`) y el objeto House.
//
// Uso (dentro de la localnet aislada, con `app.env` cargado y después de las transacciones de la CLI de
// `contracts/README.md`, "Lectura desde la app" → "Recaptura de la fixture de transacciones"):
//   node app/scripts/capture-tx-fixtures.mjs [--url http://127.0.0.1:9000]
//
// Solo acepta la localnet en `http://127.0.0.1:9000` (guarda compartida `localnet-guard.mjs`): con cualquier otra URL
// sale con código 2 **antes** de importar el SDK o hacer pedidos. Lee `contracts/deployments/localnet.json`, exige que
// el chain id del nodo coincida y escribe `contracts/fixtures/game-tx.localnet.json`. Las simulaciones **no firman**:
// `setSender` con una cuenta de la génesis y `build({ client })`. Las direcciones e IDs del archivo son de cuentas
// efímeras de una génesis desechable; ninguna clave. Sin `sender`: los casos llevan el rol (`A`, `B`, `C`, `ADMIN`).
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-tx-fixtures');

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { SuiGrpcClient } = await import('@mysten/sui/grpc');
const { SimulationError } = await import('@mysten/sui/client');
const { Transaction } = await import('@mysten/sui/transactions');
const { fromBase58, normalizeSuiAddress, toBase64, toHex } = await import('@mysten/sui/utils');

const say = (line) => process.stdout.write(`${line}\n`);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deploymentPath = join(repoRoot, 'contracts', 'deployments', 'localnet.json');
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'game-tx.localnet.json');

/** Versión instalada de `@mysten/sui`, leída de su `package.json` junto al módulo resuelto. */
async function sdkVersion() {
  let dir = dirname(fileURLToPath(import.meta.resolve('@mysten/sui/grpc')));
  for (;;) {
    try {
      const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
      if (pkg.name === '@mysten/sui') return pkg.version;
    } catch {
      // sin package.json en este nivel: se sigue subiendo
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error('no se encontró el package.json de @mysten/sui');
    dir = parent;
  }
}

/** Copia serializable: `bigint` → string, `Uint8Array` → base64; omite claves `sender`. */
function plain(value) {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array) return toBase64(value);
  if (Array.isArray(value)) return value.map(plain);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, v]) => key !== 'sender' && v !== undefined)
        .map(([key, v]) => [key, plain(v)]),
    );
  }
  return value;
}

const deployment = JSON.parse(await readFile(deploymentPath, 'utf8'));
const { packageId, originalPackageId, houseId, houseCapId } = deployment;
const client = new SuiGrpcClient({ network: 'localnet', baseUrl: url });

const { response: serviceInfo } = await client.ledgerService.getServiceInfo({});
const nodeChainId = toHex(fromBase58(serviceInfo.chainId)).slice(0, 8);
assertDeployment(deployment, nodeChainId);
say(`nodo ${url}, chain id ${nodeChainId} = despliegue`);

/** Todos los eventos de un tipo del juego, en orden ascendente (localnet: sin poda ni cota necesaria). */
async function allEvents(name) {
  const eventType = `${originalPackageId}::game::${name}`;
  const events = [];
  let after = null;
  for (;;) {
    const page = await client.listEvents({ filter: { eventType }, limit: 50, ...(after ? { after } : {}) });
    events.push(...page.events);
    if (!page.hasNextPage || !page.endCursor || page.endCursor === after) break;
    after = page.endCursor;
  }
  return events;
}

const created = await allEvents('GameCreated');
const cancelled = await allEvents('GameCancelled');
const resolved = await allEvents('GameResolved');
say(`eventos: ${created.length} GameCreated, ${cancelled.length} GameCancelled, ${resolved.length} GameResolved`);

const objects = [];
const gameIds = created.map((e) => e.json.game_id);
for (let i = 0; i < gameIds.length; i += 50) {
  const { objects: batch } = await client.getObjects({
    objectIds: gameIds.slice(i, i + 50),
    include: { json: true, previousTransaction: true },
  });
  objects.push(...batch);
}
const objectById = new Map(objects.filter((o) => !(o instanceof Error)).map((o) => [o.objectId, o]));
const cancelledById = new Map(cancelled.map((e) => [e.json.game_id, e]));
const createdById = new Map(created.map((e) => [e.json.game_id, e]));

/** Primera partida (por orden de creación) que cumple la condición, con su `GameCreated`. */
function firstGame(label, predicate) {
  for (const event of created) {
    const object = objectById.get(event.json.game_id);
    if (object && predicate(object, event)) return { object, event };
  }
  throw new Error(`no hay una partida ${label} en la red: correr antes las transacciones del handoff (TASK-1)`);
}
const variant = (o) => o.json.state['@variant'];
const cancelledBy = (o) => cancelledById.get(o.objectId)?.json.cancelled_by;
const gOpen = firstGame('G_OPEN (abierta pendiente)', (o) => variant(o) === 'Pending' && o.json.opponent === null);
const gInv = firstGame('G_INV (invitación pendiente)', (o) => variant(o) === 'Pending' && o.json.opponent !== null);
// G_CANCEL tiene que ser abierta: `acceptNotPending` la acepta con C, y sobre una invitación C daría `game`/5, no `game`/4.
const gCancel = firstGame(
  'G_CANCEL (abierta y cancelada por su creador; una invitación cancelada no sirve)',
  (o) => variant(o) === 'Cancelled' && o.json.opponent === null && cancelledBy(o) === o.json.creator,
);
const gRej = firstGame(
  'G_REJ (rechazada por el invitado)',
  (o) => variant(o) === 'Cancelled' && o.json.opponent !== null && cancelledBy(o) === o.json.opponent,
);
const gAcc1 = firstGame('G_ACC1 (abierta resuelta)', (o) => variant(o) === 'Resolved' && o.json.opponent === null);

/** Primera `GameResolved` (por orden de emisión) cuya partida cumple la condición; si no hay, aborta con `missing`. */
function firstResolved(missing, predicate) {
  for (const event of resolved) {
    const createdEvent = createdById.get(event.json.game_id);
    if (createdEvent && predicate(event, createdEvent)) return event;
  }
  throw new Error(`${missing}: correr antes las transacciones del handoff (TASK-1)`);
}
const isOpen = (createdEvent) => createdEvent.json.opponent === null;
const missingWinner = (who) => `faltan los dos ganadores: no hay una aceptación de una partida abierta que gane el ${who}`;
const acceptCreatorWins = firstResolved(missingWinner('creador'), (e, c) => isOpen(c) && e.json.winner === e.json.creator);
const acceptAcceptorWins = firstResolved(missingWinner('aceptante'), (e, c) => isOpen(c) && e.json.winner === e.json.acceptor);
const acceptInvite = firstResolved('no hay una aceptación de una invitación', (_e, c) => !isOpen(c));

// El fallo ejecutado de aceptar (C acepta G_ACC1 con --gas-budget) tampoco emite eventos: es la última transacción que
// tocó G_ACC1. Se lee con `transaction` solo para tomar su sender como rol C (nunca se escribe en la fixture).
const failedAcceptDigest = gAcc1.object.previousTransaction;
const failedAccept = await client.getTransaction({ digest: failedAcceptDigest, include: { effects: true, transaction: true } });
const failedAcceptAbort = failedAccept.FailedTransaction?.status.error;
if (
  failedAcceptAbort?.$kind !== 'MoveAbort' ||
  failedAcceptAbort.MoveAbort.location?.module !== 'game' ||
  failedAcceptAbort.MoveAbort.abortCode !== '4'
) {
  throw new Error('la última transacción sobre G_ACC1 no es el accept_game fallido (game/4): correr el paso del handoff');
}

// Roles (direcciones efímeras de la génesis; no se escriben en la fixture): A crea, B es el invitado y el que acepta,
// C es un tercero (el sender del fallo ejecutado de aceptar), ADMIN es el dueño de la HouseCap (quien publicó).
const roleA = gOpen.object.json.creator;
const roleB = gInv.object.json.opponent;
const roleC = failedAccept.FailedTransaction.transaction.sender;
const { object: capObject } = await client.getObject({ objectId: houseCapId });
const roleAdmin = capObject.owner.AddressOwner;
const roles = { A: roleA, B: roleB, C: roleC, ADMIN: roleAdmin };
if (new Set(Object.values(roles).map((a) => normalizeSuiAddress(a))).size !== 4) {
  throw new Error('los roles A, B, C y ADMIN no son cuatro cuentas distintas');
}
if (
  [gInv, gCancel, gRej, gAcc1].some((g) => g.object.json.creator !== roleA) ||
  [acceptCreatorWins, acceptAcceptorWins, acceptInvite].some((e) => e.json.creator !== roleA)
) {
  throw new Error('G_INV, G_CANCEL, G_REJ, G_ACC1 y las partidas aceptadas tienen que ser de la misma cuenta A que G_OPEN');
}
if (gRej.object.json.opponent !== roleB) throw new Error('G_REJ tiene que invitar a la misma cuenta B que G_INV');
if ([acceptCreatorWins, acceptAcceptorWins, acceptInvite].some((e) => e.json.acceptor !== roleB)) {
  throw new Error('las aceptaciones tienen que ser de la cuenta B');
}

// House: el objeto tal cual (BCS de los campos del struct en base64).
const { object: houseObject } = await client.getObject({ objectId: houseId, include: { content: true, json: true } });
const minBet = BigInt(houseObject.json.min_bet);
const maxBet = BigInt(houseObject.json.max_bet);

// PTBs con la forma de V-11 (el script no importa `app/src/`).
function createTx(bet, opponent) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: `${packageId}::game::create_game`,
    arguments: [tx.object(houseId), coin, tx.pure.option('address', opponent)],
  });
  return tx;
}
function gameCallTx(fn, gameId) {
  const tx = new Transaction();
  tx.moveCall({ target: `${packageId}::game::${fn}`, arguments: [tx.object(gameId)] });
  return tx;
}
/** PTB de aceptar con la forma de DL-1 de #12: `splitCoins(gas, [bet])` + `accept_game` con `Random`, último comando. */
function acceptTx(game, bet = BigInt(game.object.json.bet)) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: `${packageId}::game::accept_game`,
    arguments: [tx.object(game.object.objectId), tx.object(houseId), coin, tx.object.random()],
  });
  return tx;
}

/** Simula sin firmar (`setSender` + `build({ client })`) y devuelve el `SimulationError` real; exige el abort esperado. */
async function simulationError(role, tx, expected) {
  tx.setSender(roles[role]);
  try {
    await tx.build({ client });
  } catch (error) {
    if (!(error instanceof SimulationError)) throw error;
    const abort = error.executionError?.MoveAbort;
    if (
      error.executionError?.$kind !== 'MoveAbort' ||
      abort.location?.module !== expected.module ||
      abort.abortCode !== String(expected.code)
    ) {
      throw new Error(`simulación de ${expected.module}/${expected.code}: abort inesperado: ${error.message}`, {
        cause: error,
      });
    }
    // `plain` omite claves `sender`: el rol se agrega después (nunca una dirección).
    return { sender: role, ...plain({ message: error.message, executionError: error.executionError }) };
  }
  throw new Error(`la simulación de ${expected.module}/${expected.code} no falló`);
}

const simulationErrors = {
  createBetTooLow: await simulationError('A', createTx(minBet - 1n, null), { module: 'game', code: 0 }),
  createBetTooHigh: await simulationError('A', createTx(maxBet + 1n, null), { module: 'game', code: 1 }),
  createSelfInvite: await simulationError('A', createTx(minBet, roleA), { module: 'game', code: 2 }),
  cancelNotCreator: await simulationError('B', gameCallTx('cancel_game', gOpen.object.objectId), { module: 'game', code: 3 }),
  cancelNotPending: await simulationError('A', gameCallTx('cancel_game', gCancel.object.objectId), { module: 'game', code: 4 }),
  rejectNotInvited: await simulationError('ADMIN', gameCallTx('reject_game', gInv.object.objectId), { module: 'game', code: 5 }),
  rejectNoInvitation: await simulationError('B', gameCallTx('reject_game', gOpen.object.objectId), { module: 'game', code: 6 }),
  acceptSelfPlay: await simulationError('A', acceptTx(gOpen), { module: 'game', code: 9 }),
  acceptNotInvited: await simulationError('C', acceptTx(gInv), { module: 'game', code: 5 }),
  acceptNotPending: await simulationError('C', acceptTx(gCancel), { module: 'game', code: 4 }),
  acceptWrongStake: await simulationError('B', acceptTx(gOpen, BigInt(gOpen.object.json.bet) + 1n), { module: 'game', code: 10 }),
};
say(`simulationErrors: ${Object.keys(simulationErrors).length} casos`);

/**
 * Lectura del nodo de una transacción ejecutada, como la usa la app (DL-2), sin `sender` y sin `signatures` (la firma
 * de usuario lleva la clave pública de la cuenta y la app no la usa).
 */
async function executedFixture(digest) {
  const result = await client.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } });
  const transaction = { ...result[result.$kind] };
  delete transaction.signatures;
  return plain({ ...result, [result.$kind]: transaction });
}

// El fallo ejecutado (B cancela G_OPEN con --gas-budget) no emite eventos: se encuentra como la última transacción que
// tocó G_OPEN (un objeto compartido mutable cambia de versión aunque la transacción aborte) y se verifica su abort.
const failedDigest = gOpen.object.previousTransaction;
const failed = await client.getTransaction({ digest: failedDigest, include: { effects: true } });
const failedAbort = failed.FailedTransaction?.status.error;
if (failedAbort?.$kind !== 'MoveAbort' || failedAbort.MoveAbort.location?.module !== 'game' || failedAbort.MoveAbort.abortCode !== '3') {
  throw new Error('la última transacción sobre G_OPEN no es el cancel_game fallido (game/3): correr el paso del handoff');
}

const executed = {
  createOpen: await executedFixture(gOpen.event.transactionDigest),
  createInvite: await executedFixture(gInv.event.transactionDigest),
  cancel: await executedFixture(cancelledById.get(gCancel.object.objectId).transactionDigest),
  reject: await executedFixture(cancelledById.get(gRej.object.objectId).transactionDigest),
  cancelNotCreatorExecuted: await executedFixture(failedDigest),
  acceptCreatorWins: await executedFixture(acceptCreatorWins.transactionDigest),
  acceptAcceptorWins: await executedFixture(acceptAcceptorWins.transactionDigest),
  acceptInvite: await executedFixture(acceptInvite.transactionDigest),
  acceptNotPendingExecuted: await executedFixture(failedAcceptDigest),
};
say(`executed: ${Object.keys(executed).length} transacciones`);

// Texto del abort en formato Rust: el `description` del error de ejecución por gRPC, idéntico al
// `effects.status.error` que imprime `sui client tx-block <digest> --json` (CLI 1.83). Solo la dirección del paquete.
const { response: rawFailed } = await client.ledgerService.getTransaction({
  digest: failedDigest,
  readMask: { paths: ['effects.status'] },
});
const cliErrorText = rawFailed.transaction.effects.status.error.description;
for (const address of Object.values(roles)) {
  if (cliErrorText.includes(normalizeSuiAddress(address).slice(2))) throw new Error('cliErrorText contiene una cuenta');
}

const fixture = {
  _meta: {
    suiCliVersion: deployment.suiCliVersion,
    sdkVersion: await sdkVersion(),
    capturedAt: new Date().toISOString(),
    network: 'localnet',
    method: {
      house: 'SuiGrpcClient.getObject({ objectId: houseId, include: { content: true, json: true } }); content en base64 (BCS de los campos del struct)',
      simulationErrors:
        'SimulationError real de Transaction.build({ client }) con setSender(<cuenta de la génesis del rol>), sin firmar; PTB con la forma de V-11 de #11 (splitCoins(gas) + create_game; cancel_game/reject_game con el Game) y de DL-1 de #12 (splitCoins(gas, [bet]) + accept_game(game, house, coin, random) como último comando). Por caso: { sender: <rol>, message, executionError }',
      executed:
        'SuiGrpcClient.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } }) de transacciones hechas con la CLI 1.83; effects.bcs y bcs de eventos en base64, sin sender ni signatures',
      cliErrorText:
        "description del error de ejecución por gRPC (ledgerService.getTransaction, readMask effects.status) del fallo ejecutado; idéntico a effects.status.error de `sui client tx-block <digest> --json`",
      selection:
        'G_OPEN = primera abierta pendiente; G_INV = primera invitación pendiente; G_CANCEL = primera abierta cancelada por su creador; G_REJ = primera rechazada por su invitado; G_ACC1 = primera abierta resuelta (por orden de creación). acceptCreatorWins / acceptAcceptorWins = primera GameResolved de una abierta con winner = creator / acceptor; acceptInvite = primera GameResolved de una invitación (por orden de los eventos). cancelNotCreatorExecuted = previousTransaction de G_OPEN (cancel_game de B con --gas-budget, MoveAbort game/3); acceptNotPendingExecuted = previousTransaction de G_ACC1 (accept_game de C con --gas-budget, MoveAbort game/4)',
      roles:
        'A = creador de las partidas; B = invitado de G_INV y G_REJ y el que acepta; C = tercero, sender de acceptNotPendingExecuted (acceptNotInvited, acceptNotPending); ADMIN = dueño de la HouseCap (rejectNotInvited)',
    },
    note: 'Captura de una localnet aislada y desechable (agents.md §3). Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases. Sin sender: los casos llevan el rol.',
  },
  ids: {
    packageId,
    originalPackageId,
    houseId,
    games: {
      open: gOpen.object.objectId,
      invite: gInv.object.objectId,
      cancelled: gCancel.object.objectId,
      rejected: gRej.object.objectId,
      acc1: gAcc1.object.objectId,
      accInvite: acceptInvite.json.game_id,
      acceptCreatorWins: acceptCreatorWins.json.game_id,
      acceptAcceptorWins: acceptAcceptorWins.json.game_id,
      acceptInvite: acceptInvite.json.game_id,
    },
  },
  house: plain({
    objectId: houseObject.objectId,
    version: houseObject.version,
    digest: houseObject.digest,
    owner: houseObject.owner,
    type: houseObject.type,
    json: houseObject.json,
    content: houseObject.content,
  }),
  simulationErrors,
  executed,
  cliErrorText,
};

await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
say('escrito contracts/fixtures/game-tx.localnet.json');
