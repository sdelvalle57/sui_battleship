// Publicación del paquete y registro de `contracts/deployments/<red>.json` (#7, D-20261102-01 y D-20261102-03).
// Uso (desde `contracts/`):
//   node scripts/publish.mjs publish --network localnet|testnet [--pubfile-path <archivo>] [--out <ruta>] [--dry-run]
//   node scripts/publish.mjs record --network <red> --from <salida.json> [--meta <meta.json>]
//                                    [--source-commit <sha> --sui-cli-version <v> --framework-rev <sha> --chain-id <hex>]
//                                    [--out <ruta>]
//   node scripts/publish.mjs check
// Toda decisión vive en funciones puras exportadas (testeadas en `publish.test.mjs`); `main()` solo hace I/O. La única
// llamada a la CLI es `runSui` y la única a git es `runGit`. Ningún agente corre el camino testnet (D-20261102-03).
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
  chainIdError,
  checkConsistency,
  parseDryRunOutput,
  parsePublishOutput,
  parsePublishedToml,
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
const FAILED_TX_DIGEST_RE = /Error executing transaction '([1-9A-HJ-NP-Za-km-z]{32,44})'/;
const RETRY_ADVICE =
  "No reintentes sin buscar antes el digest; si la transacción existe: `printf 'n\\n' | SUI_CONFIG_DIR=<tu dir> " +
  'sui client --json tx-block <digest>` + `record` (README → Recuperación; si falta `Published.toml`, STOP de #8).';
const MISSING_PUBLISHED_TOML_ADVICE =
  'Si `Published.toml` falta o no coincide con el json (testnet), es STOP de #8: no lo edites a mano.';

/** Error de uso (subcomando u opción inválidos): sale con `EXIT.USAGE`. */
export class UsageError extends Error {}

const SUBCOMMAND_OPTIONS = Object.freeze({
  publish: ['network', 'pubfile-path', 'out', 'dry-run'],
  record: ['network', 'from', 'meta', 'source-commit', 'sui-cli-version', 'framework-rev', 'chain-id', 'out'],
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
    throw new UsageError(`subcomando inválido: ${command ?? '(ninguno)'} (publish | record | check)`);
  }
  if (extra.length > 0) throw new UsageError(`argumentos sobrantes: ${extra.join(' ')}`);
  for (const key of Object.keys(parsed.values)) {
    if (!SUBCOMMAND_OPTIONS[command].includes(key)) throw new UsageError(`--${key} no aplica a ${command}`);
  }
  return { command, values: parsed.values };
}

const FORBIDDEN_SUI_ARGS = Object.freeze(['-y', '--yes', '--client.config', '--client.env']);
const ALLOWED_SUI_VECTORS = Object.freeze([
  ['--version'],
  ['client', '--json', 'active-env'],
  ['client', '--json', 'chain-identifier'],
  ['client', '--json', 'publish'],
  ['client', '--json', 'publish', '--dry-run'],
]);
const TEST_PUBLISH_PREFIX = Object.freeze(['client', '--json', 'test-publish', '--build-env', 'testnet', '--pubfile-path']);

const sameVector = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Lista blanca por vector completo (v2-3): solo lectura de env/chain id/versión y las publicaciones previstas. Rechaza
 * además de forma explícita las opciones que crean claves sin preguntar o cambian la config/env activos.
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
  const prefix = args.slice(0, TEST_PUBLISH_PREFIX.length);
  const [pubfile, ...rest] = args.slice(TEST_PUBLISH_PREFIX.length);
  return (
    sameVector(prefix, TEST_PUBLISH_PREFIX) &&
    typeof pubfile === 'string' &&
    pubfile.length > 0 &&
    !pubfile.startsWith('-') &&
    (rest.length === 0 || sameVector(rest, ['--dry-run']))
  );
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
 * Guarda 1: red válida y `--pubfile-path` obligatorio en localnet (un pubfile de otra génesis hace fallar a la CLI, C2)
 * y prohibido en testnet (`publish` lo rechaza, C3).
 * @param {{ network: unknown, pubfilePath: unknown }} args
 */
