// Tests de `deployment.mjs` sobre salidas reales de la Sui CLI 1.83.0 capturadas en una localnet aislada y desechable
// (`fixtures/`, TASK-1 de #7). Los valores esperados se leyeron del fixture a mano (`jq`) y van como literales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEPLOYMENT_FIELDS,
  MAINNET_CHAIN_ID,
  OPTIONAL_FIELDS,
  TESTNET_CHAIN_ID,
  buildDeployment,
  checkConsistency,
  normalizeId,
  parseDryRunOutput,
  parsePublishOutput,
  parsePublishedToml,
  readFrameworkRev,
  redactAddresses,
  validateDeployment,
} from './deployment.mjs';

const readFixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const PUBLISH = JSON.parse(readFixture('localnet-publish.json'));
const DRY_RUN = JSON.parse(readFixture('localnet-publish-dry-run.json'));
const PUBLISHED_TOML = readFixture('Published.localnet.toml');

const LOCALNET_CHAIN_ID = '87818ef5';
const PKG = '0x280be75013446e6acf6fe1291884cfd05889a12ce00e82c4f1a05b2235e2b06e';
const HOUSE = '0xbcbcb0392aad3b13aeb43a007105a1467f4d33a3f40b28aff08f72f4c4da0930';
const HOUSE_CAP = '0xd37dee147b2f38e168ad47537974ae47a244b52b7caf02545712c3f35a0bc625';
const UPGRADE_CAP = '0xc13c18241f1157574188e5c7535612099754b50d7f8a6a8a7351bb55b5d874b3';
const DIGEST = 'C8teaea3BBUvqFnAJ7WidwvBYAgE7zpNWsZ1gEkiwBCz';
const TIMESTAMP_MS = '1793631179013';
const SOURCE_COMMIT = 'eb8489d239e661c22134d5c2eea019f0a67d25db';
const SUI_CLI_VERSION = '1.83.0-16d2dc1e05ed';
const FRAMEWORK_REV = '719fb2960ccfbf9f4d33041f8ea5146d30671696'; // fixture localnet.deployment.json: registro histórico (PV 139)
const LOCK_FRAMEWORK_REV = '05ad86a3e86c522deea116f80dc2bf2309a53363'; // Move.lock del repo: piso de la PV 140 (repin de #8)

const localnetDeployment = () =>
  buildDeployment({
    network: 'localnet',
    chainId: LOCALNET_CHAIN_ID,
    parsed: parsePublishOutput(PUBLISH),
    sourceCommit: SOURCE_COMMIT,
    suiCliVersion: SUI_CLI_VERSION,
    frameworkRev: FRAMEWORK_REV,
  });
const testnetDeployment = () => ({ ...localnetDeployment(), network: 'testnet', chainId: TESTNET_CHAIN_ID });

// Copia en memoria del fixture con objectChanges transformado; el archivo nunca se edita.
const withChanges = (transform) => {
  const copy = structuredClone(PUBLISH);
  copy.objectChanges = transform(copy.objectChanges);
  return copy;
};
const isCreated = (suffix) => (c) => c.type === 'created' && c.objectType.endsWith(suffix);

