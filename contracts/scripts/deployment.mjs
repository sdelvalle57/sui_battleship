// Formato de `contracts/deployments/<red>.json` (D-20261102-01): funciones puras, sin I/O ni dependencias.
// Interpretan la salida `--json` real de la Sui CLI 1.83 (fixtures en `scripts/fixtures/`) y `Published.toml`,
// para que el script de publicación (#7) y la app (#9) compartan un único contrato de formato.

/** Chain id corto de testnet (8 hex, el que la CLI escribe en `Published.toml`). */
export const TESTNET_CHAIN_ID = '4c78adac';

/** Chain id corto de mainnet: una localnet nunca puede reportarlo (mainnet está fuera de alcance). */
export const MAINNET_CHAIN_ID = '35834a8a';

/** Versión del esquema del json; cualquier cambio incompatible sube este número. */
export const SCHEMA_VERSION = 1;

/** Los 14 campos obligatorios del json, en el orden en que se escriben (D-20261102-01 §1). */
export const DEPLOYMENT_FIELDS = Object.freeze([
  'schemaVersion',
  'network',
  'chainId',
  'packageId',
  'originalPackageId',
  'packageVersion',
  'upgradeCapId',
  'houseId',
  'houseCapId',
  'publishTxDigest',
  'publishTimestamp',
  'sourceCommit',
  'suiCliVersion',
  'frameworkRev',
]);

/**
 * Campos opcionales registrados: `nombre → validador(valor) ⇒ mensaje de error | null`. Vacío en v1; existe para
 * que un campo posterior (p. ej. `packageTxDigest`) se agregue sin subir `schemaVersion` y sin aceptar claves libres.
 */
export const OPTIONAL_FIELDS = Object.freeze({});

const NETWORKS = Object.freeze(['localnet', 'testnet']);
const ID_RE = /^0x[0-9a-f]{64}$/;
const HEX_RE = /^[0-9a-fA-F]+$/;
const CHAIN_ID_RE = /^[0-9a-f]{8}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ID_HEX_DIGITS = 64;
const SUI_FRAMEWORK = '0x2';
const ADDRESS_LIKE_RE = /\b(0x)?[0-9a-fA-F]{40,64}\b/g;

/**
 * Normaliza un ID de objeto o paquete a `0x` + 64 hex minúsculas. La CLI abrevia `0x2` y puede variar el caso;
 * comparar sin normalizar daría falsos negativos.
 * @param {string} str
 * @returns {string}
 */
export function normalizeId(str) {
  if (typeof str !== 'string') throw new Error(`ID inválido: se esperaba un string (${typeof str})`);
  const hex = str.startsWith('0x') || str.startsWith('0X') ? str.slice(2) : str;
  if (hex.length === 0 || !HEX_RE.test(hex)) throw new Error(`ID inválido: no es hex (${str})`);
  if (hex.length > ID_HEX_DIGITS) throw new Error(`ID inválido: más de ${ID_HEX_DIGITS} dígitos (${str})`);
  return `0x${hex.toLowerCase().padStart(ID_HEX_DIGITS, '0')}`;
}

function parseStructType(objectType) {
  const m = typeof objectType === 'string' ? /^(0x[0-9a-fA-F]+)::(\w+)::(\w+)$/.exec(objectType) : null;
  return m ? { address: normalizeId(m[1]), module: m[2], name: m[3] } : null;
}

// Valida la forma mínima común a publicación y dry run y dice si la transacción terminó en success.
function cliStatusSucceeded(json) {
  if (json === null || typeof json !== 'object') throw new Error('salida de la CLI inválida: no es un objeto JSON');
  if (!Array.isArray(json.objectChanges)) throw new Error('salida de la CLI inválida: falta objectChanges[]');
  return json.effects?.status?.status === 'success';
}

