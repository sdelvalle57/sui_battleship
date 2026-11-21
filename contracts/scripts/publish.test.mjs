// Tests de `publish.mjs`: guardas, envoltorio de la CLI y mensajes, todo con dependencias inyectadas. Ningún test
// invoca `sui` ni git de verdad ni escribe archivos. El único proceso es `bash -n` (solo parsea, no ejecuta) en el test
// de m-2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDeployment, parsePublishOutput, validateDeployment } from './deployment.mjs';
import {
  CONTRACTS_DIR,
  EXIT,
  UsageError,
  checkCliVersion,
  checkConfigDirGuard,
  checkConfirmation,
  checkDeployments,
  checkLockUnchanged,
  checkNetworkGuard,
  checkNodeVersion,
  checkOutArg,
  checkPubfileGuard,
  checkPublishArgs,
  checkTestnetPreconditions,
  checkUpgradeBase,
  checkUpgradeChain,
  checkUpgradePreconditions,
  chainIdFromCli,
  commandRecordUpgrade,
  commandUpgrade,
  confirmationRequired,
  formatCliFailure,
  formatPostPublishFailure,
  formatPostUpgradeFailure,
  formatSummary,
  formatUpgradeSummary,
  interpretCliRun,
  isAllowedSuiArgs,
  isEntryPoint,
  main,
  parseCliArgs,
  parseUpgradeRaw,
  publishCliArgs,
  readCliJson,
  redactConfigDir,
  resolveRecordMeta,
  runGit,
  runSui,
  upgradeCliArgs,
} from './publish.mjs';

const readRepoFile = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const PUBLISH_TEXT = readRepoFile('./fixtures/localnet-publish.json');
const PUBLISH = JSON.parse(PUBLISH_TEXT);
const PUBLISHED_TOML = readRepoFile('./fixtures/Published.localnet.toml');
const DEPLOYMENT_FIXTURE_TEXT = readRepoFile('./fixtures/localnet.deployment.json');
const CI_YAML = readRepoFile('../../.github/workflows/ci.yml');

const LOCALNET_CHAIN_ID = 'cb1e492c';
const TESTNET_CHAIN_ID = '4c78adac';
const MAINNET_CHAIN_ID = '35834a8a';
// Valores fijos con los que se generó `fixtures/localnet.deployment.json` (`record`, TASK-2 §3.2).
const FIXTURE_META = Object.freeze({
  network: 'localnet',
  chainId: LOCALNET_CHAIN_ID,
  sourceCommit: '88dd53b21bc8ac4b38cf6232346edfbc2e459f28',
  suiCliVersion: '1.84.0-9dc25070cf2e',
  frameworkRev: 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
});
const CONFIG_DIR = '/srv/battleship/net';

const localnetDeployment = () => buildDeployment({ ...FIXTURE_META, parsed: parsePublishOutput(PUBLISH) });

// Direcciones de cuentas del fixture (sender y dueños) en minúsculas y sin `0x`.
const ACCOUNT_ADDRESSES = [
  ...new Set(
    [...PUBLISH_TEXT.matchAll(/"(?:sender|owner|AddressOwner|ObjectOwner)":\s*"0x([0-9a-fA-F]{64})"/g)].map((m) =>
      m[1].toLowerCase(),
    ),
  ),
];
const assertNoAccountAddress = (text) => {
  assert.ok(ACCOUNT_ADDRESSES.length > 0);
  for (const address of ACCOUNT_ADDRESSES) assert.ok(!text.toLowerCase().includes(address), 'dirección de cuenta');
};

function fakeSpawn(result = { status: 0, stdout: '', stderr: '' }) {
  const calls = [];
  const spawn = (bin, args, options) => {
    calls.push({ bin, args, options });
    return result;
  };
  return { spawn, calls };
}

// ---------- runSui / isAllowedSuiArgs / publishCliArgs ----------

const ALLOWED = [
  ['--version'],
  ['client', '--json', 'active-env'],
  ['client', '--json', 'chain-identifier'],
  ['client', '--json', 'publish'],
  ['client', '--json', 'publish', '--dry-run'],
  ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', '/tmp/smoke/Pub.localnet.toml'],
  ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', 'Pub.toml', '--dry-run'],
  // #73 (TASK-4): los vectores de testnet los corre solo el owner; aquí solo se comprueba la lista, con un spawn inyectado.
  ['client', '--json', 'upgrade'],
  ['client', '--json', 'upgrade', '--dry-run'],
  ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', '/tmp/smoke/Pub.v1.repo.toml'],
  ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', 'Pub.toml', '--dry-run'],
  ['client', '--json', 'object', `0x${'ab'.repeat(32)}`],
];

test('runSui invoca sin shell, con n por stdin, maxBuffer de 64 MiB, cwd contracts/ y el SUI_CONFIG_DIR validado', () => {
  const { spawn, calls } = fakeSpawn({ status: 0, stdout: '"localnet"', stderr: '' });
  const result = runSui(['client', '--json', 'active-env'], { spawn, configDir: CONFIG_DIR });
  assert.deepEqual(result, { status: 0, stdout: '"localnet"', stderr: '' });
  assert.equal(calls.length, 1);
  const { bin, args, options } = calls[0];
  assert.equal(bin, process.env.SUI_BIN ?? 'sui');
  assert.deepEqual(args, ['client', '--json', 'active-env']);
  assert.equal(options.input, 'n\n');
  assert.equal(options.shell, false);
  assert.equal(options.encoding, 'utf8');
  assert.ok(options.maxBuffer >= 64 * 1024 * 1024);
  assert.equal(options.env.SUI_CONFIG_DIR, CONFIG_DIR);
  assert.equal(options.cwd, CONTRACTS_DIR);
  assert.equal(CONTRACTS_DIR, path.resolve(fileURLToPath(new URL('..', import.meta.url))));
});

test('runSui invoca cada vector permitido', () => {
  for (const args of ALLOWED) {
    const { spawn, calls } = fakeSpawn();
    runSui(args, { spawn, configDir: CONFIG_DIR });
    assert.deepEqual(calls.map((c) => c.args), [args], JSON.stringify(args));
  }
});

test('runSui rechaza sin invocar todo vector fuera de la lista blanca', () => {
  const rejected = [
    ['client', '--json', 'publish', '-y'],
    ['client', '--json', 'publish', '--yes'],
    ['client', '--json', 'publish', '--client.config', 'x'],
    ['client', '--json', 'publish', '--client.config=x'],
    ['client', '--json', 'active-env', '--client.env', 'testnet'],
    ['client', '--json', 'active-env', '--client.env=testnet'],
    ['client', '--json', '--client.env', 'testnet', 'publish'],
    ['client', '--json', 'active-address'],
    ['client', '--json', 'publish', '--gas-budget', '1'],
    ['client', '--json', 'test-publish', '--pubfile-path', 'Pub.toml'],
    ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', '--dry-run'],
    ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', '-x'],
    ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', ''],
    ['client', 'publish'],
    'client --json publish',
  ];
  for (const args of rejected) {
    const { spawn, calls } = fakeSpawn();
    assert.equal(isAllowedSuiArgs(args), false, JSON.stringify(args));
    assert.throws(() => runSui(args, { spawn, configDir: CONFIG_DIR }), /no permitida/);
    assert.equal(calls.length, 0, JSON.stringify(args));
  }
});

test('allowlist (#73): los vectores de upgrade y object se aceptan; un vector parecido se rechaza', () => {
  const id = `0x${'ab'.repeat(32)}`;
  const accepted = [
    ['client', '--json', 'upgrade'],
    ['client', '--json', 'upgrade', '--dry-run'],
    ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', '/tmp/smoke/Pub.v1.repo.toml'],
    ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', '/tmp/smoke/Pub.v1.repo.toml', '--dry-run'],
    ['client', '--json', 'object', id],
  ];
  for (const args of accepted) assert.equal(isAllowedSuiArgs(args), true, JSON.stringify(args));
  const pubfile = ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path'];
  const rejected = [
    // `upgrade` con otra bandera o variante: la CLI de testnet nunca recibe nada fuera de la lista.
    ['client', '--json', 'upgrade', '--skip-verify-compatibility'],
    ['client', '--json', 'upgrade', '--dry-run', '--skip-verify-compatibility'],
    ['client', '--json', 'upgrade', '-c', id],
    ['client', '--json', 'upgrade', '--upgrade-capability', id],
    ['client', '--json', 'upgrade', '-y'],
    ['client', '--json', 'upgrade', '--yes'],
    ['client', '--json', 'upgrade', '--gas-budget', '1'],
    ['client', '--json', 'upgrade', '--client.env', 'testnet'],
    ['client', '--json', 'upgrade', '--client.config=x'],
    ['client', '--json', 'upgrade', '--dry-run', '--dry-run'],
    ['client', 'upgrade'],
    ['client', '--json', 'upgrade', '.'],
    ['client', '--json', 'Upgrade'],
    // `test-upgrade`: prefijo exacto, una ruta válida y solo `--dry-run` al final.
    ['client', '--json', 'test-upgrade', '--pubfile-path', 'Pub.toml'],
    ['client', '--json', 'test-upgrade', '--build-env', 'mainnet', '--pubfile-path', 'Pub.toml'],
    [...pubfile],
    [...pubfile, ''],
    [...pubfile, '--dry-run'],
    [...pubfile, '-x'],
    [...pubfile, 'Pub.toml', '--skip-verify-compatibility'],
    [...pubfile, 'Pub.toml', '--dry-run', '--skip-verify-compatibility'],
    [...pubfile, 'Pub.toml', '-c', id],
    [...pubfile, 'Pub.toml', '--gas-budget', '1'],
    // `object`: solo `<id>` de 0x + 64 hex minúsculas, sin nada más.
    ['client', '--json', 'object'],
    ['client', '--json', 'object', '0x2'],
    ['client', '--json', 'object', id.toUpperCase().replace('0X', '0x')],
    ['client', '--json', 'object', id.slice(0, -1)],
    ['client', '--json', 'object', `${id}0`],
    ['client', '--json', 'object', 'x'.repeat(66)],
    ['client', '--json', 'object', id, '--bcs'],
    ['client', '--json', 'object', '--bcs', id],
    ['client', '--json', 'objects', id],
    ['client', '--json', 'tx-block', id],
    ['client', '--json', 'call', '--package', id],
  ];
  for (const args of rejected) {
    const { spawn, calls } = fakeSpawn();
    assert.equal(isAllowedSuiArgs(args), false, JSON.stringify(args));
    assert.throws(() => runSui(args, { spawn, configDir: CONFIG_DIR }), /no permitida/);
    assert.equal(calls.length, 0, JSON.stringify(args));
  }
});

test('upgradeCliArgs: testnet = upgrade, localnet = test-upgrade con el pubfile; con y sin dry run; siempre dentro de la lista blanca', () => {
  const pubfilePath = '/tmp/smoke/Pub.v1.repo.toml';
  const cases = [
    [{ network: 'testnet', dryRun: false }, ['client', '--json', 'upgrade']],
    [{ network: 'testnet', dryRun: true }, ['client', '--json', 'upgrade', '--dry-run']],
    [
      { network: 'localnet', pubfilePath, dryRun: false },
      ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', pubfilePath],
    ],
    [
      { network: 'localnet', pubfilePath, dryRun: true },
      ['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path', pubfilePath, '--dry-run'],
    ],
  ];
  for (const [input, expected] of cases) {
    const args = upgradeCliArgs(input);
    assert.deepEqual(args, expected);
    assert.ok(isAllowedSuiArgs(args));
    for (const forbidden of ['--skip-verify-compatibility', '-c', '--upgrade-capability', '-y', '--yes']) {
      assert.ok(!args.includes(forbidden), forbidden);
    }
  }
});

test('runSui no invoca sin un configDir validado', () => {
  const { spawn, calls } = fakeSpawn();
  assert.throws(() => runSui(['--version'], { spawn }), /configDir/);
  assert.throws(() => runSui(['--version'], { spawn, configDir: '' }), /configDir/);
  assert.equal(calls.length, 0);
});

test('publishCliArgs: ambas redes, con y sin dry run, siempre dentro de la lista blanca', () => {
  const pubfilePath = '/tmp/smoke/Pub.localnet.toml';
  const cases = [
    [{ network: 'testnet', dryRun: false }, ['client', '--json', 'publish']],
    [{ network: 'testnet', dryRun: true }, ['client', '--json', 'publish', '--dry-run']],
    [
      { network: 'localnet', pubfilePath, dryRun: false },
      ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', pubfilePath],
    ],
    [
      { network: 'localnet', pubfilePath, dryRun: true },
      ['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path', pubfilePath, '--dry-run'],
    ],
  ];
  for (const [input, expected] of cases) {
    const args = publishCliArgs(input);
    assert.deepEqual(args, expected);
    assert.ok(isAllowedSuiArgs(args));
  }
});

test('runGit solo admite status --porcelain y rev-parse HEAD, sin shell y en contracts/', () => {
  const { spawn, calls } = fakeSpawn({ status: 0, stdout: 'abc\n', stderr: '' });
  assert.equal(runGit(['rev-parse', 'HEAD'], { spawn }), 'abc\n');
  runGit(['status', '--porcelain'], { spawn });
  assert.deepEqual(calls.map((c) => c.args), [['rev-parse', 'HEAD'], ['status', '--porcelain']]);
  assert.equal(calls[0].bin, 'git');
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.cwd, CONTRACTS_DIR);
  assert.throws(() => runGit(['push'], { spawn }), /no permitida/);
  assert.throws(() => runGit(['status'], { spawn }), /no permitida/);
  assert.equal(calls.length, 2);
  assert.throws(() => runGit(['rev-parse', 'HEAD'], { spawn: fakeSpawn({ status: 128 }).spawn }), /falló/);
});

// ---------- parseCliArgs / main ----------

test('parseCliArgs: subcomandos y opciones válidos', () => {
  const check = parseCliArgs(['check']);
  assert.equal(check.command, 'check');
  assert.deepEqual({ ...check.values }, {});
  const { command, values } = parseCliArgs(['publish', '--network', 'localnet', '--pubfile-path', 'P', '--dry-run']);
  assert.equal(command, 'publish');
  assert.deepEqual({ ...values }, { network: 'localnet', 'pubfile-path': 'P', 'dry-run': true });
});

test('parseCliArgs rechaza subcomando inválido, opción desconocida o ajena al subcomando y --yes/--force/-y', () => {
  const invalid = [
    [],
    ['deploy'],
    ['publish', '--network', 'testnet', '--yes'],
    ['publish', '--network', 'testnet', '--force'],
    ['publish', '--network', 'testnet', '-y'],
    ['check', '--network', 'testnet'],
    ['publish', '--from', 'x.json'],
    ['record', '--dry-run'],
    ['check', 'extra'],
  ];
  for (const argv of invalid) assert.throws(() => parseCliArgs(argv), UsageError, JSON.stringify(argv));
});

// Corre main capturando lo que escribe en stderr.
async function mainCapturingStderr(argv, options) {
  const original = process.stderr.write;
  let stderr = '';
  process.stderr.write = (chunk) => {
    stderr += chunk;
    return true;
  };
  try {
    return { code: await main(argv, options), stderr };
  } finally {
    process.stderr.write = original;
  }
}