// Direcciones de cuentas del fixture (sender, dueños, gas): ninguna puede llegar al json (SEG-3).
function accountAddresses(node, found = new Set()) {
  if (Array.isArray(node)) node.forEach((v) => accountAddresses(v, found));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (['sender', 'owner', 'AddressOwner', 'ObjectOwner'].includes(key) && typeof value === 'string') {
        if (/^0x[0-9a-fA-F]+$/.test(value)) found.add(normalizeId(value));
      } else accountAddresses(value, found);
    }
  }
  return found;
}
function allValues(node, out = []) {
  if (Array.isArray(node)) node.forEach((v) => allValues(v, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => allValues(v, out));
  else out.push(node);
  return out;
}

test('parsePublishOutput extrae IDs, versión, digest y timestamp del fixture real', () => {
  assert.deepEqual(parsePublishOutput(PUBLISH), {
    digest: DIGEST,
    timestampMs: TIMESTAMP_MS,
    packageId: PKG,
    packageVersion: 1,
    houseId: HOUSE,
    houseCapId: HOUSE_CAP,
    upgradeCapId: UPGRADE_CAP,
  });
});

test('parsePublishOutput no depende de la posición en objectChanges', () => {
  assert.deepEqual(parsePublishOutput(withChanges((c) => c.reverse())), parsePublishOutput(PUBLISH));
});

test('parsePublishOutput rechaza una transacción que no terminó en success', () => {
  const failed = structuredClone(PUBLISH);
  failed.effects.status = { status: 'failure', error: 'InsufficientGas' };
  assert.throws(() => parsePublishOutput(failed), /success/);
});

test('parsePublishOutput rechaza una salida sin objeto published', () => {
  assert.throws(() => parsePublishOutput(withChanges((c) => c.filter((x) => x.type !== 'published'))), /published/);
});

test('parsePublishOutput rechaza dos Houses creadas', () => {
  const twoHouses = withChanges((c) => {
    const extra = structuredClone(c.find(isCreated('::house::House')));
    extra.objectId = '0x01';
    return [...c, extra];
  });
  assert.throws(() => parsePublishOutput(twoHouses), /house::House creado y hay 2/);
});

test('parsePublishOutput rechaza una salida sin HouseCap', () => {
  assert.throws(
    () => parsePublishOutput(withChanges((c) => c.filter((x) => !isCreated('::house::HouseCap')(x)))),
    /house::HouseCap creado y hay 0/,
  );
});

test('parsePublishOutput rechaza una salida sin UpgradeCap', () => {
  assert.throws(
    () => parsePublishOutput(withChanges((c) => c.filter((x) => !isCreated('::package::UpgradeCap')(x)))),
    /0x2::package::UpgradeCap creado y hay 0/,
  );
});

test('parsePublishOutput rechaza una House de otro paquete', () => {
  const foreign = withChanges((c) => {
    c.find(isCreated('::house::House')).objectType = '0xabc::house::House';
    return c;
  });
  assert.throws(() => parsePublishOutput(foreign), /house::House creado y hay 0/);
});

test('parsePublishOutput rechaza una House no compartida', () => {
  const owned = withChanges((c) => {
    c.find(isCreated('::house::House')).owner = { AddressOwner: '0x01' };
    return c;
  });
  assert.throws(() => parsePublishOutput(owned), /Shared/);
});

test('parseDryRunOutput sobre el fixture real: ok, gas estimado y los cuatro IDs', () => {
  const result = parseDryRunOutput(DRY_RUN);
  assert.equal(result.ok, true);
  assert.ok(result.gasEstimate > 0n);
  assert.equal(result.gasEstimate, 47_246_000n);
  assert.deepEqual(result.created, {
    packageId: '0x53f46dd0e78a04dde73a51d100b2f51fa6c5ee67d773a70b500a189db8b7b2a6',
    houseId: '0x72c4f3280217f967d374a3e50f46e91b091e811cc235f260657a772c0409db07',
    houseCapId: '0x4e67a6a9739f80833ba5b40c8f51462384b294cc03848ccb231e15c0b1fc0bfa',
    upgradeCapId: '0xc307c66239d046e66868232aee1dc1a90a860308970c68b21e57ed2e7388058b',
  });
});

test('parseDryRunOutput da ok = false si el status no es success o falta un objeto', () => {
  const failed = structuredClone(DRY_RUN);
  failed.effects.status = { status: 'failure', error: 'MoveAbort' };
  assert.equal(parseDryRunOutput(failed).ok, false);
  const noCap = structuredClone(DRY_RUN);
  noCap.objectChanges = noCap.objectChanges.filter((x) => !isCreated('::house::HouseCap')(x));
  assert.equal(parseDryRunOutput(noCap).ok, false);
});

test('buildDeployment arma los 14 campos en orden y validateDeployment lo acepta', () => {
  const deployment = localnetDeployment();
  assert.deepEqual(Object.keys(deployment), [...DEPLOYMENT_FIELDS]);
  assert.equal(DEPLOYMENT_FIELDS.length, 14);
  assert.deepEqual(deployment, {
    schemaVersion: 1,
    network: 'localnet',
    chainId: LOCALNET_CHAIN_ID,
    packageId: PKG,
    originalPackageId: PKG,
    packageVersion: 1,
    upgradeCapId: UPGRADE_CAP,
    houseId: HOUSE,
    houseCapId: HOUSE_CAP,
    publishTxDigest: DIGEST,
    publishTimestamp: '2026-11-02T14:52:59.013Z',
    sourceCommit: SOURCE_COMMIT,
    suiCliVersion: SUI_CLI_VERSION,
    frameworkRev: FRAMEWORK_REV,
  });
  assert.deepEqual(validateDeployment(deployment), []);
  assert.deepEqual(validateDeployment(testnetDeployment()), []);
  assert.deepEqual(validateDeployment({ ...deployment, sourceCommit: null }), []);
});

test('SEG-3: ningún valor del json armado es una dirección de cuenta del fixture', () => {
  const addresses = accountAddresses(PUBLISH);
  assert.ok(addresses.size > 0, 'el fixture debe traer al menos el sender');
  for (const value of allValues(localnetDeployment())) {
    if (typeof value === 'string' && /^0x[0-9a-f]+$/.test(value)) {
      assert.ok(!addresses.has(normalizeId(value)), `dirección de cuenta en el json: ${value}`);
    }
  }
});

for (const field of DEPLOYMENT_FIELDS) {
  test(`validateDeployment: falta ${field}`, () => {
    const deployment = localnetDeployment();
    delete deployment[field];
    assert.ok(validateDeployment(deployment).some((e) => e.includes(`falta el campo obligatorio ${field}`)));
  });
}

const invalidCases = [
  ['clave desconocida', () => ({ ...localnetDeployment(), sender: '0x01' }), /clave desconocida: sender/],
  ['ID corto', () => ({ ...localnetDeployment(), houseId: '0x2' }), /houseId inválido/],
  ['ID en mayúsculas', () => ({ ...localnetDeployment(), packageId: PKG.toUpperCase().replace('0X', '0x') }), /packageId inválido/],
  ['testnet con chain id ajeno', () => ({ ...testnetDeployment(), chainId: LOCALNET_CHAIN_ID }), /testnet exige 4c78adac/],
  ['localnet con el chain id de testnet', () => ({ ...localnetDeployment(), chainId: TESTNET_CHAIN_ID }), /localnet no puede/],
  ['localnet con el chain id de mainnet', () => ({ ...localnetDeployment(), chainId: MAINNET_CHAIN_ID }), /localnet no puede/],
  ['sourceCommit null en testnet', () => ({ ...testnetDeployment(), sourceCommit: null }), /sourceCommit inválido/],
  ['network mainnet', () => ({ ...localnetDeployment(), network: 'mainnet' }), /network inválido/],
  ['publishTimestamp sin milisegundos', () => ({ ...localnetDeployment(), publishTimestamp: '2026-11-02T14:52:59Z' }), /publishTimestamp inválido/],
  ['publishTimestamp sin Z', () => ({ ...localnetDeployment(), publishTimestamp: '2026-11-02T14:52:59.013' }), /publishTimestamp inválido/],
];
for (const [name, make, expected] of invalidCases) {
  test(`validateDeployment rechaza: ${name}`, () => {
    const errors = validateDeployment(make());
    assert.ok(errors.some((e) => expected.test(e)), `errores: ${JSON.stringify(errors)}`);
  });
}

test('validateDeployment: opcional registrado ausente es válido y con formato malo es error', () => {
  assert.deepEqual(OPTIONAL_FIELDS, {});
  const optionalFields = {
    packageTxDigest: (v) => (typeof v === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v) ? null : 'digest base58'),
  };
  const deployment = localnetDeployment();
  assert.deepEqual(validateDeployment(deployment, { optionalFields }), []);
  assert.deepEqual(validateDeployment({ ...deployment, packageTxDigest: DIGEST }, { optionalFields }), []);
  assert.deepEqual(validateDeployment({ ...deployment, packageTxDigest: 'no-es-digest' }, { optionalFields }), [
    'packageTxDigest inválido: digest base58',
  ]);
  assert.match(validateDeployment({ ...deployment, packageTxDigest: DIGEST }).join(), /clave desconocida/);
});

