// Captura la fixture real del panel de la House (#14, TASK-1) desde la localnet aislada de `agents.md` §3: detección del
// `HouseCap` por `listOwnedObjects` (S-1), las transacciones de admin ejecutadas (S-4), los aborts de `house` en la
// simulación (S-3), la preflight sin el cap (S-5), el objeto `HouseCap` y la House después del retiro.
//
// Uso (dentro de la localnet aislada, génesis nueva y publicación variante B, con `app.env` cargado):
//   node app/scripts/capture-house-fixtures.mjs [--url http://127.0.0.1:9000]
//
// Antes, estas transacciones por CLI, **en este orden** y con el cap en `ADMIN` todo el tiempo (el que publicó):
//   1. `ADMIN`: `update_fee_rate` 250;
//   2. `ADMIN`: `update_bet_limits` 2000000 10000000000;
//   3. `A` crea una partida abierta de 200000000 (dentro de los límites nuevos);
//   4. `B` la acepta (comisión 10000000 a la House);
//   5. `ADMIN`: `withdraw_fees` + `TransferObjects` a sí mismo en una PTB (la House queda con `fees_collected` 0).
// Nada más: ni otra partida, ni otra transacción de admin, ni `transfer_house_cap` (S-2 va después de la captura).
//
// Solo acepta la localnet en `http://127.0.0.1:9000` (guarda compartida `localnet-guard.mjs`): con cualquier otra URL
// sale con código 2 **antes** de importar el SDK o hacer pedidos. Lee `contracts/deployments/localnet.json`, exige que
// el chain id del nodo coincida y escribe `contracts/fixtures/house-admin.localnet.json`. **Solo lee y simula**: las
// simulaciones no firman (`setSender` con una cuenta de la génesis y `build({ client })`). Las direcciones e IDs del
// archivo son de cuentas efímeras de una génesis desechable; ninguna clave. Sin `sender`: los casos llevan el rol
// (`ADMIN`, `A`).
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-house-fixtures');

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { SuiGrpcClient } = await import('@mysten/sui/grpc');
const { SimulationError } = await import('@mysten/sui/client');
const { Transaction } = await import('@mysten/sui/transactions');
const { fromBase58, normalizeStructTag, normalizeSuiAddress, toBase64, toHex } = await import('@mysten/sui/utils');

const say = (line) => process.stdout.write(`${line}\n`);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deploymentPath = join(repoRoot, 'contracts', 'deployments', 'localnet.json');
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'house-admin.localnet.json');
const STEPS_HINT = 'correr antes los pasos del handoff (TASK-1 de #14, encabezado de este script)';

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

const sameAddress = (a, b) => normalizeSuiAddress(a) === normalizeSuiAddress(b);

const deployment = JSON.parse(await readFile(deploymentPath, 'utf8'));
const { packageId, originalPackageId, houseId, houseCapId } = deployment;
const client = new SuiGrpcClient({ network: 'localnet', baseUrl: url });

const { response: serviceInfo } = await client.ledgerService.getServiceInfo({});
const nodeChainId = toHex(fromBase58(serviceInfo.chainId)).slice(0, 8);
assertDeployment(deployment, nodeChainId);
say(`nodo ${url}, chain id ${nodeChainId} = despliegue`);