test('main: uso inválido ⇒ exit 2; guarda de argumentos ⇒ exit 1 (sin invocar la CLI)', async () => {
  assert.deepEqual([EXIT.OK, EXIT.FAILURE, EXIT.USAGE], [0, 1, 2]);
  const cases = [
    [['deploy'], EXIT.USAGE, /^Uso inválido: subcomando inválido: deploy/],
    [['publish', '--network', 'testnet', '--yes'], EXIT.USAGE, /^Uso inválido: Unknown option '--yes'/],
    [['publish', '--network', 'mainnet'], EXIT.FAILURE, /^--network inválida: mainnet/],
    [['publish', '--network', 'localnet'], EXIT.FAILURE, /^--pubfile-path es obligatorio en localnet/],
  ];
  for (const [argv, code, message] of cases) {
    const result = await mainCapturingStderr(argv);
    assert.equal(result.code, code, JSON.stringify(argv));
    assert.match(result.stderr, message);
  }
});

test('main: --out con --network testnet ⇒ exit 1 sin leer la config ni invocar la CLI', async () => {
  // Precedente de #38: `main` con --network testnet dentro de node --test, cortado antes de la config y de la CLI.
  // Dos barreras más: sin SUI_CONFIG_DIR y con un SUI_BIN inexistente.
  const saved = { SUI_CONFIG_DIR: process.env.SUI_CONFIG_DIR, SUI_BIN: process.env.SUI_BIN };
  try {
    delete process.env.SUI_CONFIG_DIR;
    process.env.SUI_BIN = '/nonexistent/sui-bin-de-test';
    const cases = [
      ['publish', '--network', 'testnet', '--out', '/tmp/battleship-test/testnet.json'],
      [
        'record',
        '--network',
        'testnet',
        '--from',
        '/nonexistent/publish-output.json',
        '--out',
        '/tmp/battleship-test/testnet.json',
      ],
    ];
    for (const argv of cases) {
      const result = await mainCapturingStderr(argv);
      assert.equal(result.code, EXIT.FAILURE, JSON.stringify(argv));
      assert.match(result.stderr, /^--out no se admite en testnet/, JSON.stringify(argv));
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('main: con un Node que no es el de .nvmrc ⇒ exit 1 y el mensaje, antes de los argumentos, la config y la CLI', async () => {
  // Guarda 0 (#8, M-4): corta antes de parseCliArgs (un subcomando inválido da 1, no 2) y antes de la config y la CLI
  // (sin SUI_CONFIG_DIR y con un SUI_BIN inexistente, el mensaje sigue siendo el de Node).
  const saved = { SUI_CONFIG_DIR: process.env.SUI_CONFIG_DIR, SUI_BIN: process.env.SUI_BIN };
  try {
    delete process.env.SUI_CONFIG_DIR;
    process.env.SUI_BIN = '/nonexistent/sui-bin-de-test';
    const cases = [
      [['check'], '20.20.2'],
      [['check'], '22.23.4'],
      [['publish', '--network', 'testnet', '--dry-run'], '20.20.2'],
      [['deploy'], '20.20.2'],
    ];
    for (const [argv, nodeVersion] of cases) {
      const result = await mainCapturingStderr(argv, { nodeVersion });
      const label = `${JSON.stringify(argv)} con ${nodeVersion}`;
      assert.equal(result.code, EXIT.FAILURE, label);
      assert.match(result.stderr, /^se requiere Node 26 \(\.nvmrc\); este es v/, label);
      assert.ok(result.stderr.includes(`v${nodeVersion}`), label);
      assert.ok(!result.stderr.includes('/'), `${label}: sin rutas`);
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

// ---------- Guardas ----------

test('checkNodeVersion: el major de Node debe ser el de .nvmrc', () => {
  assert.doesNotThrow(() => checkNodeVersion({ nodeVersion: '26.13.0', nvmrcText: '26\n' }));
  assert.doesNotThrow(() => checkNodeVersion({ nodeVersion: '26.13.0', nvmrcText: 'v26\n' }));
  for (const nodeVersion of ['20.20.2', '22.23.4', '27.0.0']) {
    assert.throws(
      () => checkNodeVersion({ nodeVersion, nvmrcText: '26\n' }),
      (error) =>
        error.message === `se requiere Node 26 (.nvmrc); este es v${nodeVersion}: corre "nvm use" en la raíz del repo`,
      nodeVersion,
    );
  }
  for (const nvmrcText of ['', '\n', 'lts/*\n', '26.13.0\n', null]) {
    assert.throws(() => checkNodeVersion({ nodeVersion: '26.13.0', nvmrcText }), /^Error: \.nvmrc sin versión válida$/, String(nvmrcText));
  }
});

test('checkNodeVersion: el .nvmrc real del repo acepta el Node que corre los tests (la CI usa .nvmrc)', () => {
  const nvmrcText = readFileSync(path.join(CONTRACTS_DIR, '..', '.nvmrc'), 'utf8');
  assert.doesNotThrow(() => checkNodeVersion({ nodeVersion: process.versions.node, nvmrcText }));
});

test('isEntryPoint: import.meta.main si es boolean; si no, realpath de argv[1] contra el del módulo', () => {
  // Con un boolean no se mira argv[1]: realpath no se llama (un espía, porque isEntryPoint atrapa lo que lance realpath).
  const calls = [];
  const spy = (p) => {
    calls.push(p);
    return p;
  };
  assert.equal(isEntryPoint({ importMetaMain: true, argv1: '/x/otro.mjs', modulePath: '/x/publish.mjs', realpath: spy }), true);
  assert.equal(isEntryPoint({ importMetaMain: false, argv1: '/x/publish.mjs', modulePath: '/x/publish.mjs', realpath: spy }), false);
  assert.deepEqual(calls, []);
  // Node < 22.18: sin import.meta.main. Un symlink al script resuelve al mismo archivo.
  const links = { '/repo/link.mjs': '/repo/contracts/scripts/publish.mjs' };
  const realpath = (p) => links[p] ?? p;
  const modulePath = '/repo/contracts/scripts/publish.mjs';
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: modulePath, modulePath, realpath }), true);
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: '/repo/link.mjs', modulePath, realpath }), true);
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: '/repo/contracts/scripts/otro.mjs', modulePath, realpath }), false);
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: undefined, modulePath, realpath }), false);
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: '', modulePath, realpath }), false);
  const throwing = () => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  };
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: modulePath, modulePath, realpath: throwing }), false);
  // Con el fs real: este módulo de publish.mjs contra sí mismo.
  const real = path.join(CONTRACTS_DIR, 'scripts', 'publish.mjs');
  assert.equal(isEntryPoint({ importMetaMain: undefined, argv1: real, modulePath: real, realpath: realpathSync }), true);
});

test('checkPublishArgs: red válida y --pubfile-path obligatorio en localnet y prohibido en testnet', () => {
  assert.throws(() => checkPublishArgs({ network: 'mainnet' }), /--network inválida/);
  assert.throws(() => checkPublishArgs({ network: undefined }), /--network inválida/);
  assert.throws(() => checkPublishArgs({ network: 'localnet' }), /obligatorio en localnet/);
  assert.throws(() => checkPublishArgs({ network: 'testnet', pubfilePath: 'P' }), /no se admite en testnet/);
  checkPublishArgs({ network: 'localnet', pubfilePath: 'P' });
  checkPublishArgs({ network: 'testnet', pubfilePath: undefined });
});

test('checkPublishArgs y checkOutArg: --out prohibido en testnet (también vacío) y admitido en localnet', () => {
  assert.throws(
    () => checkPublishArgs({ network: 'testnet', out: '/tmp/battleship-test/testnet.json' }),
    /--out no se admite en testnet/,
  );
  assert.throws(() => checkPublishArgs({ network: 'testnet', out: '' }), /--out no se admite en testnet/);
  assert.throws(
    () => checkPublishArgs({ network: 'testnet', pubfilePath: 'P', out: 'x' }),
    /--pubfile-path no se admite en testnet/,
  );
  checkPublishArgs({ network: 'localnet', pubfilePath: 'P', out: '/tmp/battleship-test/localnet.json' });
  checkPublishArgs({ network: 'testnet', out: undefined });
  assert.throws(() => checkOutArg({ network: 'testnet', out: 'x' }), /--out no se admite en testnet/);
  checkOutArg({ network: 'localnet', out: 'x' });
  checkOutArg({ network: 'testnet', out: undefined });
});

// Sistema de archivos falso: directorios y archivos reales más symlinks (prefijo → destino).
function fakeFs({ dirs = [], files = [], links = {} }) {
  const realpath = (p) => {
    for (const [from, to] of Object.entries(links)) {
      if (p === from || p.startsWith(`${from}/`)) return to + p.slice(from.length);
    }
    return p;
  };
  return {
    isAbsolute: path.isAbsolute,
    exists: (p) => dirs.includes(realpath(p)) || files.includes(realpath(p)),
    isDir: (p) => dirs.includes(realpath(p)),
    hasClientYaml: (dir) => files.includes(`${realpath(dir)}/client.yaml`),
    realpath,
  };
}
const HOME = '/home/owner';
const FS = fakeFs({
  dirs: [HOME, `${HOME}/.sui`, `${HOME}/.sui/sui_config`, `${HOME}/.sui/otra`, '/srv/battleship/net', '/srv/empty', '/tmp/h'],
  files: [`${HOME}/.sui/sui_config/client.yaml`, `${HOME}/.sui/otra/client.yaml`, '/srv/battleship/net/client.yaml'],
  links: { '/srv/link': `${HOME}/.sui/sui_config`, '/srv/own-link': '/srv/battleship/net' },
});

test('checkConfigDirGuard rechaza config ausente, relativa, inexistente, sin client.yaml o dentro de ~/.sui', () => {
  const cases = [
    [undefined, [HOME], /no está definido/],
    ['', [HOME], /no está definido/],
    ['net', [HOME], /no es una ruta absoluta/],
    ['/srv/nada', [HOME], /no existe/],
    ['/srv/empty', [HOME], /no contiene client\.yaml/],
    [`${HOME}/.sui/sui_config`, [HOME], /dentro de ~\/\.sui/],
    [`${HOME}/.sui/otra`, [HOME], /dentro de ~\/\.sui/],
    ['/srv/link', [HOME], /dentro de ~\/\.sui/],
    // HOME redefinido: os.homedir() apunta a otro lado, pero userInfo().homedir es el real.
    [`${HOME}/.sui/sui_config`, ['/tmp/h', HOME], /dentro de ~\/\.sui/],
  ];
  for (const [value, homes, expected] of cases) {
    assert.throws(
      () => checkConfigDirGuard({ value, ...FS, homes }),
      (error) => expected.test(error.message) && error.message.startsWith('SUI_CONFIG_DIR inválido: ') &&
        (!value || !error.message.includes(value)),
      String(value),
    );
  }
});

test('checkConfigDirGuard acepta una config propia y devuelve su realpath', () => {
  assert.equal(checkConfigDirGuard({ value: '/srv/battleship/net', ...FS, homes: [HOME, HOME] }), '/srv/battleship/net');
  assert.equal(checkConfigDirGuard({ value: '/srv/own-link', ...FS, homes: [HOME] }), '/srv/battleship/net');
  // Un home sin `.sui` se compara contra la ruta resuelta del home + `.sui`.
  assert.equal(checkConfigDirGuard({ value: '/srv/battleship/net', ...FS, homes: ['/tmp/h'] }), '/srv/battleship/net');
});

test('checkConfigDirGuard: una excepción de fs ⇒ SUI_CONFIG_DIR inválido con solo su código, sin ruta ni mensaje original', () => {
  const value = '/srv/battleship/net';
  const fsThrow = (code) => (p) => {
    throw Object.assign(new Error(`${code}: permission denied, stat '${p}'`), { code });
  };
  const cases = [
    [{ isDir: fsThrow('EACCES') }, '(EACCES)'],
    [{ exists: fsThrow('EACCES') }, '(EACCES)'],
    [{ hasClientYaml: fsThrow('EACCES') }, '(EACCES)'],
    [{ realpath: (p) => (p === value ? fsThrow('ELOOP')(p) : FS.realpath(p)) }, '(ELOOP)'],
    [{ realpath: (p) => (p === `${HOME}/.sui` ? fsThrow('EACCES')(p) : FS.realpath(p)) }, '(EACCES)'],
    [
      {
        isDir: (p) => {
          throw new Error(`boom ${p}`);
        },
      },
      '(error de fs)',
    ],
  ];
  for (const [override, code] of cases) {
    assert.throws(
      () => checkConfigDirGuard({ value, ...FS, ...override, homes: [HOME] }),
      (error) =>
        error.message.startsWith('SUI_CONFIG_DIR inválido: no se pudo inspeccionar una ruta (') &&
        error.message.includes(code) &&
        ![value, HOME, '/srv', 'permission denied', 'boom'].some((s) => error.message.includes(s)) &&
        error.cause === undefined,
      code,
    );
  }
});

test('checkNetworkGuard: env activo distinto ⇒ error sin consultar el chain id', () => {
  let calls = 0;
  const readChainId = () => {
    calls += 1;
    return TESTNET_CHAIN_ID;
  };
  assert.throws(() => checkNetworkGuard({ network: 'testnet', activeEnv: 'localnet', readChainId }), /env activo/);
  assert.throws(() => checkNetworkGuard({ network: 'localnet', activeEnv: 'testnet', readChainId }), /env activo/);
  assert.equal(calls, 0);
});

test('checkNetworkGuard: chain id según la red', () => {
  const guard = (network, chainId) => checkNetworkGuard({ network, activeEnv: network, readChainId: () => chainId });
  assert.throws(() => guard('testnet', LOCALNET_CHAIN_ID), /testnet exige 4c78adac/);
  assert.throws(() => guard('localnet', TESTNET_CHAIN_ID), /localnet no puede/);
  assert.throws(() => guard('localnet', MAINNET_CHAIN_ID), /localnet no puede/);
  assert.throws(() => guard('localnet', undefined), /8 hex/);
  assert.equal(guard('testnet', TESTNET_CHAIN_ID), TESTNET_CHAIN_ID);
  assert.equal(guard('localnet', LOCALNET_CHAIN_ID), LOCALNET_CHAIN_ID);
});

test('readCliJson y chainIdFromCli leen la salida --json de active-env y chain-identifier', () => {
  assert.equal(readCliJson({ status: 0, stdout: '"localnet"\n', stderr: '' }, 'active-env'), 'localnet');
  const cid = readCliJson({ status: 0, stdout: `{"base58":"A7xd","hex":"${LOCALNET_CHAIN_ID}"}`, stderr: '' }, 'x');
  assert.equal(chainIdFromCli(cid), LOCALNET_CHAIN_ID);
  assert.equal(chainIdFromCli('cb1e492c'), undefined);
  assert.throws(() => readCliJson({ status: 0, stdout: 'no json', stderr: '' }, 'active-env'), /no devolvió JSON/);
  const address = ACCOUNT_ADDRESSES[0];
  assert.throws(
    () => readCliJson({ status: 1, stdout: '', stderr: `cannot reach 0x${address}` }, 'chain-identifier'),
    (error) => /falló \(estado 1\)/.test(error.message) && !error.message.includes(address),
  );
});

