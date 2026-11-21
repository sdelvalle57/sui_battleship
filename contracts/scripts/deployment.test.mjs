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
  buildUpgradeDeployment,
  checkConsistency,
  normalizeId,
  parseDryRunOutput,
  parsePubfile,
  parsePublishOutput,
  parsePublishedToml,
  parseTypeOriginsOutput,
  parseUpgradeDryRunOutput,
  parseUpgradeOutput,
  readFrameworkRev,
  redactAddresses,
  validateDeployment,
  validateTypeOriginsField,
  validateUpgradesField,
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
  // #73 (TASK-4) registra `upgrades` y `typeOrigins`: ya no está vacío.
  assert.deepEqual(Object.keys(OPTIONAL_FIELDS), ['upgrades', 'typeOrigins']);
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

// ---------- Upgrade (#73, TASK-4) ----------
//
// Fuentes reales (localnet aislada y desechable, CLI 1.84.0 sobre un v1 compilado con la 1.83.0):
// - `localnet-upgrade.json` y `localnet-upgrade-dry-run.json` (TASK-1a): `sui client test-upgrade` con un módulo de ensayo.
// - `localnet-upgrade-duel-coinflip.json` + `localnet-object-package.json` + `localnet-upgrade-base.deployment.json`
//   (TASK-4): el upgrade real v1 → v2 que agrega `duel` y `coinflip`, la lectura `object --json` del paquete nuevo y el
//   `record` del v1; `localnet.upgraded.deployment.json` es el json que arma el script con esas tres.
// No existe una salida real de `sui client upgrade` (testnet): la corre solo el owner. Los tests de parseo usan la forma
// de `test-upgrade` y lo dicen en el nombre (`…_with_the_test_upgrade_shape`); no afirman que sea la de testnet.
const UPGRADE_TEST_SHAPE = JSON.parse(readFixture('localnet-upgrade.json'));
const UPGRADE_DRY_RUN_TEST_SHAPE = JSON.parse(readFixture('localnet-upgrade-dry-run.json'));
const UPGRADE_DUEL = JSON.parse(readFixture('localnet-upgrade-duel-coinflip.json'));
const OBJECT_PACKAGE = JSON.parse(readFixture('localnet-object-package.json'));
const UPGRADE_BASE = JSON.parse(readFixture('localnet-upgrade-base.deployment.json'));
const UPGRADED_TEXT = readFixture('localnet.upgraded.deployment.json');
const UPGRADED = JSON.parse(UPGRADED_TEXT);

const ORIGINAL_PKG = '0x3235fb9f142718bc7b7eb878b87e45b463f91e93c5353db9425308fc234fdf36';
const UPGRADED_PKG = '0x14e041f974145b3a4d0921dda50eb43f8d9dcd6fd6c181f2cd07e025bbfc1617';
const UPGRADED_CAP = '0x4367c28e169586f024ebcf963c9e14a5516a53441885fa5108a2d2ea0a24ea84';
const UPGRADED_DIGEST = '9K1PE3EfwtutpCb3qFL4VPRwcTouffgBvwGezB6hDnB3';
const UPGRADE_META = Object.freeze({
  sourceCommit: 'ab61256275c31ba3d4050bed1e33c695159ca92a',
  suiCliVersion: '1.84.0-9dc25070cf2e',
  frameworkRev: 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
});
const DIGEST_V3 = 'GH5sBfbPhhNwiJ4uQXgzP5agEfqx6nYgtSxRuH3trKKQ';
const PKG_V3 = `0x${'c3'.repeat(32)}`;

const parsedUpgrade = () => parseUpgradeOutput(UPGRADE_DUEL);
const realTypeOrigins = () => parseTypeOriginsOutput(OBJECT_PACKAGE, { packageId: UPGRADED_PKG, packageVersion: 2 });
// Copias en memoria de `objectChanges` del upgrade real; el archivo nunca se edita.
const upgradeWithChanges = (transform, source = UPGRADE_DUEL) => {
  const copy = structuredClone(source);
  copy.objectChanges = transform(copy.objectChanges);
  return copy;
};
const objectWithTable = (transform) => {
  const copy = structuredClone(OBJECT_PACKAGE);
  copy.content.Package.type_origin_table = transform(copy.content.Package.type_origin_table);
  return copy;
};