// Identifica los objetos de la publicación por tipo (nunca por posición: el orden de objectChanges no está
// garantizado). Devuelve los IDs encontrados y un error por cada tipo que no aparece exactamente una vez.
function extractPublishedObjects(objectChanges) {
  const errors = [];
  const published = objectChanges.filter((c) => c?.type === 'published');
  if (published.length !== 1) {
    errors.push(`se esperaba exactamente un objeto published y hay ${published.length}`);
    return { errors, packageId: null, packageVersion: null, houseId: null, houseCapId: null, upgradeCapId: null };
  }
  const packageId = normalizeId(published[0].packageId);
  const packageVersion = Number(published[0].version);
  if (!Number.isInteger(packageVersion) || packageVersion < 1) {
    errors.push(`versión del paquete inválida (${published[0].version})`);
  }
  const created = objectChanges
    .filter((c) => c?.type === 'created')
    .map((c) => ({ change: c, type: parseStructType(c.objectType) }));
  const findUnique = (label, address, module, name) => {
    const matches = created.filter(
      ({ type }) => type && type.address === address && type.module === module && type.name === name,
    );
    if (matches.length !== 1) {
      errors.push(`se esperaba exactamente un ${label} creado y hay ${matches.length}`);
      return { id: null, change: null };
    }
    return { id: normalizeId(matches[0].change.objectId), change: matches[0].change };
  };
  const house = findUnique('<pkg>::house::House', packageId, 'house', 'House');
  if (house.change && !(house.change.owner && typeof house.change.owner === 'object' && 'Shared' in house.change.owner)) {
    errors.push('<pkg>::house::House no es un objeto compartido (owner ≠ Shared)');
  }
  const houseCap = findUnique('<pkg>::house::HouseCap', packageId, 'house', 'HouseCap');
  const upgradeCap = findUnique('0x2::package::UpgradeCap', normalizeId(SUI_FRAMEWORK), 'package', 'UpgradeCap');
  return {
    errors,
    packageId,
    packageVersion,
    houseId: house.id,
    houseCapId: houseCap.id,
    upgradeCapId: upgradeCap.id,
  };
}

/**
 * Interpreta la salida `sui client --json publish|test-publish` (o `tx-block --json`, misma forma). Solo devuelve
 * IDs y metadatos públicos: nunca `sender`/`owner`, que son direcciones de cuentas (D-20261102-01 §1, SEG-3).
 * Lanza si la transacción no terminó en success o si la forma es inválida.
 * @param {object} json salida ya parseada
 * @returns {{ digest: string, timestampMs: string, packageId: string, packageVersion: number, houseId: string,
 *   houseCapId: string, upgradeCapId: string }}
 */
export function parsePublishOutput(json) {
  if (!cliStatusSucceeded(json)) {
    throw new Error(`la transacción no terminó en success (status: ${json.effects?.status?.status ?? 'ausente'})`);
  }
  if (typeof json.digest !== 'string' || !DIGEST_RE.test(json.digest)) throw new Error('falta el digest de la transacción');
  if (typeof json.timestampMs !== 'string' || !/^\d+$/.test(json.timestampMs)) throw new Error('falta timestampMs');
  const objects = extractPublishedObjects(json.objectChanges);
  if (objects.errors.length > 0) throw new Error(objects.errors.join('; '));
  return {
    digest: json.digest,
    timestampMs: json.timestampMs,
    packageId: objects.packageId,
    packageVersion: objects.packageVersion,
    houseId: objects.houseId,
    houseCapId: objects.houseCapId,
    upgradeCapId: objects.upgradeCapId,
  };
}

/**
 * Interpreta la salida `--json --dry-run` (claves `effects`, `objectChanges`, `executionErrorSource`, …; sin `digest`
 * ni `timestampMs`; `effects.transactionDigest` es de la simulación y no se usa). No lanza por un resultado malo:
 * `ok` lo resume para que el script aborte antes de publicar; sí lanza si la forma es inválida.
 * `gasEstimate` es el costo neto en MIST: cómputo + almacenamiento − reembolso.
 * @param {object} json salida ya parseada
 * @returns {{ ok: boolean, gasEstimate: bigint, created: { packageId: string|null, houseId: string|null,
 *   houseCapId: string|null, upgradeCapId: string|null } }}
 */
export function parseDryRunOutput(json) {
  const success = cliStatusSucceeded(json);
  const gas = json.effects?.gasUsed;
  if (!gas) throw new Error('salida de dry run inválida: falta effects.gasUsed');
  const gasEstimate = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
  const objects = extractPublishedObjects(json.objectChanges);
  return {
    ok: success && objects.errors.length === 0,
    gasEstimate,
    created: {
      packageId: objects.packageId,
      houseId: objects.houseId,
      houseCapId: objects.houseCapId,
      upgradeCapId: objects.upgradeCapId,
    },
  };
}

/**
 * Arma el json de despliegue con los 14 campos en el orden fijo de `DEPLOYMENT_FIELDS`. En una publicación,
 * `originalPackageId` = `packageId` (difieren recién tras un upgrade). No valida: eso es `validateDeployment`.
 * @param {{ network: string, chainId: string, parsed: ReturnType<typeof parsePublishOutput>,
 *   sourceCommit: string|null, suiCliVersion: string, frameworkRev: string }} args
 * @returns {object}
 */
export function buildDeployment({ network, chainId, parsed, sourceCommit, suiCliVersion, frameworkRev }) {
  return {
    schemaVersion: SCHEMA_VERSION,
    network,
    chainId,
    packageId: parsed.packageId,
    originalPackageId: parsed.packageId,
    packageVersion: parsed.packageVersion,
    upgradeCapId: parsed.upgradeCapId,
    houseId: parsed.houseId,
    houseCapId: parsed.houseCapId,
    publishTxDigest: parsed.digest,
    publishTimestamp: new Date(Number(parsed.timestampMs)).toISOString(),
    sourceCommit,
    suiCliVersion,
    frameworkRev,
  };
}