test('redactConfigDir: realpath y valor original ⇒ <SUI_CONFIG_DIR>, la ruta más larga primero, sin tocar el resto', () => {
  assert.equal(
    redactConfigDir('open /srv/battleship/net/sui.keystore; /srv/own-link/client.yaml', [CONFIG_DIR, '/srv/own-link']),
    'open <SUI_CONFIG_DIR>/sui.keystore; <SUI_CONFIG_DIR>/client.yaml',
  );
  assert.equal(redactConfigDir('/srv/battleship/net/x', ['/srv/battleship/net/']), '<SUI_CONFIG_DIR>/x');
  assert.equal(redactConfigDir('/srv/a/b/x y /srv/a/y', ['/srv/a', '/srv/a/b']), '<SUI_CONFIG_DIR>/x y <SUI_CONFIG_DIR>/y');
  assert.equal(redactConfigDir('/srv/c.d+e/x /srv/cXd+e/x', ['/srv/c.d+e']), '<SUI_CONFIG_DIR>/x /srv/cXd+e/x');
  assert.equal(redactConfigDir('/srv/x', [undefined, '', '/', 42]), '/srv/x');
  assert.equal(redactConfigDir('sin rutas', [CONFIG_DIR]), 'sin rutas');
});

test('readCliJson, formatCliFailure e interpretCliRun: el stderr de la CLI sale sin la ruta de la config ni direcciones', () => {
  const [address] = ACCOUNT_ADDRESSES;
  const stderr = `cannot open /srv/own-link/sui.keystore (real ${CONFIG_DIR}) for 0x${address}\n`;
  const configDirs = [CONFIG_DIR, '/srv/own-link'];
  assert.throws(
    () => readCliJson({ status: 1, stdout: '', stderr }, 'active-env', configDirs),
    (error) => {
      assert.ok(error.message.includes('<SUI_CONFIG_DIR>/sui.keystore'));
      assert.ok(error.message.includes('(real <SUI_CONFIG_DIR>)'));
      assert.ok(!error.message.includes('/srv'));
      assertNoAccountAddress(error.message);
      return true;
    },
  );
  const message = formatCliFailure({
    reason: 'x',
    status: 1,
    stdout: '',
    stderr,
    dir: '/tmp/d',
    outputPath: '/tmp/d/publish-output.json',
    configDirs,
  });
  assert.ok(message.includes('stderr de la CLI (direcciones y config ocultas):'));
  assert.ok(message.includes('<SUI_CONFIG_DIR>/sui.keystore'));
  assert.ok(!message.includes('/srv'));
  assertNoAccountAddress(message);
  assert.ok(message.includes('/tmp/d/publish-output.json'));
  const outcome = interpretCliRun({
    result: { status: 1, stdout: '', stderr },
    parse: (json) => json,
    dir: '/tmp/d',
    outputPath: '/tmp/d/publish-output.json',
    configDirs,
  });
  assert.ok('error' in outcome);
  assert.ok(outcome.error.includes('<SUI_CONFIG_DIR>'));
  assert.ok(!outcome.error.includes('/srv'));
  const legacy = formatCliFailure({ reason: 'x', status: 1, stdout: '', stderr, dir: '/tmp/d', outputPath: '/tmp/d/o.json' });
  assert.ok(legacy.includes('/srv/own-link/sui.keystore'));
});

test('checkCliVersion compara con SUI_VERSION/SUI_COMMIT de ci.yml', () => {
  assert.deepEqual(checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.84.0-9dc25070cf2e\n', ciYamlText: CI_YAML }), {
    suiCliVersion: '1.84.0-9dc25070cf2e',
    warning: null,
  });
  assert.throws(
    () => checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML }),
    /no es la de ci\.yml/,
  );
  const local = checkCliVersion({ network: 'localnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML });
  assert.equal(local.suiCliVersion, '1.83.0-16d2dc1e05ed');
  assert.match(local.warning, /no es la de ci\.yml/);
  assert.throws(
    () => checkCliVersion({ network: 'localnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed', ciYamlText: 'env:\n  X: "1"\n' }),
    /SUI_VERSION y SUI_COMMIT/,
  );
});

const asTestnetToml = (text) => text.replace('[published.localnet]', '[published.testnet]');

test('checkTestnetPreconditions: árbol sucio, json o entrada existentes ⇒ error', () => {
  const clean = { gitStatus: '', deploymentExists: false, publishedTomlText: null };
  assert.throws(() => checkTestnetPreconditions({ ...clean, gitStatus: ' M contracts/Move.lock\n' }), /no está limpio/);
  assert.throws(() => checkTestnetPreconditions({ ...clean, deploymentExists: true }), /testnet\.json/);
  assert.throws(
    () => checkTestnetPreconditions({ ...clean, publishedTomlText: asTestnetToml(PUBLISHED_TOML) }),
    /\[published\.testnet\]/,
  );
  checkTestnetPreconditions(clean);
  checkTestnetPreconditions({ ...clean, publishedTomlText: PUBLISHED_TOML });
});

test('checkLockUnchanged: testnet distinto ⇒ error; localnet distinto ⇒ aviso; igual ⇒ ok', () => {
  assert.throws(() => checkLockUnchanged({ network: 'testnet', before: 'a', after: 'b' }), /repin pendiente \(H13\)/);
  assert.match(checkLockUnchanged({ network: 'localnet', before: 'a', after: 'b' }), /PROY-11/);
  assert.equal(checkLockUnchanged({ network: 'testnet', before: 'a', after: 'a' }), null);
  assert.equal(checkLockUnchanged({ network: 'localnet', before: 'a', after: 'a' }), null);
});

test('confirmación: solo en testnet sin dry run; sin TTY o sin "testnet" aborta', () => {
  assert.equal(confirmationRequired({ network: 'testnet', dryRun: false }), true);
  assert.equal(confirmationRequired({ network: 'testnet', dryRun: true }), false);
  assert.equal(confirmationRequired({ network: 'localnet', dryRun: false }), false);
  assert.throws(() => checkConfirmation({ isTTY: false, answer: 'testnet' }), /terminal interactiva/);
  assert.throws(() => checkConfirmation({ isTTY: undefined, answer: null }), /terminal interactiva/);
  assert.throws(() => checkConfirmation({ isTTY: true, answer: 'yes' }), /confirmación no recibida/);
  assert.throws(() => checkConfirmation({ isTTY: true, answer: '' }), /confirmación no recibida/);
  checkConfirmation({ isTTY: true, answer: 'testnet\n' });
});

test('confirmación: ninguna variable de entorno la omite', () => {
  const vars = ['CI', 'SUI_PUBLISH_YES', 'YES', 'FORCE'];
  const saved = Object.fromEntries(vars.map((v) => [v, process.env[v]]));
  try {
    for (const v of vars) process.env[v] = '1';
    assert.equal(confirmationRequired({ network: 'testnet', dryRun: false }), true);
    assert.throws(() => checkConfirmation({ isTTY: undefined, answer: null }), /terminal interactiva/);
    assert.throws(() => checkConfirmation({ isTTY: true, answer: '1' }), /confirmación no recibida/);
  } finally {
    for (const v of vars) {
      if (saved[v] === undefined) delete process.env[v];
      else process.env[v] = saved[v];
    }
  }
});

// ---------- record ----------

test('resolveRecordMeta: usa meta.json si existe', () => {
  assert.deepEqual(resolveRecordMeta({ metaJson: { ...FIXTURE_META }, flags: {}, network: 'localnet' }), FIXTURE_META);
});

test('resolveRecordMeta: sin meta.json exige los flags', () => {
  assert.throws(() => resolveRecordMeta({ metaJson: null, flags: {}, network: 'localnet' }), /sin meta\.json se exigen/);
  assert.throws(
    () => resolveRecordMeta({ metaJson: null, flags: { sourceCommit: FIXTURE_META.sourceCommit }, network: 'localnet' }),
    /faltan: suiCliVersion, frameworkRev, chainId/,
  );
  const { network, ...flags } = FIXTURE_META;
  assert.deepEqual(resolveRecordMeta({ metaJson: null, flags, network }), FIXTURE_META);
});

test('resolveRecordMeta: red o chain id incoherentes con --network ⇒ error', () => {
  assert.throws(
    () => resolveRecordMeta({ metaJson: { ...FIXTURE_META, chainId: TESTNET_CHAIN_ID }, flags: {}, network: 'localnet' }),
    /localnet no puede/,
  );
  assert.throws(() => resolveRecordMeta({ metaJson: { ...FIXTURE_META }, flags: {}, network: 'testnet' }), /es de localnet/);
  assert.throws(() => resolveRecordMeta({ metaJson: null, flags: {}, network: 'mainnet' }), /--network inválida/);
});

// ---------- check ----------

test('checkDeployments: sin archivos ni Published.toml ⇒ 0 despliegues', () => {
  assert.deepEqual(checkDeployments({ files: [], publishedTomlText: null }), { count: 0, errors: [] });
});

test('checkDeployments: localnet válido sin entrada en Published.toml', () => {
  const files = [{ name: 'localnet.json', text: DEPLOYMENT_FIXTURE_TEXT }];
  assert.deepEqual(checkDeployments({ files, publishedTomlText: null }), { count: 1, errors: [] });
});

test('checkDeployments: testnet sin Published.toml ⇒ error', () => {
  const testnet = { ...localnetDeployment(), network: 'testnet', chainId: TESTNET_CHAIN_ID };
  const { errors } = checkDeployments({ files: [{ name: 'testnet.json', text: JSON.stringify(testnet) }], publishedTomlText: null });
  assert.deepEqual(errors, ['deployments/testnet.json: falta [published.testnet] en Published.toml']);
});

test('checkDeployments: entrada de Published.toml sin json ⇒ error', () => {
  const { errors } = checkDeployments({ files: [], publishedTomlText: PUBLISHED_TOML });
  assert.deepEqual(errors, ['[published.localnet] de Published.toml no tiene deployments/localnet.json']);
});

test('checkDeployments: nombre de archivo distinto de network ⇒ error', () => {
  const { errors } = checkDeployments({ files: [{ name: 'testnet.json', text: DEPLOYMENT_FIXTURE_TEXT }], publishedTomlText: null });
  assert.ok(errors.some((e) => /network \(localnet\) no coincide con el nombre del archivo/.test(e)), JSON.stringify(errors));
});

test('checkDeployments: json inválido ⇒ error', () => {
  const broken = checkDeployments({ files: [{ name: 'localnet.json', text: '{' }], publishedTomlText: null });
  assert.deepEqual(broken.errors, ['deployments/localnet.json: no es JSON válido']);
  const invalid = { ...localnetDeployment(), sender: '0x01' };
  const { errors } = checkDeployments({ files: [{ name: 'localnet.json', text: JSON.stringify(invalid) }], publishedTomlText: null });
  assert.deepEqual(errors, ['deployments/localnet.json: clave desconocida: sender']);
});

test('checkDeployments: testnet coherente con su [published.testnet]; una diferencia ⇒ error', () => {
  // Solo en memoria: `Published.localnet.toml` es de la copia publicada en TASK-1 (D6), no de `localnet-publish.json`.
  // Se reetiqueta como `[published.testnet]` con el chain id de testnet, y el json toma de esa misma entrada
  // packageId, originalPackageId, packageVersion y upgradeCapId (A2 del addendum v1.1).
  const tomlText = asTestnetToml(PUBLISHED_TOML).replace(`chain-id = "${LOCALNET_CHAIN_ID}"`, `chain-id = "${TESTNET_CHAIN_ID}"`);
  const testnet = {
    ...localnetDeployment(),
    network: 'testnet',
    chainId: TESTNET_CHAIN_ID,
    packageId: '0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514',
    originalPackageId: '0xc1c2c06f1d7d60da6eadc482a2f0983f07d1c917e9ad0e35f30e8ba3c3ef9514',
    packageVersion: 1,
    upgradeCapId: '0x32ea9b07651911fc31c4c56ce234b33d37823b8553b0f09c33d8282196f13081',
  };
  const files = [{ name: 'testnet.json', text: JSON.stringify(testnet) }];
  assert.deepEqual(checkDeployments({ files, publishedTomlText: tomlText }), { count: 1, errors: [] });
  const drifted = [{ name: 'testnet.json', text: JSON.stringify({ ...testnet, packageVersion: 2 }) }];
  const { errors } = checkDeployments({ files: drifted, publishedTomlText: tomlText });
  // #73: con packageVersion > 1 el json además exige `upgrades` y `typeOrigins` (dos errores nuevos, de forma, no de deriva).
  const drift = errors.filter((e) => /≠ version/.test(e));
  assert.equal(drift.length, 1, JSON.stringify(errors));
  assert.match(drift[0], /^deployments\/testnet\.json: packageVersion \(2\) ≠ version/);
  assert.equal(errors.length, 3, JSON.stringify(errors));
});

test('checkDeployments: json que no es un objeto ⇒ error legible, sin TypeError (H3)', () => {
  const tomlText = asTestnetToml(PUBLISHED_TOML).replace(`chain-id = "${LOCALNET_CHAIN_ID}"`, `chain-id = "${TESTNET_CHAIN_ID}"`);
  for (const text of ['null', '[]', '"testnet"']) {
    const { errors } = checkDeployments({ files: [{ name: 'testnet.json', text }], publishedTomlText: tomlText });
    assert.deepEqual(errors, ['deployments/testnet.json: el despliegue no es un objeto JSON'], text);
  }
});

test('checkDeployments: Published.toml con formato inválido ⇒ error con su línea', () => {
  const { errors } = checkDeployments({ files: [], publishedTomlText: 'basura\n' });
  assert.deepEqual(errors, ['Published.toml:1: línea inesperada: basura']);
});

// ---------- Fixture para #9 ----------

test('fixtures/localnet.deployment.json = buildDeployment del fixture con los valores fijos', () => {
  const expected = localnetDeployment();
  assert.deepEqual(JSON.parse(DEPLOYMENT_FIXTURE_TEXT), expected);
  assert.equal(DEPLOYMENT_FIXTURE_TEXT, `${JSON.stringify(expected, null, 2)}\n`);
});

// ---------- Resumen y mensajes ----------

// Prefijo exacto que debe imprimir el resumen (#8, M-2); string normal: `${SUI_CONFIG_DIR:?…}` es texto literal.
const OWNER_CLI_PREFIX = 'printf \'n\\n\' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client';
const commandLines = (summary) => summary.split('\n').map((l) => l.trim()).filter((l) => l.startsWith("printf 'n\\n' |"));

