// Captura las fixtures reales de TRANSACCIONES del coinflip nuevo (`Duel<Coinflip>`, #73 TASK-5) desde la localnet aislada de
// `agents.md` §3, después del upgrade del script de TASK-4: errores de simulación (`SimulationError` de `build({ client })`),
// transacciones ejecutadas (éxitos y fallos `MoveAbort`), el objeto House (que junta las comisiones de las dos fuentes) y las
// transacciones de las partidas anteriores (`game::Game`) aceptadas y canceladas **después** del upgrade, desde el ID original y
// desde el del upgrade.
//
// Uso (dentro de la localnet aislada, después de las transacciones del ensayo de `contracts/README.md`, "Fixtures de `duel`
// (#73, TASK-5)"):
//   node app/scripts/capture-duel-tx.mjs [--url http://127.0.0.1:<puerto>]
//
// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`; guarda compartida
// `localnet-guard.mjs`): con cualquier otra URL sale con código 2 **antes** de importar el SDK o hacer pedidos. Lee
// `contracts/deployments/localnet.json`, exige que el chain id del nodo coincida y escribe `contracts/fixtures/duel-tx.localnet.json`.
// Las simulaciones **no firman**: `setSender` con una cuenta de la génesis y `build({ client })`. Las direcciones e IDs del archivo son
// de cuentas efímeras de una génesis desechable; ninguna clave. Sin `sender`: los casos llevan el rol (`A`, `B`, `C`, `ADMIN`).
// **Solo producción:** nada del sandbox (los filtros usan el tag completo `DuelXxx<Coinflip>`).
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-duel-tx');

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
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'duel-tx.localnet.json');

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

if (!Array.isArray(deployment.upgrades) || deployment.upgrades.length === 0 || !Array.isArray(deployment.typeOrigins)) {
  throw new Error('contracts/deployments/localnet.json no trae upgrades y typeOrigins: correr antes `publish.mjs upgrade` (TASK-4)');
}

/** ID de definición de un tipo, buscado por (módulo, nombre) en la tabla del despliegue (S-2: nunca solo por módulo). */
function definingId(module, name) {
  const entry = deployment.typeOrigins.find((o) => o.module === module && o.name === name);
  if (!entry) throw new Error(`typeOrigins del despliegue no trae ${module}::${name}`);
  return entry.definingId;
}
// typeArguments de las `entry` genéricas de `duel`: siempre el ID de DEFINICIÓN de typeOrigins (V-12); el target de la llamada,
// el `packageId` vigente del despliegue.
const coinflipTag = `${definingId('coinflip', 'Coinflip')}::coinflip::Coinflip`;
const eventTag = (name) => `${definingId('duel', name)}::duel::${name}<${coinflipTag}>`;