/**
 * Regla única del chain id por red (json, guarda de red del script y `record`): 8 hex; testnet exige el suyo y una
 * localnet no puede reportar el de testnet ni el de mainnet (señal de que la CLI apunta a otra red).
 * @param {string} network
 * @param {unknown} chainId
 * @returns {string|null} motivo del error, o `null` si es válido
 */
export function chainIdError(network, chainId) {
  if (typeof chainId !== 'string' || !CHAIN_ID_RE.test(chainId)) return '8 hex minúsculas';
  if (network === 'testnet' && chainId !== TESTNET_CHAIN_ID) return `testnet exige ${TESTNET_CHAIN_ID}`;
  if (network === 'localnet' && [TESTNET_CHAIN_ID, MAINNET_CHAIN_ID].includes(chainId)) {
    return 'una localnet no puede tener el chain id de testnet ni el de mainnet';
  }
  return null;
}

/**
 * Valida un json de despliegue y devuelve la lista de errores (vacía = válido). Rechaza claves desconocidas para
 * que no entre por descuido ningún dato extra (p. ej. una dirección de cuenta); los opcionales se registran en
 * `OPTIONAL_FIELDS` (inyectable para tests) y se validan solo si aparecen.
 * @param {object} obj
 * @param {{ optionalFields?: Record<string, (value: unknown) => string|null> }} [options]
 * @returns {string[]}
 */
export function validateDeployment(obj, { optionalFields = OPTIONAL_FIELDS } = {}) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return ['el despliegue no es un objeto JSON'];
  const errors = [];
  for (const key of Object.keys(obj)) {
    if (!DEPLOYMENT_FIELDS.includes(key) && !Object.hasOwn(optionalFields, key)) errors.push(`clave desconocida: ${key}`);
  }
  for (const key of DEPLOYMENT_FIELDS) {
    if (!Object.hasOwn(obj, key)) errors.push(`falta el campo obligatorio ${key}`);
  }
  const has = (key) => Object.hasOwn(obj, key);
  const check = (key, valid, rule) => {
    if (has(key) && !valid(obj[key])) errors.push(`${key} inválido: ${rule}`);
  };
  check('schemaVersion', (v) => v === SCHEMA_VERSION, `debe ser ${SCHEMA_VERSION}`);
  check('network', (v) => NETWORKS.includes(v), `debe ser ${NETWORKS.join(' o ')}`);
  if (has('chainId')) {
    const error = chainIdError(obj.network, obj.chainId);
    if (error) errors.push(`chainId inválido: ${error}`);
  }
  for (const key of ['packageId', 'originalPackageId', 'upgradeCapId', 'houseId', 'houseCapId']) {
    check(key, (v) => typeof v === 'string' && ID_RE.test(v), '0x + 64 hex minúsculas');
  }
  check('packageVersion', (v) => Number.isInteger(v) && v >= 1, 'entero ≥ 1');
  check('publishTxDigest', (v) => typeof v === 'string' && DIGEST_RE.test(v), 'digest base58 de 32 a 44 caracteres');
  check(
    'publishTimestamp',
    (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString() === v,
    'ISO 8601 UTC con milisegundos y Z',
  );
  check(
    'sourceCommit',
    (v) => (typeof v === 'string' && SHA_RE.test(v)) || (v === null && obj.network === 'localnet'),
    'SHA de 40 hex (null solo en localnet)',
  );
  check('suiCliVersion', (v) => typeof v === 'string' && v.length > 0, 'string no vacío');
  check('frameworkRev', (v) => typeof v === 'string' && SHA_RE.test(v), 'SHA de 40 hex');
  for (const [key, validate] of Object.entries(optionalFields)) {
    if (!has(key)) continue;
    const error = validate(obj[key]);
    if (error) errors.push(`${key} inválido: ${error}`);
  }
  return errors;
}

const PUBLISHED_KEYS = Object.freeze({
  'chain-id': { field: 'chainId', type: 'string' },
  'published-at': { field: 'publishedAt', type: 'string' },
  'original-id': { field: 'originalId', type: 'string' },
  version: { field: 'version', type: 'integer' },
  'upgrade-capability': { field: 'upgradeCapability', type: 'string' },
  'toolchain-version': { field: 'toolchainVersion', type: 'string' },
});

/**
 * Lee `Published.toml` (lo escribe la CLI; fuente de verdad del paquete, D-20261102-01 §3). Parser deliberadamente
 * restringido al formato de la CLI 1.83 en vez de un TOML completo (sin dependencias, D2): cualquier línea fuera de
 * ese formato es un error con su número, para que un cambio de formato de la CLI se note en la CI.
 * @param {string} text
 * @returns {Map<string, { chainId: string, publishedAt: string, originalId: string, version: number,
 *   upgradeCapability: string, toolchainVersion: string }>}
 */
