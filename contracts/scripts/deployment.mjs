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

/** Redes admitidas por el json y el script; mainnet está fuera de alcance sin decisión registrada. */
export const NETWORKS = Object.freeze(['localnet', 'testnet']);
const ID_RE = /^0x[0-9a-f]{64}$/;
const HEX_RE = /^[0-9a-fA-F]+$/;
const CHAIN_ID_RE = /^[0-9a-f]{8}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const DIGEST_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ID_HEX_DIGITS = 64;
const SUI_FRAMEWORK = '0x2';
const ADDRESS_LIKE_RE = /\b(0x)?[0-9a-fA-F]{40,64}\b/g;
/** Primera versión de un paquete que es un upgrade (la 1 es la publicación). */
const FIRST_UPGRADE_VERSION = 2;
/**
 * Los 13 tipos de `house` y `game` que existen desde la v1 (plan §4.4, H-3): llevan siempre el `originalPackageId` y no
 * pueden faltar (un upgrade compatible no borra tipos), así que su ausencia delata una tabla truncada. Un struct
 * **agregado** a esos módulos en un upgrade posterior no está en la lista: tiene su propio `definingId` (S-2).
 */
const V1_TYPES = Object.freeze({
  house: ['House', 'HouseCap', 'HOUSE', 'FeeRateUpdated', 'BetLimitsUpdated', 'FeesWithdrawn', 'HouseCapTransferred', 'HouseMigrated'],
  game: ['Game', 'GameCreated', 'GameCancelled', 'GameResolved', 'GameState'],
});
const V1_TYPE_PAIRS = Object.freeze(Object.entries(V1_TYPES).flatMap(([module, names]) => names.map((name) => [module, name])));
const UPGRADE_ENTRY_KEYS = Object.freeze(['version', 'packageId', 'txDigest']);
const TYPE_ORIGIN_KEYS = Object.freeze(['module', 'name', 'definingId']);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Claves de una entrada: exactamente `keys`, ni más ni menos (nada se cuela por descuido, como en el json raíz).
function entryKeysError(entry, keys, label) {
  const extra = Object.keys(entry).filter((k) => !keys.includes(k));
  if (extra.length > 0) return `${label}: clave desconocida ${extra.join(', ')}`;
  const missing = keys.filter((k) => !Object.hasOwn(entry, k));
  return missing.length > 0 ? `${label}: falta ${missing.join(', ')}` : null;
}

/**
 * Validador de forma de `upgrades` (#73, TASK-4): `[{ version, packageId, txDigest }]`, uno por upgrade, en orden
 * ascendente y consecutivo desde la versión 2, con `packageId` distintos. Las reglas que cruzan con el resto del json
 * (el último = `packageId`/`packageVersion`) las aplica `validateDeployment`.
 * @param {unknown} value
 * @returns {string|null} motivo del error, o `null` si es válido
 */
export function validateUpgradesField(value) {
  if (!Array.isArray(value)) return 'debe ser un arreglo';
  const seen = new Set();
  for (const [i, entry] of value.entries()) {
    const label = `upgrades[${i}]`;
    if (!isPlainObject(entry)) return `${label} debe ser un objeto`;
    const keysError = entryKeysError(entry, UPGRADE_ENTRY_KEYS, label);
    if (keysError) return keysError;
    if (!Number.isInteger(entry.version) || entry.version !== FIRST_UPGRADE_VERSION + i) {
      return `${label}.version debe ser ${FIRST_UPGRADE_VERSION + i} (consecutivo desde ${FIRST_UPGRADE_VERSION})`;
    }
    if (typeof entry.packageId !== 'string' || !ID_RE.test(entry.packageId)) {
      return `${label}.packageId debe ser 0x + 64 hex minúsculas`;
    }
    if (seen.has(entry.packageId)) return `${label}.packageId repetido`;
    seen.add(entry.packageId);
    if (typeof entry.txDigest !== 'string' || !DIGEST_RE.test(entry.txDigest)) {
      return `${label}.txDigest debe ser un digest base58 de 32 a 44 caracteres`;
    }
  }
  return null;
}

/**
 * Validador de forma de `typeOrigins` (#73, TASK-4): `[{ module, name, definingId }]`, la tabla de orígenes del objeto
 * paquete. La clave es el **par** (módulo, nombre), nunca solo el módulo (S-2): un struct agregado a un módulo
 * existente en un upgrade posterior tiene su propio `definingId`; un par repetido es un error.
 * @param {unknown} value
 * @returns {string|null} motivo del error, o `null` si es válido
 */