/** Todos los eventos de un tag completo, en orden ascendente (localnet: sin poda ni cota necesaria). */
async function listAll(eventType) {
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

const created = await listAll(eventTag('DuelCreated'));
const cancelled = await listAll(eventTag('DuelCancelled'));
const resolved = await listAll(eventTag('DuelResolved'));
say(`eventos: ${created.length} DuelCreated, ${cancelled.length} DuelCancelled, ${resolved.length} DuelResolved`);

const objects = [];
const duelIds = created.map((e) => e.json.duel_id);
for (let i = 0; i < duelIds.length; i += 50) {
  const { objects: batch } = await client.getObjects({
    objectIds: duelIds.slice(i, i + 50),
    include: { json: true, previousTransaction: true },
  });
  objects.push(...batch);
}
const objectById = new Map(objects.filter((o) => !(o instanceof Error)).map((o) => [o.objectId, o]));
const cancelledById = new Map(cancelled.map((e) => [e.json.duel_id, e]));
const createdById = new Map(created.map((e) => [e.json.duel_id, e]));

/** Primer duelo (por orden de creación) que cumple la condición, con su `DuelCreated`. */
function firstDuel(label, predicate) {
  for (const event of created) {
    const object = objectById.get(event.json.duel_id);
    if (object && predicate(object, event)) return { object, event };
  }
  throw new Error(`no hay un duelo ${label} en la red: correr antes el ensayo de TASK-5 (coinflip nuevo)`);
}
const variant = (o) => o.json.state['@variant'];
const cancelledBy = (o) => cancelledById.get(o.objectId)?.json.cancelled_by;
const dOpen = firstDuel('D_OPEN (abierto pendiente)', (o) => variant(o) === 'Pending' && o.json.opponent === null);
const dInv = firstDuel('D_INV (invitación pendiente)', (o) => variant(o) === 'Pending' && o.json.opponent !== null);
// D_CANCEL tiene que ser abierto: `acceptNotPending` lo acepta con C, y sobre una invitación C daría `duel`/5, no `duel`/4.
const dCancel = firstDuel(
  'D_CANCEL (abierto y cancelado por su creador; una invitación cancelada no sirve)',
  (o) => variant(o) === 'Cancelled' && o.json.opponent === null && cancelledBy(o) === o.json.creator,
);
const dRej = firstDuel(
  'D_REJ (rechazado por el invitado)',
  (o) => variant(o) === 'Cancelled' && o.json.opponent !== null && cancelledBy(o) === o.json.opponent,
);
const dAcc1 = firstDuel('D_ACC1 (abierto resuelto)', (o) => variant(o) === 'Resolved' && o.json.opponent === null);

/** Primera `DuelResolved` (por orden de emisión) cuyo duelo cumple la condición; si no hay, aborta con `missing`. */
function firstResolved(missing, predicate) {
  for (const event of resolved) {
    const createdEvent = createdById.get(event.json.duel_id);
    if (createdEvent && predicate(event, createdEvent)) return event;
  }
  throw new Error(`${missing}: correr antes el ensayo de TASK-5`);
}
const isOpen = (createdEvent) => createdEvent.json.opponent === null;
const missingWinner = (who) => `faltan los dos ganadores: no hay una aceptación de un duelo abierto que gane el ${who}`;
const acceptCreatorWins = firstResolved(missingWinner('creador'), (e, c) => isOpen(c) && e.json.winner === e.json.creator);
const acceptAcceptorWins = firstResolved(missingWinner('aceptante'), (e, c) => isOpen(c) && e.json.winner === e.json.acceptor);
const acceptInvite = firstResolved('no hay una aceptación de una invitación', (_e, c) => !isOpen(c));

// El fallo ejecutado de aceptar (C acepta D_ACC1 con presupuesto explícito) tampoco emite eventos: es la última transacción que
// tocó D_ACC1. Se lee con `transaction` solo para tomar su sender como rol C (nunca se escribe en la fixture).
const failedAcceptDigest = dAcc1.object.previousTransaction;
const failedAccept = await client.getTransaction({ digest: failedAcceptDigest, include: { effects: true, transaction: true } });
const failedAcceptAbort = failedAccept.FailedTransaction?.status.error;
if (
  failedAcceptAbort?.$kind !== 'MoveAbort' ||
  failedAcceptAbort.MoveAbort.location?.module !== 'duel' ||
  failedAcceptAbort.MoveAbort.abortCode !== '4'
) {
  throw new Error('la última transacción sobre D_ACC1 no es el coinflip::accept fallido (duel/4): correr el paso del ensayo');
}

// Roles (direcciones efímeras de la génesis; no se escriben en la fixture): A crea, B es el invitado y el que acepta,
// C es un tercero (el sender del fallo ejecutado de aceptar), ADMIN es el dueño de la HouseCap (quien publicó).
const roleA = dOpen.object.json.creator;
const roleB = dInv.object.json.opponent;
const roleC = failedAccept.FailedTransaction.transaction.sender;
const { object: capObject } = await client.getObject({ objectId: houseCapId });
const roleAdmin = capObject.owner.AddressOwner;
const roles = { A: roleA, B: roleB, C: roleC, ADMIN: roleAdmin };
if (new Set(Object.values(roles).map((a) => normalizeSuiAddress(a))).size !== 4) {
  throw new Error('los roles A, B, C y ADMIN no son cuatro cuentas distintas');
}
if (
  [dInv, dCancel, dRej, dAcc1].some((d) => d.object.json.creator !== roleA) ||
  [acceptCreatorWins, acceptAcceptorWins, acceptInvite].some((e) => e.json.creator !== roleA)
) {
  throw new Error('D_INV, D_CANCEL, D_REJ, D_ACC1 y los duelos aceptados tienen que ser de la misma cuenta A que D_OPEN');
}
if (dRej.object.json.opponent !== roleB) throw new Error('D_REJ tiene que invitar a la misma cuenta B que D_INV');
if ([acceptCreatorWins, acceptAcceptorWins, acceptInvite].some((e) => e.json.acceptor !== roleB)) {
  throw new Error('las aceptaciones tienen que ser de la cuenta B');
}

/** `google.protobuf.Value` del gRPC (el campo `json` de un objeto) → JSON, como lo hace el SDK al leer un objeto. */
function valueToJson(value) {
  const kind = value?.kind;
  switch (kind?.oneofKind) {
    case 'structValue':
      return Object.fromEntries(Object.entries(kind.structValue.fields).map(([name, v]) => [name, valueToJson(v)]));
    case 'listValue':
      return kind.listValue.values.map(valueToJson);
    case 'stringValue':
      return kind.stringValue;
    case 'numberValue':
      return kind.numberValue;
    case 'boolValue':
      return kind.boolValue;
    default:
      return null;
  }
}

// House: el objeto tal cual (BCS de los campos del struct en base64). Con el upgrade, `fees_collected` junta las dos fuentes de
// producción. Se lee la VERSIÓN que dejó la última aceptación de producción (la última `DuelResolved<Coinflip>`), no la vigente:
// otras transacciones de la misma génesis (p. ej. el sandbox de reloj de `duel-clock.localnet.json`) también cobran comisiones, y
// esta fixture no puede cambiar ni llevar nada de ellas. Es una lectura histórica (`GetObject` con `version`).
const lastResolvedTx = await client.getTransaction({
  digest: resolved[resolved.length - 1].transactionDigest,
  include: { effects: true },
});
const lastHouseChange = (lastResolvedTx.Transaction ?? lastResolvedTx.FailedTransaction).effects.changedObjects.find(
  (o) => normalizeSuiAddress(o.objectId) === normalizeSuiAddress(houseId),
);
if (!lastHouseChange?.outputVersion) throw new Error('la última aceptación de producción no modificó la House');
const { object: currentHouse } = await client.getObject({ objectId: houseId });
const { response: houseResponse } = await client.ledgerService.batchGetObjects({
  requests: [{ objectId: houseId, version: BigInt(lastHouseChange.outputVersion) }],
  readMask: { paths: ['owner', 'object_type', 'digest', 'version', 'object_id', 'contents', 'json'] },
});
const houseResult = houseResponse.objects[0].result;
if (houseResult.oneofKind !== 'object') throw new Error('la versión histórica de la House no está disponible en el nodo');
const houseObject = {
  objectId: houseResult.object.objectId,
  version: houseResult.object.version?.toString(),
  digest: houseResult.object.digest,
  content: houseResult.object.contents?.value,
  owner: currentHouse.owner,
  type: currentHouse.type,
  json: valueToJson(houseResult.object.json),
};
const minBet = BigInt(houseObject.json.min_bet);
const maxBet = BigInt(houseObject.json.max_bet);

// PTBs con la forma de V-11 de #11 y DL-1 de #12 (el script no importa `app/src/`), apuntando al coinflip nuevo y a las `entry`
// genéricas de `duel`.
function createTx(bet, opponent) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: `${packageId}::coinflip::create`,
    arguments: [tx.object(houseId), coin, tx.pure.option('address', opponent)],
  });
  return tx;
}
function duelCallTx(fn, duelId) {
  const tx = new Transaction();
  tx.moveCall({ target: `${packageId}::duel::${fn}`, typeArguments: [coinflipTag], arguments: [tx.object(duelId)] });
  return tx;
}
/** PTB de aceptar: `splitCoins(gas, [bet])` + `coinflip::accept` con `Random`, último comando. */
function acceptTx(duel, bet = BigInt(duel.object.json.bet)) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: `${packageId}::coinflip::accept`,
    arguments: [tx.object(duel.object.objectId), tx.object(houseId), coin, tx.object.random()],
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
  createBetTooLow: await simulationError('A', createTx(minBet - 1n, null), { module: 'duel', code: 0 }),
  createBetTooHigh: await simulationError('A', createTx(maxBet + 1n, null), { module: 'duel', code: 1 }),
  createSelfInvite: await simulationError('A', createTx(minBet, roleA), { module: 'duel', code: 2 }),
  cancelNotCreator: await simulationError('B', duelCallTx('cancel', dOpen.object.objectId), { module: 'duel', code: 3 }),
  cancelNotPending: await simulationError('A', duelCallTx('cancel', dCancel.object.objectId), { module: 'duel', code: 4 }),
  rejectNotInvited: await simulationError('ADMIN', duelCallTx('reject', dInv.object.objectId), { module: 'duel', code: 5 }),
  rejectNoInvitation: await simulationError('B', duelCallTx('reject', dOpen.object.objectId), { module: 'duel', code: 6 }),
  acceptSelfPlay: await simulationError('A', acceptTx(dOpen), { module: 'duel', code: 9 }),
  acceptNotInvited: await simulationError('C', acceptTx(dInv), { module: 'duel', code: 5 }),
  acceptNotPending: await simulationError('C', acceptTx(dCancel), { module: 'duel', code: 4 }),
  acceptWrongStake: await simulationError('B', acceptTx(dOpen, BigInt(dOpen.object.json.bet) + 1n), { module: 'duel', code: 10 }),
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

