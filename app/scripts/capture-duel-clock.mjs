// Captura las fixtures reales del RELOJ POR JUGADA de `duel` (#73 TASK-5) por gRPC desde la localnet aislada de `agents.md` §3.
//
// **SANDBOX.** El coinflip no persiste `Active`, así que el reloj solo se puede ejercer con un juego de ensayo: una v3 sandbox
// (no se commitea; vive en `<SMOKE_DIR>/v3`, fuera del árbol de trabajo) con un módulo mínimo `testgame` y dos cambios de ensayo en la
// copia de `duel`: el id de control 8 (= `SANDBOX_CONTROL_8_TURN_MS`, 15 000 ms; ningún id existente se redefine) y una gracia
// propia de `refund_stalled` (`SANDBOX_CLAIM_GRACE_MS`, 15 000 ms). Por eso el archivo que escribe este script lleva
// `_meta.sandbox = true` y `_meta.sandboxConstants`: sus valores de tiempo NO son los de producción (`turn_ms` de los controles
// 1-7 y `CLAIM_GRACE_MS` = 7 días) y la app los trata como un valor fuera del espejo (formato genérico, nunca un error de
// configuración). Los valores reales los cubren los tests de contrato; esto prueba el *mecanismo* (eventos, objetos, BCS, tipos con
// IDs de upgrades distintos, aborts).
//
// Uso (dentro de la localnet aislada, después del ensayo de `contracts/README.md`, "Fixtures de `duel` (#73, TASK-5)"):
//   node app/scripts/capture-duel-clock.mjs [--url http://127.0.0.1:<puerto>]
//
// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`; guarda compartida
// `localnet-guard.mjs`): con cualquier otra URL sale con código 2 **antes** de importar el SDK o hacer pedidos. Lee
// `contracts/deployments/localnet.json` (House, HouseCap, `typeOrigins` de `duel`), descubre el juego del sandbox por los eventos
// (`DuelCreated` con el literal PREFIJO, que devuelve todas las instanciaciones de `G`) y escribe
// `contracts/fixtures/duel-clock.localnet.json`. Las simulaciones **no firman**. Las direcciones e IDs del archivo son de cuentas
// efímeras de una génesis desechable; ninguna clave. Sin `sender`: los casos llevan el rol (`A`, `B`, `C`, `ADMIN`).
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-duel-clock');

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { SuiGrpcClient, GrpcTypes } = await import('@mysten/sui/grpc');
const { SimulationError } = await import('@mysten/sui/client');
const { Transaction } = await import('@mysten/sui/transactions');
const { fromBase58, normalizeSuiAddress, toBase64, toHex } = await import('@mysten/sui/utils');

const say = (line) => process.stdout.write(`${line}\n`);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deploymentPath = join(repoRoot, 'contracts', 'deployments', 'localnet.json');
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'duel-clock.localnet.json');

// Constantes del sandbox (los nombres llevan el marcador `SANDBOX_`): lo que la v3 sandbox agrega o cambia.
const SANDBOX_CONTROL_8_ID = 8;
const SANDBOX_CONTROL_8_TURN_MS = 15_000;
const SANDBOX_CLAIM_GRACE_MS = 15_000;
// Un control de producción con plazo largo (id 7 = daily 7 días): una partida `Active` con él no vence durante el ensayo.
const CONTROL_7_TURN_MS = '604800000';

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
const { houseId, houseCapId } = deployment;
const client = new SuiGrpcClient({ network: 'localnet', baseUrl: url });

const { response: serviceInfo } = await client.ledgerService.getServiceInfo({});
const nodeChainId = toHex(fromBase58(serviceInfo.chainId)).slice(0, 8);
assertDeployment(deployment, nodeChainId);
say(`nodo ${url}, chain id ${nodeChainId} = despliegue`);

if (!Array.isArray(deployment.typeOrigins)) throw new Error('contracts/deployments/localnet.json no trae typeOrigins');
const duelOrigin = deployment.typeOrigins.find((o) => o.module === 'duel' && o.name === 'DuelCreated');
if (!duelOrigin) throw new Error('typeOrigins del despliegue no trae duel::DuelCreated');
const duelDef = duelOrigin.definingId;

/** Todos los eventos de un literal (prefijo sin parámetros de tipo o tag completo), en orden ascendente. */
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