export function validateTypeOriginsField(value) {
  if (!Array.isArray(value)) return 'debe ser un arreglo';
  if (value.length === 0) return 'no puede estar vacío';
  const seen = new Set();
  for (const [i, entry] of value.entries()) {
    const label = `typeOrigins[${i}]`;
    if (!isPlainObject(entry)) return `${label} debe ser un objeto`;
    const keysError = entryKeysError(entry, TYPE_ORIGIN_KEYS, label);
    if (keysError) return keysError;
    for (const key of ['module', 'name']) {
      if (typeof entry[key] !== 'string' || !IDENTIFIER_RE.test(entry[key])) return `${label}.${key} debe ser un identificador`;
    }
    if (typeof entry.definingId !== 'string' || !ID_RE.test(entry.definingId)) {
      return `${label}.definingId debe ser 0x + 64 hex minúsculas`;
    }
    const pair = `${entry.module}::${entry.name}`;
    if (seen.has(pair)) return `${label}: el par (módulo, nombre) ${pair} está repetido`;
    seen.add(pair);
  }
  return null;
}

/**
 * Campos opcionales registrados: `nombre → validador(valor) ⇒ mensaje de error | null`. `upgrades` y `typeOrigins`
 * (#73) se agregan sin subir `schemaVersion` (el `testnet.json` de hoy, sin ellos, sigue siendo válido) y sin aceptar
 * claves libres; un campo posterior se registra aquí en el mismo PR que su fila de `contracts/README.md`.
 */
export const OPTIONAL_FIELDS = Object.freeze({
  upgrades: validateUpgradesField,
  typeOrigins: validateTypeOriginsField,
});

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

const UPGRADE_CAP_TYPE = Object.freeze({ address: normalizeId(SUI_FRAMEWORK), module: 'package', name: 'UpgradeCap' });

// Cambios de paquete de un upgrade (real o simulado): el único `published` y el `0x2::package::UpgradeCap` mutado
// (el upgrade no crea otro cap: lo avanza de versión). Devuelve los IDs y un error por cada cosa que falte o sobre.
function extractUpgradedObjects(objectChanges) {
  const errors = [];
  const published = objectChanges.filter((c) => c?.type === 'published');
  let packageId = null;
  let packageVersion = null;
  if (published.length !== 1) {
    errors.push(`no trae el cambio de paquete: se esperaba exactamente un objeto published y hay ${published.length}`);
  } else {
    packageId = normalizeId(published[0].packageId);
    packageVersion = Number(published[0].version);
    if (!Number.isInteger(packageVersion) || packageVersion < FIRST_UPGRADE_VERSION) {
      errors.push(`versión del paquete inválida para un upgrade (${published[0].version})`);
    }
  }
  const caps = objectChanges.filter((c) => {
    const type = c?.type === 'mutated' ? parseStructType(c.objectType) : null;
    return (
      type !== null &&
      type.address === UPGRADE_CAP_TYPE.address &&
      type.module === UPGRADE_CAP_TYPE.module &&
      type.name === UPGRADE_CAP_TYPE.name
    );
  });
  let upgradeCapId = null;
  if (caps.length !== 1) errors.push(`se esperaba exactamente un 0x2::package::UpgradeCap mutado y hay ${caps.length}`);
  else upgradeCapId = normalizeId(caps[0].objectId);
  return { errors, packageId, packageVersion, upgradeCapId };
}

/**
 * Interpreta la salida `sui client --json upgrade|test-upgrade`. Solo devuelve IDs y metadatos públicos (nunca
 * `sender`/`owner`). Lanza si la transacción no terminó en success o si **no trae el cambio de paquete** (sin
 * `published`: es lo que distingue un upgrade de cualquier otra transacción).
 * **Forma de referencia: la de `test-upgrade`** (la única medida; `sui client upgrade` la corre solo el owner): el script
 * toma el ID nuevo, la versión y el digest de esta salida, no de cómo la CLI reescribe `Published.toml` (V-11).
 * @param {object} json salida ya parseada
 * @returns {{ digest: string, timestampMs: string, packageId: string, packageVersion: number, upgradeCapId: string }}
 */