test('formatSummary: los 14 campos y el siguiente paso con el prefijo guardado, sin direcciones de cuentas', () => {
  assert.equal(OWNER_CLI_PREFIX, `printf 'n\\n' | SUI_CONFIG_DIR="\${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client`);
  const localnet = localnetDeployment();
  const testnet = { ...localnet, network: 'testnet', chainId: TESTNET_CHAIN_ID };
  const fee = (d, bps) =>
    `  ${OWNER_CLI_PREFIX} call --package ${d.packageId} --module house --function update_fee_rate ` +
    `--args ${d.houseId} ${d.houseCapId} ${bps}`;
  const verify = (d) => `  ${OWNER_CLI_PREFIX} object ${d.houseId} --json   # campo content.fee_rate`;
  const cases = [
    [testnet, '/tmp/out/testnet.json', '200'],
    [localnet, '/tmp/out/localnet.json', '<bps>'],
  ];
  for (const [deployment, outPath, bps] of cases) {
    const summary = formatSummary({ deployment, outPath, dir: '/tmp/battleship-publish-x' });
    const lines = summary.split('\n');
    const label = deployment.network;
    for (const [key, value] of Object.entries(deployment)) assert.ok(summary.includes(`  ${key}: ${value}`), `${label}: ${key}`);
    assert.match(summary, /bórralo cuando termines/);
    assert.ok(lines.includes(fee(deployment, bps)), `${label}: comando de comisión`);
    assert.ok(lines.includes(verify(deployment)), `${label}: verificación`);
    assert.ok(summary.includes('${SUI_CONFIG_DIR:?'), `${label}: el prefijo no se interpoló`);
    assert.doesNotMatch(summary, /^\s*sui client/m, `${label}: ningún sui client sin el prefijo`);
    assert.equal(commandLines(summary).length, 2, label);
    assertNoAccountAddress(summary);
  }
  const testnetSummary = formatSummary({ deployment: testnet, outPath: '/tmp/out/testnet.json', dir: null });
  assert.ok(!testnetSummary.includes('<bps>'));
});