test('parsePublishedToml lee cada campo del fixture real', () => {
  const entries = parsePublishedToml(PUBLISHED_TOML);
  assert.deepEqual([...entries.keys()], ['localnet']);
  assert.deepEqual(entries.get('localnet'), {
    chainId: LOCALNET_CHAIN_ID,
    publishedAt: '0x06501a59986ee126787b2e18b133737d37ee89d1ffd207f38b2ffe61b18a4ec8',
    originalId: '0x06501a59986ee126787b2e18b133737d37ee89d1ffd207f38b2ffe61b18a4ec8',
    version: 1,
    toolchainVersion: '1.83.0',
    upgradeCapability: '0xf47132acbaeb5c58715c658a84f05119bf95523dd9ea099a3d3364ce1518acbb',
  });
});

test('parsePublishedToml rechaza una línea inesperada con su número', () => {
  const lines = PUBLISHED_TOML.split('\n');
  lines.splice(5, 0, 'published-at: "0x1"');
  assert.throws(() => parsePublishedToml(lines.join('\n')), /^Error: Published\.toml:6: línea inesperada/);
  assert.throws(() => parsePublishedToml(`version = 1\n${PUBLISHED_TOML}`), /Published\.toml:1:/);
});

// Variantes en memoria del fixture, por número de línea (1-based): 5 = `[published.localnet]`, 6 = chain-id,
// 9 = version, 11 = build-config, 12 = upgrade-capability.
const tomlWithLine = (n, line) => PUBLISHED_TOML.split('\n').toSpliced(n - 1, 1, line).join('\n');
const tomlInsertingAt = (n, line) => PUBLISHED_TOML.split('\n').toSpliced(n - 1, 0, line).join('\n');
const strictTomlCases = [
  ['clave desconocida', () => tomlInsertingAt(13, 'foo = "x"'), /^Error: Published\.toml:13: clave desconocida: foo$/],
  ['clave duplicada', () => tomlInsertingAt(13, 'version = 2'), /^Error: Published\.toml:13: clave duplicada: version$/],
  [
    'sección duplicada',
    () => `${PUBLISHED_TOML}${PUBLISHED_TOML.split('\n').slice(4, 12).join('\n')}\n`,
    /^Error: Published\.toml:13: sección \[published\.localnet\] duplicada$/,
  ],
  [
    'sección incompleta',
    () => PUBLISHED_TOML.split('\n').toSpliced(11, 1).join('\n'),
    /^Error: Published\.toml:5: \[published\.localnet\] sin upgradeCapability$/,
  ],
  [
    'build-config que no es tabla en línea',
    () => tomlWithLine(11, 'build-config = "sui"'),
    /^Error: Published\.toml:11: build-config debe ser una tabla en línea$/,
  ],
  ['entero mal formado', () => tomlWithLine(9, 'version = 1.0'), /^Error: Published\.toml:9: version debe ser un entero$/],
  [
    'texto sin comillas',
    () => tomlWithLine(6, 'chain-id = 87818ef5'),
    /^Error: Published\.toml:6: chain-id debe ser un texto entre comillas$/,
  ],
];
for (const [name, make, expected] of strictTomlCases) {
  test(`parsePublishedToml rechaza: ${name}, con su número de línea`, () => {
    assert.throws(() => parsePublishedToml(make()), expected);
  });
}

