// Captura las fixtures reales de LECTURA del coinflip nuevo (`Duel<Coinflip>`, #73 TASK-5) por gRPC desde la localnet aislada de
// `agents.md` §3, DESPUÉS del upgrade del script de TASK-4 (variante B: `contracts/deployments/localnet.json` con `upgrades` y
// `typeOrigins`): objetos `Duel` `Pending`/`Cancelled`/`Resolved`, sus eventos, la tabla de orígenes por lectura y páginas crudas
// de `ListEvents` como las del lobby (un literal por juego y la unión del coinflip nuevo con el anterior).
//
// Uso (dentro de la localnet aislada, con el ensayo de `contracts/README.md`, "Fixtures de `duel` (#73, TASK-5)"):
//   node app/scripts/capture-duel-reads.mjs [--url http://127.0.0.1:<puerto>]
//
// Solo acepta loopback `http://127.0.0.1:<puerto>` (1024-65535; por defecto `http://127.0.0.1:9000`; guarda compartida
// `localnet-guard.mjs`): con cualquier otra URL sale con código 2 **antes** de importar el SDK o hacer pedidos. Lee
// `contracts/deployments/localnet.json`, exige que el chain id del nodo coincida y escribe `contracts/fixtures/duel-reads.localnet.json`.
// Las direcciones e IDs del archivo son de cuentas efímeras de una génesis desechable; ninguna clave. Los eventos se guardan sin
// `sender`. **Solo producción:** ningún dato del sandbox (el juego de reloj va en `duel-clock.localnet.json`): los filtros usan el
// tag completo `DuelXxx<Coinflip>`, nunca el prefijo, y todas las selecciones son deterministas (dos capturas, mismo archivo salvo
// `_meta.capturedAt`).
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-duel-reads');

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { SuiGrpcClient, GrpcTypes } = await import('@mysten/sui/grpc');
const { fromBase58, normalizeSuiAddress, toBase64, toHex } = await import('@mysten/sui/utils');

const say = (line) => process.stdout.write(`${line}\n`);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deploymentPath = join(repoRoot, 'contracts', 'deployments', 'localnet.json');
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'duel-reads.localnet.json');

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
const { packageId, originalPackageId } = deployment;
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
const duelDef = definingId('duel', 'Duel');
const coinflipTag = `${definingId('coinflip', 'Coinflip')}::coinflip::Coinflip`;
const duelType = `${duelDef}::duel::Duel<${coinflipTag}>`;
const eventTag = (name) => `${definingId('duel', name)}::duel::${name}<${coinflipTag}>`;

// Tabla de orígenes por lectura (gRPC, independiente de la CLI que la produjo): la del paquete vigente del despliegue.
const { response: packageResponse } = await client.ledgerService.getObject({
  objectId: packageId,
  readMask: { paths: ['package'] },
});
const chainOrigins = (packageResponse.object.package.typeOrigins ?? [])
  .map((o) => ({ module: o.moduleName, name: o.datatypeName, definingId: normalizeSuiAddress(o.packageId) }))
  .sort((a, b) => (a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module)));
const deploymentOrigins = [...deployment.typeOrigins].sort((a, b) =>
  a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module),
);
if (JSON.stringify(chainOrigins) !== JSON.stringify(deploymentOrigins)) {
  throw new Error('la tabla de typeOrigins del despliegue no coincide con la de la cadena (gRPC): otra génesis o json desactualizado');
}
say(`typeOrigins: ${chainOrigins.length} tipos, deployment = cadena`);