test('parseUpgradeOutput_with_the_test_upgrade_shape: ID nuevo, versión, digest, timestamp y UpgradeCap del upgrade real', () => {
  assert.deepEqual(parseUpgradeOutput(UPGRADE_TEST_SHAPE), {
    digest: 'A4smWEU3g79gVWWfr2AxHmuom7EHFgcZb71ovmMjDneN',
    timestampMs: '1795153813508',
    packageId: '0xc2e358707175dea52a29ca7e958e1c5738cc268fe874d9803a745c332882ccfa',
    packageVersion: 2,
    upgradeCapId: '0x599718fb636381effbc379131907ab6c6facff02c4542206c41472369d713fbd',
  });
  assert.deepEqual(parsedUpgrade(), {
    digest: UPGRADED_DIGEST,
    timestampMs: '1795161810823',
    packageId: UPGRADED_PKG,
    packageVersion: 2,
    upgradeCapId: UPGRADED_CAP,
  });
});

test('parseUpgradeOutput_with_the_test_upgrade_shape no depende de la posición en objectChanges ni devuelve cuentas', () => {
  assert.deepEqual(parseUpgradeOutput(upgradeWithChanges((c) => c.reverse())), parsedUpgrade());
  const addresses = accountAddresses(UPGRADE_DUEL);
  assert.ok(addresses.size > 0);
  for (const value of allValues(parsedUpgrade())) {
    if (typeof value === 'string' && /^0x[0-9a-f]+$/.test(value)) assert.ok(!addresses.has(normalizeId(value)));
  }
});

test('parseUpgradeOutput rechaza lo que no es un upgrade registrable (sin success, sin published, dos, sin UpgradeCap mutado)', () => {
  const failed = structuredClone(UPGRADE_DUEL);
  failed.effects.status = { status: 'failure', error: 'PackageUpgradeError' };
  assert.throws(() => parseUpgradeOutput(failed), /success/);
  assert.throws(() => parseUpgradeOutput(upgradeWithChanges((c) => c.filter((x) => x.type !== 'published'))), /no trae el cambio de paquete/);
  assert.throws(
    () => parseUpgradeOutput(upgradeWithChanges((c) => [...c, structuredClone(c.find((x) => x.type === 'published'))])),
    /exactamente un objeto published y hay 2/,
  );
  assert.throws(
    () => parseUpgradeOutput(upgradeWithChanges((c) => c.filter((x) => !String(x.objectType).endsWith('::package::UpgradeCap')))),
    /UpgradeCap mutado y hay 0/,
  );
  const created = upgradeWithChanges((c) => {
    c.find((x) => String(x.objectType).endsWith('::package::UpgradeCap')).type = 'created';
    return c;
  });
  assert.throws(() => parseUpgradeOutput(created), /UpgradeCap mutado y hay 0/);
  assert.throws(() => parseUpgradeOutput({ ...structuredClone(UPGRADE_DUEL), digest: 'x' }), /digest/);
  assert.throws(() => parseUpgradeOutput({ ...structuredClone(UPGRADE_DUEL), timestampMs: undefined }), /timestampMs/);
  assert.throws(() => parseUpgradeOutput({ ...structuredClone(UPGRADE_DUEL), objectChanges: undefined }), /objectChanges/);
});

test('parseUpgradeOutput rechaza la salida de una publicación (versión 1 y sin UpgradeCap mutado)', () => {
  assert.throws(() => parseUpgradeOutput(PUBLISH), /versión del paquete inválida para un upgrade.*UpgradeCap mutado y hay 0/);
});