test('checkConsistency: igual ⇒ [] y cada campo distinto ⇒ una diferencia', () => {
  // El TOML es el de la copia publicada en TASK-1 (D6), no el de `localnet-publish.json`: el caso coherente se arma
  // con los valores de la propia entrada.
  const entry = parsePublishedToml(PUBLISHED_TOML).get('localnet');
  const matching = {
    ...localnetDeployment(),
    packageId: entry.publishedAt,
    originalPackageId: entry.originalId,
    packageVersion: entry.version,
    upgradeCapId: entry.upgradeCapability,
    chainId: entry.chainId,
  };
  assert.deepEqual(checkConsistency(matching, entry), []);
  assert.deepEqual(checkConsistency(matching, { ...entry, publishedAt: entry.publishedAt.toUpperCase().replace('0X', '0x') }), []);
  const mutations = [
    ['packageId', { packageId: PKG }],
    ['originalPackageId', { originalPackageId: PKG }],
    ['packageVersion', { packageVersion: 2 }],
    ['upgradeCapId', { upgradeCapId: UPGRADE_CAP }],
    ['chainId', { chainId: TESTNET_CHAIN_ID }],
  ];
  for (const [field, change] of mutations) {
    const differences = checkConsistency({ ...matching, ...change }, entry);
    assert.equal(differences.length, 1, `${field}: ${JSON.stringify(differences)}`);
    assert.ok(differences[0].startsWith(`${field} (`));
  }
});

test('readFrameworkRev lee el rev de [pinned.testnet.Sui] del Move.lock del repo', () => {
  const lock = readFileSync(new URL('../Move.lock', import.meta.url), 'utf8');
  assert.equal(readFrameworkRev(lock), LOCK_FRAMEWORK_REV);
  assert.throws(() => readFrameworkRev('[pinned.testnet.MoveStdlib]\nrev = "' + 'a'.repeat(40) + '"\n'), /pinned\.testnet\.Sui/);
});

test('redactAddresses oculta direcciones y deja intactos digests y texto sin hex', () => {
  const addr = 'ab'.repeat(32);
  assert.equal(redactAddresses(`sender 0x${addr} sin fondos`), 'sender 0x… sin fondos');
  assert.equal(redactAddresses(`owner ${addr}.`), 'owner 0x….');
  assert.equal(redactAddresses(`key ${'c'.repeat(40)}`), 'key 0x…');
  assert.equal(redactAddresses(`Error executing transaction '${DIGEST}'`), `Error executing transaction '${DIGEST}'`);
  assert.equal(redactAddresses('Insufficient gas, retry later'), 'Insufficient gas, retry later');
});

test('normalizeId rellena, pasa a minúsculas y rechaza lo que no es hex', () => {
  assert.equal(normalizeId('0x2'), `0x${'0'.repeat(63)}2`);
  assert.equal(normalizeId(`0x${'AB'.repeat(32)}`), `0x${'ab'.repeat(32)}`);
  assert.throws(() => normalizeId('0xzz'), /no es hex/);
  assert.throws(() => normalizeId(`0x${'1'.repeat(65)}`), /más de 64/);
});