export function parseUpgradeOutput(json) {
  if (!cliStatusSucceeded(json)) {
    throw new Error(`la transacción no terminó en success (status: ${json.effects?.status?.status ?? 'ausente'})`);
  }
  if (typeof json.digest !== 'string' || !DIGEST_RE.test(json.digest)) throw new Error('falta el digest de la transacción');
  if (typeof json.timestampMs !== 'string' || !/^\d+$/.test(json.timestampMs)) throw new Error('falta timestampMs');
  const objects = extractUpgradedObjects(json.objectChanges);
  if (objects.errors.length > 0) throw new Error(objects.errors.join('; '));
  return {
    digest: json.digest,
    timestampMs: json.timestampMs,
    packageId: objects.packageId,
    packageVersion: objects.packageVersion,
    upgradeCapId: objects.upgradeCapId,
  };
}

/**
 * Interpreta la salida `--json --dry-run` de un upgrade (sin `digest` ni `timestampMs`; el `packageId` es de la
 * simulación). Como `parseDryRunOutput`: no lanza por un resultado malo, `ok` lo resume; sí lanza si la forma es inválida.
 * @param {object} json salida ya parseada
 * @returns {{ ok: boolean, gasEstimate: bigint, created: { packageId: string|null, packageVersion: number|null,
 *   upgradeCapId: string|null } }}
 */
export function parseUpgradeDryRunOutput(json) {
  const success = cliStatusSucceeded(json);
  const gas = json.effects?.gasUsed;
  if (!gas) throw new Error('salida de dry run inválida: falta effects.gasUsed');
  const gasEstimate = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
  const objects = extractUpgradedObjects(json.objectChanges);
  return {
    ok: success && objects.errors.length === 0,
    gasEstimate,
    created: { packageId: objects.packageId, packageVersion: objects.packageVersion, upgradeCapId: objects.upgradeCapId },
  };
}

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Interpreta `sui client --json object <packageId>` y arma `typeOrigins`: fuente única de la tabla (V-6, H-f). Toma
 * `content.Package.type_origin_table` (`module_name`, `datatype_name`, `package`) y devuelve
 * `[{ module, name, definingId }]` con los IDs a `0x` + 64 hex, **ordenada por (módulo, nombre)** con comparación de
 * texto (no por locale), para que el json quede determinista. Comprueba que el objeto leído es **el paquete pedido**
 * (`objectId` y `content.Package.id`) y, si se indica, su `version`. Lanza con un mensaje claro ante una tabla vacía o
 * ausente, un par (módulo, nombre) repetido o una entrada mal formada. Ignora `module_map` (el bytecode) y todo lo demás.
 * No usa gRPC ni GraphQL: esas lecturas son la verificación **independiente** del owner (runbook).
 * @param {object} json salida ya parseada
 * @param {{ packageId: string, packageVersion?: number }} expected
 * @returns {{ module: string, name: string, definingId: string }[]}
 */
export function parseTypeOriginsOutput(json, { packageId, packageVersion }) {
  if (!isPlainObject(json) || json.objType !== 'package') throw new Error('la salida de object no es un paquete (objType ≠ package)');
  const pkg = json.content?.Package;
  if (!isPlainObject(pkg)) throw new Error('la salida de object no trae content.Package');
  const wanted = normalizeId(packageId);
  if (normalizeId(json.objectId) !== wanted || normalizeId(pkg.id) !== wanted) {
    throw new Error('la salida de object es de otro paquete que el pedido');
  }
  if (packageVersion !== undefined && pkg.version !== packageVersion) {
    throw new Error(`la versión del paquete leído (${pkg.version}) no es la esperada (${packageVersion})`);
  }
  const table = pkg.type_origin_table;
  if (!Array.isArray(table) || table.length === 0) {
    throw new Error('la salida de object no trae content.Package.type_origin_table (o está vacía): sin tabla de orígenes no se registra nada');
  }
  const seen = new Set();
  const origins = table.map((entry, i) => {
    if (!isPlainObject(entry) || typeof entry.module_name !== 'string' || typeof entry.datatype_name !== 'string') {
      throw new Error(`type_origin_table[${i}] mal formada`);
    }
    const pair = `${entry.module_name}::${entry.datatype_name}`;
    if (seen.has(pair)) throw new Error(`type_origin_table repite el par (módulo, nombre) ${pair}`);
    seen.add(pair);
    return { module: entry.module_name, name: entry.datatype_name, definingId: normalizeId(entry.package) };
  });
  const error = validateTypeOriginsField(origins);
  if (error) throw new Error(`type_origin_table inválida: ${error}`);
  return origins.toSorted((a, b) => compareText(a.module, b.module) || compareText(a.name, b.name));
}