test('parseUpgradeDryRunOutput_with_the_test_upgrade_shape: ok, gas estimado y los IDs simulados', () => {
  const result = parseUpgradeDryRunOutput(UPGRADE_DRY_RUN_TEST_SHAPE);
  assert.equal(result.ok, true);
  assert.equal(result.gasEstimate, 46_600_163n);
  assert.deepEqual(result.created, {
    packageId: '0xf7e29186fda2b5426c7e3ccaf795fdd0293bc1d32eb37aff87bdbbab2707b23a',
    packageVersion: 2,
    upgradeCapId: '0x599718fb636381effbc379131907ab6c6facff02c4542206c41472369d713fbd',
  });
  const failed = structuredClone(UPGRADE_DRY_RUN_TEST_SHAPE);
  failed.effects.status = { status: 'failure', error: 'IncompatibleUpgrade' };
  assert.equal(parseUpgradeDryRunOutput(failed).ok, false);
  const noPackage = structuredClone(UPGRADE_DRY_RUN_TEST_SHAPE);
  noPackage.objectChanges = noPackage.objectChanges.filter((x) => x.type !== 'published');
  assert.equal(parseUpgradeDryRunOutput(noPackage).ok, false);
  assert.throws(() => parseUpgradeDryRunOutput({ ...structuredClone(UPGRADE_DRY_RUN_TEST_SHAPE), effects: {} }), /gasUsed/);
});

// ----- typeOrigins desde `sui client --json object <paquete>` (hueco 1; fixture capturada en el smoke) -----

test('parseTypeOriginsOutput (fixture real de object --json): 24 tipos con IDs a 64 hex, house y game en el original', () => {
  const origins = realTypeOrigins();
  assert.equal(origins.length, 24);
  assert.ok(origins.every((o) => /^0x[0-9a-f]{64}$/.test(o.definingId)));
  const byPair = Object.fromEntries(origins.map((o) => [`${o.module}::${o.name}`, o.definingId]));
  for (const pair of ['house::House', 'house::HouseCap', 'game::Game', 'game::GameResolved']) {
    assert.equal(byPair[pair], ORIGINAL_PKG, pair);
  }
  for (const pair of ['duel::Duel', 'duel::Collected', 'duel::DuelState', 'coinflip::Coinflip']) {
    assert.equal(byPair[pair], UPGRADED_PKG, pair);
  }
  assert.equal(origins.filter((o) => o.definingId === UPGRADED_PKG).length, 11);
  assert.equal(origins.filter((o) => o.definingId === ORIGINAL_PKG).length, 13);
});

test('parseTypeOriginsOutput: ordenado por (módulo, nombre) con texto plano y determinista (dos corridas, mismo resultado)', () => {
  const origins = realTypeOrigins();
  const keys = origins.map((o) => `${o.module}\u0000${o.name}`);
  assert.deepEqual(keys, keys.toSorted());
  assert.deepEqual(realTypeOrigins(), origins);
  assert.equal(JSON.stringify(realTypeOrigins()), JSON.stringify(origins));
  // La tabla cruda de la CLI NO viene ordenada: el orden sale del parser, no de la salida.
  const raw = OBJECT_PACKAGE.content.Package.type_origin_table.map((e) => `${e.module_name}\u0000${e.datatype_name}`);
  assert.notDeepEqual(raw, raw.toSorted());
  // Un orden de entrada distinto da el mismo json.
  const reversed = objectWithTable((t) => t.toReversed());
  assert.deepEqual(parseTypeOriginsOutput(reversed, { packageId: UPGRADED_PKG, packageVersion: 2 }), origins);
});

test('parseTypeOriginsOutput: un ID no normalizado (corto, mayúsculas) se normaliza a 0x + 64 hex', () => {
  const messy = objectWithTable((t) => {
    t[0].package = '0X2';
    t[1].package = ORIGINAL_PKG.toUpperCase().replace('0X', '0x');
    return t;
  });
  const origins = parseTypeOriginsOutput(messy, { packageId: UPGRADED_PKG });
  const find = (name) => origins.find((o) => o.module === 'house' && o.name === name);
  assert.equal(find('House').definingId, `0x${'0'.repeat(63)}2`);
  assert.equal(find('HouseCap').definingId, ORIGINAL_PKG);
});