// Descubrimiento del juego del sandbox: el literal PREFIJO `<def>::duel::DuelCreated` devuelve las instanciaciones de TODOS los `G`
// (V-4, S-1 del MAYOR); el tag de cada evento trae el `G`. El del sandbox es el del módulo `testgame`.
const allCreated = await listAll(`${duelDef}::duel::DuelCreated`);
const gTags = [...new Set(allCreated.map((e) => /<(.*)>$/.exec(e.eventType)?.[1]).filter(Boolean))].sort();
const testgameTags = gTags.filter((g) => g.endsWith('::testgame::Testgame'));
if (testgameTags.length !== 1) {
  throw new Error(`se esperaba exactamente un juego del sandbox (testgame) entre ${gTags.join(', ')}: correr antes el ensayo de TASK-5 (v3 sandbox)`);
}
const testgameTag = testgameTags[0];
const sandboxPackageId = normalizeSuiAddress(testgameTag.split('::')[0]);
say(`juegos con DuelCreated (prefijo): ${gTags.length}; sandbox: testgame en el paquete ${sandboxPackageId.slice(0, 10)}…`);

// Tabla de orígenes del paquete del sandbox (gRPC): `testgame` se define en el upgrade v3, `duel`/`coinflip` en el v2 y `house`/`game` en el original.
const { response: packageResponse } = await client.ledgerService.getObject({
  objectId: sandboxPackageId,
  readMask: { paths: ['package'] },
});
const typeOrigins = (packageResponse.object.package.typeOrigins ?? [])
  .map((o) => ({ module: o.moduleName, name: o.datatypeName, definingId: normalizeSuiAddress(o.packageId) }))
  .sort((a, b) => (a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module)));
const testgameOrigin = typeOrigins.find((o) => o.module === 'testgame' && o.name === 'Testgame');
if (testgameOrigin?.definingId !== sandboxPackageId) throw new Error('testgame::Testgame no se define en el paquete del sandbox');
say(`typeOrigins del paquete del sandbox: ${typeOrigins.length} tipos`);

const tagFor = (name) => `${duelDef}::duel::${name}<${testgameTag}>`;
const created = await listAll(tagFor('DuelCreated'));
const activated = await listAll(tagFor('DuelActivated'));
const turns = await listAll(tagFor('DuelTurn'));
const resolved = await listAll(tagFor('DuelResolved'));
const timedOut = await listAll(tagFor('DuelTimedOut'));
const expired = await listAll(tagFor('DuelExpired'));
say(
  `eventos del sandbox: ${created.length} DuelCreated, ${activated.length} DuelActivated, ${turns.length} DuelTurn, ${resolved.length} DuelResolved, ${timedOut.length} DuelTimedOut, ${expired.length} DuelExpired`,
);

const objects = [];
const duelIds = created.map((e) => e.json.duel_id);
for (let i = 0; i < duelIds.length; i += 50) {
  const { objects: batch } = await client.getObjects({
    objectIds: duelIds.slice(i, i + 50),
    include: { content: true, json: true, previousTransaction: true },
  });
  objects.push(...batch);
}
const objectById = new Map(objects.filter((o) => !(o instanceof Error)).map((o) => [o.objectId, o]));
const activatedById = new Map(activated.map((e) => [e.json.duel_id, e]));
const createdById = new Map(created.map((e) => [e.json.duel_id, e]));
const variant = (o) => o.json.state['@variant'];