/**
 * Arma el json de un upgrade a partir del despliegue **base** (el `deployments/<red>.json` existente: la publicación
 * original y, si hubo, los upgrades anteriores). Reescribe solo los campos de "versión vigente" (`packageId`,
 * `packageVersion`, `sourceCommit`, `suiCliVersion`, `frameworkRev`), agrega el upgrade a `upgrades` y reemplaza
 * `typeOrigins`; `publishTxDigest`, `publishTimestamp`, `originalPackageId`, `upgradeCapId`, `houseId`, `houseCapId`,
 * `chainId` y `network` no cambian. Lanza si el upgrade no es la versión siguiente de la base o si avanzó un
 * `UpgradeCap` distinto del registrado. No valida el resultado: eso es `validateDeployment`.
 * @param {{ base: object, parsed: ReturnType<typeof parseUpgradeOutput>,
 *   typeOrigins: ReturnType<typeof parseTypeOriginsOutput>, sourceCommit: string|null, suiCliVersion: string,
 *   frameworkRev: string }} args
 * @returns {object}
 */
export function buildUpgradeDeployment({ base, parsed, typeOrigins, sourceCommit, suiCliVersion, frameworkRev }) {
  const expectedVersion = base.packageVersion + 1;
  if (parsed.packageVersion !== expectedVersion) {
    throw new Error(
      `el upgrade es la versión ${parsed.packageVersion} y el despliegue base está en la ${base.packageVersion} ` +
        `(se esperaba la ${expectedVersion}): no se registra`,
    );
  }
  if (parsed.upgradeCapId !== base.upgradeCapId) {
    throw new Error('el UpgradeCap que avanzó el upgrade no es el upgradeCapId del despliegue base: no se registra');
  }
  const current = {
    packageId: parsed.packageId,
    packageVersion: parsed.packageVersion,
    sourceCommit,
    suiCliVersion,
    frameworkRev,
  };
  const deployment = Object.fromEntries(DEPLOYMENT_FIELDS.map((key) => [key, Object.hasOwn(current, key) ? current[key] : base[key]]));
  deployment.upgrades = [
    ...(base.upgrades ?? []),
    { version: parsed.packageVersion, packageId: parsed.packageId, txDigest: parsed.digest },
  ];
  deployment.typeOrigins = typeOrigins;
  return deployment;
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
  errors.push(...upgradeInvariantErrors(obj));
  return errors;
}

/**
 * Invariantes de `upgrades` y `typeOrigins` que cruzan con el resto del json (plan §4.4, `check` de la CI): con
 * `packageVersion > 1` los dos son obligatorios; `upgrades` termina en el `packageId` y la `packageVersion` vigentes;
 * todo `definingId` es el `originalPackageId` o el `packageId` de un upgrade; los 13 tipos de la v1 de `house` y `game`
 * están y llevan el original. Solo mira lo que ya pasó su validador de forma (los errores de forma ya están en la lista).
 * @param {object} obj
 * @returns {string[]}
 */