test('parseTypeOriginsOutput: tabla vacía, ausente, entrada mal formada, par repetido, paquete o versión ajenos ⇒ mensaje claro', () => {
  const opts = { packageId: UPGRADED_PKG, packageVersion: 2 };
  assert.throws(() => parseTypeOriginsOutput(objectWithTable(() => []), opts), /type_origin_table.*vacía/);
  const noTable = structuredClone(OBJECT_PACKAGE);
  delete noTable.content.Package.type_origin_table;
  assert.throws(() => parseTypeOriginsOutput(noTable, opts), /no trae content\.Package\.type_origin_table/);
  const noContent = structuredClone(OBJECT_PACKAGE);
  delete noContent.content;
  assert.throws(() => parseTypeOriginsOutput(noContent, opts), /no trae content\.Package/);
  assert.throws(() => parseTypeOriginsOutput({ ...structuredClone(OBJECT_PACKAGE), objType: '0x2::coin::Coin' }, opts), /no es un paquete/);
  assert.throws(() => parseTypeOriginsOutput(null, opts), /no es un paquete/);
  assert.throws(
    () => parseTypeOriginsOutput(objectWithTable((t) => [...t, { module_name: 'house' }]), opts),
    /type_origin_table\[24\] mal formada/,
  );
  assert.throws(
    () => parseTypeOriginsOutput(objectWithTable((t) => [...t, structuredClone(t[0])]), opts),
    /repite el par \(módulo, nombre\) house::House/,
  );
  assert.throws(() => parseTypeOriginsOutput(OBJECT_PACKAGE, { packageId: ORIGINAL_PKG }), /es de otro paquete/);
  assert.throws(() => parseTypeOriginsOutput(OBJECT_PACKAGE, { packageId: UPGRADED_PKG, packageVersion: 3 }), /versión del paquete leído \(2\)/);
});

test('parseTypeOriginsOutput: dos tipos del mismo módulo con definingId distintos se conservan (S-2)', () => {
  const extended = objectWithTable((t) => [
    ...t,
    { module_name: 'game', datatype_name: 'GameExtra', package: UPGRADED_PKG },
  ]);
  const origins = parseTypeOriginsOutput(extended, { packageId: UPGRADED_PKG, packageVersion: 2 });
  const game = origins.filter((o) => o.module === 'game');
  assert.equal(game.find((o) => o.name === 'Game').definingId, ORIGINAL_PKG);
  assert.equal(game.find((o) => o.name === 'GameExtra').definingId, UPGRADED_PKG);
  assert.equal(origins.length, 25);
});

// ----- buildUpgradeDeployment -----

test('buildUpgradeDeployment: el upgrade real sobre el despliegue base da exactamente el json de la fixture', () => {
  assert.deepEqual(validateDeployment(UPGRADE_BASE), []);
  const deployment = buildUpgradeDeployment({
    base: UPGRADE_BASE,
    parsed: parsedUpgrade(),
    typeOrigins: realTypeOrigins(),
    ...UPGRADE_META,
  });
  assert.equal(`${JSON.stringify(deployment, null, 2)}\n`, UPGRADED_TEXT);
  assert.deepEqual(validateDeployment(deployment), []);
  assert.deepEqual(Object.keys(deployment), [...DEPLOYMENT_FIELDS, 'upgrades', 'typeOrigins']);
});

test('buildUpgradeDeployment: solo cambian los campos de "versión vigente"; la publicación original no se toca', () => {
  const deployment = UPGRADED;
  const changed = DEPLOYMENT_FIELDS.filter((k) => deployment[k] !== UPGRADE_BASE[k]);
  assert.deepEqual(changed, ['packageId', 'packageVersion', 'sourceCommit', 'suiCliVersion', 'frameworkRev']);
  for (const key of ['originalPackageId', 'upgradeCapId', 'houseId', 'houseCapId', 'publishTxDigest', 'publishTimestamp', 'chainId']) {
    assert.equal(deployment[key], UPGRADE_BASE[key], key);
  }
  assert.equal(deployment.publishTxDigest, 'HP5TN8bVeECsZiTwiWjsxFxXNQDcb45wnhiHZ9Fn2hYC');
  assert.deepEqual(deployment.upgrades, [{ version: 2, packageId: UPGRADED_PKG, txDigest: UPGRADED_DIGEST }]);
});