/** Todos los eventos de un tag completo, en orden ascendente (localnet: sin poda ni cota necesaria). */
async function allEvents(name) {
  const eventType = eventTag(name);
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

const created = await allEvents('DuelCreated');
const activated = await allEvents('DuelActivated');
const cancelled = await allEvents('DuelCancelled');
const resolved = await allEvents('DuelResolved');
say(`eventos: ${created.length} DuelCreated, ${activated.length} DuelActivated, ${cancelled.length} DuelCancelled, ${resolved.length} DuelResolved`);

const duelIds = created.map((e) => e.json.duel_id);
const objects = [];
for (let i = 0; i < duelIds.length; i += 50) {
  const { objects: batch } = await client.getObjects({
    objectIds: duelIds.slice(i, i + 50),
    include: { content: true, json: true, previousTransaction: true },
  });
  objects.push(...batch);
}
const objectById = new Map(objects.filter((o) => !(o instanceof Error)).map((o) => [o.objectId, o]));
const cancelledById = new Map(cancelled.map((e) => [e.json.duel_id, e]));
const resolvedById = new Map(resolved.map((e) => [e.json.duel_id, e]));
const activatedById = new Map(activated.map((e) => [e.json.duel_id, e]));

/** Primer duelo (por orden de creación) que cumple la condición, con su `DuelCreated`. */
function firstDuel(label, predicate) {
  for (const event of created) {
    const object = objectById.get(event.json.duel_id);
    if (object && predicate(object, event)) return { object, event };
  }
  throw new Error(`no hay un duelo ${label} en la red: correr antes el ensayo de TASK-5 (coinflip nuevo)`);
}
const variant = (o) => o.json.state['@variant'];
for (const { object } of created.map((e) => ({ object: objectById.get(e.json.duel_id) }))) {
  if (object && object.type !== duelType) throw new Error(`un duelo de ${object.type} entre los DuelCreated<Coinflip>: se esperaba ${duelType}`);
}
const pendingOpen = firstDuel('abierto pendiente', (o) => variant(o) === 'Pending' && o.json.opponent === null);
const pendingInvite = firstDuel('de invitación pendiente', (o) => variant(o) === 'Pending' && o.json.opponent !== null);
const byCreator = firstDuel(
  'cancelado por su creador',
  (o) => variant(o) === 'Cancelled' && cancelledById.get(o.objectId)?.json.cancelled_by === o.json.creator,
);
const byInvitee = firstDuel(
  'rechazado por su invitado',
  (o) => variant(o) === 'Cancelled' && cancelledById.get(o.objectId)?.json.cancelled_by !== o.json.creator,
);
const wonBy = (who) => (o) => {
  const event = resolvedById.get(o.objectId);
  return variant(o) === 'Resolved' && event !== undefined && event.json.winner === o.json[who];
};
const resolvedCreatorWins = firstDuel('resuelto con victoria del creador', wonBy('creator'));
const resolvedAcceptorWins = firstDuel('resuelto con victoria del aceptante', (o) => {
  const event = resolvedById.get(o.objectId);
  return variant(o) === 'Resolved' && event !== undefined && event.json.winner === event.json.acceptor;
});

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

async function transactionFixture(digest) {
  const result = await client.getTransaction({ digest });
  const tx = result.Transaction ?? result.FailedTransaction;
  return { digest, timestampMs: tx.timestampMs, checkpoint: tx.checkpoint };
}
const upgradeTx = await transactionFixture(deployment.upgrades[0].txDigest);
const publishTx = await transactionFixture(deployment.publishTxDigest);
const createdOpenTx = await transactionFixture(pendingOpen.event.transactionDigest);

// Pedidos crudos de ListEvents como los del lobby, con el tag completo del coinflip nuevo (ID de definición, typeOrigins):
// (1) solo `DuelCreated<Coinflip>`; (2) la unión del coinflip anterior (`GameCreated`, ID original) y el nuevo, un solo pedido
// con dos literales (el filtro admite hasta 10). `startCheckpoint` = el de la publicación del v1; (1) descendente y (2) ascendente.
const RAW_READ_MASK = ['package_id', 'module', 'event_type', 'contents', 'json', 'checkpoint', 'transaction_digest', 'event_index'];
const literal = (eventType) => ({
  negated: false,
  predicate: { oneofKind: 'eventType', eventType: { eventType } },
});
async function rawPage(literals, limit, ordering) {
  const request = {
    readMask: { paths: RAW_READ_MASK },
    startCheckpoint: BigInt(publishTx.checkpoint),
    filter: { terms: literals.map((l) => ({ literals: [l] })) },
    options: { limit, ordering },
  };
  const frames = [];
  for await (const frame of client.ledgerService.listEvents(request).responses) frames.push(plain(frame));
  return { request: plain(request), frames };
}
const rawDuelCreatedPage = await rawPage([literal(eventTag('DuelCreated'))], 3, GrpcTypes.Ordering.DESCENDING);
// La unión va ascendente para que una sola página traiga las dos fuentes (las partidas anteriores son más viejas que el upgrade).
const rawUnionPage = await rawPage(
  [literal(`${originalPackageId}::game::GameCreated`), literal(eventTag('DuelCreated'))],
  10,
  GrpcTypes.Ordering.ASCENDING,
);

const fixture = {
  _meta: {
    suiCliVersion: deployment.suiCliVersion,
    sdkVersion: await sdkVersion(),
    capturedAt: new Date().toISOString(),
    network: 'localnet',
    method: {
      objects:
        'SuiGrpcClient.getObjects({ objectIds, include: { content: true, json: true, previousTransaction: true } }) de los Duel<Coinflip>; content en base64 (BCS de los campos del struct)',
      events:
        "SuiGrpcClient.listEvents({ filter: { eventType: '<definingId>::duel::<Evento><<definingId>::coinflip::Coinflip>' } }) ascendente (tag completo, IDs de definición de typeOrigins; nunca el prefijo, para no mezclar otros juegos); EventEntry con bcs en base64 y sin sender",
      transactions: 'SuiGrpcClient.getTransaction({ digest }) → { digest, timestampMs, checkpoint }',
      typeOrigins:
        'client.ledgerService.getObject({ objectId: packageId, readMask: { paths: [\'package\'] } }).response.object.package.typeOrigins → { module, name, definingId } con IDs a 64 hex, ordenado por (module, name); exigido igual a typeOrigins de deployments/localnet.json (que produjo la CLI)',
      rawListEventsPages: `client.ledgerService.listEvents crudo, startCheckpoint = checkpoint de la publicación del v1, readMask ${RAW_READ_MASK.join(', ')} (sin sender); duelCreatedOnly = un literal DuelCreated<Coinflip> (descendente, limit 3); union = dos literales en un solo pedido (GameCreated con el ID original y DuelCreated<Coinflip>; ascendente, limit 10: trae las dos fuentes); frames con bigint → string y bytes → base64`,
      selection:
        'cada variante es el primer duelo (por orden de creación) que la cumple, leída del objeto; resolvedCreatorWins / resolvedAcceptorWins = primer DuelResolved con winner = creator / acceptor',
    },
    note: 'Captura de una localnet aislada y desechable (agents.md §3), después del upgrade del script. Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases. Solo producción.',
  },
  ids: {
    packageId,
    originalPackageId,
    packageVersion: deployment.packageVersion,
    upgrades: deployment.upgrades,
    duelType,
    coinflipTag,
  },
  typeOrigins: chainOrigins,
  objects: {
    pendingOpen: objectFixture(pendingOpen.object),
    pendingInvite: objectFixture(pendingInvite.object),
    cancelledByCreator: objectFixture(byCreator.object),
    cancelledByInvitee: objectFixture(byInvitee.object),
    resolvedCreatorWins: objectFixture(resolvedCreatorWins.object),
    resolvedAcceptorWins: objectFixture(resolvedAcceptorWins.object),
  },
  events: {
    duelCreatedOpen: eventFixture(pendingOpen.event),
    duelCreatedInvite: eventFixture(pendingInvite.event),
    duelCancelledByCreator: eventFixture(cancelledById.get(byCreator.object.objectId)),
    duelCancelledByInvitee: eventFixture(cancelledById.get(byInvitee.object.objectId)),
    duelActivatedCreatorWins: eventFixture(activatedById.get(resolvedCreatorWins.object.objectId)),
    duelResolvedCreatorWins: eventFixture(resolvedById.get(resolvedCreatorWins.object.objectId)),
    duelResolvedAcceptorWins: eventFixture(resolvedById.get(resolvedAcceptorWins.object.objectId)),
  },
  transactions: {
    duelCreatedOpen: createdOpenTx,
    publish: publishTx,
    upgrade: upgradeTx,
  },
  rawListEventsPages: {
    duelCreatedOnly: rawDuelCreatedPage,
    union: rawUnionPage,
  },
};

await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
say(`escrito contracts/fixtures/duel-reads.localnet.json (${String(rawDuelCreatedPage.frames.length)} + ${String(rawUnionPage.frames.length)} frames crudos)`);