export function checkPublishArgs({ network, pubfilePath }) {
  if (!NETWORKS.includes(network)) throw new Error(`--network inválida: ${network ?? '(falta)'} (localnet | testnet)`);
  if (network === 'localnet' && (typeof pubfilePath !== 'string' || pubfilePath.length === 0)) {
    throw new Error('--pubfile-path es obligatorio en localnet (uno nuevo por génesis)');
  }
  if (network === 'testnet' && pubfilePath !== undefined) throw new Error('--pubfile-path no se admite en testnet');
}

/**
 * Guarda 2 (v2-2): `SUI_CONFIG_DIR` definido, absoluto, existente, con `client.yaml` y cuyo realpath no esté dentro
 * de `<home>/.sui` para ningún home (`os.homedir()` y `os.userInfo().homedir`, por si `HOME` está redefinido):
 * `~/.sui/` no tiene claves y nunca se usa para publicar (D-20261102-03). Los mensajes no incluyen la ruta.
 * @param {{ value: string|undefined, isAbsolute: (p: string) => boolean, exists: (p: string) => boolean,
 *   isDir: (p: string) => boolean, hasClientYaml: (dir: string) => boolean, realpath: (p: string) => string,
 *   homes: string[] }} probes
 * @returns {string} realpath validado, el que `runSui` pasa a la CLI
 */
export function checkConfigDirGuard({ value, isAbsolute, exists, isDir, hasClientYaml, realpath, homes }) {
  const invalid = (reason) => new Error(`SUI_CONFIG_DIR inválido: ${reason}`);
  if (typeof value !== 'string' || value.length === 0) {
    throw invalid('no está definido (owner: tu config propia; agentes: la localnet aislada de agents.md §3)');
  }
  if (!isAbsolute(value)) throw invalid('no es una ruta absoluta');
  if (!exists(value) || !isDir(value)) throw invalid('no existe o no es un directorio');
  if (!hasClientYaml(value)) throw invalid('no contiene client.yaml');
  const real = realpath(value);
  for (const home of homes) {
    const suiDir = path.join(home, '.sui');
    const resolvedSui = exists(suiDir)
      ? realpath(suiDir)
      : path.join(exists(home) ? realpath(home) : path.resolve(home), '.sui');
    if (real === resolvedSui || real.startsWith(resolvedSui + path.sep)) {
      throw invalid('está dentro de ~/.sui, que queda sin claves para siempre (D-20261102-03)');
    }
  }
  return real;
}

/**
 * Lee la salida `--json` de una consulta de la CLI (`active-env`, `chain-identifier`). Ante un fallo muestra el stderr
 * con las direcciones ocultas; nunca el stdout.
 * @param {{ status: number|null, stdout: string, stderr: string }} result
 * @param {string} what nombre de la consulta, para el mensaje
 * @returns {unknown}
 */
