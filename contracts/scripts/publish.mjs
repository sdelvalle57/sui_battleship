// Publicación, upgrade y registro de `contracts/deployments/<red>.json` (#7 y #73, D-20261102-01 y D-20261102-03).
// Uso (desde `contracts/`):
//   node scripts/publish.mjs publish --network localnet|testnet [--pubfile-path <archivo>] [--out <ruta>, solo localnet]
//                                     [--dry-run]
//   node scripts/publish.mjs upgrade --network localnet|testnet [--pubfile-path <archivo>, obligatorio solo en localnet]
//                                     [--out <ruta>, solo localnet] [--dry-run]
//   node scripts/publish.mjs record --network <red> --from <salida.json> [--meta <meta.json>]
//                                    [--source-commit <sha> --sui-cli-version <v> --framework-rev <sha> --chain-id <hex>]
//                                    [--out <ruta>, solo localnet]
//   node scripts/publish.mjs record --upgrade --network <red> --from <salida cruda del upgrade>
//                                    --type-origins <salida cruda de `sui client --json object <paquete>`> [lo mismo]
//   node scripts/publish.mjs check
// Toda decisión vive en funciones puras exportadas (testeadas en `publish.test.mjs`); `main()` solo hace I/O. La única
// llamada a la CLI es `runSui` y la única a git es `runGit`. Ningún agente corre el camino testnet (D-20261102-03):
// `upgrade --network testnet` (con o sin `--dry-run`) es del owner con su `SUI_CONFIG_DIR` propio.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  NETWORKS,
  buildDeployment,
  buildUpgradeDeployment,
  chainIdError,
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
} from './deployment.mjs';

/** Raíz del paquete Move; la CLI y git corren siempre aquí, sin importar desde dónde se invoque el script. */
export const CONTRACTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Exit codes: 0 ok, 1 guarda o validación, 2 uso inválido (subcomando u opción). */
export const EXIT = Object.freeze({ OK: 0, FAILURE: 1, USAGE: 2 });

const MAX_CLI_OUTPUT_BYTES = 64 * 1024 * 1024;
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const CONFIRMATION_WORD = 'testnet';
const FS_ERROR_CODE_RE = /^E[A-Z0-9_]+$/;
const CONFIG_DIR_PLACEHOLDER = '<SUI_CONFIG_DIR>';
const FAILED_TX_DIGEST_RE = /Error executing transaction '([1-9A-HJ-NP-Za-km-z]{32,44})'/;
const RETRY_ADVICE =
  "No reintentes sin buscar antes el digest; si la transacción existe: `printf 'n\\n' | SUI_CONFIG_DIR=<tu dir> " +
  'sui client --json tx-block <digest>` + `record` (README → Recuperación; si falta `Published.toml`, STOP de #8).';
const MISSING_PUBLISHED_TOML_ADVICE =
  'Si `Published.toml` falta o no coincide con el json (testnet), es STOP de #8: no lo edites a mano.';
// R-2 del plan de #73: un upgrade reintentado con el `Published.toml` (o el pubfile) viejo falla con `PackageIDDoesNotMatch`
// y paga gas; el digest del primero se busca antes y el json se rearma offline con `record --upgrade`.
const UPGRADE_RETRY_ADVICE =
  "No reintentes el upgrade sin buscar antes el digest (con el Published.toml viejo falla con PackageIDDoesNotMatch y " +
  "paga gas); si la transacción existe: `printf 'n\\n' | SUI_CONFIG_DIR=<tu dir> sui client --json tx-block <digest>` " +
  'y `record --upgrade` (README → Upgrade → Recuperación).';
const UPGRADE_PUBLISHED_TOML_STOP =
  'Si Published.toml no cambió como se espera (published-at, version y toolchain-version), es STOP: no registres ni reintentes (README → Upgrade).';
/** Texto de un error de la CLI de un upgrade fallido (la CLI lo escribe como texto por stdout, no como JSON). */
const CLI_ERROR_TEXT_RE = /^Error executing transaction |PackageUpgradeError|TransactionNotFound|not found/i;
const OBJECT_ID_RE = /^0x[0-9a-f]{64}$/;
/** Comisión que el owner fija en testnet justo después de publicar (D-20261103-01 (3)). */
const TESTNET_FEE_BPS = 200;
// Prefijo de los comandos que imprime el resumen (#8, M-2): sin `SUI_CONFIG_DIR` exportado, `:?` aborta antes de invocar
// `sui`, así que nunca cae en `~/.sui/`. String normal a propósito: en un template literal, `${…}` se interpolaría.
const OWNER_CLI_PREFIX = 'printf \'n\\n\' | SUI_CONFIG_DIR="${SUI_CONFIG_DIR:?exporta tu SUI_CONFIG_DIR}" sui client';

/** Error de uso (subcomando u opción inválidos): sale con `EXIT.USAGE`. */
export class UsageError extends Error {}

const SUBCOMMAND_OPTIONS = Object.freeze({
  publish: ['network', 'pubfile-path', 'out', 'dry-run'],
  upgrade: ['network', 'pubfile-path', 'out', 'dry-run'],
  record: [
    'network',
    'from',
    'meta',
    'source-commit',
    'sui-cli-version',
    'framework-rev',
    'chain-id',
    'out',
    'upgrade',
    'type-origins',
  ],
  check: [],
});
const ARG_OPTIONS = Object.freeze({
  network: { type: 'string' },
  'pubfile-path': { type: 'string' },
  out: { type: 'string' },
  'dry-run': { type: 'boolean' },
  from: { type: 'string' },
  meta: { type: 'string' },
  'source-commit': { type: 'string' },
  'sui-cli-version': { type: 'string' },
  'framework-rev': { type: 'string' },
  'chain-id': { type: 'string' },
  upgrade: { type: 'boolean' },
  'type-origins': { type: 'string' },
});

/**
 * Interpreta la línea de comandos con `strict: true`: no existe ninguna opción para saltar guardas ni la confirmación
 * (`--yes`, `-y`, `--force` son desconocidas y dan `UsageError`).
 * @param {string[]} argv argumentos sin `node` ni el script
 * @returns {{ command: string, values: Record<string, string|boolean|undefined> }}
 */
export function parseCliArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: ARG_OPTIONS, strict: true, allowPositionals: true });
  } catch (error) {
    throw new UsageError(error.message);
  }
  const [command, ...extra] = parsed.positionals;
  if (!Object.hasOwn(SUBCOMMAND_OPTIONS, command ?? '')) {
    throw new UsageError(`subcomando inválido: ${command ?? '(ninguno)'} (publish | upgrade | record | check)`);
  }
  if (extra.length > 0) throw new UsageError(`argumentos sobrantes: ${extra.join(' ')}`);
  for (const key of Object.keys(parsed.values)) {
    if (!SUBCOMMAND_OPTIONS[command].includes(key)) throw new UsageError(`--${key} no aplica a ${command}`);
  }
  if (command === 'record' && parsed.values['type-origins'] !== undefined && parsed.values.upgrade !== true) {
    throw new UsageError('--type-origins solo aplica a record --upgrade');
  }
  return { command, values: parsed.values };
}

const FORBIDDEN_SUI_ARGS = Object.freeze([
  '-y',
  '--yes',
  '--client.config',
  '--client.env',
  // Nunca se saltea la verificación local de compatibilidad (H-e, M-4 de #73): un error `EUC01009` es STOP del owner.
  '--skip-verify-compatibility',
]);
const ALLOWED_SUI_VECTORS = Object.freeze([
  ['--version'],
  ['client', '--json', 'active-env'],
  ['client', '--json', 'chain-identifier'],
  ['client', '--json', 'publish'],
  ['client', '--json', 'publish', '--dry-run'],
  // Upgrade de testnet (#73, TASK-4): **solo los corre el owner**; ningún test ni agente los ejecuta (spawns inyectados).
  // Sin `--upgrade-capability` ni `--skip-verify-compatibility`: la CLI toma el UpgradeCap de `Published.toml` y verifica
  // la compatibilidad localmente (H-e, M-4); un vector con esas banderas no está en la lista.
  ['client', '--json', 'upgrade'],
  ['client', '--json', 'upgrade', '--dry-run'],
]);
const TEST_PUBLISH_PREFIX = Object.freeze(['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path']);
const TEST_UPGRADE_PREFIX = Object.freeze(['client', '--json', 'test-upgrade', '--build-env', 'testnet', '--pubfile-path']);
const OBJECT_READ_PREFIX = Object.freeze(['client', '--json', 'object']);