/** Primer duelo del sandbox (por orden de creación) que cumple la condición, con su `DuelCreated`. */
function firstDuel(label, predicate) {
  for (const event of created) {
    const object = objectById.get(event.json.duel_id);
    if (object && predicate(object, event)) return { object, event };
  }
  throw new Error(`no hay un duelo del sandbox ${label}: correr antes el ensayo de TASK-5 (v3 sandbox)`);
}
const toMove = (o) => Number(o.json.state.to_move);
// Active: (1) un jugador pendiente y el plazo del sandbox ya vencido; (2) con el control 7 (plazo de 7 días, no vence);
// (3) ambos pendientes y el plazo vencido. TimedOut / Expired (ambos pendientes y uno pendiente, por la máscara de la activación) / Resuelto por collect + pay.
const activeOnePending = firstDuel(
  'Active con un jugador pendiente y plazo vencido',
  (o) => variant(o) === 'Active' && o.json.turn_ms === String(SANDBOX_CONTROL_8_TURN_MS) && toMove(o) === 1,
);
const activeSevenDays = firstDuel(
  'Active con el control 7 (7 días)',
  (o) => variant(o) === 'Active' && o.json.turn_ms === CONTROL_7_TURN_MS,
);
const activeBothPending = firstDuel(
  'Active con ambos pendientes y plazo vencido',
  (o) => variant(o) === 'Active' && o.json.turn_ms === String(SANDBOX_CONTROL_8_TURN_MS) && toMove(o) === 3,
);
const timedOutDuel = firstDuel('TimedOut', (o) => variant(o) === 'TimedOut');
const activatedMask = (o) => Number(activatedById.get(o.objectId)?.json.to_move);
const expiredBoth = firstDuel('Expired con ambos pendientes', (o) => variant(o) === 'Expired' && activatedMask(o) === 3);
const expiredOne = firstDuel('Expired con un jugador pendiente (tras la gracia)', (o) => variant(o) === 'Expired' && activatedMask(o) !== 3);
const resolvedDuel = firstDuel('Resolved por collect + pay', (o) => variant(o) === 'Resolved');
const pendingDuel = firstDuel('Pending', (o) => variant(o) === 'Pending');

const eventOf = (events, duel) => {
  const event = events.find((e) => e.json.duel_id === duel.object.objectId);
  if (!event) throw new Error(`falta un evento del duelo ${duel.object.objectId}`);
  return event;
};
const objectFixture = (o) =>
  plain({
    objectId: o.objectId,
    version: o.version,
    digest: o.digest,
    owner: o.owner,
    type: o.type,
    previousTransaction: o.previousTransaction,
    json: o.json,
    content: o.content,
  });
const eventFixture = (e) =>
  plain({
    packageId: e.packageId,
    module: e.module,
    eventType: e.eventType,
    bcs: e.bcs,
    json: e.json,
    checkpoint: e.checkpoint,
    transactionDigest: e.transactionDigest,
    eventIndex: e.eventIndex,
  });

// Pedido crudo de ListEvents con el literal PREFIJO (todas las instanciaciones de `G`, como el "Todos" del lobby): ascendente desde
// el checkpoint del último `DuelCreated<Coinflip>` anterior al primer duelo del sandbox, 4 eventos; trae las dos instanciaciones.
const RAW_READ_MASK = ['package_id', 'module', 'event_type', 'contents', 'json', 'checkpoint', 'transaction_digest', 'event_index'];
const firstSandboxCreated = created[0];
const lastCoinflipBefore = [...allCreated]
  .filter((e) => !e.eventType.endsWith(`<${testgameTag}>`) && BigInt(e.checkpoint) < BigInt(firstSandboxCreated.checkpoint))
  .pop();
if (!lastCoinflipBefore) throw new Error('no hay un DuelCreated de otro juego anterior al primero del sandbox');
const rawRequest = {
  readMask: { paths: RAW_READ_MASK },
  startCheckpoint: BigInt(lastCoinflipBefore.checkpoint),
  filter: {
    terms: [
      {
        literals: [
          { negated: false, predicate: { oneofKind: 'eventType', eventType: { eventType: `${duelDef}::duel::DuelCreated` } } },
        ],
      },
    ],
  },
  options: { limit: 4, ordering: GrpcTypes.Ordering.ASCENDING },
};
const rawFrames = [];
for await (const frame of client.ledgerService.listEvents(rawRequest).responses) rawFrames.push(plain(frame));
const rawGs = new Set(rawFrames.filter((f) => f.event).map((f) => /<(.*)>$/.exec(f.event.eventType)?.[1]));
if (rawGs.size < 2) throw new Error('la página cruda con el literal prefijo no trae dos instanciaciones de G');

