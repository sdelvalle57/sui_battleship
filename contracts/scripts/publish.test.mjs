// Tests de `publish.mjs`: guardas, envoltorio de la CLI y mensajes, todo con dependencias inyectadas. Ningún test
// invoca `sui` ni git de verdad ni escribe archivos. El único proceso es `bash -n` (solo parsea, no ejecuta) en el test
// de m-2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDeployment, parsePublishOutput } from './deployment.mjs';
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
  checkPublishArgs,
  checkTestnetPreconditions,
  chainIdFromCli,
  confirmationRequired,
  formatCliFailure,
  formatPostPublishFailure,
  formatSummary,
  interpretCliRun,
  isAllowedSuiArgs,
  isEntryPoint,
  main,
  parseCliArgs,
  publishCliArgs,
  readCliJson,
  redactConfigDir,
  resolveRecordMeta,
  runGit,
  runSui,
} from './publish.mjs';

const readRepoFile = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const PUBLISH_TEXT = readRepoFile('./fixtures/localnet-publish.json');
const PUBLISH = JSON.parse(PUBLISH_TEXT);
const PUBLISHED_TOML = readRepoFile('./fixtures/Published.localnet.toml');
const DEPLOYMENT_FIXTURE_TEXT = readRepoFile('./fixtures/localnet.deployment.json');
const CI_YAML = readRepoFile('../../.github/workflows/ci.yml');

const LOCALNET_CHAIN_ID = '87818ef5';
const TESTNET_CHAIN_ID = '4c78adac';
const MAINNET_CHAIN_ID = '35834a8a';
// Valores fijos con los que se generó `fixtures/localnet.deployment.json` (`record`, TASK-2 §3.2).
const FIXTURE_META = Object.freeze({
  network: 'localnet',
  chainId: LOCALNET_CHAIN_ID,
  sourceCommit: 'ef1a72026cdf02ffbabf46c34016cc151cacc620',
  suiCliVersion: '1.83.0-16d2dc1e05ed',
  frameworkRev: '719fb2960ccfbf9f4d33041f8ea5146d30671696',
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
  assert.equal(chainIdFromCli('87818ef5'), undefined);
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
  assert.deepEqual(checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.83.0-16d2dc1e05ed\n', ciYamlText: CI_YAML }), {
    suiCliVersion: '1.83.0-16d2dc1e05ed',
    warning: null,
  });
  assert.throws(
    () => checkCliVersion({ network: 'testnet', versionOutput: 'sui 1.84.0-aaaaaaaaaaaa\n', ciYamlText: CI_YAML }),
    /no es la de ci\.yml/,
  );
  const local = checkCliVersion({ network: 'localnet', versionOutput: 'sui 1.84.0-aaaaaaaaaaaa\n', ciYamlText: CI_YAML });
  assert.equal(local.suiCliVersion, '1.84.0-aaaaaaaaaaaa');
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
    packageId: '0x06501a59986ee126787b2e18b133737d37ee89d1ffd207f38b2ffe61b18a4ec8',
    originalPackageId: '0x06501a59986ee126787b2e18b133737d37ee89d1ffd207f38b2ffe61b18a4ec8',
    packageVersion: 1,
    upgradeCapId: '0xf47132acbaeb5c58715c658a84f05119bf95523dd9ea099a3d3364ce1518acbb',
  };
  const files = [{ name: 'testnet.json', text: JSON.stringify(testnet) }];
  assert.deepEqual(checkDeployments({ files, publishedTomlText: tomlText }), { count: 1, errors: [] });
  const drifted = [{ name: 'testnet.json', text: JSON.stringify({ ...testnet, packageVersion: 2 }) }];
  const { errors } = checkDeployments({ files: drifted, publishedTomlText: tomlText });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^deployments\/testnet\.json: packageVersion \(2\) ≠ version/);
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