export function parsePublishedToml(text) {
  if (typeof text !== 'string') throw new Error('Published.toml: se esperaba texto');
  const result = new Map();
  let current = null;
  const lines = text.split(/\r?\n/);
  const fail = (n, msg) => {
    throw new Error(`Published.toml:${n}: ${msg}`);
  };
  // Una sección incompleta se reporta en la línea de su cabecera.
  const finish = () => {
    if (!current) return;
    for (const { field } of Object.values(PUBLISHED_KEYS)) {
      if (!(field in current.entry)) fail(current.line, `[published.${current.env}] sin ${field}`);
    }
    result.set(current.env, current.entry);
  };
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    const section = /^\[published\.([A-Za-z0-9_-]+)\]$/.exec(line);
    if (section) {
      finish();
      if (result.has(section[1])) fail(n, `sección [published.${section[1]}] duplicada`);
      current = { env: section[1], entry: {}, seen: new Set(), line: n };
      return;
    }
    const kv = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!kv || !current) fail(n, `línea inesperada: ${line}`);
    const [, key, value] = kv;
    if (current.seen.has(key)) fail(n, `clave duplicada: ${key}`);
    current.seen.add(key);
    if (key === 'build-config') {
      if (!/^\{.*\}$/.test(value)) fail(n, 'build-config debe ser una tabla en línea');
      return;
    }
    const spec = PUBLISHED_KEYS[key];
    if (!spec) fail(n, `clave desconocida: ${key}`);
    if (spec.type === 'integer') {
      if (!/^\d+$/.test(value)) fail(n, `${key} debe ser un entero`);
      current.entry[spec.field] = Number(value);
    } else {
      const str = /^"([^"\\]*)"$/.exec(value);
      if (!str) fail(n, `${key} debe ser un texto entre comillas`);
      current.entry[spec.field] = str[1];
    }
  });
  finish();
  return result;
}

/**
 * Compara el json de despliegue con su entrada de `Published.toml` (ARQ-6: la CI falla si divergen). Devuelve una
 * diferencia legible por campo; IDs comparados normalizados porque la CLI y el json pueden diferir en formato.
 * @param {object} deployment
 * @param {{ chainId: string, publishedAt: string, originalId: string, version: number, upgradeCapability: string }} entry
 * @returns {string[]}
 */
export function checkConsistency(deployment, entry) {
  const differences = [];
  const sameId = (a, b) => {
    try {
      return normalizeId(a) === normalizeId(b);
    } catch {
      return false;
    }
  };
  const pairs = [
    ['packageId', 'published-at', deployment.packageId, entry.publishedAt, sameId],
    ['originalPackageId', 'original-id', deployment.originalPackageId, entry.originalId, sameId],
    ['packageVersion', 'version', deployment.packageVersion, entry.version, (a, b) => a === b],
    ['upgradeCapId', 'upgrade-capability', deployment.upgradeCapId, entry.upgradeCapability, sameId],
    ['chainId', 'chain-id', deployment.chainId, entry.chainId, (a, b) => a === b],
  ];
  for (const [jsonKey, tomlKey, a, b, equal] of pairs) {
    if (!equal(a, b)) differences.push(`${jsonKey} (${a}) ≠ ${tomlKey} de Published.toml (${b})`);
  }
  return differences;
}

/**
 * Devuelve el `rev` del framework fijado en `Move.lock` (`[pinned.testnet.Sui]`), con la misma lógica que `lock_rev`
 * del job `framework-drift` (`ci.yml`), para registrar con qué framework se publicó (STATUS H13).
 * @param {string} moveLockText
 * @returns {string}
 */
export function readFrameworkRev(moveLockText) {
  if (typeof moveLockText !== 'string') throw new Error('Move.lock: se esperaba texto');
  const lines = moveLockText.split(/\r?\n/);
  const start = lines.indexOf('[pinned.testnet.Sui]');
  if (start !== -1) {
    for (const line of lines.slice(start + 1)) {
      if (line.startsWith('[')) break;
      const m = /rev = "([0-9a-f]{40})"/.exec(line);
      if (m) return m[1];
    }
  }
  throw new Error('Move.lock: no se encontró el rev de [pinned.testnet.Sui]');
}

/**
 * Oculta todo lo que parece una dirección (40 a 64 hex, con o sin `0x`) en texto de la CLI (stderr) antes de
 * imprimirlo, para no filtrar la dirección del owner (SEG-3). No es para el resumen propio del script, que solo
 * tiene IDs públicos.
 * @param {string} text
 * @returns {string}
 */
export function redactAddresses(text) {
  return String(text).replace(ADDRESS_LIKE_RE, '0x…');
}