// El fallo ejecutado (B cancela D_OPEN con presupuesto explícito) no emite eventos: se encuentra como la última transacción que
// tocó D_OPEN (un objeto compartido mutable cambia de versión aunque la transacción aborte) y se verifica su abort.
const failedDigest = dOpen.object.previousTransaction;
const failed = await client.getTransaction({ digest: failedDigest, include: { effects: true } });
const failedAbort = failed.FailedTransaction?.status.error;
if (failedAbort?.$kind !== 'MoveAbort' || failedAbort.MoveAbort.location?.module !== 'duel' || failedAbort.MoveAbort.abortCode !== '3') {
  throw new Error('la última transacción sobre D_OPEN no es el duel::cancel fallido (duel/3): correr el paso del ensayo');
}

// Partidas anteriores (`game::Game`) tocadas DESPUÉS del upgrade: se leen los eventos con el ID original (los tipos del módulo
// `game` no cambian) y se toman las posteriores al checkpoint del upgrade. Se verifica por los comandos de la transacción
// desde qué ID de paquete se llamó (el original para la primera, el del upgrade para las otras).
const upgradeTxResult = await client.getTransaction({ digest: deployment.upgrades[0].txDigest });
const upgradeCheckpoint = BigInt((upgradeTxResult.Transaction ?? upgradeTxResult.FailedTransaction).checkpoint);
const legacyResolved = (await listAll(`${originalPackageId}::game::GameResolved`)).filter((e) => BigInt(e.checkpoint) > upgradeCheckpoint);
const legacyCancelled = (await listAll(`${originalPackageId}::game::GameCancelled`)).filter((e) => BigInt(e.checkpoint) > upgradeCheckpoint);
if (legacyResolved.length < 2 || legacyCancelled.length < 1) {
  throw new Error('faltan las partidas anteriores aceptadas (2) y cancelada (1) después del upgrade: correr el paso 4 del ensayo');
}
/** ID de paquete del último `MoveCall` de una transacción (comando de `accept_game` / `cancel_game`). */
async function calledPackage(digest) {
  const result = await client.getTransaction({ digest, include: { transaction: true } });
  const calls = result[result.$kind].transaction.commands.filter((c) => c.$kind === 'MoveCall');
  return normalizeSuiAddress(calls[calls.length - 1].MoveCall.package);
}
const legacyAcceptOriginal = legacyResolved[0];
const legacyAcceptUpgraded = legacyResolved[1];
const legacyCancelUpgraded = legacyCancelled[0];
if (
  (await calledPackage(legacyAcceptOriginal.transactionDigest)) !== normalizeSuiAddress(originalPackageId) ||
  (await calledPackage(legacyAcceptUpgraded.transactionDigest)) !== normalizeSuiAddress(packageId) ||
  (await calledPackage(legacyCancelUpgraded.transactionDigest)) !== normalizeSuiAddress(packageId)
) {
  throw new Error('las partidas anteriores posteriores al upgrade no se tocaron desde los IDs esperados (original, upgrade, upgrade)');
}