const sameVector = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// `<prefijo> <ruta> [--dry-run]`: la ruta es un valor (no vacío ni una opción) y lo único que puede seguirle es `--dry-run`.
function isPubfileVector(args, prefix) {
  const [pubfile, ...rest] = args.slice(prefix.length);
  return (
    sameVector(args.slice(0, prefix.length), prefix) &&
    typeof pubfile === 'string' &&
    pubfile.length > 0 &&
    !pubfile.startsWith('-') &&
    (rest.length === 0 || sameVector(rest, ['--dry-run']))
  );
}

/**
 * Lista blanca por vector completo (v2-3): solo lectura de env/chain id/versión y las publicaciones y upgrades
 * previstos (más la lectura `object <id>` de la tabla de orígenes, #73). Rechaza además de forma explícita las opciones
 * que crean claves sin preguntar o cambian la config/env activos.
 * @param {unknown} args
 * @returns {boolean}
 */
export function isAllowedSuiArgs(args) {
  if (!Array.isArray(args) || !args.every((a) => typeof a === 'string')) return false;
  const forbidden = args.some(
    (a) => FORBIDDEN_SUI_ARGS.includes(a) || a.startsWith('--client.config=') || a.startsWith('--client.env='),
  );
  if (forbidden) return false;
  if (ALLOWED_SUI_VECTORS.some((v) => sameVector(v, args))) return true;
  if (args.length === OBJECT_READ_PREFIX.length + 1 && sameVector(args.slice(0, OBJECT_READ_PREFIX.length), OBJECT_READ_PREFIX)) {
    return OBJECT_ID_RE.test(args.at(-1));
  }
  return isPubfileVector(args, TEST_PUBLISH_PREFIX) || isPubfileVector(args, TEST_UPGRADE_PREFIX);
}

/**
 * Único punto que invoca la Sui CLI. Siempre `'n\n'` por stdin (con EOF la CLI crearía una clave, C13), sin shell y con
 * `SUI_CONFIG_DIR` = la ruta ya validada por `checkConfigDirGuard` (v2-2).
 * @param {string[]} args
 * @param {{ spawn?: typeof spawnSync, configDir: string }} options
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
export function runSui(args, { spawn = spawnSync, configDir } = {}) {
  if (!isAllowedSuiArgs(args)) throw new Error(`invocación de sui no permitida: ${JSON.stringify(args)}`);
  if (typeof configDir !== 'string' || configDir.length === 0) throw new Error('runSui sin configDir validado');
  const bin = process.env.SUI_BIN ?? 'sui';
  const result = spawn(bin, args, {
    cwd: CONTRACTS_DIR,
    input: 'n\n',
    shell: false,
    encoding: 'utf8',
    maxBuffer: MAX_CLI_OUTPUT_BYTES,
    env: { ...process.env, SUI_CONFIG_DIR: configDir },
  });
  if (result.error) throw new Error(`no se pudo ejecutar sui: ${result.error.message}`);
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

const ALLOWED_GIT_VECTORS = Object.freeze([
  ['status', '--porcelain'],
  ['rev-parse', 'HEAD'],
]);

/**
 * Único punto que invoca git: solo lecturas del estado del árbol y del commit.
 * @param {string[]} args
 * @param {{ spawn?: typeof spawnSync }} [options]
 * @returns {string} stdout
 */