test('formatSummary (m-2): en testnet las dos líneas de comando se pegan tal cual (bash -n, sin ejecutar)', () => {
  const testnet = { ...localnetDeployment(), network: 'testnet', chainId: TESTNET_CHAIN_ID };
  const lines = commandLines(formatSummary({ deployment: testnet, outPath: '/tmp/out/testnet.json', dir: null }));
  assert.equal(lines.length, 2);
  for (const line of lines) {
    // `bash -n` solo parsea: no expande `${SUI_CONFIG_DIR:?…}` ni invoca nada.
    const result = spawnSync('bash', ['-n', '-c', line], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${line}\n${result.stderr}`);
  }
  // En localnet, `<bps>` no es pegable a propósito: el shell lo toma como redirección y no corre nada.
  const [localFee] = commandLines(formatSummary({ deployment: localnetDeployment(), outPath: '/tmp/out/localnet.json', dir: null }));
  assert.notEqual(spawnSync('bash', ['-n', '-c', localFee], { encoding: 'utf8' }).status, 0);
});

test('formatCliFailure: digest de stderr, stderr redactado con y sin 0x y consejo fijo tras publicar', () => {
  const [address] = ACCOUNT_ADDRESSES;
  const digest = PUBLISH.digest;
  const stderr = `Error executing transaction '${digest}': sender 0x${address} owner ${address.toUpperCase()}\n`;
  const message = formatCliFailure({
    reason: 'la CLI terminó con estado 1',
    stderr,
    dir: '/tmp/d',
    outputPath: '/tmp/d/publish-output.json',
    afterPublish: true,
  });
  assert.ok(message.includes(`Digest de la transacción: ${digest}`));
  assert.ok(message.includes('/tmp/d/publish-output.json'));
  assert.ok(message.includes('Directorio temporal: /tmp/d'));
  assert.ok(message.includes('sender 0x… owner 0x…'));
  assert.match(message, /No reintentes sin buscar antes el digest/);
  assertNoAccountAddress(message);
});

test('formatCliFailure: sin publicación real (dry run, record) no aconseja buscar el digest; sin dir no lo nombra', () => {
  const dryRun = formatCliFailure({ reason: 'x', stderr: '', dir: '/tmp/d', outputPath: '/tmp/d/dry-run-output.json' });
  assert.doesNotMatch(dryRun, /No reintentes/);
  assert.ok(dryRun.includes('Directorio temporal: /tmp/d'));
  const record = formatCliFailure({ reason: 'x', stderr: '', dir: null, outputPath: '/srv/out.json' });
  assert.doesNotMatch(record, /No reintentes|Directorio temporal/);
  assert.ok(record.includes('/srv/out.json'));
});

// H-1 del smoke: con `--json` la CLI escribe el motivo de un fallo por stdout. Del stdout solo se extrae el digest.
const ADDR = PUBLISH.objectChanges.find((c) => typeof c.sender === 'string').sender;
const OTHER_DIGEST = PUBLISH.objectChanges.find((c) => c.type === 'published').digest;
const FAILURE_BASE = { reason: 'la CLI terminó con estado 1', dir: '/tmp/d', outputPath: '/tmp/d/publish-output.json' };
const MOTIVE_LINE = 'Motivo de la CLI en /tmp/d/publish-output.json (revísalo ahí; no lo pegues: puede traer tu dirección)';
const assertNoStdout = (message) => {
  assert.ok(!message.includes('STDOUT-MARK'));
  assert.ok(!message.toLowerCase().includes(ADDR.toLowerCase()));
  assert.ok(!message.toLowerCase().includes(ADDR.slice(2).toLowerCase()));
  assertNoAccountAddress(message);
};

test('formatCliFailure (H-1): estado ≠ 0 con el digest solo en stdout ⇒ solo la línea del digest y el motivo', () => {
  const message = formatCliFailure({
    ...FAILURE_BASE,
    status: 1,
    stdout: `STDOUT-MARK ${ADDR} Error executing transaction '${PUBLISH.digest}'`,
    stderr: '',
    afterPublish: true,
  });
  assert.ok(message.includes(`Digest de la transacción: ${PUBLISH.digest}`));
  assert.ok(message.includes(MOTIVE_LINE));
  assert.match(message, /No reintentes sin buscar antes el digest/);
  assertNoStdout(message);
});

test('formatCliFailure (H-1): digests distintos en stderr y stdout ⇒ gana el de stderr', () => {
  assert.notEqual(OTHER_DIGEST, PUBLISH.digest);
  const message = formatCliFailure({
    ...FAILURE_BASE,
    status: 1,
    stdout: `STDOUT-MARK Error executing transaction '${OTHER_DIGEST}'`,
    stderr: `Error executing transaction '${PUBLISH.digest}'\n`,
  });
  assert.ok(message.includes(`Digest de la transacción: ${PUBLISH.digest}`));
  assert.ok(!message.includes(OTHER_DIGEST));
  assertNoStdout(message);
});

test('formatCliFailure (H-1): estado ≠ 0 sin digest ⇒ sin línea Digest, con la línea del motivo', () => {
  const message = formatCliFailure({
    ...FAILURE_BASE,
    status: 1,
    stdout: `STDOUT-MARK Your package is already published ${ADDR}`,
    stderr: '',
  });
  assert.doesNotMatch(message, /Digest de la transacción/);
  assert.ok(message.includes(MOTIVE_LINE));
  assertNoStdout(message);
});

test('interpretCliRun (H-1): estado 0 con stdout no JSON ⇒ no se mira el stdout (ni digest ni motivo)', () => {
  const outcome = interpretCliRun({
    result: {
      status: 0,
      stdout: `STDOUT-MARK ${ADDR} Error executing transaction '${PUBLISH.digest}'`,
      stderr: '',
    },
    parse: (json) => json,
    dir: '/tmp/d',
    outputPath: '/tmp/d/publish-output.json',
  });
  assert.ok('error' in outcome);
  assert.match(outcome.error, /no es JSON válido/);
  assert.doesNotMatch(outcome.error, /Digest de la transacción|Motivo de la CLI/);
  assertNoStdout(outcome.error);
});

test('formatPostPublishFailure: directorio temporal, digest y receta de record, sin direcciones (H2)', () => {
  const [address] = ACCOUNT_ADDRESSES;
  const message = formatPostPublishFailure({
    reason: `falta [published.testnet] en Published.toml (sender 0x${address})`,
    network: 'testnet',
    digest: PUBLISH.digest,
    dir: '/tmp/battleship-publish-x',
    outputPath: '/tmp/battleship-publish-x/publish-output.json',
  });
  assert.ok(message.startsWith('Error: falta [published.testnet] en Published.toml'));
  assert.ok(message.includes(`La publicación ya se ejecutó (digest ${PUBLISH.digest}): no republiques.`));
  assert.ok(message.includes('Directorio temporal: /tmp/battleship-publish-x'));
  assert.ok(
    message.includes(
      'node scripts/publish.mjs record --network testnet --from /tmp/battleship-publish-x/publish-output.json',
    ),
  );
  assert.match(message, /STOP de #8/);
  assertNoAccountAddress(message);
});

test('interpretCliRun: estado ≠ 0, stdout que no parsea o forma inválida ⇒ solo la ruta, nunca el stdout', () => {
  const [address] = ACCOUNT_ADDRESSES;
  const base = { parse: parsePublishOutput, dir: '/tmp/d', outputPath: '/tmp/d/publish-output.json' };
  const cases = [
    [{ status: 1, stdout: `{"sender":"0x${address}"}`, stderr: '' }, /estado 1/],
    [{ status: 0, stdout: `not json STDOUT-MARK 0x${address}`, stderr: '' }, /no es JSON válido/],
    [{ status: 0, stdout: `{"STDOUT-MARK":"0x${address}","objectChanges":"x"}`, stderr: '' }, /forma inesperada/],
    [{ status: 0, stdout: PUBLISH_TEXT.replace('"published"', '"PUBLISHED"'), stderr: '' }, /forma inesperada/],
  ];
  for (const [result, expected] of cases) {
    const outcome = interpretCliRun({ result, ...base, afterPublish: true });
    assert.ok('error' in outcome);
    assert.match(outcome.error, /No reintentes/);
    assert.match(outcome.error, expected);
    assert.ok(outcome.error.includes('/tmp/d/publish-output.json'));
    assert.ok(!outcome.error.includes('STDOUT-MARK'));
    assertNoAccountAddress(outcome.error);
  }
});

test('interpretCliRun: salida real ⇒ el resultado del parser', () => {
  const outcome = interpretCliRun({
    result: { status: 0, stdout: PUBLISH_TEXT, stderr: '' },
    parse: parsePublishOutput,
    dir: '/tmp/d',
    outputPath: '/tmp/d/publish-output.json',
  });
  assert.deepEqual(outcome, { value: parsePublishOutput(PUBLISH) });
});

// ---------- upgrade y record --upgrade (#73, TASK-4) ----------
//
// Ningún test llega a la CLI real ni a `sui client upgrade` de testnet: todo `commandUpgrade` corre con un `spawn` inyectado
// que atiende solo los vectores previstos y falla ante cualquier otro. Los datos son los de la localnet aislada (fixtures
// `localnet-upgrade-*`, `localnet-object-package.json`, `localnet.upgraded.deployment.json`): la forma de la salida del
// upgrade es la de `test-upgrade`, la única medida (la de `sui client upgrade` de testnet la verá el owner).

const UPGRADE_RAW_TEXT = readRepoFile('./fixtures/localnet-upgrade-duel-coinflip.json');
const UPGRADE_DRY_RUN_TEXT = readRepoFile('./fixtures/localnet-upgrade-dry-run.json');
const OBJECT_RAW_TEXT = readRepoFile('./fixtures/localnet-object-package.json');
const RETRY_ERROR_TEXT = readRepoFile('./fixtures/localnet-upgrade-retry-error.txt');
const UPGRADE_BASE_TEXT = readRepoFile('./fixtures/localnet-upgrade-base.deployment.json');
const UPGRADED_TEXT = readRepoFile('./fixtures/localnet.upgraded.deployment.json');
const PUBFILE_TEXT = readRepoFile('./fixtures/Published.upgrade-base.localnet.toml');
const REAL_LOCK_TEXT = readRepoFile('../Move.lock');
const UPGRADE_BASE = JSON.parse(UPGRADE_BASE_TEXT);
const UPGRADED = JSON.parse(UPGRADED_TEXT);

const ORIGINAL_PKG = '0x3235fb9f142718bc7b7eb878b87e45b463f91e93c5353db9425308fc234fdf36';
const UPGRADED_PKG = '0x14e041f974145b3a4d0921dda50eb43f8d9dcd6fd6c181f2cd07e025bbfc1617';
const UPGRADE_CAP = '0x4367c28e169586f024ebcf963c9e14a5516a53441885fa5108a2d2ea0a24ea84';
const UPGRADE_DIGEST = '9K1PE3EfwtutpCb3qFL4VPRwcTouffgBvwGezB6hDnB3';
const UPGRADE_LOCALNET_CHAIN_ID = '13c5acea';
const REAL_SUI_VERSION_OUTPUT = 'sui 1.84.0-9dc25070cf2e\n';
const HEAD_SHA = 'ab61256275c31ba3d4050bed1e33c695159ca92a';

const SMOKE_PUBFILE = '/srv/smoke/Pub.v1.repo.toml';
const DEPLOYMENTS_LOCALNET = path.join(CONTRACTS_DIR, 'deployments', 'localnet.json');
const DEPLOYMENTS_TESTNET = path.join(CONTRACTS_DIR, 'deployments', 'testnet.json');
const PUBLISHED_TOML_PATH = path.join(CONTRACTS_DIR, 'Published.toml');
const LOCK_PATH = path.join(CONTRACTS_DIR, 'Move.lock');
const CI_YAML_PATH = path.join(CONTRACTS_DIR, '..', '.github', 'workflows', 'ci.yml');

const ok = (stdout) => ({ status: 0, stdout, stderr: '' });
const asTestnetDeployment = (d) => ({ ...d, network: 'testnet', chainId: TESTNET_CHAIN_ID });
const TESTNET_BASE = asTestnetDeployment(UPGRADE_BASE);
const TESTNET_UPGRADED = asTestnetDeployment(UPGRADED);

// Salida de un dry run de upgrade con la forma de `test-upgrade`, avanzando el UpgradeCap del despliegue base de la fixture.
const dryRunTextFor = ({ version = 2, cap = UPGRADE_CAP } = {}) => {
  const copy = JSON.parse(UPGRADE_DRY_RUN_TEXT);
  copy.objectChanges.find((c) => c.type === 'published').version = String(version);
  copy.objectChanges.find((c) => String(c.objectType).endsWith('::package::UpgradeCap')).objectId = cap;
  return JSON.stringify(copy);
};

// `Published.toml` en el formato real (`[published.<red>]`); el "después" es la forma de `test-upgrade`: published-at,
// version y toolchain-version cambian.
const testnetPublishedToml = ({ publishedAt, version, toolchain }) =>
  [
    '# Generated by Move',
    '',
    '[published.testnet]',
    `chain-id = "${TESTNET_CHAIN_ID}"`,
    `published-at = "${publishedAt}"`,
    `original-id = "${ORIGINAL_PKG}"`,
    `version = ${version}`,
    `toolchain-version = "${toolchain}"`,
    'build-config = { flavor = "sui", edition = "2024" }',
    `upgrade-capability = "${UPGRADE_CAP}"`,
    '',
  ].join('\n');
const PUBLISHED_TOML_BEFORE = testnetPublishedToml({ publishedAt: ORIGINAL_PKG, version: 1, toolchain: '1.83.0' });
const PUBLISHED_TOML_AFTER = testnetPublishedToml({ publishedAt: UPGRADED_PKG, version: 2, toolchain: '1.84.0' });

const SUI_REAL_UPGRADE = 'client --json upgrade';
const SUI_DRY_UPGRADE = 'client --json upgrade --dry-run';
const SUI_REAL_TEST_UPGRADE = `client --json test-upgrade --build-env testnet --pubfile-path ${SMOKE_PUBFILE}`;
const SUI_DRY_TEST_UPGRADE = `${SUI_REAL_TEST_UPGRADE} --dry-run`;
const SUI_OBJECT = `client --json object ${UPGRADED_PKG}`;

// Arma las dependencias inyectadas de `commandUpgrade` / `commandRecordUpgrade`: archivos en memoria, un `spawn` ruteado
// por vector (falla ante uno no previsto) y los efectos (json escrito, salidas guardadas, mensajes) recogidos.
function upgradeHarness({
  network = 'localnet',
  files = {},
  routes = {},
  isTTY = false,
  answer = 'testnet',
  env,
  realpath,
  forbidSpawn = false,
} = {}) {
  const testnet = network === 'testnet';
  const state = {
    files: {
      [CI_YAML_PATH]: CI_YAML,
      [LOCK_PATH]: REAL_LOCK_TEXT,
      ...(testnet
        ? {
            [DEPLOYMENTS_TESTNET]: JSON.stringify(TESTNET_BASE, null, 2),
            [PUBLISHED_TOML_PATH]: PUBLISHED_TOML_BEFORE,
          }
        : { [DEPLOYMENTS_LOCALNET]: UPGRADE_BASE_TEXT, [SMOKE_PUBFILE]: PUBFILE_TEXT }),
      ...files,
    },
  };
  const calls = [];
  const defaults = {
    'git status --porcelain': ok(''),
    'git rev-parse HEAD': ok(`${HEAD_SHA}\n`),
    '--version': ok(REAL_SUI_VERSION_OUTPUT),
    'client --json active-env': ok(`"${network}"\n`),
    'client --json chain-identifier': ok(
      JSON.stringify({ base58: 'x', hex: testnet ? TESTNET_CHAIN_ID : UPGRADE_LOCALNET_CHAIN_ID }),
    ),
    [SUI_DRY_UPGRADE]: ok(dryRunTextFor()),
    [SUI_DRY_TEST_UPGRADE]: ok(dryRunTextFor()),
    [SUI_REAL_TEST_UPGRADE]: ok(UPGRADE_RAW_TEXT),
    // La CLI de testnet reescribe `Published.toml` al upgradear: aquí lo hace el spawn inyectado.
    [SUI_REAL_UPGRADE]: () => {
      state.files[PUBLISHED_TOML_PATH] = PUBLISHED_TOML_AFTER;
      return ok(UPGRADE_RAW_TEXT);
    },
    [SUI_OBJECT]: ok(OBJECT_RAW_TEXT),
  };
  const spawn = (bin, args) => {
    calls.push({ bin, args });
    // `record --upgrade` es offline: cualquier proceso (la CLI, git) que intente lanzar es un fallo del test.
    if (forbidSpawn) throw new Error(`proceso invocado en un camino offline: ${bin} ${args.join(' ')}`);
    const key = bin === 'git' ? `git ${args.join(' ')}` : args.join(' ');
    const route = Object.hasOwn(routes, key) ? routes[key] : defaults[key];
    if (route === undefined) throw new Error(`spawn inesperado: ${key}`);
    return typeof route === 'function' ? route(state) : route;
  };
  const effects = { written: [], kept: new Map(), out: [], warns: [], asked: 0 };
  const io = {
    env: env ?? { SUI_CONFIG_DIR: CONFIG_DIR },
    homes: [HOME],
    contractsDir: CONTRACTS_DIR,
    spawn,
    isTTY,
    ask: async () => {
      effects.asked += 1;
      return answer;
    },
    fsProbes: FS,
    realpath: realpath ?? ((p) => (p === '<REPO>/contracts' ? CONTRACTS_DIR : p)),
    readText: (file) => (Object.hasOwn(state.files, file) ? state.files[file] : null),
    makeTempDir: () => '/tmp/battleship-upgrade-test',
    keep: (file, text) => effects.kept.set(file, text),
    writeDeployment: (file, deployment) => effects.written.push([file, deployment]),
    info: (text) => effects.out.push(text),
    warn: (text) => effects.warns.push(text),
  };
  const suiCalls = () => calls.filter((c) => c.bin !== 'git').map((c) => c.args.join(' '));
  return { io, state, calls, suiCalls, effects };
}

// Ningún test ni camino de `upgrade` usa las banderas prohibidas, ni siquiera ante un spawn inyectado.
const assertSafeCalls = (calls) => {
  for (const { args } of calls) {
    for (const flag of ['--skip-verify-compatibility', '-c', '--upgrade-capability', '-y', '--yes', '--client.config', '--client.env']) {
      assert.ok(!args.includes(flag), `${flag} en ${args.join(' ')}`);
    }
  }
};
const LOCALNET_VALUES = { network: 'localnet', 'pubfile-path': SMOKE_PUBFILE, out: '/srv/smoke/localnet.json' };

test('parseCliArgs: upgrade, record --upgrade y las combinaciones inválidas', () => {
  const upgrade = parseCliArgs(['upgrade', '--network', 'localnet', '--pubfile-path', 'P', '--out', 'O', '--dry-run']);
  assert.equal(upgrade.command, 'upgrade');
  assert.deepEqual({ ...upgrade.values }, { network: 'localnet', 'pubfile-path': 'P', out: 'O', 'dry-run': true });
  const record = parseCliArgs(['record', '--upgrade', '--network', 'testnet', '--from', 'U', '--type-origins', 'T', '--meta', 'M']);
  assert.equal(record.command, 'record');
  assert.deepEqual({ ...record.values }, { upgrade: true, network: 'testnet', from: 'U', 'type-origins': 'T', meta: 'M' });
  const invalid = [
    ['upgrade', '--network', 'testnet', '--yes'],
    ['upgrade', '--network', 'testnet', '-y'],
    ['upgrade', '--network', 'testnet', '--force'],
    ['upgrade', '--network', 'testnet', '--skip-verify-compatibility'],
    ['upgrade', '--network', 'testnet', '--upgrade-capability', 'x'],
    ['upgrade', '--network', 'testnet', '-c', 'x'],
    ['upgrade', '--from', 'x.json'],
    ['upgrade', '--type-origins', 'x.json'],
    ['upgrade', '--upgrade'],
    ['publish', '--network', 'localnet', '--upgrade'],
    ['publish', '--network', 'localnet', '--type-origins', 'x'],
    ['check', '--upgrade'],
    ['record', '--network', 'localnet', '--from', 'x', '--type-origins', 'T'],
    ['upgrade', 'testnet'],
  ];
  for (const argv of invalid) assert.throws(() => parseCliArgs(argv), UsageError, JSON.stringify(argv));
});

test('checkPublishArgs con command upgrade: mismas reglas de red, --pubfile-path y --out, con el mensaje de la Receta U', () => {
  const upgrade = { command: 'upgrade' };
  assert.throws(() => checkPublishArgs({ network: 'mainnet' }, upgrade), /--network inválida/);
  assert.throws(() => checkPublishArgs({ network: 'localnet' }, upgrade), /obligatorio en localnet \(la copia del pubfile.*Receta U\)/);
  assert.throws(() => checkPublishArgs({ network: 'testnet', pubfilePath: 'P' }, upgrade), /--pubfile-path no se admite en testnet/);
  assert.throws(() => checkPublishArgs({ network: 'testnet', out: '/tmp/x.json' }, upgrade), /--out no se admite en testnet/);
  assert.throws(() => checkPublishArgs({ network: 'testnet', out: '' }, upgrade), /--out no se admite en testnet/);
  checkPublishArgs({ network: 'localnet', pubfilePath: 'P', out: '/tmp/x.json' }, upgrade);
  checkPublishArgs({ network: 'testnet' }, upgrade);
  // Sin el segundo argumento, el mensaje de la publicación no cambia.
  assert.throws(() => checkPublishArgs({ network: 'localnet' }), /uno nuevo por génesis/);
});

test('main (#73): flags solo-localnet en testnet, pubfile ausente en localnet y record --upgrade sin --type-origins ⇒ exit 1; --type-origins sin --upgrade ⇒ exit 2', async () => {
  const saved = { SUI_CONFIG_DIR: process.env.SUI_CONFIG_DIR, SUI_BIN: process.env.SUI_BIN };
  try {
    delete process.env.SUI_CONFIG_DIR;
    process.env.SUI_BIN = '/nonexistent/sui-bin-de-test';
    const cases = [
      [['upgrade', '--network', 'testnet', '--out', '/tmp/battleship-test/testnet.json'], EXIT.FAILURE, /^--out no se admite en testnet/],
      [['upgrade', '--network', 'testnet', '--pubfile-path', 'P'], EXIT.FAILURE, /^--pubfile-path no se admite en testnet/],
      [['upgrade', '--network', 'localnet'], EXIT.FAILURE, /^--pubfile-path es obligatorio en localnet \(la copia/],
      [['upgrade', '--network', 'mainnet'], EXIT.FAILURE, /^--network inválida: mainnet/],
      [['upgrade', '--network', 'testnet', '--yes'], EXIT.USAGE, /^Uso inválido: Unknown option '--yes'/],
      [['record', '--upgrade', '--network', 'testnet', '--from', '/nonexistent/u.json'], EXIT.FAILURE, /^--type-origins es obligatorio con --upgrade/],
      [
        ['record', '--upgrade', '--network', 'testnet', '--from', '/nonexistent/u.json', '--type-origins', '/nonexistent/o.json', '--out', 'x'],
        EXIT.FAILURE,
        /^--out no se admite en testnet/,
      ],
      [['record', '--network', 'testnet', '--from', 'x', '--type-origins', 'T'], EXIT.USAGE, /^Uso inválido: --type-origins solo aplica a record --upgrade/],
    ];
    for (const [argv, code, message] of cases) {
      const result = await mainCapturingStderr(argv);
      assert.equal(result.code, code, JSON.stringify(argv));
      assert.match(result.stderr, message, JSON.stringify(argv));
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('main (#73): upgrade en testnet, con o sin --dry-run, sin SUI_CONFIG_DIR sale con 1 en la guarda de config, antes de cualquier CLI', async () => {
  // Con un SUI_BIN inexistente: si algún camino llegara a invocar `sui`, el error sería otro ("no se pudo ejecutar sui").
  const saved = { SUI_CONFIG_DIR: process.env.SUI_CONFIG_DIR, SUI_BIN: process.env.SUI_BIN };
  try {
    delete process.env.SUI_CONFIG_DIR;
    process.env.SUI_BIN = '/nonexistent/sui-bin-de-test';
    for (const argv of [
      ['upgrade', '--network', 'testnet'],
      ['upgrade', '--network', 'testnet', '--dry-run'],
      ['upgrade', '--network', 'localnet', '--pubfile-path', '/nonexistent/Pub.toml'],
    ]) {
      const result = await mainCapturingStderr(argv);
      assert.equal(result.code, EXIT.FAILURE, JSON.stringify(argv));
      assert.match(result.stderr, /^SUI_CONFIG_DIR inválido: no está definido/, JSON.stringify(argv));
      assert.ok(!result.stderr.includes('no se pudo ejecutar sui'), JSON.stringify(argv));
    }
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('checkConfirmation: el verbo de la acción cambia el mensaje, no la regla (sin TTY o sin "testnet" aborta)', () => {
  assert.throws(() => checkConfirmation({ isTTY: false, answer: 'testnet', action: 'hacer el upgrade' }), /^Error: hacer el upgrade en testnet exige una terminal interactiva/);
  assert.throws(() => checkConfirmation({ isTTY: true, answer: 'yes', action: 'hacer el upgrade' }), /confirmación no recibida/);
  checkConfirmation({ isTTY: true, answer: 'testnet\n', action: 'hacer el upgrade' });
  assert.throws(() => checkConfirmation({ isTTY: undefined, answer: null }), /^Error: publicar en testnet exige/);
});

test('formatCliFailure con retryAdvice propio: el consejo del upgrade reemplaza al de la publicación', () => {
  const message = formatCliFailure({
    reason: 'x',
    stderr: '',
    dir: '/tmp/d',
    outputPath: '/tmp/d/upgrade-output.json',
    afterPublish: true,
    retryAdvice: 'CONSEJO-DEL-UPGRADE',
  });
  assert.ok(message.endsWith('CONSEJO-DEL-UPGRADE'));
  assert.doesNotMatch(message, /No reintentes sin buscar antes el digest/);
});

// ----- guardas puras del upgrade -----

test('checkUpgradeBase: sin json base, inválido o de otra red ⇒ error claro (el upgrade no inventa ni publica)', () => {
  assert.throws(() => checkUpgradeBase({ network: 'testnet', base: null }), /falta deployments\/testnet\.json.*no la inventa ni publica/);
  assert.throws(() => checkUpgradeBase({ network: 'localnet', base: { ...UPGRADE_BASE, houseId: '0x2' } }), /deployments\/localnet\.json base inválido:\n {2}houseId inválido/);
  assert.throws(() => checkUpgradeBase({ network: 'testnet', base: UPGRADE_BASE }), /es de localnet, no de testnet/);
  checkUpgradeBase({ network: 'localnet', base: UPGRADE_BASE });
  checkUpgradeBase({ network: 'localnet', base: UPGRADED });
});

test('checkUpgradePreconditions: testnet exige árbol limpio, [published.testnet] y un json base coherente con él', () => {
  const valid = { network: 'testnet', gitStatus: '', base: TESTNET_BASE, publishedTomlText: PUBLISHED_TOML_BEFORE };
  checkUpgradePreconditions(valid);
  assert.throws(() => checkUpgradePreconditions({ ...valid, gitStatus: ' M contracts/Move.lock\n' }), /el árbol git no está limpio/);
  assert.throws(() => checkUpgradePreconditions({ ...valid, base: null }), /falta deployments\/testnet\.json/);
  assert.throws(() => checkUpgradePreconditions({ ...valid, publishedTomlText: null }), /falta Published\.toml.*STOP de #8/);
  assert.throws(
    () => checkUpgradePreconditions({ ...valid, publishedTomlText: PUBLISHED_TOML_BEFORE.replace('[published.testnet]', '[published.otra]') }),
    /no tiene \[published\.testnet\]/,
  );
  // El json base y Published.toml ya difieren (p. ej. un upgrade hecho que el json no registró): STOP antes de invocar la CLI.
  assert.throws(
    () => checkUpgradePreconditions({ ...valid, publishedTomlText: PUBLISHED_TOML_AFTER }),
    /no coincide con Published\.toml:\n {2}packageId .*\n {2}packageVersion \(1\) ≠ version/,
  );
  // En localnet no se cruza con Published.toml ni importa el árbol.
  checkUpgradePreconditions({ network: 'localnet', gitStatus: ' M x\n', base: UPGRADE_BASE, publishedTomlText: null });
});

test('checkPubfileGuard (Receta U): source.local = contracts/ sigue; otra ruta aborta con el mensaje de la receta y sin editar nada', () => {
  const realpath = (p) => (p === '<REPO>/contracts' ? CONTRACTS_DIR : p);
  const args = { pubfileText: PUBFILE_TEXT, contractsDir: CONTRACTS_DIR, realpath, base: UPGRADE_BASE };
  assert.deepEqual(checkPubfileGuard(args), { chainId: UPGRADE_LOCALNET_CHAIN_ID });
  // El symlink de contracts/ se resuelve por realpath en ambos lados.
  const viaLink = (p) => (p === '<REPO>/contracts' || p === '/srv/link-a-contracts' ? CONTRACTS_DIR : p);
  assert.deepEqual(
    checkPubfileGuard({ ...args, realpath: viaLink, pubfileText: PUBFILE_TEXT.replace('<REPO>/contracts', '/srv/link-a-contracts') }),
    { chainId: UPGRADE_LOCALNET_CHAIN_ID },
  );
  const wrongTree = (p) => (p === '<REPO>/contracts' ? '/srv/otro-arbol/contracts' : p);
  assert.throws(
    () => checkPubfileGuard({ ...args, realpath: wrongTree }),
    /^Error: el pubfile no corresponde al árbol que se upgradea: ningún source\.local coincide con contracts\/ \(Receta U de agents\.md §3/,
  );
  // Una ruta que no existe (el árbol de otro smoke ya borrado) no coincide: el realpath lanza y se trata como distinta.
  const missing = (p) => {
    if (p === '<REPO>/contracts') throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return p;
  };
  assert.throws(() => checkPubfileGuard({ ...args, realpath: missing }), /no corresponde al árbol/);
  // Un pubfile ilegible falla con su línea.
  assert.throws(() => checkPubfileGuard({ ...args, pubfileText: 'basura\n' }), /^Error: --pubfile-path inválido: pubfile:1: línea inesperada/);
  // Dos entradas para el mismo árbol: ambiguo.
  const block = PUBFILE_TEXT.slice(PUBFILE_TEXT.indexOf('[[published]]'));
  assert.throws(() => checkPubfileGuard({ ...args, pubfileText: `${PUBFILE_TEXT}\n${block}` }), /más de una entrada para contracts\//);
  // Una entrada de otro árbol junto a la correcta no estorba.
  const other = block.replace('<REPO>/contracts', '/srv/otro-arbol/contracts');
  assert.deepEqual(checkPubfileGuard({ ...args, pubfileText: `${PUBFILE_TEXT}\n${other}` }), { chainId: UPGRADE_LOCALNET_CHAIN_ID });
});

test('checkPubfileGuard: el pubfile tiene que ser el del despliegue base (otra génesis o un upgrade que el json no registró)', () => {
  const realpath = (p) => (p === '<REPO>/contracts' ? CONTRACTS_DIR : p);
  const base = { pubfileText: PUBFILE_TEXT, contractsDir: CONTRACTS_DIR, realpath, base: UPGRADE_BASE };
  // Un upgrade que el json no registró: la CLI reescribió el pubfile a la versión 2 y el json sigue en la 1.
  const advanced = PUBFILE_TEXT.replace('version = 1', 'version = 2').replace(`published-at = "${ORIGINAL_PKG}"`, `published-at = "${UPGRADED_PKG}"`);
  assert.throws(() => checkPubfileGuard({ ...base, pubfileText: advanced }), /el pubfile no es el del despliegue base \(published-at, version difieren\)/);
  const otherCap = PUBFILE_TEXT.replace(UPGRADE_CAP, `0x${'ee'.repeat(32)}`);
  assert.throws(() => checkPubfileGuard({ ...base, pubfileText: otherCap }), /\(upgrade-capability difieren\)/);
  const otherOriginal = PUBFILE_TEXT.replace(`original-id = "${ORIGINAL_PKG}"`, `original-id = "0x${'dd'.repeat(32)}"`);
  assert.throws(() => checkPubfileGuard({ ...base, pubfileText: otherOriginal }), /\(original-id difieren\)/);
  // Con un despliegue base ya upgradeado, el pubfile de la versión 2 sí coincide.
  const v2 = PUBFILE_TEXT.replace('version = 1', 'version = 2').replace(`published-at = "${ORIGINAL_PKG}"`, `published-at = "${UPGRADED_PKG}"`);
  assert.deepEqual(checkPubfileGuard({ ...base, pubfileText: v2, base: UPGRADED }), { chainId: UPGRADE_LOCALNET_CHAIN_ID });
});

test('checkUpgradeChain: el json base y el pubfile son de la cadena del env activo', () => {
  checkUpgradeChain({ base: UPGRADE_BASE, chainId: UPGRADE_LOCALNET_CHAIN_ID, pubfileChainId: UPGRADE_LOCALNET_CHAIN_ID });
  checkUpgradeChain({ base: UPGRADE_BASE, chainId: UPGRADE_LOCALNET_CHAIN_ID });
  assert.throws(() => checkUpgradeChain({ base: UPGRADE_BASE, chainId: 'cb1e492c' }), /el despliegue base es de otra cadena/);
  assert.throws(
    () => checkUpgradeChain({ base: UPGRADE_BASE, chainId: UPGRADE_LOCALNET_CHAIN_ID, pubfileChainId: 'cb1e492c' }),
    /el pubfile es de otra génesis/,
  );
  assert.throws(() => checkUpgradeChain({ base: UPGRADE_BASE, chainId: UPGRADE_LOCALNET_CHAIN_ID, pubfileChainId: null }), /el pubfile es de otra génesis/);
});

test('parseUpgradeRaw: el upgrade real se interpreta; un error de la CLI o una salida sin cambio de paquete ("digest inexistente") fallan claro', () => {
  const parsed = parseUpgradeRaw(UPGRADE_RAW_TEXT);
  assert.equal(parsed.packageId, UPGRADED_PKG);
  assert.equal(parsed.digest, UPGRADE_DIGEST);
  // El error real de reintentar con el pubfile viejo (texto, no JSON).
  assert.throws(() => parseUpgradeRaw(RETRY_ERROR_TEXT), /^Error: la salida cruda es un error de la CLI .*no hay upgrade que registrar$/);
  assert.throws(() => parseUpgradeRaw(`Error executing transaction '${PUBLISH.digest}': algo`), /es un error de la CLI/);
  assert.throws(() => parseUpgradeRaw('Transaction not found'), /es un error de la CLI/);
  assert.throws(() => parseUpgradeRaw('hola'), /no es JSON ni un error de la CLI reconocido/);
  assert.throws(() => parseUpgradeRaw(''), /no es JSON ni un error de la CLI reconocido/);
  // JSON sin el cambio de paquete (otra transacción), fallida, o una publicación.
  const noPackage = JSON.parse(UPGRADE_RAW_TEXT);
  noPackage.objectChanges = noPackage.objectChanges.filter((c) => c.type !== 'published');
  assert.throws(() => parseUpgradeRaw(JSON.stringify(noPackage)), /no es un upgrade registrable: no trae el cambio de paquete/);
  const failed = JSON.parse(UPGRADE_RAW_TEXT);
  failed.effects.status = { status: 'failure', error: 'PackageUpgradeError' };
  assert.throws(() => parseUpgradeRaw(JSON.stringify(failed)), /no es un upgrade registrable: la transacción no terminó en success/);
  assert.throws(() => parseUpgradeRaw(PUBLISH_TEXT), /no es un upgrade registrable/);
  assert.throws(() => parseUpgradeRaw('null'), /no es un upgrade registrable/);
  // Nunca cita la salida (puede traer cuentas).
  for (const text of [RETRY_ERROR_TEXT, 'hola', JSON.stringify(failed)]) {
    try {
      parseUpgradeRaw(text);
    } catch (error) {
      assert.ok(!error.message.includes('GH5sBfbPhhNwiJ4uQXgzP5agEfqx6nYgtSxRuH3trKKQ'));
    }
  }
});

test('formatUpgradeSummary y formatPostUpgradeFailure: IDs y digests públicos, los pasos que siguen y ninguna dirección de cuenta', () => {
  const summary = formatUpgradeSummary({ base: UPGRADE_BASE, deployment: UPGRADED, outPath: '/tmp/out/localnet.json', dir: '/tmp/battleship-upgrade-x' });
  assert.ok(summary.includes('packageVersion: 1 → 2'));
  assert.ok(summary.includes(`packageId: ${ORIGINAL_PKG} → ${UPGRADED_PKG}`));
  assert.ok(summary.includes(`upgrades[0]: version 2, packageId ${UPGRADED_PKG}, txDigest ${UPGRADE_DIGEST}`));
  assert.ok(summary.includes('typeOrigins: 24 tipos, 11 definidos en un upgrade'));
  assert.match(summary, /bórralo cuando termines/);
  assert.match(summary, /git diff -- contracts\/Published\.toml/);
  assert.match(summary, /gRPC o GraphQL público/);
  assert.doesNotMatch(summary, /^\s*sui client/m);
  const [address] = [...new Set([...UPGRADE_RAW_TEXT.matchAll(/"(?:sender|AddressOwner)":\s*"0x([0-9a-f]{64})"/g)].map((m) => m[1]))];
  assert.ok(address);
  assert.ok(!summary.toLowerCase().includes(address));
  assert.ok(!formatUpgradeSummary({ base: UPGRADE_BASE, deployment: UPGRADED, outPath: '/o', dir: null }).includes('bórralo'));
  const failure = formatPostUpgradeFailure({
    reason: `la tabla no se pudo leer (sender 0x${address})`,
    network: 'testnet',
    digest: UPGRADE_DIGEST,
    dir: '/tmp/battleship-upgrade-x',
    outputPath: '/tmp/battleship-upgrade-x/upgrade-output.json',
  });
  assert.ok(failure.includes(`El upgrade ya se ejecutó (digest ${UPGRADE_DIGEST}): no lo repitas.`));
  assert.ok(
    failure.includes(
      'node scripts/publish.mjs record --upgrade --network testnet --from /tmp/battleship-upgrade-x/upgrade-output.json ' +
        '--type-origins /tmp/battleship-upgrade-x/object-output.json',
    ),
  );
  assert.match(failure, /es STOP: no registres ni reintentes/);
  assert.ok(!failure.toLowerCase().includes(address));
});

// ----- commandUpgrade: localnet (variantes A y B) -----

test('upgrade en localnet, variante A (--out): escribe solo ahí el json de la fixture, con los vectores previstos y nada prohibido', async () => {
  const h = upgradeHarness();
  await commandUpgrade(LOCALNET_VALUES, h.io);
  assert.deepEqual(h.effects.written, [['/srv/smoke/localnet.json', UPGRADED]]);
  assert.equal(`${JSON.stringify(h.effects.written[0][1], null, 2)}\n`, UPGRADED_TEXT);
  assert.deepEqual(h.suiCalls(), [
    'client --json active-env',
    'client --json chain-identifier',
    '--version',
    SUI_REAL_TEST_UPGRADE,
    SUI_OBJECT,
  ]);
  // Un solo upgrade real, y ninguna transacción de testnet.
  assert.equal(h.suiCalls().filter((c) => c.includes('upgrade') && !c.includes('--dry-run')).length, 1);
  assert.ok(!h.suiCalls().includes(SUI_REAL_UPGRADE) && !h.suiCalls().includes(SUI_DRY_UPGRADE));
  assertSafeCalls(h.calls);
  assert.equal(h.effects.asked, 0);
  // Las salidas crudas se guardan antes de interpretarlas (R-2): el meta.json, el upgrade y la tabla de orígenes.
  const kept = [...h.effects.kept.keys()].map((k) => path.basename(k));
  assert.deepEqual(kept, ['meta.json', 'upgrade-output.json', 'upgrade-stderr.txt', 'object-output.json', 'object-stderr.txt']);
  assert.equal(h.effects.kept.get('/tmp/battleship-upgrade-test/upgrade-output.json'), UPGRADE_RAW_TEXT);
  assert.deepEqual(JSON.parse(h.effects.kept.get('/tmp/battleship-upgrade-test/meta.json')), {
    network: 'localnet',
    chainId: UPGRADE_LOCALNET_CHAIN_ID,
    sourceCommit: HEAD_SHA,
    suiCliVersion: '1.84.0-9dc25070cf2e',
    frameworkRev: 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
  });
  assert.match(h.effects.out.join('\n'), /Upgrade registrado en \/srv\/smoke\/localnet\.json/);
  assert.deepEqual(h.effects.warns, []);
});

test('upgrade en localnet, variante B (sin --out): reescribe contracts/deployments/localnet.json con upgrades y typeOrigins', async () => {
  const h = upgradeHarness();
  await commandUpgrade({ network: 'localnet', 'pubfile-path': SMOKE_PUBFILE }, h.io);
  assert.equal(h.effects.written.length, 1);
  const [outPath, deployment] = h.effects.written[0];
  assert.equal(outPath, DEPLOYMENTS_LOCALNET);
  assert.deepEqual(deployment, UPGRADED);
  assert.equal(deployment.packageVersion, 2);
  assert.equal(deployment.upgrades.length, 1);
  assert.equal(deployment.typeOrigins.length, 24);
  // Mismo contenido que la variante A.
  const a = upgradeHarness();
  await commandUpgrade(LOCALNET_VALUES, a.io);
  assert.deepEqual(a.effects.written[0][1], deployment);
});

test('upgrade en localnet con árbol sucio: sourceCommit null (como publish); los campos base se conservan y solo cambia la versión vigente', async () => {
  const h = upgradeHarness({ routes: { 'git status --porcelain': ok(' M contracts/scripts/publish.mjs\n') } });
  await commandUpgrade(LOCALNET_VALUES, h.io);
  const [, deployment] = h.effects.written[0];
  assert.equal(deployment.sourceCommit, null);
  assert.ok(!h.calls.some((c) => c.bin === 'git' && c.args[0] === 'rev-parse'));
  for (const key of ['originalPackageId', 'upgradeCapId', 'houseId', 'houseCapId', 'publishTxDigest', 'publishTimestamp', 'chainId']) {
    assert.equal(deployment[key], UPGRADE_BASE[key], key);
  }
  assert.equal(deployment.packageId, UPGRADED_PKG);
});

test('upgrade en localnet con --dry-run: dry run ok, sin upgrade real, sin json y sin confirmación', async () => {
  const h = upgradeHarness();
  await commandUpgrade({ ...LOCALNET_VALUES, 'dry-run': true }, h.io);
  assert.deepEqual(h.effects.written, []);
  assert.deepEqual(h.suiCalls(), ['client --json active-env', 'client --json chain-identifier', '--version', SUI_DRY_TEST_UPGRADE]);
  assert.match(h.effects.out.join('\n'), /Dry run ok\. Gas estimado: 46600163 MIST\./);
  assert.equal(h.effects.asked, 0);
  assertSafeCalls(h.calls);
});

test('upgrade: sin deployments/<red>.json base aborta con el mensaje claro y sin invocar sui', async () => {
  const h = upgradeHarness({ files: { [DEPLOYMENTS_LOCALNET]: null } });
  delete h.state.files[DEPLOYMENTS_LOCALNET];
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, h.io), /falta deployments\/localnet\.json.*no la inventa ni publica/);
  assert.deepEqual(h.suiCalls(), []);
  assert.deepEqual(h.effects.written, []);
  const t = upgradeHarness({ network: 'testnet' });
  delete t.state.files[DEPLOYMENTS_TESTNET];
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, t.io), /falta deployments\/testnet\.json/);
  assert.deepEqual(t.suiCalls(), []);
});

test('upgrade: un json base que no es JSON válido o es inválido aborta sin invocar sui', async () => {
  const broken = upgradeHarness({ files: { [DEPLOYMENTS_LOCALNET]: '{' } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, broken.io), /deployments\/localnet\.json no es JSON válido/);
  const invalid = upgradeHarness({ files: { [DEPLOYMENTS_LOCALNET]: JSON.stringify({ ...UPGRADE_BASE, sender: '0x1' }) } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, invalid.io), /base inválido:\n {2}clave desconocida: sender/);
  assert.deepEqual([...broken.suiCalls(), ...invalid.suiCalls()], []);
});

test('upgrade (Receta U): con un pubfile cuyo source.local apunta a otra ruta aborta con el mensaje de la receta y sin invocar sui', async () => {
  const wrong = upgradeHarness({ realpath: (p) => (p === '<REPO>/contracts' ? '/srv/otro-arbol/contracts' : p) });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, wrong.io), /Receta U de agents\.md §3/);
  assert.deepEqual(wrong.suiCalls(), []);
  assert.deepEqual(wrong.effects.written, []);
  // El pubfile se lee y no se edita: nada se guarda ni se escribe.
  assert.deepEqual([...wrong.effects.kept.keys()], []);
  // Con la ruta correcta, sigue (ver los tests de las variantes A y B).
  const right = upgradeHarness();
  await commandUpgrade(LOCALNET_VALUES, right.io);
  assert.equal(right.effects.written.length, 1);
  // Un pubfile inexistente tampoco invoca la CLI.
  const none = upgradeHarness();
  delete none.state.files[SMOKE_PUBFILE];
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, none.io), /--pubfile-path no existe/);
  assert.deepEqual(none.suiCalls(), []);
});

test('upgrade: un pubfile ya avanzado (el json no registró el upgrade) o de otra génesis aborta antes de pagar gas', async () => {
  const advanced = PUBFILE_TEXT.replace('version = 1', 'version = 2').replace(`published-at = "${ORIGINAL_PKG}"`, `published-at = "${UPGRADED_PKG}"`);
  const h = upgradeHarness({ files: { [SMOKE_PUBFILE]: advanced } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, h.io), /el pubfile no es el del despliegue base/);
  assert.deepEqual(h.suiCalls(), []);
  // Otra génesis: el pubfile coincide con el json pero su chain-id no es el del env activo.
  const otherChain = upgradeHarness({ files: { [SMOKE_PUBFILE]: PUBFILE_TEXT.replace('chain-id = "13c5acea"', 'chain-id = "cb1e492c"') } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, otherChain.io), /el pubfile es de otra génesis \(chain-id cb1e492c\)/);
  assert.deepEqual(otherChain.suiCalls(), ['client --json active-env', 'client --json chain-identifier']);
  assert.deepEqual(otherChain.effects.written, []);
});

test('upgrade: el despliegue base de otra cadena, o un env activo que no es --network, aborta antes del dry run y del upgrade', async () => {
  const otherBase = upgradeHarness({ files: { [DEPLOYMENTS_LOCALNET]: JSON.stringify({ ...UPGRADE_BASE, chainId: 'cb1e492c' }, null, 2) } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, otherBase.io), /el despliegue base es de otra cadena/);
  assert.deepEqual(otherBase.suiCalls(), ['client --json active-env', 'client --json chain-identifier']);
  const wrongEnv = upgradeHarness({ routes: { 'client --json active-env': ok('"testnet"\n') } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, wrongEnv.io), /el env activo de la CLI \(testnet\) no es localnet/);
  assert.deepEqual(wrongEnv.suiCalls(), ['client --json active-env']);
  const testnetChainOnLocalnet = upgradeHarness({
    routes: { 'client --json chain-identifier': ok(JSON.stringify({ base58: 'x', hex: TESTNET_CHAIN_ID })) },
  });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, testnetChainOnLocalnet.io), /localnet no puede/);
  assert.deepEqual(testnetChainOnLocalnet.effects.written, []);
});

test('upgrade: la guarda de config rechaza una config ausente o dentro de ~/.sui antes de leer nada o invocar la CLI', async () => {
  for (const env of [{}, { SUI_CONFIG_DIR: '' }, { SUI_CONFIG_DIR: 'net' }, { SUI_CONFIG_DIR: `${HOME}/.sui/sui_config` }]) {
    const h = upgradeHarness({ env });
    await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, h.io), /^Error: SUI_CONFIG_DIR inválido: /, JSON.stringify(env));
    assert.deepEqual(h.calls, [], JSON.stringify(env));
  }
});

test('upgrade: una CLI de otra versión que ci.yml es solo un aviso en localnet y error en testnet', async () => {
  const local = upgradeHarness({ routes: { '--version': ok('sui 1.83.0-16d2dc1e05ed\n') } });
  await commandUpgrade(LOCALNET_VALUES, local.io);
  assert.match(local.effects.warns.join('\n'), /no es la de ci\.yml/);
  assert.equal(local.effects.written.length, 1);
  const testnet = upgradeHarness({ network: 'testnet', isTTY: true, routes: { '--version': ok('sui 1.83.0-16d2dc1e05ed\n') } });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, testnet.io), /no es la de ci\.yml/);
  assert.ok(!testnet.suiCalls().includes(SUI_DRY_UPGRADE) && !testnet.suiCalls().includes(SUI_REAL_UPGRADE));
});

test('upgrade: un dry run con otra versión (el json base no es el estado de la cadena) o un error de compatibilidad ⇒ STOP, nunca --skip-verify-compatibility', async () => {
  const stale = upgradeHarness({ routes: { [SUI_DRY_TEST_UPGRADE]: ok(dryRunTextFor({ version: 3 })) } });
  await assert.rejects(() => commandUpgrade({ ...LOCALNET_VALUES, 'dry-run': true }, stale.io), /daría la versión 3 \(se esperaba la 2\).*¿ya se hizo este upgrade\?/);
  const otherCap = upgradeHarness({ routes: { [SUI_DRY_TEST_UPGRADE]: ok(dryRunTextFor({ cap: `0x${'ee'.repeat(32)}` })) } });
  await assert.rejects(() => commandUpgrade({ ...LOCALNET_VALUES, 'dry-run': true }, otherCap.io), /avanzaría otro UpgradeCap/);
  const incompatible = JSON.parse(UPGRADE_DRY_RUN_TEXT);
  incompatible.effects.status = { status: 'failure', error: 'IncompatibleUpgrade' };
  const failed = upgradeHarness({ routes: { [SUI_DRY_TEST_UPGRADE]: ok(JSON.stringify(incompatible)) } });
  await assert.rejects(
    () => commandUpgrade({ ...LOCALNET_VALUES, 'dry-run': true }, failed.io),
    /un error de compatibilidad es STOP, nunca --skip-verify-compatibility/,
  );
  for (const h of [stale, otherCap, failed]) {
    assert.deepEqual(h.effects.written, []);
    assertSafeCalls(h.calls);
  }
});

test('upgrade: una CLI que falla muestra el stderr sin direcciones ni la ruta de la config, con el consejo del upgrade, y no escribe el json', async () => {
  const [address] = ACCOUNT_ADDRESSES;
  const stderr = `cannot open ${CONFIG_DIR}/sui.keystore for 0x${address}\n`;
  const h = upgradeHarness({ routes: { [SUI_REAL_TEST_UPGRADE]: { status: 1, stdout: `Error executing transaction '${PUBLISH.digest}': PackageUpgradeError`, stderr } } });
  await assert.rejects(
    () => commandUpgrade(LOCALNET_VALUES, h.io),
    (error) => {
      assert.match(error.message, /la CLI terminó con estado 1/);
      assert.ok(error.message.includes(`Digest de la transacción: ${PUBLISH.digest}`));
      assert.match(error.message, /No reintentes el upgrade sin buscar antes el digest.*PackageIDDoesNotMatch.*record --upgrade/);
      assert.doesNotMatch(error.message, /No reintentes sin buscar antes el digest/);
      assert.ok(error.message.includes('<SUI_CONFIG_DIR>/sui.keystore'));
      assert.ok(!error.message.includes(CONFIG_DIR));
      assertNoAccountAddress(error.message);
      return true;
    },
  );
  assert.deepEqual(h.effects.written, []);
  // El stdout y el stderr crudos quedan guardados (0600) aunque falle.
  assert.ok(h.effects.kept.has('/tmp/battleship-upgrade-test/upgrade-output.json'));
});

test('upgrade: si falla la lectura de la tabla de orígenes después del upgrade, el mensaje dice que ya se ejecutó y cómo rearmar con record --upgrade', async () => {
  const h = upgradeHarness({ routes: { [SUI_OBJECT]: { status: 1, stdout: '', stderr: 'object not found' } } });
  await assert.rejects(
    () => commandUpgrade(LOCALNET_VALUES, h.io),
    (error) => {
      assert.ok(error.message.includes(`El upgrade ya se ejecutó (digest ${UPGRADE_DIGEST}): no lo repitas.`));
      assert.match(error.message, /record --upgrade --network localnet --from \/tmp\/battleship-upgrade-test\/upgrade-output\.json --type-origins \/tmp\/battleship-upgrade-test\/object-output\.json/);
      return true;
    },
  );
  assert.deepEqual(h.effects.written, []);
  // Una tabla de otro paquete tampoco se registra.
  const wrongTable = JSON.parse(OBJECT_RAW_TEXT);
  wrongTable.objectId = ORIGINAL_PKG;
  const other = upgradeHarness({ routes: { [SUI_OBJECT]: ok(JSON.stringify(wrongTable)) } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, other.io), /es de otro paquete.*El upgrade ya se ejecutó/s);
  assert.deepEqual(other.effects.written, []);
});

test('upgrade: el UpgradeCap que avanzó la transacción real tiene que ser el del json base (si no, no se registra)', async () => {
  const raw = JSON.parse(UPGRADE_RAW_TEXT);
  raw.objectChanges.find((c) => String(c.objectType).endsWith('::package::UpgradeCap')).objectId = `0x${'ee'.repeat(32)}`;
  const h = upgradeHarness({ routes: { [SUI_REAL_TEST_UPGRADE]: ok(JSON.stringify(raw)) } });
  await assert.rejects(() => commandUpgrade(LOCALNET_VALUES, h.io), /UpgradeCap que avanzó el upgrade no es el upgradeCapId.*El upgrade ya se ejecutó/s);
  assert.deepEqual(h.effects.written, []);
});

// ----- commandUpgrade: testnet (con spawn inyectado: el vector real de testnet nunca corre de verdad) -----

test('upgrade en testnet con TTY y "testnet": dry run → confirmación → upgrade → lectura de orígenes → json coherente con Published.toml', async () => {
  const h = upgradeHarness({ network: 'testnet', isTTY: true });
  await commandUpgrade({ network: 'testnet' }, h.io);
  assert.deepEqual(h.suiCalls(), [
    'client --json active-env',
    'client --json chain-identifier',
    '--version',
    SUI_DRY_UPGRADE,
    SUI_REAL_UPGRADE,
    SUI_OBJECT,
  ]);
  assert.equal(h.effects.asked, 1);
  assert.deepEqual(h.effects.written, [[DEPLOYMENTS_TESTNET, TESTNET_UPGRADED]]);
  assert.deepEqual(validateDeployment(TESTNET_UPGRADED), []);
  assert.match(h.effects.out.join('\n'), /Dry run ok\. Gas estimado: 46600163 MIST\./);
  assertSafeCalls(h.calls);
  assert.deepEqual(h.effects.warns, []);
});

test('upgrade en testnet: la transacción real va siempre después de la confirmación; sin TTY o con otra respuesta no se envía', async () => {
  const noTty = upgradeHarness({ network: 'testnet', isTTY: false });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, noTty.io), /^Error: hacer el upgrade en testnet exige una terminal interactiva \(sin TTY: abortado\)/);
  assert.equal(noTty.effects.asked, 0);
  assert.ok(!noTty.suiCalls().includes(SUI_REAL_UPGRADE));
  const undef = upgradeHarness({ network: 'testnet', isTTY: undefined });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, undef.io), /terminal interactiva/);
  assert.ok(!undef.suiCalls().includes(SUI_REAL_UPGRADE));
  for (const answer of ['yes', 'y', '', 'Testnet ', 'localnet', '--yes']) {
    const wrong = upgradeHarness({ network: 'testnet', isTTY: true, answer });
    await assert.rejects(() => commandUpgrade({ network: 'testnet' }, wrong.io), /confirmación no recibida: abortado/, answer);
    assert.equal(wrong.effects.asked, 1);
    assert.ok(!wrong.suiCalls().includes(SUI_REAL_UPGRADE), answer);
    assert.deepEqual(wrong.effects.written, [], answer);
  }
  // Ninguna variable de entorno la omite.
  const saved = Object.fromEntries(['CI', 'SUI_PUBLISH_YES', 'YES', 'FORCE'].map((v) => [v, process.env[v]]));
  try {
    for (const v of Object.keys(saved)) process.env[v] = '1';
    const envHarness = upgradeHarness({ network: 'testnet', isTTY: false, env: { SUI_CONFIG_DIR: CONFIG_DIR, CI: '1', YES: '1', FORCE: '1' } });
    await assert.rejects(() => commandUpgrade({ network: 'testnet' }, envHarness.io), /terminal interactiva/);
    assert.ok(!envHarness.suiCalls().includes(SUI_REAL_UPGRADE));
  } finally {
    for (const [v, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[v];
      else process.env[v] = value;
    }
  }
});

test('upgrade en testnet con --dry-run: no pide confirmación, no envía el upgrade real y no escribe nada', async () => {
  const h = upgradeHarness({ network: 'testnet', isTTY: false });
  await commandUpgrade({ network: 'testnet', 'dry-run': true }, h.io);
  assert.equal(h.effects.asked, 0);
  assert.deepEqual(h.suiCalls(), ['client --json active-env', 'client --json chain-identifier', '--version', SUI_DRY_UPGRADE]);
  assert.deepEqual(h.effects.written, []);
  assert.match(h.effects.out.join('\n'), /Dry run ok/);
  assertSafeCalls(h.calls);
});

test('upgrade en testnet: árbol sucio, sin testnet.json, sin [published.testnet] o un json que no coincide con Published.toml abortan sin invocar sui', async () => {
  const dirty = upgradeHarness({ network: 'testnet', isTTY: true, routes: { 'git status --porcelain': ok(' M contracts/Move.lock\n') } });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, dirty.io), /el árbol git no está limpio/);
  const noJson = upgradeHarness({ network: 'testnet', isTTY: true });
  delete noJson.state.files[DEPLOYMENTS_TESTNET];
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, noJson.io), /falta deployments\/testnet\.json/);
  const noToml = upgradeHarness({ network: 'testnet', isTTY: true });
  delete noToml.state.files[PUBLISHED_TOML_PATH];
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, noToml.io), /falta Published\.toml/);
  const noEntry = upgradeHarness({
    network: 'testnet',
    isTTY: true,
    files: { [PUBLISHED_TOML_PATH]: PUBLISHED_TOML_BEFORE.replace('[published.testnet]', '[published.localnet]') },
  });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, noEntry.io), /no tiene \[published\.testnet\]/);
  const drifted = upgradeHarness({ network: 'testnet', isTTY: true, files: { [PUBLISHED_TOML_PATH]: PUBLISHED_TOML_AFTER } });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, drifted.io), /no coincide con Published\.toml/);
  for (const h of [dirty, noJson, noToml, noEntry, drifted]) {
    assert.deepEqual(h.suiCalls(), []);
    assert.equal(h.effects.asked, 0);
    assert.deepEqual(h.effects.written, []);
  }
});

test('upgrade en testnet: los flags solo-localnet (--out, --pubfile-path) se rechazan antes de cualquier cosa', async () => {
  for (const values of [
    { network: 'testnet', out: '/tmp/x.json' },
    { network: 'testnet', out: '' },
    { network: 'testnet', 'pubfile-path': SMOKE_PUBFILE },
  ]) {
    const h = upgradeHarness({ network: 'testnet', isTTY: true });
    await assert.rejects(() => commandUpgrade(values, h.io), /no se admite en testnet/, JSON.stringify(values));
    assert.deepEqual(h.calls, []);
  }
});

test('upgrade en testnet: si Published.toml no cambió como se espera, el json NO se escribe y el mensaje dice STOP, el digest y record --upgrade', async () => {
  // La CLI "no reescribió" Published.toml (o lo dejó distinto): el script no lo arregla ni registra.
  const h = upgradeHarness({ network: 'testnet', isTTY: true, routes: { [SUI_REAL_UPGRADE]: ok(UPGRADE_RAW_TEXT) } });
  await assert.rejects(
    () => commandUpgrade({ network: 'testnet' }, h.io),
    (error) => {
      assert.match(error.message, /el json armado no coincide con Published\.toml \(no se escribió el json\):\n {2}packageId .*\n {2}packageVersion \(2\) ≠ version/);
      assert.ok(error.message.includes(`El upgrade ya se ejecutó (digest ${UPGRADE_DIGEST}): no lo repitas.`));
      assert.match(error.message, /record --upgrade --network testnet/);
      assert.match(error.message, /es STOP: no registres ni reintentes/);
      return true;
    },
  );
  assert.deepEqual(h.effects.written, []);
  // También si Published.toml quedó con otro `published-at` (p. ej. un upgrade ajeno) o desapareció.
  const other = upgradeHarness({
    network: 'testnet',
    isTTY: true,
    routes: {
      [SUI_REAL_UPGRADE]: (state) => {
        state.files[PUBLISHED_TOML_PATH] = testnetPublishedToml({ publishedAt: `0x${'ee'.repeat(32)}`, version: 2, toolchain: '1.84.0' });
        return ok(UPGRADE_RAW_TEXT);
      },
    },
  });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, other.io), /no se escribió el json/);
  const gone = upgradeHarness({
    network: 'testnet',
    isTTY: true,
    routes: {
      [SUI_REAL_UPGRADE]: (state) => {
        delete state.files[PUBLISHED_TOML_PATH];
        return ok(UPGRADE_RAW_TEXT);
      },
    },
  });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, gone.io), /falta \[published\.testnet\] en Published\.toml \(no se escribió el json\)/);
  assert.deepEqual([...other.effects.written, ...gone.effects.written], []);
});

test('upgrade en testnet: un dry run que cambia Move.lock es error (repin pendiente, H13) y no se envía el upgrade', async () => {
  const h = upgradeHarness({
    network: 'testnet',
    isTTY: true,
    routes: {
      [SUI_DRY_UPGRADE]: (state) => {
        state.files[LOCK_PATH] = `${REAL_LOCK_TEXT}# repin\n`;
        return ok(dryRunTextFor());
      },
    },
  });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, h.io), /repin pendiente \(H13\)/);
  assert.ok(!h.suiCalls().includes(SUI_REAL_UPGRADE));
  assert.equal(h.effects.asked, 0);
});