const executed = {
  createOpen: await executedFixture(dOpen.event.transactionDigest),
  createInvite: await executedFixture(dInv.event.transactionDigest),
  cancel: await executedFixture(cancelledById.get(dCancel.object.objectId).transactionDigest),
  reject: await executedFixture(cancelledById.get(dRej.object.objectId).transactionDigest),
  cancelNotCreatorExecuted: await executedFixture(failedDigest),
  acceptCreatorWins: await executedFixture(acceptCreatorWins.transactionDigest),
  acceptAcceptorWins: await executedFixture(acceptAcceptorWins.transactionDigest),
  acceptInvite: await executedFixture(acceptInvite.transactionDigest),
  acceptNotPendingExecuted: await executedFixture(failedAcceptDigest),
  legacyAcceptViaOriginalPackage: await executedFixture(legacyAcceptOriginal.transactionDigest),
  legacyAcceptViaUpgradedPackage: await executedFixture(legacyAcceptUpgraded.transactionDigest),
  legacyCancelViaUpgradedPackage: await executedFixture(legacyCancelUpgraded.transactionDigest),
};
say(`executed: ${Object.keys(executed).length} transacciones`);

// Texto del abort en formato Rust: el `description` del error de ejecución por gRPC, idéntico al
// `effects.status.error` que imprime `sui client tx-block <digest> --json` (CLI 1.84). Solo la dirección del paquete.
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
      house:
        'ledgerService.batchGetObjects({ requests: [{ objectId: houseId, version }] }) de la versión de la House que dejó la última DuelResolved<Coinflip> (lectura histórica: no cambia con otras transacciones de la génesis, como las de un juego de ensayo con reloj); después del upgrade y de las partidas de las dos fuentes de producción (fees_collected las junta); content en base64 (BCS de los campos del struct); owner y type del getObject vigente',
      simulationErrors:
        'SimulationError real de Transaction.build({ client }) con setSender(<cuenta de la génesis del rol>), sin firmar; PTB con la forma de V-11 de #11 (splitCoins(gas) + coinflip::create; duel::cancel / duel::reject con typeArguments [<definingId>::coinflip::Coinflip], target = packageId vigente) y de DL-1 de #12 (splitCoins(gas, [bet]) + coinflip::accept(duel, house, coin, random) como último comando). Por caso: { sender: <rol>, message, executionError }',
      executed:
        'SuiGrpcClient.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } }) de transacciones hechas con la CLI 1.84; effects.bcs y bcs de eventos en base64, sin sender ni signatures. legacy* = partidas de game::Game tocadas DESPUÉS del upgrade (la primera aceptada desde el ID original, la segunda aceptada y la cancelada desde el ID del upgrade; se verifica por el paquete del último MoveCall)',
      cliErrorText:
        "description del error de ejecución por gRPC (ledgerService.getTransaction, readMask effects.status) del fallo ejecutado; idéntico a effects.status.error de `sui client tx-block <digest> --json`",
      selection:
        'D_OPEN = primer duelo abierto pendiente; D_INV = primera invitación pendiente; D_CANCEL = primero abierto cancelado por su creador; D_REJ = primero rechazado por su invitado; D_ACC1 = primero abierto resuelto (por orden de creación). acceptCreatorWins / acceptAcceptorWins = primera DuelResolved de un duelo abierto con winner = creator / acceptor; acceptInvite = primera DuelResolved de una invitación (por orden de los eventos). cancelNotCreatorExecuted = previousTransaction de D_OPEN (duel::cancel de B con presupuesto explícito, MoveAbort duel/3); acceptNotPendingExecuted = previousTransaction de D_ACC1 (coinflip::accept de C con presupuesto explícito, MoveAbort duel/4)',
      roles:
        'A = creador de los duelos; B = invitado de D_INV y D_REJ y el que acepta; C = tercero, sender de acceptNotPendingExecuted (acceptNotInvited, acceptNotPending); ADMIN = dueño de la HouseCap (rejectNotInvited)',
    },
    note: 'Captura de una localnet aislada y desechable (agents.md §3), después del upgrade del script. Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases. Sin sender: los casos llevan el rol. Solo producción.',
  },
  ids: {
    packageId,
    originalPackageId,
    houseId,
    coinflipTag,
    duels: {
      open: dOpen.object.objectId,
      invite: dInv.object.objectId,
      cancelled: dCancel.object.objectId,
      rejected: dRej.object.objectId,
      acc1: dAcc1.object.objectId,
      acceptCreatorWins: acceptCreatorWins.json.duel_id,
      acceptAcceptorWins: acceptAcceptorWins.json.duel_id,
      acceptInvite: acceptInvite.json.duel_id,
    },
    legacyGames: {
      acceptViaOriginalPackage: legacyAcceptOriginal.json.game_id,
      acceptViaUpgradedPackage: legacyAcceptUpgraded.json.game_id,
      cancelViaUpgradedPackage: legacyCancelUpgraded.json.game_id,
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
say('escrito contracts/fixtures/duel-tx.localnet.json');