test('SEG-3: el json del upgrade no trae ninguna dirección de cuenta de la salida de la CLI', () => {
  const addresses = accountAddresses(UPGRADE_DUEL);
  assert.ok(addresses.size > 0);
  for (const value of allValues(UPGRADED)) {
    if (typeof value === 'string' && /^0x[0-9a-f]+$/.test(value)) assert.ok(!addresses.has(normalizeId(value)), value);
  }
});

test('buildUpgradeDeployment: un segundo upgrade (v2 → v3) suma una entrada y reemplaza typeOrigins', () => {
  const parsed = { digest: DIGEST_V3, timestampMs: '1', packageId: PKG_V3, packageVersion: 3, upgradeCapId: UPGRADED_CAP };
  const typeOrigins = [...realTypeOrigins(), { module: 'zz', name: 'Nuevo', definingId: PKG_V3 }];
  const third = buildUpgradeDeployment({ base: UPGRADED, parsed, typeOrigins, ...UPGRADE_META });
  assert.equal(third.packageVersion, 3);
  assert.equal(third.packageId, PKG_V3);
  assert.deepEqual(third.upgrades, [
    { version: 2, packageId: UPGRADED_PKG, txDigest: UPGRADED_DIGEST },
    { version: 3, packageId: PKG_V3, txDigest: DIGEST_V3 },
  ]);
  assert.deepEqual(validateDeployment(third), []);
});

test('buildUpgradeDeployment: versión que no es la siguiente (p. ej. registrar dos veces el mismo upgrade) o UpgradeCap ajeno ⇒ error', () => {
  const args = { base: UPGRADE_BASE, parsed: parsedUpgrade(), typeOrigins: realTypeOrigins(), ...UPGRADE_META };
  assert.throws(() => buildUpgradeDeployment({ ...args, base: UPGRADED }), /es la versión 2 y el despliegue base está en la 2 \(se esperaba la 3\)/);
  assert.throws(
    () => buildUpgradeDeployment({ ...args, parsed: { ...parsedUpgrade(), packageVersion: 3 } }),
    /se esperaba la 2/,
  );
  assert.throws(
    () => buildUpgradeDeployment({ ...args, parsed: { ...parsedUpgrade(), upgradeCapId: ORIGINAL_PKG } }),
    /UpgradeCap que avanzó el upgrade no es el upgradeCapId/,
  );
});

// ----- validateDeployment: upgrades y typeOrigins -----

const withFields = (changes) => ({ ...structuredClone(UPGRADED), ...changes });
const errorsOf = (deployment) => validateDeployment(deployment).join(' | ');

test('validateDeployment acepta el testnet.json actual (sin upgrades ni typeOrigins, packageVersion 1) y el json real del upgrade', () => {
  const current = JSON.parse(readFileSync(new URL('../deployments/testnet.json', import.meta.url), 'utf8'));
  assert.equal(current.packageVersion, 1);
  assert.ok(!('upgrades' in current) && !('typeOrigins' in current));
  assert.deepEqual(validateDeployment(current), []);
  assert.deepEqual(validateDeployment(UPGRADED), []);
  // Con packageVersion 1, los campos nuevos son opcionales: typeOrigins solo (todo en el original) y upgrades vacío valen.
  const v1Origins = UPGRADE_BASE;
  assert.deepEqual(validateDeployment({ ...v1Origins, upgrades: [] }), []);
  const originalOnly = realTypeOrigins().map((o) => ({ ...o, definingId: ORIGINAL_PKG }));
  assert.deepEqual(validateDeployment({ ...v1Origins, typeOrigins: originalOnly }), []);
});