export function runGit(args, { spawn = spawnSync } = {}) {
  if (!ALLOWED_GIT_VECTORS.some((v) => sameVector(v, args))) throw new Error(`invocación de git no permitida: ${args}`);
  const result = spawn('git', args, { cwd: CONTRACTS_DIR, shell: false, encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`git ${args.join(' ')} falló`);
  return result.stdout;
}

/**
 * Argumentos de la CLI para publicar: en localnet `test-publish` con pubfile propio (C2/C3: `publish` no puede porque
 * el manifest no declara localnet); en testnet `publish`, que escribe `Published.toml` (C1).
 * @param {{ network: string, pubfilePath?: string, dryRun: boolean }} args
 * @returns {string[]}
 */
export function publishCliArgs({ network, pubfilePath, dryRun }) {
  const base =
    network === 'testnet' ? ['client', '--json', 'publish'] : [...TEST_PUBLISH_PREFIX, pubfilePath];
  return dryRun ? [...base, '--dry-run'] : base;
}

/**
 * Argumentos de la CLI para el upgrade: en localnet `test-upgrade` con el pubfile (copia de la Receta U); en testnet
 * `upgrade`, que lee el UpgradeCap y el paquete de `Published.toml` y reescribe `published-at`, `version` y
 * `toolchain-version` (V-11). Nunca `--skip-verify-compatibility` ni `-c`.
 * @param {{ network: string, pubfilePath?: string, dryRun: boolean }} args
 * @returns {string[]}
 */
export function upgradeCliArgs({ network, pubfilePath, dryRun }) {
  const base = network === 'testnet' ? ['client', '--json', 'upgrade'] : [...TEST_UPGRADE_PREFIX, pubfilePath];
  return dryRun ? [...base, '--dry-run'] : base;
}

/**
 * Guarda de `--out` (#39): en testnet el json va siempre a `deployments/testnet.json`, el que `check` cruza con
 * `[published.testnet]`; con otra ruta el json canónico no se escribiría y la CI fallaría recién en `check`. Se
 * rechaza la presencia de la opción (también vacía). En localnet se admite (smokes, agents.md §3).
 * @param {{ network: unknown, out: unknown }} args
 */
export function checkOutArg({ network, out }) {
  if (network === 'testnet' && out !== undefined) {
    throw new Error('--out no se admite en testnet (el json va siempre a deployments/testnet.json)');
  }
}

/**
 * Guarda 1: red válida y `--pubfile-path` obligatorio en localnet (un pubfile de otra génesis hace fallar a la CLI, C2)
 * y prohibido en testnet (`publish` lo rechaza, C3), y `--out` prohibido en testnet (#39).
 * También la usa `upgrade` (`command: 'upgrade'`): las mismas reglas, con el pubfile de la Receta U en vez de uno nuevo.
 * @param {{ network: unknown, pubfilePath: unknown, out: unknown }} args
 * @param {{ command?: 'publish'|'upgrade' }} [options]
 */
export function checkPublishArgs({ network, pubfilePath, out }, { command = 'publish' } = {}) {
  if (!NETWORKS.includes(network)) throw new Error(`--network inválida: ${network ?? '(falta)'} (localnet | testnet)`);
  if (network === 'localnet' && (typeof pubfilePath !== 'string' || pubfilePath.length === 0)) {
    throw new Error(
      command === 'upgrade'
        ? '--pubfile-path es obligatorio en localnet (la copia del pubfile con source.local = contracts/, Receta U)'
        : '--pubfile-path es obligatorio en localnet (uno nuevo por génesis)',
    );
  }
  if (network === 'testnet' && pubfilePath !== undefined) throw new Error('--pubfile-path no se admite en testnet');
  checkOutArg({ network, out });
}

/**
 * Guarda 2 (v2-2): `SUI_CONFIG_DIR` definido, absoluto, existente, con `client.yaml` y cuyo realpath no esté dentro
 * de `<home>/.sui` para ningún home (`os.homedir()` y `os.userInfo().homedir`, por si `HOME` está redefinido):
 * `~/.sui/` no tiene claves y nunca se usa para publicar (D-20261102-03). Los mensajes no incluyen la ruta, tampoco ante
 * una excepción de `fs` (solo su código, #39).
 * @param {{ value: string|undefined, isAbsolute: (p: string) => boolean, exists: (p: string) => boolean,
 *   isDir: (p: string) => boolean, hasClientYaml: (dir: string) => boolean, realpath: (p: string) => string,
 *   homes: string[] }} probes
 * @returns {string} realpath validado, el que `runSui` pasa a la CLI
 */
export function checkConfigDirGuard({ value, isAbsolute, exists, isDir, hasClientYaml, realpath, homes }) {
  const invalid = (reason) => new Error(`SUI_CONFIG_DIR inválido: ${reason}`);
  // Una excepción de fs trae la ruta en su mensaje (`EACCES: permission denied, stat '<ruta>'`): se descarta el
  // mensaje, sin `cause`, y solo se informa el código. Falla cerrada (#39, NIT-2).
  const guarded = (probe) => (p) => {
    try {
      return probe(p);
    } catch (error) {
      const code = typeof error?.code === 'string' && FS_ERROR_CODE_RE.test(error.code) ? error.code : 'error de fs';
      throw invalid(`no se pudo inspeccionar una ruta (${code}); revisa permisos y symlinks de la config y de ~/.sui`);
    }
  };
  const safeExists = guarded(exists);
  const safeIsDir = guarded(isDir);
  const safeHasClientYaml = guarded(hasClientYaml);
  const safeRealpath = guarded(realpath);
  if (typeof value !== 'string' || value.length === 0) {
    throw invalid('no está definido (owner: tu config propia; agentes: la localnet aislada de agents.md §3)');
  }
  if (!isAbsolute(value)) throw invalid('no es una ruta absoluta');
  if (!safeExists(value) || !safeIsDir(value)) throw invalid('no existe o no es un directorio');
  if (!safeHasClientYaml(value)) throw invalid('no contiene client.yaml');
  const real = safeRealpath(value);
  for (const home of homes) {
    const suiDir = path.join(home, '.sui');
    const resolvedSui = safeExists(suiDir)
      ? safeRealpath(suiDir)
      : path.join(safeExists(home) ? safeRealpath(home) : path.resolve(home), '.sui');
    if (real === resolvedSui || real.startsWith(resolvedSui + path.sep)) {
      throw invalid('está dentro de ~/.sui, que queda sin claves para siempre (D-20261102-03)');
    }
  }
  return real;
}

/**
 * Reemplaza la ruta de la config (realpath validado y valor original de `SUI_CONFIG_DIR`) por `<SUI_CONFIG_DIR>` en un
 * texto de la CLI (#39): un error sobre el keystore o `client.yaml` la mostraría. Reemplazo literal (sin regex), de la
 * ruta más larga a la más corta; sin separadores finales; ignora valores que no sean texto, vacíos o la raíz.
 * @param {string} text
 * @param {unknown[]} configDirs
 * @returns {string}
 */
export function redactConfigDir(text, configDirs) {
  const dirs = [
    ...new Set(
      configDirs
        .filter((d) => typeof d === 'string')
        .map((d) => d.replace(/[\\/]+$/, ''))
        .filter((d) => d.length > 0),
    ),
  ].sort((a, b) => b.length - a.length);
  return dirs.reduce((acc, dir) => acc.split(dir).join(CONFIG_DIR_PLACEHOLDER), text);
}

/**
 * Lee la salida `--json` de una consulta de la CLI (`active-env`, `chain-identifier`). Ante un fallo muestra el stderr
 * con las direcciones y la ruta de la config ocultas; nunca el stdout.
 * @param {{ status: number|null, stdout: string, stderr: string }} result
 * @param {string} what nombre de la consulta, para el mensaje
 * @param {unknown[]} [configDirs] rutas de la config a ocultar (`redactConfigDir`)
 * @returns {unknown}
 */
export function readCliJson(result, what, configDirs = []) {
  if (result.status !== 0) {
    const stderr = redactAddresses(redactConfigDir(result.stderr, configDirs)).trim();
    throw new Error(`sui client ${what} falló (estado ${result.status}): ${stderr}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`sui client --json ${what} no devolvió JSON`);
  }
}

/**
 * Guarda 3: el env activo de la CLI debe ser `--network` y, **solo si coincide**, se consulta el chain id
 * (`chain-identifier` reescribe el cache de la config activa, C12; así nunca se llama contra un env equivocado, v2-1).
 * @param {{ network: string, activeEnv: unknown, readChainId: () => unknown }} args
 * @returns {string} chain id hex validado
 */
export function checkNetworkGuard({ network, activeEnv, readChainId }) {
  if (activeEnv !== network) throw new Error(`red inválida: el env activo de la CLI (${activeEnv}) no es ${network}`);
  const chainId = readChainId();
  const error = chainIdError(network, chainId);
  if (error) throw new Error(`chain id inválido (${chainId}): ${error}`);
  return chainId;
}

/**
 * Extrae el hex de `sui client --json chain-identifier` (`{ base58, hex }`, C11).
 * @param {unknown} json
 * @returns {unknown}
 */
export function chainIdFromCli(json) {
  return json && typeof json === 'object' ? json.hex : undefined;
}

/**
 * Guarda 0 (#8, M-4): el major de Node debe ser el de `.nvmrc` (fuente única, PROY-17). Falla cerrada en todos los
 * subcomandos: sin ella, con un Node sin `import.meta.main` el script saldría con 0 sin haber corrido.
 * @param {{ nodeVersion: string, nvmrcText: string|null }} args  p. ej. `process.versions.node` = '26.13.0', `.nvmrc` = '26\n'
 */
export function checkNodeVersion({ nodeVersion, nvmrcText }) {
  const required = /^\s*v?(\d+)\s*$/.exec(nvmrcText ?? '')?.[1];
  if (!required) throw new Error('.nvmrc sin versión válida');
  const version = String(nodeVersion).replace(/^v/, '');
  const major = /^(\d+)\./.exec(version)?.[1];
  if (major === undefined || Number(major) !== Number(required)) {
    throw new Error(`se requiere Node ${Number(required)} (.nvmrc); este es v${version}: corre "nvm use" en la raíz del repo`);
  }
}

/**
 * Guarda 4: la CLI local es la de `ci.yml` (`SUI_VERSION`/`SUI_COMMIT`, fuente única, PROY-17). En testnet una
 * diferencia es error; en localnet, aviso.
 * @param {{ network: string, versionOutput: string, ciYamlText: string }} args
 * @returns {{ suiCliVersion: string, warning: string|null }}
 */
export function checkCliVersion({ network, versionOutput, ciYamlText }) {
  const version = /^\s*SUI_VERSION:\s*"([^"]+)"/m.exec(ciYamlText)?.[1];
  const commit = /^\s*SUI_COMMIT:\s*"([^"]+)"/m.exec(ciYamlText)?.[1];
  if (!version || !commit) throw new Error('ci.yml no define SUI_VERSION y SUI_COMMIT');
  const expected = `sui ${version}-${commit}`;
  const actual = versionOutput.trim();
  const suiCliVersion = actual.replace(/^sui /, '');
  if (actual === expected) return { suiCliVersion, warning: null };
  const message = `la CLI local (${actual}) no es la de ci.yml (${expected})`;
  if (network === 'testnet') throw new Error(message);
  return { suiCliVersion, warning: message };
}

/**
 * Guarda 5 (testnet): árbol limpio (lo publicado es exactamente un commit) y ninguna publicación previa: ni
 * `deployments/testnet.json` ni `[published.testnet]` (republicar es decisión de #8, C4).
 * @param {{ gitStatus: string, deploymentExists: boolean, publishedTomlText: string|null }} args
 */
export function checkTestnetPreconditions({ gitStatus, deploymentExists, publishedTomlText }) {
  if (gitStatus.trim() !== '') throw new Error('el árbol git no está limpio (testnet publica solo un commit)');
  if (deploymentExists) throw new Error('ya existe deployments/testnet.json (republicar es decisión de #8)');
  if (publishedTomlText !== null && parsePublishedToml(publishedTomlText).has('testnet')) {
    throw new Error('Published.toml ya tiene [published.testnet] (republicar es decisión de #8)');
  }
}

/**
 * Guarda 6: el dry run no debe repinear `Move.lock` (C5). En testnet es error (el lock repineado se commitea y los
 * gates se re-miden antes, H13); en localnet, aviso para declarar el delta (PROY-11).
 * @param {{ network: string, before: string, after: string }} args
 * @returns {string|null} aviso, si corresponde
 */
export function checkLockUnchanged({ network, before, after }) {
  if (before === after) return null;
  if (network === 'testnet') throw new Error('repin pendiente (H13): commitear el lock y re-medir los gates');
  return 'Move.lock cambió: declarar el delta (PROY-11) o descartarlo con git checkout -- Move.lock';
}

/**
 * La confirmación se pide solo al publicar de verdad en testnet. No depende de ninguna opción ni variable de entorno.
 * @param {{ network: string, dryRun: boolean }} args
 * @returns {boolean}
 */
export function confirmationRequired({ network, dryRun }) {
  return network === 'testnet' && !dryRun;
}

const confirmationPrompt = (action) =>
  'Freno contra accidentes; la autorización es la del owner (D-20261030-09, DECISIONES.md). ' +
  `Escribe "${CONFIRMATION_WORD}" para ${action}: `;

/**
 * Guarda 7: freno contra accidentes, no control de seguridad (se puede simular una terminal, D-20261102-03). Sin TTY
 * aborta; con TTY exige escribir `testnet`. No existe opción ni variable que la omita. `action` solo cambia el verbo
 * del mensaje (`publicar` | `hacer el upgrade`).
 * @param {{ isTTY: unknown, answer: string|null, action?: string }} args
 */
export function checkConfirmation({ isTTY, answer, action = 'publicar' }) {
  if (isTTY !== true) throw new Error(`${action} en testnet exige una terminal interactiva (sin TTY: abortado)`);
  if (typeof answer !== 'string' || answer.trim() !== CONFIRMATION_WORD) throw new Error('confirmación no recibida: abortado');
}

/**
 * Mensaje ante un fallo de la CLI o una salida que no se puede interpretar. Nunca incluye el stdout ni un fragmento
 * suyo (contiene la dirección del publicador, C9; v2-4). Con `--json`, la CLI 1.83.0 escribe el motivo de un fallo
 * por **stdout** (H-1 del smoke de #7), así que con `status !== 0` el stdout solo se usa para extraer el digest
 * (`Error executing transaction '<digest>'`, C8; primero en stderr, después en stdout) y el mensaje remite al archivo
 * con el motivo. Con `status === 0` (JSON inválido o forma inesperada) el stdout no se mira. El consejo de no
 * reintentar solo aplica tras invocar una publicación real (`afterPublish`): un dry run o `record` no envían
 * transacciones.
 * El stderr se reimprime con las direcciones y la ruta de la config (`configDirs`, #39) ocultas.
 * `retryAdvice` es el consejo de después de una transacción real (por defecto el de la publicación; el upgrade pasa el suyo).
 * @param {{ reason: string, status?: number|null, stdout?: string, stderr: string, dir: string|null,
 *   outputPath: string, afterPublish?: boolean, configDirs?: unknown[], retryAdvice?: string }} args
 * @returns {string}
 */
export function formatCliFailure({
  reason,
  status = 1,
  stdout = '',
  stderr,
  dir,
  outputPath,
  afterPublish = false,
  configDirs = [],
  retryAdvice = RETRY_ADVICE,
}) {
  const lines = [`Error: ${reason}`, `Salida completa (sin mostrar): ${outputPath}`];
  if (dir) lines.push(`Directorio temporal: ${dir}`);
  const cliFailed = status !== 0;
  const digest = FAILED_TX_DIGEST_RE.exec(stderr)?.[1] ?? (cliFailed ? FAILED_TX_DIGEST_RE.exec(stdout)?.[1] : undefined);
  if (digest) lines.push(`Digest de la transacción: ${digest}`);
  if (cliFailed) {
    lines.push(`Motivo de la CLI en ${outputPath} (revísalo ahí; no lo pegues: puede traer tu dirección)`);
  }
  if (stderr.trim() !== '') {
    lines.push(
      'stderr de la CLI (direcciones y config ocultas):',
      redactAddresses(redactConfigDir(stderr, configDirs)).trimEnd(),
    );
  }
  if (afterPublish) lines.push(retryAdvice);
  return lines.join('\n');
}

/**
 * Mensaje ante un error **después** de una publicación exitosa (json inválido, escritura, `Published.toml` ausente o
 * incoherente): la transacción ya existe, así que se indica el directorio con la salida y cómo rearmar el json con
 * `record` sin republicar.
 * @param {{ reason: string, network: string, digest: string, dir: string, outputPath: string }} args
 * @returns {string}
 */
export function formatPostPublishFailure({ reason, network, digest, dir, outputPath }) {
  return [
    `Error: ${redactAddresses(reason)}`,
    `La publicación ya se ejecutó (digest ${digest}): no republiques.`,
    `Salida completa (sin mostrar): ${outputPath}`,
    `Directorio temporal: ${dir}`,
    'Para rearmar el json sin republicar (usa el meta.json de ese directorio): ' +
      `node scripts/publish.mjs record --network ${network} --from ${outputPath}`,
    MISSING_PUBLISHED_TOML_ADVICE,
  ].join('\n');
}

/**
 * Interpreta el resultado de una publicación o dry run: estado, JSON y forma (A4). Cualquier fallo devuelve el
 * mensaje de `formatCliFailure`, que nunca incluye el stdout: se lo pasa solo para que, si la CLI falló, extraiga el
 * digest (H-1). `configDirs` se reenvía para ocultar la ruta de la config en el stderr (#39).
 * @param {{ result: { status: number|null, stdout: string, stderr: string }, parse: (json: object) => unknown,
 *   dir: string|null, outputPath: string, afterPublish?: boolean, configDirs?: unknown[], retryAdvice?: string }} args
 * @returns {{ value: unknown } | { error: string }}
 */
export function interpretCliRun({
  result,
  parse,
  dir,
  outputPath,
  afterPublish = false,
  configDirs = [],
  retryAdvice = RETRY_ADVICE,
}) {
  const fail = (reason) => ({
    error: formatCliFailure({
      reason,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      dir,
      outputPath,
      afterPublish,
      configDirs,
      retryAdvice,
    }),
  });
  if (result.status !== 0) return fail(`la CLI terminó con estado ${result.status}`);
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    return fail('la salida de la CLI no es JSON válido');
  }
  try {
    return { value: parse(json) };
  } catch (error) {
    return fail(`salida de la CLI con forma inesperada: ${redactAddresses(error.message)}`);
  }
}

/**
 * Resumen propio del script: los 14 campos (IDs y hashes públicos, sin direcciones de cuentas) y el siguiente paso
 * obligatorio de #8 (la House nace con comisión 0), que el script no ejecuta.
 * @param {{ deployment: object, outPath: string, dir: string|null }} args
 * @returns {string}
 */
export function formatSummary({ deployment, outPath, dir }) {
  const lines = [`Despliegue escrito en ${outPath}:`];
  for (const [key, value] of Object.entries(deployment)) lines.push(`  ${key}: ${value}`);
  if (dir) lines.push(`Directorio temporal con la salida cruda: ${dir} (bórralo cuando termines)`);
  // En testnet, la comisión decidida; en localnet, `<bps>` (cada smoke elige su valor; el shell no lo ejecuta).
  const feeBps = deployment.network === 'testnet' ? String(TESTNET_FEE_BPS) : '<bps>';
  // Cada comando va solo en su línea, pegable tal cual (m-2): la nota del campo es un comentario `#`.
  lines.push(
    'Siguiente paso obligatorio (#8), no lo ejecuta este script. En la shell donde exportaste tu SUI_CONFIG_DIR',
    '(README → "Uso en testnet", pasos 6-10):',
    `  ${OWNER_CLI_PREFIX} call --package ${deployment.packageId} --module house --function update_fee_rate ` +
      `--args ${deployment.houseId} ${deployment.houseCapId} ${feeBps}`,
    'Verificación:',
    `  ${OWNER_CLI_PREFIX} object ${deployment.houseId} --json   # campo content.fee_rate`,
  );
  return lines.join('\n');
}

/**
 * Mensaje ante un error **después** de un upgrade exitoso (lectura de la tabla de orígenes, json inválido, `Published.toml`
 * que no coincide): la transacción ya existe, así que se indica el directorio con la salida y cómo rearmar el json
 * **offline** con `record --upgrade`, sin repetir el upgrade (R-2).
 * @param {{ reason: string, network: string, digest: string, dir: string, outputPath: string }} args
 * @returns {string}
 */
export function formatPostUpgradeFailure({ reason, network, digest, dir, outputPath }) {
  return [
    `Error: ${redactAddresses(reason)}`,
    `El upgrade ya se ejecutó (digest ${digest}): no lo repitas.`,
    `Salida completa (sin mostrar): ${outputPath}`,
    `Directorio temporal: ${dir}`,
    'Para rearmar el json sin repetir el upgrade (offline; usa el meta.json de ese directorio; la tabla de orígenes es la ' +
      `salida de "sui client --json object <paquete nuevo>"): node scripts/publish.mjs record --upgrade --network ${network} ` +
      `--from ${outputPath} --type-origins ${path.join(dir, 'object-output.json')}`,
    UPGRADE_PUBLISHED_TOML_STOP,
  ].join('\n');
}

/**
 * Resumen propio del upgrade: lo que cambió respecto del despliegue base (IDs, versiones y digests públicos, sin
 * direcciones de cuentas) y los pasos que siguen, que el script no ejecuta.
 * @param {{ base: object, deployment: object, outPath: string, dir: string|null }} args
 * @returns {string}
 */
export function formatUpgradeSummary({ base, deployment, outPath, dir }) {
  const last = deployment.upgrades.at(-1);
  const upgraded = deployment.typeOrigins.filter((t) => t.definingId !== deployment.originalPackageId).length;
  const lines = [
    `Upgrade registrado en ${outPath}:`,
    `  packageVersion: ${base.packageVersion} → ${deployment.packageVersion}`,
    `  packageId: ${base.packageId} → ${deployment.packageId}`,
    `  upgrades[${deployment.upgrades.length - 1}]: version ${last.version}, packageId ${last.packageId}, txDigest ${last.txDigest}`,
    `  typeOrigins: ${deployment.typeOrigins.length} tipos, ${upgraded} definidos en un upgrade`,
    `  sourceCommit: ${deployment.sourceCommit}`,
    `  suiCliVersion: ${deployment.suiCliVersion}`,
    `  frameworkRev: ${deployment.frameworkRev}`,
  ];
  if (dir) lines.push(`Directorio temporal con la salida cruda: ${dir} (bórralo cuando termines)`);
  lines.push(
    'Siguiente (no lo ejecuta este script; README → Upgrade, pasos de registro y verificación):',
    '  git diff -- contracts/Published.toml   # solo published-at, version y toolchain-version; si no, STOP',
    '  node scripts/publish.mjs check',
    '  verificación independiente de typeOrigins por gRPC o GraphQL público (no con la CLI que la produjo)',
  );
  return lines.join('\n');
}

/**
 * El despliegue base de un upgrade (`deployments/<red>.json`: la publicación original y los upgrades anteriores) existe,
 * es válido y es de la red pedida. Lo comparten `upgrade` y `record --upgrade`.
 * @param {{ network: string, base: object|null }} args
 */
export function checkUpgradeBase({ network, base }) {
  if (base === null) {
    throw new Error(
      `falta deployments/${network}.json: el upgrade parte de la publicación original y no la inventa ni publica ` +
        '(testnet: lo commiteó #8; localnet: `record` sobre la salida de test-publish del v1)',
    );
  }
  const errors = validateDeployment(base);
  if (errors.length > 0) throw new Error(`deployments/${network}.json base inválido:\n  ${errors.join('\n  ')}`);
  if (base.network !== network) throw new Error(`deployments/${network}.json es de ${base.network}, no de ${network}`);
}

/**
 * Precondiciones del upgrade que no necesitan la CLI (se evalúan **antes** de invocar `sui`): existe el
 * `deployments/<red>.json` base (la publicación original; el upgrade no la inventa ni publica) y es válido; en testnet
 * además el árbol está limpio (el upgrade es exactamente un commit), existe `[published.testnet]` en `Published.toml` y el
 * json base coincide con él (`checkConsistency`).
 * @param {{ network: string, gitStatus: string, base: object|null, publishedTomlText: string|null }} args
 */
export function checkUpgradePreconditions({ network, gitStatus, base, publishedTomlText }) {
  checkUpgradeBase({ network, base });
  if (network !== 'testnet') return;
  if (gitStatus.trim() !== '') throw new Error('el árbol git no está limpio (el upgrade de testnet es de un solo commit)');
  if (publishedTomlText === null) throw new Error('falta Published.toml: el upgrade de testnet lo necesita (STOP de #8)');
  const entry = parsePublishedToml(publishedTomlText).get('testnet');
  if (!entry) throw new Error('Published.toml no tiene [published.testnet]: el upgrade de testnet lo necesita (STOP de #8)');
  const differences = checkConsistency(base, entry);
  if (differences.length > 0) {
    throw new Error(`deployments/testnet.json base no coincide con Published.toml:\n  ${differences.join('\n  ')}`);
  }
}

/**
 * Guarda del pubfile de localnet (H-a, Receta U): `test-upgrade` indexa el pubfile por la ruta del árbol publicado
 * (`source.local`). Si el `realpath` de ninguna entrada es el de `CONTRACTS_DIR`, aborta **sin invocar `sui`** con el
 * mensaje de la Receta U (la copia del pubfile con la ruta correcta); el script **nunca edita** el pubfile. Además exige
 * que esa entrada sea la del despliegue base (`published-at`, `original-id`, `version`, `upgrade-capability`): un pubfile
 * de otra génesis, o ya avanzado por un upgrade que el json no registró, haría fallar al upgrade pagando gas
 * (`PackageIDDoesNotMatch`, R-2).
 * @param {{ pubfileText: string, contractsDir: string, realpath: (p: string) => string, base: object }} args
 * @returns {{ chainId: string|null }} el `chain-id` del pubfile, para compararlo con el de la red
 */
export function checkPubfileGuard({ pubfileText, contractsDir, realpath, base }) {
  let pubfile;
  try {
    pubfile = parsePubfile(pubfileText);
  } catch (error) {
    throw new Error(`--pubfile-path inválido: ${error.message}`);
  }
  const target = realpath(contractsDir);
  const resolves = (p) => {
    try {
      return realpath(p) === target;
    } catch {
      return false;
    }
  };
  const matching = pubfile.entries.filter((entry) => resolves(entry.sourceLocal));
  if (matching.length === 0) {
    throw new Error(
      'el pubfile no corresponde al árbol que se upgradea: ningún source.local coincide con contracts/ ' +
        '(Receta U de agents.md §3: haz una copia del pubfile con source.local = la ruta de contracts/; el script no edita el pubfile)',
    );
  }
  if (matching.length > 1) throw new Error('el pubfile tiene más de una entrada para contracts/: ambiguo');
  const [entry] = matching;
  const same = (a, b) => {
    try {
      return normalizeId(a) === normalizeId(b);
    } catch {
      return false;
    }
  };
  const differences = [
    ['published-at', same(entry.publishedAt, base.packageId)],
    ['original-id', same(entry.originalId, base.originalPackageId)],
    ['version', entry.version === base.packageVersion],
    ['upgrade-capability', same(entry.upgradeCapability, base.upgradeCapId)],
  ]
    .filter(([, equal]) => !equal)
    .map(([key]) => key);
  if (differences.length > 0) {
    throw new Error(
      `el pubfile no es el del despliegue base (${differences.join(', ')} difieren): otra génesis o un upgrade que el json no registró`,
    );
  }
  return { chainId: pubfile.chainId };
}

/**
 * Tras la guarda de red: el despliegue base es de **esta** cadena (su `chainId` es el del env activo) y, en localnet, el
 * pubfile también (si no, la CLI haría fallar el upgrade o se upgradearía el paquete de otra génesis).
 * @param {{ base: object, chainId: string, pubfileChainId?: string|null }} args
 */
export function checkUpgradeChain({ base, chainId, pubfileChainId }) {
  if (base.chainId !== chainId) {
    throw new Error(`el despliegue base es de otra cadena (chainId ${base.chainId}) que la del env activo (${chainId})`);
  }
  if (pubfileChainId !== undefined && pubfileChainId !== chainId) {
    throw new Error(`el pubfile es de otra génesis (chain-id ${pubfileChainId}) que la del env activo (${chainId})`);
  }
}

/**
 * Interpreta la salida cruda de un upgrade guardada en un archivo (`record --upgrade --from`). "Digest inexistente" =
 * la salida es un **error de la CLI** (texto, p. ej. `PackageIDDoesNotMatch` o transacción no encontrada) o **no trae el
 * cambio de paquete** (sin `published`): falla con un mensaje claro y sin escribir nada. El mensaje nunca cita la salida.
 * @param {string} text
 * @returns {ReturnType<typeof parseUpgradeOutput>}
 */
export function parseUpgradeRaw(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    if (CLI_ERROR_TEXT_RE.test(text.trim())) {
      throw new Error('la salida cruda es un error de la CLI (la transacción de upgrade falló o no existe): no hay upgrade que registrar');
    }
    throw new Error('la salida cruda no es JSON ni un error de la CLI reconocido');
  }
  try {
    return parseUpgradeOutput(json);
  } catch (error) {
    throw new Error(`la salida cruda no es un upgrade registrable: ${redactAddresses(error.message)}`);
  }
}

/**
 * Metadatos de `record`: de `meta.json` (escrito por `publish` antes de invocar la CLI) o, si no existe, de los flags
 * explícitos; nunca del estado actual del repo, que puede haber cambiado desde la publicación.
 * @param {{ metaJson: object|null, flags: { sourceCommit?: string, suiCliVersion?: string, frameworkRev?: string,
 *   chainId?: string }, network: string }} args
 * @returns {{ network: string, chainId: string, sourceCommit: string|null, suiCliVersion: string,
 *   frameworkRev: string }}
 */
export function resolveRecordMeta({ metaJson, flags, network }) {
  if (!NETWORKS.includes(network)) throw new Error(`--network inválida: ${network ?? '(falta)'} (localnet | testnet)`);
  let meta;
  if (metaJson) {
    if (metaJson.network !== network) throw new Error(`meta.json es de ${metaJson.network}, no de ${network}`);
    meta = {
      network,
      chainId: metaJson.chainId,
      sourceCommit: metaJson.sourceCommit,
      suiCliVersion: metaJson.suiCliVersion,
      frameworkRev: metaJson.frameworkRev,
    };
  } else {
    const missing = ['sourceCommit', 'suiCliVersion', 'frameworkRev', 'chainId'].filter((k) => !flags[k]);
    if (missing.length > 0) {
      throw new Error(
        'sin meta.json se exigen --source-commit, --sui-cli-version, --framework-rev y --chain-id ' +
          `(faltan: ${missing.join(', ')})`,
      );
    }
    meta = { network, ...flags };
  }
  const error = chainIdError(network, meta.chainId);
  if (error) throw new Error(`chain id de los metadatos inválido para ${network}: ${error}`);
  return meta;
}

/**
 * Validación de la CI (ARQ-6): cada `deployments/<red>.json` es válido, se llama como su red, y cada red no-localnet
 * coincide con su `[published.<red>]` de `Published.toml`, sin entradas huérfanas en ningún sentido.
 * @param {{ files: { name: string, text: string }[], publishedTomlText: string|null }} args
 * @returns {{ count: number, errors: string[] }}
 */
export function checkDeployments({ files, publishedTomlText }) {
  const errors = [];
  let published = new Map();
  if (publishedTomlText !== null) {
    try {
      published = parsePublishedToml(publishedTomlText);
    } catch (error) {
      errors.push(error.message);
    }
  }
  const seen = new Set();
  for (const { name, text } of files) {
    const network = name.replace(/\.json$/, '');
    seen.add(network);
    let deployment;
    try {
      deployment = JSON.parse(text);
    } catch {
      errors.push(`deployments/${name}: no es JSON válido`);
      continue;
    }
    for (const error of validateDeployment(deployment)) errors.push(`deployments/${name}: ${error}`);
    if (deployment === null || typeof deployment !== 'object' || Array.isArray(deployment)) continue;
    if (deployment.network !== network) {
      errors.push(`deployments/${name}: network (${deployment.network}) no coincide con el nombre del archivo`);
    }
    const entry = published.get(network);
    if (!entry) {
      if (network !== 'localnet') errors.push(`deployments/${name}: falta [published.${network}] en Published.toml`);
      continue;
    }
    for (const difference of checkConsistency(deployment, entry)) errors.push(`deployments/${name}: ${difference}`);
  }
  for (const network of published.keys()) {
    if (!seen.has(network)) errors.push(`[published.${network}] de Published.toml no tiene deployments/${network}.json`);
  }
  return { count: files.length, errors };
}

const write = (stream, text) => stream.write(`${text}\n`);
const info = (text) => write(process.stdout, text);
const warn = (text) => write(process.stderr, `Aviso: ${text}`);

const readTextOrNull = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
const defaultOut = (network) => path.join(CONTRACTS_DIR, 'deployments', `${network}.json`);

function writePrivate(file, text) {
  fs.writeFileSync(file, text, { mode: FILE_MODE });
  fs.chmodSync(file, FILE_MODE);
}

function writeDeployment(outPath, deployment) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(deployment, null, 2)}\n`);
}

function validatedOrThrow(deployment) {
  const errors = validateDeployment(deployment);
  if (errors.length > 0) throw new Error(`el json armado no es válido:\n  ${errors.join('\n  ')}`);
  return deployment;
}

// Ejecuta la CLI y guarda stdout/stderr crudos (0600) antes de interpretarlos, para no perder nunca una salida.
function runAndKeep({
  sui,
  args,
  dir,
  prefix,
  parse,
  afterPublish,
  configDirs,
  retryAdvice = RETRY_ADVICE,
  keep = writePrivate,
}) {
  const result = sui(args);
  const outputPath = path.join(dir, `${prefix}-output.json`);
  keep(outputPath, result.stdout);
  keep(path.join(dir, `${prefix}-stderr.txt`), result.stderr);
  const interpreted = interpretCliRun({ result, parse, dir, outputPath, afterPublish, configDirs, retryAdvice });
  if ('error' in interpreted) throw new Error(interpreted.error);
  return { value: interpreted.value, outputPath };
}

async function askConfirmation(action = 'publicar') {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question(confirmationPrompt(action));
  } finally {
    rl.close();
  }
}

async function commandPublish(values) {
  const network = values.network;
  const dryRun = values['dry-run'] === true;
  checkPublishArgs({ network, pubfilePath: values['pubfile-path'], out: values.out });
  const pubfilePath = network === 'localnet' ? path.resolve(values['pubfile-path']) : undefined;
  const outPath = path.resolve(values.out ?? defaultOut(network));

  const configDir = checkConfigDirGuard({
    value: process.env.SUI_CONFIG_DIR,
    isAbsolute: path.isAbsolute,
    exists: fs.existsSync,
    isDir: (p) => fs.statSync(p).isDirectory(),
    hasClientYaml: (dir) => fs.existsSync(path.join(dir, 'client.yaml')),
    realpath: fs.realpathSync,
    homes: [os.homedir(), os.userInfo().homedir],
  });
  // La CLI puede mostrar la config con cualquiera de las dos formas: se ocultan ambas en su stderr (#39).
  const configDirs = [configDir, process.env.SUI_CONFIG_DIR];
  const sui = (args) => runSui(args, { configDir });

  const chainId = checkNetworkGuard({
    network,
    activeEnv: readCliJson(sui(['client', '--json', 'active-env']), 'active-env', configDirs),
    readChainId: () =>
      chainIdFromCli(readCliJson(sui(['client', '--json', 'chain-identifier']), 'chain-identifier', configDirs)),
  });

  const versionResult = sui(['--version']);
  if (versionResult.status !== 0) throw new Error('sui --version falló');
  const ciYamlText = fs.readFileSync(path.join(CONTRACTS_DIR, '..', '.github', 'workflows', 'ci.yml'), 'utf8');
  const { suiCliVersion, warning: cliWarning } = checkCliVersion({
    network,
    versionOutput: versionResult.stdout,
    ciYamlText,
  });
  if (cliWarning) warn(cliWarning);

  const publishedTomlPath = path.join(CONTRACTS_DIR, 'Published.toml');
  const gitStatus = runGit(['status', '--porcelain']);
  if (network === 'testnet') {
    checkTestnetPreconditions({
      gitStatus,
      deploymentExists: fs.existsSync(defaultOut('testnet')),
      publishedTomlText: readTextOrNull(publishedTomlPath),
    });
  }

  const lockPath = path.join(CONTRACTS_DIR, 'Move.lock');
  const lockBefore = fs.readFileSync(lockPath, 'utf8');
  const meta = {
    network,
    chainId,
    sourceCommit: gitStatus.trim() === '' ? runGit(['rev-parse', 'HEAD']).trim() : null,
    suiCliVersion,
    frameworkRev: readFrameworkRev(lockBefore),
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'battleship-publish-'));
  fs.chmodSync(dir, DIR_MODE);
  writePrivate(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

  if (network === 'testnet' || dryRun) {
    const { value: dry } = runAndKeep({
      sui,
      args: publishCliArgs({ network, pubfilePath, dryRun: true }),
      dir,
      prefix: 'dry-run',
      parse: parseDryRunOutput,
      afterPublish: false,
      configDirs,
    });
    if (!dry.ok) throw new Error(`el dry run no dio success con un paquete, una House, un HouseCap y un UpgradeCap (${dir})`);
    const lockWarning = checkLockUnchanged({ network, before: lockBefore, after: fs.readFileSync(lockPath, 'utf8') });
    if (lockWarning) warn(lockWarning);
    info(`Dry run ok. Gas estimado: ${dry.gasEstimate} MIST.`);
    if (dryRun) {
      info(`Directorio temporal: ${dir} (bórralo cuando termines)`);
      return;
    }
  }

  if (confirmationRequired({ network, dryRun })) {
    const isTTY = process.stdin.isTTY;
    checkConfirmation({ isTTY, answer: isTTY === true ? await askConfirmation() : null });
  }

  const lockBeforePublish = fs.readFileSync(lockPath, 'utf8');
  const { value: parsed, outputPath } = runAndKeep({
    sui,
    args: publishCliArgs({ network, pubfilePath, dryRun: false }),
    dir,
    prefix: 'publish',
    parse: parsePublishOutput,
    afterPublish: true,
    configDirs,
  });
  // Desde aquí la transacción ya existe: todo error indica el directorio y cómo rearmar el json con `record` (H2).
  try {
    const deployment = validatedOrThrow(buildDeployment({ ...meta, parsed }));
    writeDeployment(outPath, deployment);
    if (network === 'testnet') {
      const entry = parsePublishedToml(readTextOrNull(publishedTomlPath) ?? '').get('testnet');
      if (!entry) throw new Error(`falta [published.testnet] en Published.toml (json escrito en ${outPath})`);
      const differences = checkConsistency(deployment, entry);
      if (differences.length > 0) {
        throw new Error(`json escrito en ${outPath} pero no coincide con Published.toml:\n  ${differences.join('\n  ')}`);
      }
    } else {
      const lockWarning = checkLockUnchanged({ network, before: lockBeforePublish, after: fs.readFileSync(lockPath, 'utf8') });
      if (lockWarning) warn(lockWarning);
    }
    info(formatSummary({ deployment, outPath, dir }));
  } catch (error) {
    throw new Error(formatPostPublishFailure({ reason: error.message, network, digest: parsed.digest, dir, outputPath }));
  }
}

/**
 * Dependencias de I/O de `upgrade` y `record --upgrade`, inyectables: los tests pasan un `spawn` y archivos falsos, así que
 * ningún test invoca `sui` ni git de verdad, ni escribe, ni llega nunca a `sui client upgrade` de testnet.
 * @returns {{ env: NodeJS.ProcessEnv, homes: string[], contractsDir: string, spawn: typeof spawnSync,
 *   isTTY: unknown, ask: (action: string) => Promise<string>, fsProbes: object, realpath: (p: string) => string,
 *   readText: (file: string) => string|null, makeTempDir: () => string, keep: (file: string, text: string) => void,
 *   writeDeployment: (file: string, deployment: object) => void, info: (text: string) => void,
 *   warn: (text: string) => void }}
 */
function defaultIo() {
  return {
    env: process.env,
    homes: [os.homedir(), os.userInfo().homedir],
    contractsDir: CONTRACTS_DIR,
    spawn: spawnSync,
    isTTY: process.stdin.isTTY,
    ask: askConfirmation,
    fsProbes: {
      isAbsolute: path.isAbsolute,
      exists: fs.existsSync,
      isDir: (p) => fs.statSync(p).isDirectory(),
      hasClientYaml: (dir) => fs.existsSync(path.join(dir, 'client.yaml')),
      realpath: fs.realpathSync,
    },
    realpath: fs.realpathSync,
    readText: readTextOrNull,
    makeTempDir: () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'battleship-upgrade-'));
      fs.chmodSync(dir, DIR_MODE);
      return dir;
    },
    keep: writePrivate,
    writeDeployment,
    info,
    warn,
  };
}

// Lee `deployments/<red>.json` (el despliegue base de un upgrade): `null` si no existe; un json roto es un error claro.
function readBaseDeployment(io, network) {
  const text = io.readText(path.join(io.contractsDir, 'deployments', `${network}.json`));
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`deployments/${network}.json no es JSON válido`);
  }
}

/**
 * Subcomando `upgrade` (#73, TASK-4): mismas guardas que `publish` (Node, config fuera de `~/.sui`, red y chain id, CLI =
 * `ci.yml`, árbol limpio, `Move.lock` sin delta, confirmación escrita en una terminal para testnet sin forma de
 * saltarla) más las propias (despliegue base, `Published.toml`/pubfile). Testnet: `sui client upgrade`; localnet:
 * `sui client test-upgrade --pubfile-path …`. Un solo PTB (V-10). **Ningún agente corre el camino testnet.**
 * El orden importa: todo lo que no necesita la CLI (argumentos, config, json base, git, `Published.toml`, pubfile) se
 * comprueba **antes** de la primera llamada a `sui`; la transacción real va **siempre** después de la confirmación.
 * @param {Record<string, string|boolean|undefined>} values
 * @param {ReturnType<typeof defaultIo>} [io]
 */
export async function commandUpgrade(values, io = defaultIo()) {
  const network = values.network;
  const dryRun = values['dry-run'] === true;
  checkPublishArgs({ network, pubfilePath: values['pubfile-path'], out: values.out }, { command: 'upgrade' });
  const pubfilePath = network === 'localnet' ? path.resolve(values['pubfile-path']) : undefined;
  const outPath = path.resolve(values.out ?? path.join(io.contractsDir, 'deployments', `${network}.json`));

  const configDir = checkConfigDirGuard({ value: io.env.SUI_CONFIG_DIR, ...io.fsProbes, homes: io.homes });
  const configDirs = [configDir, io.env.SUI_CONFIG_DIR];
  const sui = (args) => runSui(args, { spawn: io.spawn, configDir });

  const base = readBaseDeployment(io, network);
  const gitStatus = runGit(['status', '--porcelain'], { spawn: io.spawn });
  const publishedTomlPath = path.join(io.contractsDir, 'Published.toml');
  checkUpgradePreconditions({ network, gitStatus, base, publishedTomlText: io.readText(publishedTomlPath) });
  let pubfileChainId;
  if (network === 'localnet') {
    const pubfileText = io.readText(pubfilePath);
    if (pubfileText === null) throw new Error('--pubfile-path no existe');
    ({ chainId: pubfileChainId } = checkPubfileGuard({
      pubfileText,
      contractsDir: io.contractsDir,
      realpath: io.realpath,
      base,
    }));
  }

  const chainId = checkNetworkGuard({
    network,
    activeEnv: readCliJson(sui(['client', '--json', 'active-env']), 'active-env', configDirs),
    readChainId: () =>
      chainIdFromCli(readCliJson(sui(['client', '--json', 'chain-identifier']), 'chain-identifier', configDirs)),
  });
  checkUpgradeChain({ base, chainId, pubfileChainId });

  const versionResult = sui(['--version']);
  if (versionResult.status !== 0) throw new Error('sui --version falló');
  const ciYamlText = io.readText(path.join(io.contractsDir, '..', '.github', 'workflows', 'ci.yml'));
  const { suiCliVersion, warning: cliWarning } = checkCliVersion({
    network,
    versionOutput: versionResult.stdout,
    ciYamlText: ciYamlText ?? '',
  });
  if (cliWarning) io.warn(cliWarning);

  const lockPath = path.join(io.contractsDir, 'Move.lock');
  const lockBefore = io.readText(lockPath) ?? '';
  const meta = {
    network,
    chainId,
    sourceCommit: gitStatus.trim() === '' ? runGit(['rev-parse', 'HEAD'], { spawn: io.spawn }).trim() : null,
    suiCliVersion,
    frameworkRev: readFrameworkRev(lockBefore),
  };
  const dir = io.makeTempDir();
  io.keep(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  const expectedVersion = base.packageVersion + 1;
  const run = (args, prefix, parse, afterPublish) =>
    runAndKeep({
      sui,
      args,
      dir,
      prefix,
      parse,
      afterPublish,
      configDirs,
      retryAdvice: UPGRADE_RETRY_ADVICE,
      keep: io.keep,
    });

  if (network === 'testnet' || dryRun) {
    const { value: dry } = run(upgradeCliArgs({ network, pubfilePath, dryRun: true }), 'dry-run', parseUpgradeDryRunOutput, false);
    if (!dry.ok) {
      throw new Error(`el dry run no dio success con un paquete nuevo y el UpgradeCap avanzado (${dir}); un error de compatibilidad es STOP, nunca --skip-verify-compatibility`);
    }
    if (dry.created.packageVersion !== expectedVersion || dry.created.upgradeCapId !== base.upgradeCapId) {
      throw new Error(
        `el dry run daría la versión ${dry.created.packageVersion} (se esperaba la ${expectedVersion}) o avanzaría otro UpgradeCap: ` +
          `el despliegue base no es el estado actual de la cadena (¿ya se hizo este upgrade?); no se sigue (${dir})`,
      );
    }
    const lockWarning = checkLockUnchanged({ network, before: lockBefore, after: io.readText(lockPath) ?? '' });
    if (lockWarning) io.warn(lockWarning);
    io.info(`Dry run ok. Gas estimado: ${dry.gasEstimate} MIST.`);
    if (dryRun) {
      io.info(`Directorio temporal: ${dir} (bórralo cuando termines)`);
      return;
    }
  }

  // La transacción real va siempre después de esta guarda (solo testnet): sin terminal o sin escribir `testnet`, aborta.
  if (confirmationRequired({ network, dryRun })) {
    checkConfirmation({
      isTTY: io.isTTY,
      answer: io.isTTY === true ? await io.ask('hacer el upgrade') : null,
      action: 'hacer el upgrade',
    });
  }

  const lockBeforeUpgrade = io.readText(lockPath) ?? '';
  const { value: parsed, outputPath } = run(upgradeCliArgs({ network, pubfilePath, dryRun: false }), 'upgrade', parseUpgradeOutput, true);
  // Desde aquí la transacción ya existe: todo error indica el directorio y cómo rearmar el json con `record --upgrade`.
  try {
    const { value: typeOrigins } = run(
      ['client', '--json', 'object', parsed.packageId],
      'object',
      (json) => parseTypeOriginsOutput(json, { packageId: parsed.packageId, packageVersion: parsed.packageVersion }),
      false,
    );
    const deployment = validatedOrThrow(
      buildUpgradeDeployment({
        base,
        parsed,
        typeOrigins,
        sourceCommit: meta.sourceCommit,
        suiCliVersion,
        frameworkRev: meta.frameworkRev,
      }),
    );
    if (network === 'testnet') {
      const entry = parsePublishedToml(io.readText(publishedTomlPath) ?? '').get('testnet');
      if (!entry) throw new Error('falta [published.testnet] en Published.toml (no se escribió el json)');
      const differences = checkConsistency(deployment, entry);
      if (differences.length > 0) {
        throw new Error(`el json armado no coincide con Published.toml (no se escribió el json):\n  ${differences.join('\n  ')}`);
      }
    } else {
      const lockWarning = checkLockUnchanged({ network, before: lockBeforeUpgrade, after: io.readText(lockPath) ?? '' });
      if (lockWarning) io.warn(lockWarning);
    }
    io.writeDeployment(outPath, deployment);
    io.info(formatUpgradeSummary({ base, deployment, outPath, dir }));
  } catch (error) {
    throw new Error(formatPostUpgradeFailure({ reason: error.message, network, digest: parsed.digest, dir, outputPath }));
  }
}

/**
 * `record --upgrade` (#73, hueco 2): rearma el json de un upgrade **sin repetirlo y sin tocar la red**: lee el
 * `deployments/<red>.json` base, la salida cruda del upgrade (`--from`) y la de `sui client --json object <paquete>`
 * (`--type-origins`); no invoca `sui` ni git. El ID nuevo, la versión y el digest salen de la salida de la CLI, no de
 * `Published.toml` (V-11); en testnet el json solo se escribe si coincide con el `Published.toml` ya existente.
 * @param {Record<string, string|boolean|undefined>} values
 * @param {ReturnType<typeof defaultIo>} [io]
 */
export function commandRecordUpgrade(values, io = defaultIo()) {
  checkOutArg({ network: values.network, out: values.out });
  if (!values.from) throw new Error('--from es obligatorio');
  if (!values['type-origins']) {
    throw new Error('--type-origins es obligatorio con --upgrade (la salida cruda de `sui client --json object <paquete nuevo>`)');
  }
  const fromPath = path.resolve(values.from);
  const typeOriginsPath = path.resolve(values['type-origins']);
  const metaPath = path.resolve(values.meta ?? path.join(path.dirname(fromPath), 'meta.json'));
  if (values.meta && io.readText(metaPath) === null) throw new Error('--meta no existe');
  const metaText = io.readText(metaPath);
  let metaJson = null;
  if (metaText !== null) {
    try {
      metaJson = JSON.parse(metaText);
    } catch {
      throw new Error(`meta.json no es JSON válido: ${metaPath}`);
    }
  }
  const meta = resolveRecordMeta({
    metaJson,
    flags: {
      sourceCommit: values['source-commit'],
      suiCliVersion: values['sui-cli-version'],
      frameworkRev: values['framework-rev'],
      chainId: values['chain-id'],
    },
    network: values.network,
  });
  const base = readBaseDeployment(io, meta.network);
  checkUpgradeBase({ network: meta.network, base });
  if (base.chainId !== meta.chainId) {
    throw new Error(`el despliegue base es de otra cadena (chainId ${base.chainId}) que la de los metadatos (${meta.chainId})`);
  }
  const fromText = io.readText(fromPath);
  if (fromText === null) throw new Error('--from no existe');
  const typeOriginsText = io.readText(typeOriginsPath);
  if (typeOriginsText === null) throw new Error('--type-origins no existe');
  const parsed = parseUpgradeRaw(fromText);
  let typeOriginsJson;
  try {
    typeOriginsJson = JSON.parse(typeOriginsText);
  } catch {
    throw new Error('--type-origins no es JSON válido (la salida cruda de `sui client --json object <paquete nuevo>`)');
  }
  const typeOrigins = parseTypeOriginsOutput(typeOriginsJson, { packageId: parsed.packageId, packageVersion: parsed.packageVersion });
  const deployment = validatedOrThrow(
    buildUpgradeDeployment({
      base,
      parsed,
      typeOrigins,
      sourceCommit: meta.sourceCommit,
      suiCliVersion: meta.suiCliVersion,
      frameworkRev: meta.frameworkRev,
    }),
  );
  if (meta.network === 'testnet') {
    const publishedTomlText = io.readText(path.join(io.contractsDir, 'Published.toml'));
    const entry = parsePublishedToml(publishedTomlText ?? '').get('testnet');
    if (!entry) throw new Error('falta [published.testnet] en Published.toml: STOP, no se registra (README → Upgrade)');
    const differences = checkConsistency(deployment, entry);
    if (differences.length > 0) {
      throw new Error(`el json armado no coincide con Published.toml: STOP, no se registra ni se reintenta:\n  ${differences.join('\n  ')}`);
    }
  }
  const outPath = path.resolve(values.out ?? path.join(io.contractsDir, 'deployments', `${meta.network}.json`));
  io.writeDeployment(outPath, deployment);
  io.info(formatUpgradeSummary({ base, deployment, outPath, dir: null }));
}

function commandRecord(values) {
  if (values.upgrade === true) return commandRecordUpgrade(values);
  checkOutArg({ network: values.network, out: values.out });
  if (!values.from) throw new Error('--from es obligatorio');
  const fromPath = path.resolve(values.from);
  const metaPath = path.resolve(values.meta ?? path.join(path.dirname(fromPath), 'meta.json'));
  if (values.meta && !fs.existsSync(metaPath)) throw new Error('--meta no existe');
  const metaText = readTextOrNull(metaPath);
  let metaJson = null;
  if (metaText !== null) {
    try {
      metaJson = JSON.parse(metaText);
    } catch {
      throw new Error(`meta.json no es JSON válido: ${metaPath}`);
    }
  }
  const meta = resolveRecordMeta({
    metaJson,
    flags: {
      sourceCommit: values['source-commit'],
      suiCliVersion: values['sui-cli-version'],
      frameworkRev: values['framework-rev'],
      chainId: values['chain-id'],
    },
    network: values.network,
  });
  const result = { status: 0, stdout: fs.readFileSync(fromPath, 'utf8'), stderr: '' };
  const interpreted = interpretCliRun({ result, parse: parsePublishOutput, dir: null, outputPath: fromPath });
  if ('error' in interpreted) throw new Error(interpreted.error);
  const deployment = validatedOrThrow(buildDeployment({ ...meta, parsed: interpreted.value }));
  const outPath = path.resolve(values.out ?? defaultOut(meta.network));
  writeDeployment(outPath, deployment);
  info(formatSummary({ deployment, outPath, dir: null }));
}

function commandCheck() {
  const deploymentsDir = path.join(CONTRACTS_DIR, 'deployments');
  const names = fs.existsSync(deploymentsDir)
    ? fs.readdirSync(deploymentsDir).filter((n) => n.endsWith('.json')).sort()
    : [];
  const files = names.map((name) => ({ name, text: fs.readFileSync(path.join(deploymentsDir, name), 'utf8') }));
  const { count, errors } = checkDeployments({
    files,
    publishedTomlText: readTextOrNull(path.join(CONTRACTS_DIR, 'Published.toml')),
  });
  if (errors.length > 0) throw new Error(`deployments incoherentes:\n  ${errors.join('\n  ')}`);
  info(count === 0 ? '0 despliegues' : `${count} despliegue(s) válidos y coherentes con Published.toml`);
}

/**
 * Punto de entrada: solo I/O y despacho; devuelve el exit code. La guarda de Node va primero, antes de interpretar
 * los argumentos.
 * @param {string[]} argv
 * @param {{ nodeVersion?: string }} [options] versión de Node a validar (inyectable en los tests)
 * @returns {Promise<number>}
 */
export async function main(argv, { nodeVersion = process.versions.node } = {}) {
  try {
    checkNodeVersion({ nodeVersion, nvmrcText: readTextOrNull(path.join(CONTRACTS_DIR, '..', '.nvmrc')) });
    const { command, values } = parseCliArgs(argv);
    if (command === 'publish') await commandPublish(values);
    else if (command === 'upgrade') await commandUpgrade(values);
    else if (command === 'record') commandRecord(values);
    else commandCheck();
    return EXIT.OK;
  } catch (error) {
    write(process.stderr, error instanceof UsageError ? `Uso inválido: ${error.message}` : error.message);
    return error instanceof UsageError ? EXIT.USAGE : EXIT.FAILURE;
  }
}

/**
 * ¿Este módulo es el punto de entrada? `import.meta.main` si el runtime lo trae (boolean); si no (Node < 22.18),
 * compara el realpath de `process.argv[1]` con el de este archivo, para que la guarda de Node llegue a correr.
 * @param {{ importMetaMain: unknown, argv1: unknown, modulePath: string, realpath: (p: string) => string }} args
 * @returns {boolean}
 */
export function isEntryPoint({ importMetaMain, argv1, modulePath, realpath }) {
  if (typeof importMetaMain === 'boolean') return importMetaMain;
  if (typeof argv1 !== 'string' || argv1 === '') return false;
  try {
    return realpath(path.resolve(argv1)) === realpath(modulePath);
  } catch {
    return false;
  }
}

if (
  isEntryPoint({
    importMetaMain: import.meta.main,
    argv1: process.argv[1],
    modulePath: fileURLToPath(import.meta.url),
    realpath: fs.realpathSync,
  })
) {
  process.exitCode = await main(process.argv.slice(2));
}
