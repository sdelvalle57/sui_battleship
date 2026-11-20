// Tests de `deployment.mjs` sobre salidas reales de la Sui CLI 1.84.0 capturadas en una localnet aislada y desechable
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

const LOCALNET_CHAIN_ID = 'cb1e492c';
const PKG = '0x8b6a8b1f648af5773e3f97e9fcc07edab93d77c165c4e1dc99c1a41ef87fd71d';
const HOUSE = '0xbf3bf8d1638985c2acc7b0b86e2563fd30ade6c45aa4532a1ffdaa8fbbeb8035';
const HOUSE_CAP = '0x95794194fad84a5f3fee87a06d88b79a3044b0f9b3bc38db3444b3e142135e7c';
const UPGRADE_CAP = '0x1ae71697a07810fb1d42b77e008bb7225bef3ffb1b65a93aca17faca3739748a';
const DIGEST = 'BVdpCHXfQ9qwEG5tABiZBeVN1qkgtiqUPhJ4GazaJYdH';
const TIMESTAMP_MS = '1795148038204';
const SOURCE_COMMIT = 'eb8489d239e661c22134d5c2eea019f0a67d25db';
const SUI_CLI_VERSION = '1.84.0-9dc25070cf2e';
const FRAMEWORK_REV = 'e6f43880f4b65e2c1f0397583a9690b4b22c9223'; // fixture localnet.deployment.json: piso de la PV 142 (recapturada en #75)
const LOCK_FRAMEWORK_REV = 'e6f43880f4b65e2c1f0397583a9690b4b22c9223'; // Move.lock del repo: piso de la PV 142 (repin de #75)

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
    packageId: '0xe8c83494b09dedd61ae4910ab9f65a04b5aefd4b2690887249a08c80f4e4ba94',
    houseId: '0x32b612672a6f79427ae028469c4bd344bb53b2c487bd7e969442a7064074cdcd',
    houseCapId: '0x606b012e49781c44d6b20f7c83dc90606f14fad8dff5e0165f599952c6564274',
    upgradeCapId: '0x05fb2d1428db3cb5c3b5c12e2068076dd73a600cde9b1ec8c1bff20edc4efa67',
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
    publishTimestamp: '2026-11-20T04:13:58.204Z',
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
    publishedAt: '0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514',
    originalId: '0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514',
    version: 1,
    toolchainVersion: '1.84.0',
    upgradeCapability: '0x32ea9b07651911fc31c4c56ce234b33d37823b8553b0f09c33d8282196f13081',
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
    () => tomlWithLine(6, 'chain-id = cb1e492c'),
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