// Roles: A = creador, B = el que acepta, C = tercero (sender del fallo ejecutado de reclamar), ADMIN = dueño de la HouseCap.
const failedClaimDigest = activeSevenDays.object.previousTransaction;
const failedClaim = await client.getTransaction({ digest: failedClaimDigest, include: { effects: true, transaction: true } });
const failedClaimAbort = failedClaim.FailedTransaction?.status.error;
if (
  failedClaimAbort?.$kind !== 'MoveAbort' ||
  failedClaimAbort.MoveAbort.location?.module !== 'duel' ||
  failedClaimAbort.MoveAbort.abortCode !== '14'
) {
  throw new Error('la última transacción sobre el Active de 7 días no es el claim_timeout fallido (duel/14): correr el paso del ensayo');
}
const failedBothDigest = activeBothPending.object.previousTransaction;
const failedBoth = await client.getTransaction({ digest: failedBothDigest, include: { effects: true } });
const failedBothAbort = failedBoth.FailedTransaction?.status.error;
if (
  failedBothAbort?.$kind !== 'MoveAbort' ||
  failedBothAbort.MoveAbort.location?.module !== 'duel' ||
  failedBothAbort.MoveAbort.abortCode !== '22'
) {
  throw new Error('la última transacción sobre el Active con ambos pendientes no es el claim_timeout fallido (duel/22)');
}
const failedTypeDigest = pendingDuel.object.previousTransaction;
const failedType = await client.getTransaction({ digest: failedTypeDigest, include: { effects: true } });
const failedTypeError = failedType.FailedTransaction?.status.error;
if (failedTypeError?.$kind !== 'CommandArgumentError' && !JSON.stringify(failedTypeError).includes('TypeNotFound')) {
  throw new Error('la última transacción sobre el Pending del sandbox no es la cancel con un typeArgument de un ID anterior (TypeNotFound)');
}
const roleA = activeSevenDays.object.json.creator;
const roleB = activatedById.get(activeSevenDays.object.objectId).json.acceptor;
const roleC = failedClaim.FailedTransaction.transaction.sender;
const { object: capObject } = await client.getObject({ objectId: houseCapId });
const roleAdmin = capObject.owner.AddressOwner;
const roles = { A: roleA, B: roleB, C: roleC, ADMIN: roleAdmin };
if (new Set(Object.values(roles).map((a) => normalizeSuiAddress(a))).size !== 4) {
  throw new Error('los roles A, B, C y ADMIN no son cuatro cuentas distintas');
}

// House (para los argumentos de las simulaciones y los límites de apuesta).
const { object: houseObject } = await client.getObject({ objectId: houseId, include: { json: true } });
const minBet = BigInt(houseObject.json.min_bet);

// PTBs de las simulaciones: `entry` genéricas de `duel` (typeArguments con el ID de DEFINICIÓN del `G`, V-12) y las `entry` del
// sandbox. El target es el paquete vigente (el del sandbox).
function genericTx(fn, duelId, withHouse) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${sandboxPackageId}::duel::${fn}`,
    typeArguments: [testgameTag],
    arguments: withHouse ? [tx.object(duelId), tx.object(houseId)] : [tx.object(duelId)],
  });
  return tx;
}
function playTx(duelId, next) {
  const tx = new Transaction();
  tx.moveCall({ target: `${sandboxPackageId}::testgame::play`, arguments: [tx.object(duelId), tx.pure.u8(next)] });
  return tx;
}
function settleTx(duelId, winnerIndex) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${sandboxPackageId}::testgame::settle`,
    arguments: [tx.object(duelId), tx.object(houseId), tx.pure.u8(winnerIndex)],
  });
  return tx;
}
function createTx(control) {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(minBet)]);
  tx.moveCall({
    target: `${sandboxPackageId}::testgame::create`,
    arguments: [tx.object(houseId), coin, tx.pure.option('address', null), tx.pure.u8(control)],
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
    return { sender: role, ...plain({ message: error.message, executionError: error.executionError }) };
  }
  throw new Error(`la simulación de ${expected.module}/${expected.code} no falló`);
}