/** Todos los eventos de un tipo del paquete, en orden ascendente (localnet: sin poda ni cota necesaria). */
async function allEvents(module, name) {
  const eventType = `${originalPackageId}::${module}::${name}`;
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

/** El único evento de un tipo; aborta si no hay o si hay más de uno (la red no es la de los pasos del handoff). */
async function onlyEvent(module, name) {
  const events = await allEvents(module, name);
  if (events.length !== 1) throw new Error(`hay ${events.length} eventos ${module}::${name} (se espera 1): ${STEPS_HINT}`);
  return events[0];
}

// Roles (direcciones efímeras de la génesis; nunca se escriben en la fixture): ADMIN = dueño del cap, A = creador de la
// única partida, B = el que la aceptó.
const { object: capOwnerRead } = await client.getObject({ objectId: houseCapId });
if (capOwnerRead.owner?.$kind !== 'AddressOwner') throw new Error(`el HouseCap no es de una dirección: ${STEPS_HINT}`);
const roleAdmin = capOwnerRead.owner.AddressOwner;
const gameCreated = await onlyEvent('game', 'GameCreated');
const gameResolved = await onlyEvent('game', 'GameResolved');
const roles = { ADMIN: roleAdmin, A: gameCreated.json.creator, B: gameResolved.json.acceptor };
if (new Set(Object.values(roles).map((a) => normalizeSuiAddress(a))).size !== 3) {
  throw new Error(`ADMIN (dueño del HouseCap), A (creador) y B (aceptante) no son tres cuentas distintas: ${STEPS_HINT}`);
}

// S-4 (lectura): las tres transacciones de admin, por sus eventos. Las tres las firmó el dueño actual del cap: si el cap
// cambió de manos (S-2 antes de la captura), el remitente no coincide.
const adminEvents = {
  updateFeeRate: await onlyEvent('house', 'FeeRateUpdated'),
  updateBetLimits: await onlyEvent('house', 'BetLimitsUpdated'),
  withdrawFees: await onlyEvent('house', 'FeesWithdrawn'),
};
for (const [name, event] of Object.entries(adminEvents)) {
  if (!sameAddress(event.sender, roleAdmin)) {
    throw new Error(`${name} no lo firmó el dueño actual del HouseCap: el cap no está en ADMIN; ${STEPS_HINT}`);
  }
}
say(`roles: ADMIN, A y B distintos; ${Object.keys(adminEvents).length} transacciones de admin de ADMIN`);

// S-1: detección del cap por dueño y tipo exacto, con la forma que usa `fetchHouseCap` (TASK-2).
const capType = normalizeStructTag(`${originalPackageId}::house::HouseCap`);
async function capListing(owner, limit) {
  const page = await client.listOwnedObjects({ owner, type: capType, limit, include: { content: true } });
  return plain({ objects: page.objects, hasNextPage: page.hasNextPage, cursor: page.cursor });
}
const houseCapListing = {
  admin: await capListing(roles.ADMIN, 2),
  nonOwner: await capListing(roles.A, 2),
  adminLimit1: await capListing(roles.ADMIN, 1),
};
if (houseCapListing.admin.objects.length !== 1 || houseCapListing.admin.objects[0].objectId !== houseCapId) {
  throw new Error(
    `listOwnedObjects(ADMIN, HouseCap) devolvió ${houseCapListing.admin.objects.length} objetos ` +
      `(hasNextPage ${houseCapListing.admin.hasNextPage}) en vez del cap: el nodo no filtra por tipo (STOP de TASK-1)`,
  );
}
if (houseCapListing.nonOwner.objects.length !== 0) {
  throw new Error(`listOwnedObjects(A, HouseCap) devolvió ${houseCapListing.nonOwner.objects.length} objetos (STOP de TASK-1)`);
}
say(
  `houseCapListing: admin ${houseCapListing.admin.objects.length} (hasNextPage ${houseCapListing.admin.hasNextPage}), ` +
    `nonOwner ${houseCapListing.nonOwner.objects.length}, adminLimit1 ${houseCapListing.adminLimit1.objects.length} ` +
    `(hasNextPage ${houseCapListing.adminLimit1.hasNextPage}, cursor ${houseCapListing.adminLimit1.cursor === null ? 'null' : 'presente'})`,
);

// PTBs con la forma de los builders de TASK-2 (el script no importa `app/src/`).
function updateFeeRateTx(feeRate) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::house::update_fee_rate`,
    arguments: [tx.object(houseId), tx.object(houseCapId), tx.pure.u16(feeRate)],
  });
  return tx;
}
function updateBetLimitsTx(minBet, maxBet) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::house::update_bet_limits`,
    arguments: [tx.object(houseId), tx.object(houseCapId), tx.pure.u64(minBet), tx.pure.u64(maxBet)],
  });
  return tx;
}
/** Retiro con exactamente 2 comandos (D-4): `withdraw_fees` y `TransferObjects([Result 0], recipient)`. */
function withdrawFeesTx(recipient) {
  const tx = new Transaction();
  const [fees] = tx.moveCall({
    target: `${packageId}::house::withdraw_fees`,
    arguments: [tx.object(houseId), tx.object(houseCapId)],
  });
  tx.transferObjects([fees], tx.pure.address(recipient));
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
      throw new Error(`simulación de ${expected.module}/${expected.code}: abort inesperado (STOP de TASK-1): ${error.message}`, {
        cause: error,
      });
    }
    // `plain` omite claves `sender`: el rol se agrega después (nunca una dirección).
    return { sender: role, ...plain({ message: error.message, executionError: error.executionError }) };
  }
  throw new Error(`la simulación de ${expected.module}/${expected.code} no falló`);
}

/**
 * S-5: la preflight de una acción de admin firmada por una cuenta sin el cap. Guarda el error tal cual llega, sin exigir
 * un `MoveAbort`: el nombre de la clase, el mensaje, el `executionError` si lo trae y el código gRPC de la causa si existe.
 */
async function preflightError(role, tx) {
  tx.setSender(roles[role]);
  try {
    await tx.build({ client });
  } catch (error) {
    const causeCode = error?.cause?.code;
    return {
      sender: role,
      errorName: error?.constructor?.name ?? typeof error,
      ...plain({
        message: error instanceof Error ? error.message : String(error),
        executionError: error instanceof SimulationError ? error.executionError : undefined,
        causeCode: causeCode === undefined ? undefined : String(causeCode),
      }),
    };
  }
  throw new Error(`la preflight de ${role} sin el HouseCap no falló`);
}