test('validateDeployment: con packageVersion > 1, upgrades y typeOrigins son obligatorios', () => {
  const noUpgrades = structuredClone(UPGRADED);
  delete noUpgrades.upgrades;
  assert.match(errorsOf(noUpgrades), /upgrades es obligatorio con packageVersion > 1 \(2\)/);
  const noOrigins = structuredClone(UPGRADED);
  delete noOrigins.typeOrigins;
  assert.match(errorsOf(noOrigins), /typeOrigins es obligatorio con packageVersion > 1 \(2\)/);
  assert.match(errorsOf(withFields({ upgrades: [] })), /upgrades vacío con packageVersion 2/);
});

test('validateDeployment rechaza upgrades mal formado', () => {
  const entry = UPGRADED.upgrades[0];
  const cases = [
    ['no es un arreglo', {}, /upgrades inválido: debe ser un arreglo/],
    ['entrada que no es objeto', [1], /upgrades\[0\] debe ser un objeto/],
    ['clave desconocida', [{ ...entry, sender: '0x1' }], /clave desconocida sender/],
    ['falta txDigest', [{ version: 2, packageId: UPGRADED_PKG }], /falta txDigest/],
    ['version que no arranca en 2', [{ ...entry, version: 1 }], /upgrades\[0\]\.version debe ser 2/],
    ['version no entera', [{ ...entry, version: '2' }], /upgrades\[0\]\.version debe ser 2/],
    ['no consecutivo', [entry, { version: 4, packageId: PKG_V3, txDigest: DIGEST_V3 }], /upgrades\[1\]\.version debe ser 3/],
    ['packageId corto', [{ ...entry, packageId: '0x2' }], /upgrades\[0\]\.packageId debe ser 0x \+ 64 hex/],
    ['txDigest inválido', [{ ...entry, txDigest: 'no-es-digest' }], /upgrades\[0\]\.txDigest/],
    ['packageId repetido', [entry, { version: 3, packageId: UPGRADED_PKG, txDigest: DIGEST_V3 }], /upgrades\[1\]\.packageId repetido/],
  ];
  for (const [name, upgrades, expected] of cases) assert.match(errorsOf(withFields({ upgrades })), expected, name);
  assert.equal(validateUpgradesField(UPGRADED.upgrades), null);
});

test('validateDeployment rechaza typeOrigins mal formado', () => {
  const entry = UPGRADED.typeOrigins[0];
  const cases = [
    ['no es un arreglo', 'x', /typeOrigins inválido: debe ser un arreglo/],
    ['vacío', [], /no puede estar vacío/],
    ['entrada que no es objeto', [null], /typeOrigins\[0\] debe ser un objeto/],
    ['clave desconocida', [{ ...entry, owner: '0x1' }], /clave desconocida owner/],
    ['falta definingId', [{ module: 'house', name: 'House' }], /falta definingId/],
    ['módulo que no es identificador', [{ ...entry, module: 'a::b' }], /\.module debe ser un identificador/],
    ['nombre vacío', [{ ...entry, name: '' }], /\.name debe ser un identificador/],
    ['definingId sin normalizar', [{ ...entry, definingId: '0x2' }], /definingId debe ser 0x \+ 64 hex/],
  ];
  for (const [name, typeOrigins, expected] of cases) assert.match(errorsOf(withFields({ typeOrigins })), expected, name);
  assert.equal(validateTypeOriginsField(UPGRADED.typeOrigins), null);
});

test('validateDeployment: un par (módulo, nombre) repetido rechaza; dos entradas del mismo módulo con definingId distintos se aceptan (S-2)', () => {
  const origins = structuredClone(UPGRADED.typeOrigins);
  const repeated = [...origins, { ...origins[0], definingId: UPGRADED_PKG }];
  assert.match(errorsOf(withFields({ typeOrigins: repeated })), /el par \(módulo, nombre\) \w+::\w+ está repetido/);
  const sameModule = [
    ...origins,
    { module: 'game', name: 'GameExtra', definingId: UPGRADED_PKG },
  ];
  assert.deepEqual(validateDeployment(withFields({ typeOrigins: sameModule })), []);
  const game = sameModule.filter((o) => o.module === 'game');
  assert.notEqual(new Set(game.map((o) => o.definingId)).size, 1);
});