// Los plazos de las partidas Active de estas simulaciones ya vencieron (las del sandbox, de 15 s) o no vencen en todo el ensayo (la de
// 7 días), así que el resultado no depende del momento de la captura.
const simulationErrors = {
  createBadControl: await simulationError('A', createTx(SANDBOX_CONTROL_8_ID + 1), { module: 'duel', code: 16 }),
  claimNotExpired: await simulationError('C', genericTx('claim_timeout', activeSevenDays.object.objectId, true), { module: 'duel', code: 14 }),
  claimBothPending: await simulationError('C', genericTx('claim_timeout', activeBothPending.object.objectId, true), { module: 'duel', code: 22 }),
  refundNotStalled: await simulationError('C', genericTx('refund_stalled', activeSevenDays.object.objectId, false), { module: 'duel', code: 23 }),
  recordMoveAfterDeadline: await simulationError('A', playTx(activeOnePending.object.objectId, 2), { module: 'duel', code: 21 }),
  recordMoveNotYourTurn: await simulationError('B', playTx(activeOnePending.object.objectId, 1), { module: 'duel', code: 20 }),
  collectNotPlayer: await simulationError('C', settleTx(activeSevenDays.object.objectId, 0), { module: 'duel', code: 24 }),
};
say(`simulationErrors: ${Object.keys(simulationErrors).length} casos`);

/**
 * Lectura del nodo de una transacción ejecutada, como la usa la app (DL-2), sin `sender` y sin `signatures`.
 */
async function executedFixture(digest) {
  const result = await client.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } });
  const transaction = { ...result[result.$kind] };
  delete transaction.signatures;
  return plain({ ...result, [result.$kind]: transaction });
}
const executed = {
  activate: await executedFixture(eventOf(activated, timedOutDuel).transactionDigest),
  recordMove: await executedFixture(turns[0].transactionDigest),
  collectAndPay: await executedFixture(eventOf(resolved, resolvedDuel).transactionDigest),
  claimTimeoutByThirdParty: await executedFixture(eventOf(timedOut, timedOutDuel).transactionDigest),
  refundStalledBothPending: await executedFixture(eventOf(expired, expiredBoth).transactionDigest),
  refundStalledOnePendingAfterGrace: await executedFixture(eventOf(expired, expiredOne).transactionDigest),
  claimNotExpiredExecuted: await executedFixture(failedClaimDigest),
  claimBothPendingExecuted: await executedFixture(failedBothDigest),
  cancelUnknownTypeArgumentExecuted: await executedFixture(failedTypeDigest),
};
say(`executed: ${Object.keys(executed).length} transacciones`);