// S-3 y S-5.
const simulationErrors = {
  feeTooHigh: await simulationError('ADMIN', updateFeeRateTx(1001), { module: 'house', code: 0 }),
  limitsZeroMin: await simulationError('ADMIN', updateBetLimitsTx(0n, 10_000_000_000n), { module: 'house', code: 1 }),
  limitsMinAboveMax: await simulationError('ADMIN', updateBetLimitsTx(5_000_000n, 1_000_000n), { module: 'house', code: 1 }),
  withdrawNoFees: await simulationError('ADMIN', withdrawFeesTx(roles.ADMIN), { module: 'house', code: 2 }),
  nonOwnerPreflight: await preflightError('A', updateFeeRateTx(300)),
};
say(`simulationErrors: ${Object.keys(simulationErrors).length} casos; nonOwnerPreflight = ${simulationErrors.nonOwnerPreflight.errorName}`);

/**
 * Lectura del nodo de una transacción ejecutada, como la usa la app, sin `sender` y sin `signatures` (la firma de usuario
 * lleva la clave pública de la cuenta y la app no la usa).
 */
async function executedFixture(digest) {
  const result = await client.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } });
  const transaction = { ...result[result.$kind] };
  delete transaction.signatures;
  return plain({ ...result, [result.$kind]: transaction });
}
const executed = Object.fromEntries(
  await Promise.all(Object.entries(adminEvents).map(async ([name, e]) => [name, await executedFixture(e.transactionDigest)])),
);
for (const [name, result] of Object.entries(executed)) {
  if (result.$kind !== 'Transaction') throw new Error(`la transacción ${name} no es un éxito ejecutado`);
}
say(`executed: ${Object.keys(executed).length} transacciones`);

// `getObject` del cap (la forma que lee el `precheck` de TASK-4) y la House después del retiro.
const { object: capObject } = await client.getObject({ objectId: houseCapId, include: { content: true } });
const { object: houseObject } = await client.getObject({ objectId: houseId, include: { content: true, json: true } });
if (houseObject.json.fees_collected !== '0') throw new Error(`la House tiene fees_collected ${houseObject.json.fees_collected}: ${STEPS_HINT}`);

const objectFields = (o) => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: o.type });
const fixture = {
  _meta: {
    suiCliVersion: deployment.suiCliVersion,
    sdkVersion: await sdkVersion(),
    capturedAt: new Date().toISOString(),
    network: 'localnet',
    order:
      'Transacciones por CLI 1.83, en este orden y con el HouseCap en ADMIN: (1) ADMIN update_fee_rate 250; (2) ADMIN update_bet_limits 2000000 10000000000; (3) A crea una partida abierta de 200000000; (4) B la acepta (comisión 10000000); (5) ADMIN withdraw_fees + TransferObjects a sí mismo. Después, solo lecturas y simulaciones',
    method: {
      houseCapListing:
        'SuiGrpcClient.listOwnedObjects({ owner, type: normalizeStructTag(<originalPackageId>::house::HouseCap), limit, include: { content: true } }) ⇒ { objects, hasNextPage, cursor }: admin = ADMIN con limit 2; nonOwner = A con limit 2; adminLimit1 = ADMIN con limit 1',
      houseCapObject: 'SuiGrpcClient.getObject({ objectId: houseCapId, include: { content: true } }); content en base64',
      simulationErrors:
        'SimulationError real de Transaction.build({ client }) con setSender(<cuenta de la génesis del rol>), sin firmar: feeTooHigh = update_fee_rate(1001); limitsZeroMin = update_bet_limits(0, 10000000000); limitsMinAboveMax = update_bet_limits(5000000, 1000000); withdrawNoFees = withdraw_fees + TransferObjects([Result 0], ADMIN) con la House en 0. Por caso: { sender: <rol>, message, executionError }. nonOwnerPreflight = update_fee_rate(300) con setSender(A), sin el cap: el error tal cual llega { sender: <rol>, errorName, message, executionError?, causeCode? }',
      executed:
        'SuiGrpcClient.getTransaction({ digest, include: { effects: true, events: true, objectTypes: true } }) de las transacciones de admin, encontradas por el único evento FeeRateUpdated, BetLimitsUpdated y FeesWithdrawn del paquete; effects.bcs y bcs de eventos en base64, sin sender ni signatures',
      house:
        'SuiGrpcClient.getObject({ objectId: houseId, include: { content: true, json: true } }) después del retiro; content en base64 (BCS de los campos del struct)',
    },
    roles:
      'ADMIN = dueño del HouseCap (publicó; firmó las tres transacciones de admin); A = creador de la única partida (y la cuenta sin el cap de nonOwner y nonOwnerPreflight); B = el que la aceptó. Se derivan on-chain y nunca se escriben',
    note: 'Captura de una localnet aislada y desechable (agents.md §3). Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases. Sin sender: los casos llevan el rol.',
  },
  ids: { packageId, originalPackageId, houseId, houseCapId },
  houseCapListing,
  houseCapObject: plain({ ...objectFields(capObject), content: capObject.content }),
  simulationErrors,
  executed,
  house: plain({ ...objectFields(houseObject), json: houseObject.json, content: houseObject.content }),
};

await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
say('escrito contracts/fixtures/house-admin.localnet.json');