test('validateDeployment: un definingId ajeno, o un tipo de house/game con otro ID, rechaza', () => {
  const origins = structuredClone(UPGRADED.typeOrigins);
  const replace = (module, name, definingId) =>
    origins.map((o) => (o.module === module && o.name === name ? { ...o, definingId } : o));
  assert.match(
    errorsOf(withFields({ typeOrigins: replace('duel', 'Duel', `0x${'ee'.repeat(32)}`) })),
    /typeOrigins duel::Duel: definingId .* no es el originalPackageId ni el de un upgrade/,
  );
  // Un ID de upgrade válido, pero en un tipo de house o de game que existe desde la v1: deben llevar el original.
  assert.match(
    errorsOf(withFields({ typeOrigins: replace('house', 'House', UPGRADED_PKG) })),
    /typeOrigins house::House: los tipos de la v1 llevan el originalPackageId/,
  );
  assert.match(
    errorsOf(withFields({ typeOrigins: replace('game', 'GameState', UPGRADED_PKG) })),
    /typeOrigins game::GameState: los tipos de la v1 llevan el originalPackageId/,
  );
  // Un definingId que sí es un upgrade pero que el json no registra en upgrades.
  assert.match(errorsOf(withFields({ upgrades: [{ version: 2, packageId: PKG_V3, txDigest: UPGRADED_DIGEST }], packageId: PKG_V3 })), /definingId/);
  // Sin alguno de los 13 tipos de la v1 la tabla está truncada.
  assert.match(errorsOf(withFields({ typeOrigins: origins.filter((o) => !(o.module === 'house' && o.name === 'House')) })), /typeOrigins sin house::House \(tipo de la v1\)/);
  assert.match(errorsOf(withFields({ typeOrigins: origins.filter((o) => !(o.module === 'game' && o.name === 'GameState')) })), /typeOrigins sin game::GameState \(tipo de la v1\)/);
});

test('validateDeployment: upgrades no consecutivo, último packageId ≠ packageId o última versión ≠ packageVersion rechazan', () => {
  assert.match(errorsOf(withFields({ packageId: PKG_V3 })), /el último upgrade \(0x14e0.*\) ≠ packageId/);
  assert.match(errorsOf(withFields({ packageVersion: 3 })), /el último upgrade \(version 2\) ≠ packageVersion \(3\)/);
  const gap = [UPGRADED.upgrades[0], { version: 4, packageId: PKG_V3, txDigest: DIGEST_V3 }];
  assert.match(errorsOf(withFields({ upgrades: gap, packageId: PKG_V3, packageVersion: 4 })), /upgrades\[1\]\.version debe ser 3/);
  // Con packageVersion 1 un upgrade registrado no coincide.
  assert.match(errorsOf({ ...UPGRADE_BASE, upgrades: UPGRADED.upgrades }), /el último upgrade \(version 2\) ≠ packageVersion \(1\)/);
  // El paquete de un upgrade no puede ser el original.
  assert.match(
    errorsOf(withFields({ upgrades: [{ ...UPGRADED.upgrades[0], packageId: ORIGINAL_PKG }], packageId: ORIGINAL_PKG })),
    /un upgrade no puede tener el originalPackageId como packageId/,
  );
});

// ----- Published.toml de un upgrade y pubfile efímero -----

// `Published.toml` en el formato real de `sui client publish` (`[published.<red>]`), armado en memoria.
const publishedTomlText = ({ network, chainId, publishedAt, originalId, version, toolchain, cap }) =>
  [
    '# Generated by Move',
    '# This file contains metadata about published versions of this package in different environments',
    '# This file SHOULD be committed to source control',
    '',
    `[published.${network}]`,
    `chain-id = "${chainId}"`,
    `published-at = "${publishedAt}"`,
    `original-id = "${originalId}"`,
    `version = ${version}`,
    `toolchain-version = "${toolchain}"`,
    'build-config = { flavor = "sui", edition = "2024" }',
    `upgrade-capability = "${cap}"`,
    '',
  ].join('\n');