const fixture = {
  _meta: {
    sandbox: true,
    sandboxConstants: {
      SANDBOX_CONTROL_8_ID,
      SANDBOX_CONTROL_8_TURN_MS,
      SANDBOX_CLAIM_GRACE_MS,
    },
    suiCliVersion: deployment.suiCliVersion,
    sdkVersion: await sdkVersion(),
    capturedAt: new Date().toISOString(),
    network: 'localnet',
    method: {
      sandbox:
        'v3 sandbox fuera del árbol de trabajo: git archive HEAD contracts + un módulo `testgame` mínimo con reloj (create con control, accept con `activate`, play con `record_move`, settle = `collect` + `pay`, y dos `public` solo de ensayo para el PTB del clique) + dos cambios en su copia de duel.move: el id de control 8 (SANDBOX_CONTROL_8_TURN_MS) y la gracia de refund_stalled (SANDBOX_CLAIM_GRACE_MS); upgrade por la CLI directa (Receta U). Los controles 1-7 y CLAIM_GRACE_MS de producción no cambian de valor.',
      discovery:
        'ListEvents con el literal PREFIJO <def>::duel::DuelCreated (todas las instanciaciones de G); el G del sandbox es el del módulo testgame y su paquete, el del tag',
      objects:
        'SuiGrpcClient.getObjects({ objectIds, include: { content: true, json: true, previousTransaction: true } }) de los Duel<Testgame>; content en base64 (BCS de los campos del struct)',
      events:
        "SuiGrpcClient.listEvents({ filter: { eventType: '<definingId>::duel::<Evento><<testgameDefiningId>::testgame::Testgame>' } }) ascendente (tag completo); EventEntry con bcs en base64 y sin sender",
      typeOrigins:
        'client.ledgerService.getObject({ objectId: <paquete del sandbox>, readMask: { paths: [\'package\'] } }).response.object.package.typeOrigins → { module, name, definingId } a 64 hex, ordenado por (module, name): house/game → ID original, duel/coinflip → v2, testgame → v3 (los IDs de definición difieren del paquete vigente)',
      rawListEventsPage: `client.ledgerService.listEvents crudo con el literal PREFIJO de DuelCreated, ascendente, limit 4, startCheckpoint = el del último DuelCreated<otro juego> anterior al primero del sandbox, readMask ${RAW_READ_MASK.join(', ')}: trae dos instanciaciones de G (el parser de la app ignora un G desconocido); frames con bigint → string y bytes → base64`,
      simulationErrors:
        'SimulationError real de Transaction.build({ client }) con setSender(<cuenta de la génesis del rol>), sin firmar; claim_timeout / refund_stalled genéricas con typeArguments [<definingId de testgame>::testgame::Testgame], target = paquete del sandbox; play / settle / create del sandbox. Resultado independiente del momento de la captura: las partidas Active del sandbox ya vencieron (15 s) y la de control 7 no vence. Por caso: { sender: <rol>, message, executionError }',
      executed:
        'SuiGrpcClient.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } }); effects.bcs y bcs de eventos en base64, sin sender ni signatures. Los éxitos salen del evento (DuelActivated, DuelTurn, DuelResolved, DuelTimedOut, DuelExpired); los fallos ejecutados, de previousTransaction del objeto',
      selection:
        'activeOnePending = primer Active con turn_ms 15000 y to_move 1; activeSevenDays = primer Active con turn_ms 604800000 (control 7); activeBothPending = primer Active con turn_ms 15000 y to_move 3; timedOut / resolved / pending = primero de su variante; expiredBothPending / expiredOnePending = primer Expired cuya DuelActivated tenía to_move 3 / distinto de 3 (por orden de creación). claimNotExpiredExecuted = previousTransaction de activeSevenDays (claim_timeout de C, MoveAbort duel/14); claimBothPendingExecuted = previousTransaction de activeBothPending (duel/22); cancelUnknownTypeArgumentExecuted = previousTransaction del Pending del sandbox (cancel con un typeArgument de un ID anterior a su definición: TypeArgumentError TypeNotFound)',
      roles:
        'A = creador; B = el que acepta; C = tercero (sender de los reclamos fallidos y de los reclamos y reembolsos de las simulaciones); ADMIN = dueño de la HouseCap',
    },
    note: 'SANDBOX: captura de una localnet aislada y desechable (agents.md §3) con la v3 sandbox; los tiempos (controles y gracia) NO son los de producción. Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases. Sin sender: los casos llevan el rol.',
  },
  ids: {
    sandboxPackageId,
    testgameTag,
    houseId,
    duels: {
      activeOnePending: activeOnePending.object.objectId,
      activeSevenDays: activeSevenDays.object.objectId,
      activeBothPending: activeBothPending.object.objectId,
      timedOut: timedOutDuel.object.objectId,
      expiredBothPending: expiredBoth.object.objectId,
      expiredOnePending: expiredOne.object.objectId,
      resolved: resolvedDuel.object.objectId,
      pending: pendingDuel.object.objectId,
    },
  },
  typeOrigins,
  objects: {
    activeOnePending: objectFixture(activeOnePending.object),
    activeSevenDays: objectFixture(activeSevenDays.object),
    activeBothPending: objectFixture(activeBothPending.object),
    timedOut: objectFixture(timedOutDuel.object),
    expiredBothPending: objectFixture(expiredBoth.object),
    expiredOnePending: objectFixture(expiredOne.object),
    resolved: objectFixture(resolvedDuel.object),
    pending: objectFixture(pendingDuel.object),
  },
  events: {
    duelCreated: eventFixture(createdById.get(timedOutDuel.object.objectId)),
    duelActivated: eventFixture(eventOf(activated, timedOutDuel)),
    duelTurn: eventFixture(turns[0]),
    duelResolved: eventFixture(eventOf(resolved, resolvedDuel)),
    duelTimedOut: eventFixture(eventOf(timedOut, timedOutDuel)),
    duelExpiredBothPending: eventFixture(eventOf(expired, expiredBoth)),
    duelExpiredOnePending: eventFixture(eventOf(expired, expiredOne)),
  },
  rawListEventsPage: {
    request: plain(rawRequest),
    frames: rawFrames,
  },
  simulationErrors,
  executed,
};

await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
say(`escrito contracts/fixtures/duel-clock.localnet.json (${String(rawFrames.length)} frames crudos; sandbox = true)`);
