// Captura las fixtures reales de lectura por gRPC (#10, D-20261031-01) desde la localnet aislada de `agents.md` §3.
//
// Uso (dentro de la localnet aislada, con `app.env` cargado; ver `contracts/README.md`, "Lectura desde la app"):
//   node app/scripts/capture-read-fixtures.mjs [--url http://127.0.0.1:9000]
//
// Solo acepta la localnet en `http://127.0.0.1:9000`: con cualquier otra URL sale con error **antes** de crear el
// cliente o hacer pedidos. Lee `contracts/deployments/localnet.json`, exige que el chain id del nodo coincida y escribe
// `contracts/fixtures/game-reads.localnet.json`. Las direcciones e IDs del archivo son de cuentas efímeras de una génesis
// desechable; ninguna clave. Los eventos se guardan sin `sender`.
import process from 'node:process';
import { assertDeployment, assertLocalnetUrl } from './localnet-guard.mjs';

// Guarda de URL: primera instrucción ejecutable. Nada de red ni de SDK antes de esto.
const url = assertLocalnetUrl(process.argv.slice(2), 'capture-read-fixtures');

const { readFile, writeFile, mkdir } = await import('node:fs/promises');
const { fileURLToPath } = await import('node:url');
const { dirname, join } = await import('node:path');
const { SuiGrpcClient, GrpcTypes } = await import('@mysten/sui/grpc');
const { fromBase58, toBase64, toHex } = await import('@mysten/sui/utils');

const say = (line) => process.stdout.write(`${line}\n`);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deploymentPath = join(repoRoot, 'contracts', 'deployments', 'localnet.json');
const fixturePath = join(repoRoot, 'contracts', 'fixtures', 'game-reads.localnet.json');

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
const originalPackageId = deployment.originalPackageId;
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

const gameIds = created.map((e) => e.json.game_id);
const objects = [];
for (let i = 0; i < gameIds.length; i += 50) {
  const { objects: batch } = await client.getObjects({
    objectIds: gameIds.slice(i, i + 50),
    include: { content: true, json: true, previousTransaction: true },
  });
  objects.push(...batch);
}
const objectById = new Map(objects.filter((o) => !(o instanceof Error)).map((o) => [o.objectId, o]));
const cancelledById = new Map(cancelled.map((e) => [e.json.game_id, e]));
const resolvedById = new Map(resolved.map((e) => [e.json.game_id, e]));

/** Primera partida (por orden de creación) que cumple la condición, con su `GameCreated`. */
function firstGame(predicate) {
  for (const event of created) {
    const object = objectById.get(event.json.game_id);
    if (object && predicate(object, event)) return { object, event };
  }
  throw new Error('no hay una partida de esta variante en la red: correr antes las transacciones del handoff');
}
const variant = (o) => o.json.state['@variant'];
const pendingOpen = firstGame((o) => variant(o) === 'Pending' && o.json.opponent === null);
const pendingInvite = firstGame((o) => variant(o) === 'Pending' && o.json.opponent !== null);
const byCreator = firstGame((o) => variant(o) === 'Cancelled' && cancelledById.get(o.objectId)?.json.cancelled_by === o.json.creator);
const byInvitee = firstGame((o) => variant(o) === 'Cancelled' && cancelledById.get(o.objectId)?.json.cancelled_by !== o.json.creator);
const resolvedGame = firstGame((o) => variant(o) === 'Resolved');

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
const publishTx = await transactionFixture(deployment.publishTxDigest);
const createdOpenTx = await transactionFixture(pendingOpen.event.transactionDigest);

// Un pedido crudo de ListEvents como el del lobby: GameCreated, descendente, limit 3, startCheckpoint = publicación.
const RAW_READ_MASK = ['package_id', 'module', 'event_type', 'contents', 'json', 'checkpoint', 'transaction_digest', 'event_index'];
const rawRequest = {
  readMask: { paths: RAW_READ_MASK },
  startCheckpoint: BigInt(publishTx.checkpoint),
  filter: {
    terms: [
      {
        literals: [
          {
            negated: false,
            predicate: { oneofKind: 'eventType', eventType: { eventType: `${originalPackageId}::game::GameCreated` } },
          },
        ],
      },
    ],
  },
  options: { limit: 3, ordering: GrpcTypes.Ordering.DESCENDING },
};
const rawFrames = [];
for await (const frame of client.ledgerService.listEvents(rawRequest).responses) rawFrames.push(plain(frame));

const fixture = {
  _meta: {
    suiCliVersion: deployment.suiCliVersion,
    sdkVersion: await sdkVersion(),
    capturedAt: new Date().toISOString(),
    network: 'localnet',
    method: {
      objects: 'SuiGrpcClient.getObjects({ objectIds, include: { content: true, json: true, previousTransaction: true } }); content en base64 (BCS de los campos del struct)',
      events: `SuiGrpcClient.listEvents({ filter: { eventType: '<originalPackageId>::game::<Evento>' } }) ascendente; EventEntry con bcs en base64 y sin sender`,
      transactions: 'SuiGrpcClient.getTransaction({ digest }) → { digest, timestampMs, checkpoint }',
      rawListEventsPage: `client.ledgerService.listEvents crudo: GameCreated, descendente, limit 3, startCheckpoint = checkpoint de la publicación, readMask ${RAW_READ_MASK.join(', ')} (sin sender); frames con bigint → string y bytes → base64`,
      selection: 'cada variante es la primera partida (por orden de creación) que la cumple, leída del objeto',
    },
    note: 'Captura de una localnet aislada y desechable (agents.md §3). Las direcciones e IDs son de cuentas efímeras de la génesis; sin claves ni frases.',
  },
  objects: {
    pendingOpen: objectFixture(pendingOpen.object),
    pendingInvite: objectFixture(pendingInvite.object),
    cancelledByCreator: objectFixture(byCreator.object),
    cancelledByInvitee: objectFixture(byInvitee.object),
    resolved: objectFixture(resolvedGame.object),
  },
  events: {
    gameCreatedOpen: eventFixture(pendingOpen.event),
    gameCreatedInvite: eventFixture(pendingInvite.event),
    gameCancelledByCreator: eventFixture(cancelledById.get(byCreator.object.objectId)),
    gameCancelledByInvitee: eventFixture(cancelledById.get(byInvitee.object.objectId)),
    gameResolved: eventFixture(resolvedById.get(resolvedGame.object.objectId)),
  },
  transactions: {
    gameCreatedOpen: createdOpenTx,
    publish: publishTx,
  },
  rawListEventsPage: {
    request: plain(rawRequest),
    frames: rawFrames,
  },
};

await mkdir(dirname(fixturePath), { recursive: true });
await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
say(`escrito contracts/fixtures/game-reads.localnet.json (${String(rawFrames.length)} frames crudos)`);