test('checkConsistency_with_the_test_upgrade_shape: Published.toml de un upgrade (versión 2) coincide; el viejo no', () => {
  // Forma de `test-upgrade` (la única medida): published-at, version y toolchain-version cambian; el resto no.
  const before = parsePublishedToml(
    publishedTomlText({
      network: 'localnet', chainId: '13c5acea', publishedAt: ORIGINAL_PKG, originalId: ORIGINAL_PKG,
      version: 1, toolchain: '1.83.0', cap: UPGRADED_CAP,
    }),
  ).get('localnet');
  const after = parsePublishedToml(
    publishedTomlText({
      network: 'localnet', chainId: '13c5acea', publishedAt: UPGRADED_PKG, originalId: ORIGINAL_PKG,
      version: 2, toolchain: '1.84.0', cap: UPGRADED_CAP,
    }),
  ).get('localnet');
  assert.deepEqual(checkConsistency(UPGRADED, after), []);
  assert.deepEqual(checkConsistency(UPGRADE_BASE, before), []);
  // El json del upgrade contra el Published.toml viejo (la CLI no lo reescribió): packageId y version difieren.
  const stale = checkConsistency(UPGRADED, before);
  assert.equal(stale.length, 2, JSON.stringify(stale));
  assert.ok(stale[0].startsWith('packageId ('));
  assert.ok(stale[1].startsWith('packageVersion (2) ≠ version'));
});

test('parsePubfile_with_the_test_upgrade_shape: el pubfile efímero antes y después de test-upgrade', () => {
  const before = parsePubfile(readFixture('Published.upgrade-before.localnet.toml'));
  assert.equal(before.chainId, '7b8ba4f1');
  assert.deepEqual(before.entries, [
    {
      sourceLocal: '<SMOKE_DIR>/v1/contracts',
      publishedAt: '0xb622ea17e78ed309ca071bfde55c8ab5829871730660f5394e0b6f5c28bce152',
      originalId: '0xb622ea17e78ed309ca071bfde55c8ab5829871730660f5394e0b6f5c28bce152',
      version: 1,
      upgradeCapability: '0x599718fb636381effbc379131907ab6c6facff02c4542206c41472369d713fbd',
    },
  ]);
  const after = parsePubfile(readFixture('Published.upgrade.localnet.toml'));
  assert.equal(after.entries.length, 1);
  assert.equal(after.entries[0].version, 2);
  assert.equal(after.entries[0].publishedAt, '0xc2e358707175dea52a29ca7e958e1c5738cc268fe874d9803a745c332882ccfa');
  const copy = parsePubfile(readFixture('Published.upgrade-base.localnet.toml'));
  assert.equal(copy.entries[0].sourceLocal, '<REPO>/contracts');
  assert.equal(copy.entries[0].publishedAt, UPGRADE_BASE.packageId);
  assert.equal(copy.entries[0].upgradeCapability, UPGRADE_BASE.upgradeCapId);
  assert.equal(copy.chainId, UPGRADE_BASE.chainId);
});

test('parsePubfile rechaza una entrada incompleta o una línea que no entiende, con su número', () => {
  const text = readFixture('Published.upgrade-base.localnet.toml');
  assert.throws(() => parsePubfile(text.replace(/^upgrade-capability.*$/m, '')), /^Error: pubfile:8: \[\[published\]\] sin upgradeCapability$/);
  assert.throws(() => parsePubfile(text.replace(/^source = .*$/m, 'source = { git = "x" }')), /sin sourceLocal/);
  assert.throws(() => parsePubfile(`${text}\nbasura\n`), /^Error: pubfile:\d+: línea inesperada: basura$/);
  assert.throws(() => parsePubfile(text.replace('version = 1', 'version = 1.0')), /version debe ser un entero/);
  assert.throws(() => parsePubfile(text.replace('published-at = "', 'published-at = "x" "')), /published-at debe ser un texto entre comillas/);
  assert.throws(() => parsePubfile(text.replace('chain-id = "13c5acea"', 'chain-id = 13c5acea')), /chain-id debe ser un texto/);
  assert.deepEqual(parsePubfile('').entries, []);
  assert.throws(() => parsePubfile(null), /se esperaba texto/);
});