function upgradeInvariantErrors(obj) {
  const errors = [];
  const version = obj.packageVersion;
  const hasUpgrades = Object.hasOwn(obj, 'upgrades');
  const hasTypeOrigins = Object.hasOwn(obj, 'typeOrigins');
  if (Number.isInteger(version) && version > 1) {
    if (!hasUpgrades) errors.push(`upgrades es obligatorio con packageVersion > 1 (${version})`);
    if (!hasTypeOrigins) errors.push(`typeOrigins es obligatorio con packageVersion > 1 (${version})`);
  }
  const upgradesOk = hasUpgrades && validateUpgradesField(obj.upgrades) === null;
  if (upgradesOk) {
    const last = obj.upgrades.at(-1);
    if (last === undefined) {
      if (Number.isInteger(version) && version > 1) errors.push(`upgrades vacío con packageVersion ${version}`);
    } else {
      if (last.version !== version) errors.push(`el último upgrade (version ${last.version}) ≠ packageVersion (${version})`);
      if (last.packageId !== obj.packageId) errors.push(`el último upgrade (${last.packageId}) ≠ packageId (${obj.packageId})`);
    }
    if (obj.upgrades.some((u) => u.packageId === obj.originalPackageId)) {
      errors.push('un upgrade no puede tener el originalPackageId como packageId');
    }
  }
  if (hasTypeOrigins && validateTypeOriginsField(obj.typeOrigins) === null && ID_RE.test(String(obj.originalPackageId))) {
    const allowed = new Set([obj.originalPackageId, ...(upgradesOk ? obj.upgrades.map((u) => u.packageId) : [])]);
    for (const { module, name, definingId } of obj.typeOrigins) {
      if (!allowed.has(definingId)) {
        errors.push(`typeOrigins ${module}::${name}: definingId (${definingId}) no es el originalPackageId ni el de un upgrade`);
      }
    }
    for (const [module, name] of V1_TYPE_PAIRS) {
      const entry = obj.typeOrigins.find((t) => t.module === module && t.name === name);
      if (!entry) errors.push(`typeOrigins sin ${module}::${name} (tipo de la v1)`);
      else if (entry.definingId !== obj.originalPackageId) {
        errors.push(`typeOrigins ${module}::${name}: los tipos de la v1 llevan el originalPackageId, no ${entry.definingId}`);
      }
    }
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

const PUBFILE_STRING_KEYS = Object.freeze({
  'published-at': 'publishedAt',
  'original-id': 'originalId',
  'upgrade-capability': 'upgradeCapability',
});
const PUBFILE_SOURCE_RE = /^source\s*=\s*\{\s*local\s*=\s*"([^"]+)"\s*\}$/;

/**
 * Lee el pubfile **efímero** que escribe `sui client test-publish|test-upgrade` en localnet (`[[published]]`, indexado
 * por la ruta del árbol publicado en `source.local`; cabecera "should not be committed"). No es el `Published.toml` de
 * testnet (`[published.<red>]`, `parsePublishedToml`). Solo lo que la guarda del upgrade necesita: el `chain-id`
 * de la cabecera y, por entrada `[[published]]`, `source.local`, `published-at`, `original-id`, `version` y
 * `upgrade-capability`; el resto de las claves se ignora. Una entrada sin alguna de las cinco, o con una línea que no
 * entiende dentro de las que sí lee, es un error con su número de línea.
 * @param {string} text
 * @returns {{ chainId: string|null, entries: { sourceLocal: string, publishedAt: string, originalId: string,
 *   version: number, upgradeCapability: string }[] }}
 */
export function parsePubfile(text) {
  if (typeof text !== 'string') throw new Error('pubfile: se esperaba texto');
  let chainId = null;
  const entries = [];
  let current = null;
  const fail = (n, msg) => {
    throw new Error(`pubfile:${n}: ${msg}`);
  };
  const finish = () => {
    if (!current) return;
    for (const field of ['sourceLocal', 'publishedAt', 'originalId', 'version', 'upgradeCapability']) {
      if (!(field in current.entry)) fail(current.line, `[[published]] sin ${field}`);
    }
    entries.push(current.entry);
  };
  text.split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;
    if (line === '[[published]]') {
      finish();
      current = { entry: {}, line: n };
      return;
    }
    const kv = /^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(line);
    if (!kv) fail(n, `línea inesperada: ${line}`);
    const [, key, value] = kv;
    if (!current) {
      if (key === 'chain-id') {
        const str = /^"([^"\\]*)"$/.exec(value);
        if (!str) fail(n, 'chain-id debe ser un texto entre comillas');
        chainId = str[1];
      }
      return;
    }
    if (key === 'source') {
      const m = PUBFILE_SOURCE_RE.exec(line);
      if (m) current.entry.sourceLocal = m[1];
    } else if (Object.hasOwn(PUBFILE_STRING_KEYS, key)) {
      const str = /^"([^"\\]*)"$/.exec(value);
      if (!str) fail(n, `${key} debe ser un texto entre comillas`);
      current.entry[PUBFILE_STRING_KEYS[key]] = str[1];
    } else if (key === 'version') {
      if (!/^\d+$/.test(value)) fail(n, 'version debe ser un entero');
      current.entry.version = Number(value);
    }
  });
  finish();
  return { chainId, entries };
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