test('upgrade en testnet: un error del dry run (p. ej. compatibilidad) corta antes de la confirmación y del upgrade', async () => {
  const incompatible = JSON.parse(UPGRADE_DRY_RUN_TEXT);
  incompatible.effects.status = { status: 'failure', error: 'EUC01009' };
  const h = upgradeHarness({ network: 'testnet', isTTY: true, routes: { [SUI_DRY_UPGRADE]: ok(JSON.stringify(incompatible)) } });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, h.io), /nunca --skip-verify-compatibility/);
  const failing = upgradeHarness({
    network: 'testnet',
    isTTY: true,
    routes: { [SUI_DRY_UPGRADE]: { status: 1, stdout: 'EUC01009 friend mismatch', stderr: '' } },
  });
  await assert.rejects(() => commandUpgrade({ network: 'testnet' }, failing.io), /la CLI terminó con estado 1/);
  for (const x of [h, failing]) {
    assert.ok(!x.suiCalls().includes(SUI_REAL_UPGRADE));
    assert.equal(x.effects.asked, 0);
    assertSafeCalls(x.calls);
  }
});

// ----- record --upgrade (offline) -----

const RECORD_FLAGS = {
  network: 'localnet',
  upgrade: true,
  from: '/srv/raw/upgrade-output.json',
  'type-origins': '/srv/raw/object-output.json',
  'chain-id': UPGRADE_LOCALNET_CHAIN_ID,
  'source-commit': HEAD_SHA,
  'sui-cli-version': '1.84.0-9dc25070cf2e',
  'framework-rev': 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
  out: '/srv/smoke/localnet.json',
};
const recordHarness = (options = {}) =>
  upgradeHarness({
    ...options,
    files: {
      '/srv/raw/upgrade-output.json': UPGRADE_RAW_TEXT,
      '/srv/raw/object-output.json': OBJECT_RAW_TEXT,
      ...(options.files ?? {}),
    },
    // Un spawn que falla si se lo llama: `record --upgrade` es offline (ni la CLI ni git ni la red).
    forbidSpawn: true,
  });