export function readCliJson(result, what) {
  if (result.status !== 0) {
    throw new Error(`sui client ${what} falló (estado ${result.status}): ${redactAddresses(result.stderr).trim()}`);
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

const CONFIRMATION_PROMPT =
  'Freno contra accidentes; la autorización es la del owner (D-20261030-09). ' +
  `Escribe "${CONFIRMATION_WORD}" para publicar: `;

/**
 * Guarda 7: freno contra accidentes, no control de seguridad (se puede simular una terminal, D-20261102-03). Sin TTY
 * aborta; con TTY exige escribir `testnet`. No existe opción ni variable que la omita.
 * @param {{ isTTY: unknown, answer: string|null }} args
 */
export function checkConfirmation({ isTTY, answer }) {
  if (isTTY !== true) throw new Error('publicar en testnet exige una terminal interactiva (sin TTY: abortado)');
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
 * @param {{ reason: string, status?: number|null, stdout?: string, stderr: string, dir: string|null,
 *   outputPath: string, afterPublish?: boolean }} args
 * @returns {string}
 */
export function formatCliFailure({ reason, status = 1, stdout = '', stderr, dir, outputPath, afterPublish = false }) {
  const lines = [`Error: ${reason}`, `Salida completa (sin mostrar): ${outputPath}`];
  if (dir) lines.push(`Directorio temporal: ${dir}`);
  const cliFailed = status !== 0;
  const digest = FAILED_TX_DIGEST_RE.exec(stderr)?.[1] ?? (cliFailed ? FAILED_TX_DIGEST_RE.exec(stdout)?.[1] : undefined);
  if (digest) lines.push(`Digest de la transacción: ${digest}`);
  if (cliFailed) {
    lines.push(`Motivo de la CLI en ${outputPath} (revísalo ahí; no lo pegues: puede traer tu dirección)`);
  }
  if (stderr.trim() !== '') lines.push('stderr de la CLI (direcciones ocultas):', redactAddresses(stderr).trimEnd());
  if (afterPublish) lines.push(RETRY_ADVICE);
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
 * digest (H-1).
 * @param {{ result: { status: number|null, stdout: string, stderr: string }, parse: (json: object) => unknown,
 *   dir: string|null, outputPath: string, afterPublish?: boolean }} args
 * @returns {{ value: unknown } | { error: string }}
 */
export function interpretCliRun({ result, parse, dir, outputPath, afterPublish = false }) {
  const fail = (reason) => ({
    error: formatCliFailure({
      reason,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      dir,
      outputPath,
      afterPublish,
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
  lines.push(
    'Siguiente paso obligatorio (#8), no lo ejecuta este script:',
    `  sui client call --package ${deployment.packageId} --module house --function update_fee_rate ` +
      `--args ${deployment.houseId} ${deployment.houseCapId} <bps>`,
    `  Verificación: sui client object ${deployment.houseId} --json (campo fee_rate)`,
  );
  return lines.join('\n');
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
function runAndKeep({ sui, args, dir, prefix, parse, afterPublish }) {
  const result = sui(args);
  const outputPath = path.join(dir, `${prefix}-output.json`);
  writePrivate(outputPath, result.stdout);
  writePrivate(path.join(dir, `${prefix}-stderr.txt`), result.stderr);
  const interpreted = interpretCliRun({ result, parse, dir, outputPath, afterPublish });
  if ('error' in interpreted) throw new Error(interpreted.error);
  return { value: interpreted.value, outputPath };
}

async function askConfirmation() {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return await rl.question(CONFIRMATION_PROMPT);
  } finally {
    rl.close();
  }
}

async function commandPublish(values) {
  const network = values.network;
  const dryRun = values['dry-run'] === true;
  checkPublishArgs({ network, pubfilePath: values['pubfile-path'] });
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
  const sui = (args) => runSui(args, { configDir });

  const chainId = checkNetworkGuard({
    network,
    activeEnv: readCliJson(sui(['client', '--json', 'active-env']), 'active-env'),
    readChainId: () => chainIdFromCli(readCliJson(sui(['client', '--json', 'chain-identifier']), 'chain-identifier')),
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

function commandRecord(values) {
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
 * Punto de entrada: solo I/O y despacho; devuelve el exit code.
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
export async function main(argv) {
  try {
    const { command, values } = parseCliArgs(argv);
    if (command === 'publish') await commandPublish(values);
    else if (command === 'record') commandRecord(values);
    else commandCheck();
    return EXIT.OK;
  } catch (error) {
    write(process.stderr, error instanceof UsageError ? `Uso inválido: ${error.message}` : error.message);
    return error instanceof UsageError ? EXIT.USAGE : EXIT.FAILURE;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