test('record --upgrade rearma offline el mismo json que escribió upgrade, sin invocar sui, git ni la red', () => {
  const h = recordHarness();
  commandRecordUpgrade(RECORD_FLAGS, h.io);
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.effects.written, [['/srv/smoke/localnet.json', UPGRADED]]);
  assert.equal(`${JSON.stringify(h.effects.written[0][1], null, 2)}\n`, UPGRADED_TEXT);
  assert.match(h.effects.out.join('\n'), /Upgrade registrado en \/srv\/smoke\/localnet\.json/);
});

test('record --upgrade: el json es idéntico al de upgrade con los mismos datos (variante A y record)', async () => {
  const viaUpgrade = upgradeHarness();
  await commandUpgrade(LOCALNET_VALUES, viaUpgrade.io);
  const viaRecord = recordHarness();
  commandRecordUpgrade(RECORD_FLAGS, viaRecord.io);
  assert.equal(JSON.stringify(viaRecord.effects.written[0][1]), JSON.stringify(viaUpgrade.effects.written[0][1]));
});

test('record --upgrade usa el meta.json que dejó upgrade junto a la salida cruda (como record), sin los cuatro flags', () => {
  const meta = {
    network: 'localnet',
    chainId: UPGRADE_LOCALNET_CHAIN_ID,
    sourceCommit: HEAD_SHA,
    suiCliVersion: '1.84.0-9dc25070cf2e',
    frameworkRev: 'e6f43880f4b65e2c1f0397583a9690b4b22c9223',
  };
  const h = recordHarness({ files: { '/srv/raw/meta.json': JSON.stringify(meta) } });
  const { 'chain-id': _c, 'source-commit': _s, 'sui-cli-version': _v, 'framework-rev': _f, ...values } = RECORD_FLAGS;
  commandRecordUpgrade(values, h.io);
  assert.deepEqual(h.effects.written[0][1], UPGRADED);
  // Sin meta.json ni flags falla como record.
  const none = recordHarness();
  assert.throws(() => commandRecordUpgrade(values, none.io), /sin meta\.json se exigen/);
  assert.deepEqual(none.effects.written, []);
});

test('record --upgrade: argumentos faltantes, base ausente, salida de error de la CLI o sin cambio de paquete ("digest inexistente") fallan claro y sin escribir', () => {
  const run = (change, options) => {
    const h = recordHarness(options);
    const values = { ...RECORD_FLAGS, ...change };
    for (const [key, value] of Object.entries(change)) if (value === undefined) delete values[key];
    return { h, run: () => commandRecordUpgrade(values, h.io) };
  };
  const cases = [
    ['sin --type-origins', { 'type-origins': undefined }, undefined, /--type-origins es obligatorio con --upgrade/],
    ['sin --from', { from: undefined }, undefined, /--from es obligatorio/],
    ['--from inexistente', { from: '/srv/raw/nada.json' }, undefined, /--from no existe/],
    ['--type-origins inexistente', { 'type-origins': '/srv/raw/nada.json' }, undefined, /--type-origins no existe/],
    ['--meta inexistente', { meta: '/srv/raw/nada-meta.json' }, undefined, /--meta no existe/],
    ['red inválida', { network: 'mainnet' }, undefined, /--network inválida/],
    ['chain id ajeno', { 'chain-id': TESTNET_CHAIN_ID }, undefined, /localnet no puede/],
    ['chain id de otra cadena que la del base', { 'chain-id': 'cb1e492c' }, undefined, /el despliegue base es de otra cadena/],
    ['--out en testnet', { network: 'testnet', 'chain-id': TESTNET_CHAIN_ID }, undefined, /--out no se admite en testnet/],
    [
      'salida cruda = error real de la CLI (reintento con el pubfile viejo)',
      {},
      { files: { '/srv/raw/upgrade-output.json': RETRY_ERROR_TEXT } },
      /la salida cruda es un error de la CLI .* no hay upgrade que registrar/,
    ],
    ['salida cruda que no es JSON', {}, { files: { '/srv/raw/upgrade-output.json': 'hola' } }, /no es JSON ni un error de la CLI reconocido/],
    [
      'salida cruda sin el cambio de paquete',
      {},
      {
        files: {
          '/srv/raw/upgrade-output.json': JSON.stringify({
            ...JSON.parse(UPGRADE_RAW_TEXT),
            objectChanges: JSON.parse(UPGRADE_RAW_TEXT).objectChanges.filter((c) => c.type !== 'published'),
          }),
        },
      },
      /no es un upgrade registrable: no trae el cambio de paquete/,
    ],
    ['--type-origins que no es JSON', {}, { files: { '/srv/raw/object-output.json': 'x' } }, /--type-origins no es JSON válido/],
    ['tabla de orígenes vacía', {}, { files: { '/srv/raw/object-output.json': JSON.stringify({ ...JSON.parse(OBJECT_RAW_TEXT), content: { Package: { ...JSON.parse(OBJECT_RAW_TEXT).content.Package, type_origin_table: [] } } }) } }, /type_origin_table.*vacía/],
    ['tabla de otro paquete', {}, { files: { '/srv/raw/object-output.json': JSON.stringify({ ...JSON.parse(OBJECT_RAW_TEXT), objectId: ORIGINAL_PKG }) } }, /es de otro paquete/],
    ['base ausente', {}, { files: { [DEPLOYMENTS_LOCALNET]: null } }, /falta deployments\/localnet\.json/],
    ['base ya upgradeada (mismo upgrade registrado dos veces)', {}, { files: { [DEPLOYMENTS_LOCALNET]: UPGRADED_TEXT } }, /se esperaba la 3/],
  ];
  for (const [name, change, options, expected] of cases) {
    const { h, run: attempt } = run(change, options);
    if (options?.files && Object.hasOwn(options.files, DEPLOYMENTS_LOCALNET)) {
      if (options.files[DEPLOYMENTS_LOCALNET] === null) delete h.state.files[DEPLOYMENTS_LOCALNET];
    }
    assert.throws(attempt, expected, name);
    assert.deepEqual(h.effects.written, [], name);
    assert.deepEqual(h.calls, [], name);
  }
});

test('record --upgrade en testnet: solo escribe si el json coincide con el Published.toml ya existente; si no, STOP sin registrar', () => {
  const testnetFlags = { ...RECORD_FLAGS, network: 'testnet', 'chain-id': TESTNET_CHAIN_ID };
  delete testnetFlags.out;
  const good = recordHarness({ network: 'testnet', files: { [PUBLISHED_TOML_PATH]: PUBLISHED_TOML_AFTER } });
  commandRecordUpgrade(testnetFlags, good.io);
  assert.deepEqual(good.effects.written, [[DEPLOYMENTS_TESTNET, TESTNET_UPGRADED]]);
  assert.deepEqual(good.calls, []);
  // Published.toml sin reescribir (el de antes del upgrade): no se registra.
  const stale = recordHarness({ network: 'testnet' });
  assert.throws(() => commandRecordUpgrade(testnetFlags, stale.io), /STOP, no se registra ni se reintenta/);
  assert.deepEqual(stale.effects.written, []);
  const missing = recordHarness({ network: 'testnet' });
  delete missing.state.files[PUBLISHED_TOML_PATH];
  assert.throws(() => commandRecordUpgrade(testnetFlags, missing.io), /falta \[published\.testnet\] en Published\.toml: STOP/);
  assert.deepEqual(missing.effects.written, []);
});

test('ningún test ni código de upgrade llega a la CLI real: spawn siempre inyectado y SUI_BIN inexistente en los tests de main', () => {
  // Los tests de commandUpgrade/commandRecordUpgrade pasan un spawn propio (`upgradeHarness`); el vector real de testnet
  // (`client --json upgrade`) solo aparece como clave de ese spawn falso. Y `publish.mjs` solo invoca `spawnSync` por
  // `runSui`/`runGit`, cuyo `spawn` es inyectable, y por `defaultIo`, que los tests de arriba reemplazan por completo.
  const source = readRepoFile('./publish.mjs');
  const direct = source.split('\n').filter((line) => /\bspawnSync\(/.test(line));
  assert.deepEqual(direct, []);
  const spawns = source.split('\n').filter((line) => /(^|[^.\w])spawn\(/.test(line)).map((line) => line.trim());
  assert.deepEqual(spawns, ['const result = spawn(bin, args, {', "const result = spawn('git', args, { cwd: CONTRACTS_DIR, shell: false, encoding: 'utf8' });"]);
  assert.ok(isAllowedSuiArgs(['client', '--json', 'upgrade']));
  // Con el spawn real de un entorno sin sui, una invocación del vector de testnet no podría ejecutarse con éxito: se verifica
  // solo que `runSui` exige un configDir validado antes de cualquier spawn.
  const { spawn, calls } = fakeSpawn();
  assert.throws(() => runSui(['client', '--json', 'upgrade'], { spawn }), /configDir/);
  assert.equal(calls.length, 0);
});
