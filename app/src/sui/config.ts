import { isValidTransactionDigest } from '@mysten/sui/utils';
import { registryTypeKeys, type TypeOrigin } from './gameRegistry';
import { isNetwork, NETWORKS, type Network } from './networks';

/** Única versión del esquema de `contracts/deployments/<red>.json` que entiende la app (`contracts/README.md`). */
const SCHEMA_VERSION = 1;
/** `packageVersion` de la publicación original (sin upgrades): el mapa de tipos puede faltar y todo cae al ID original. */
const PUBLISHED_PACKAGE_VERSION = 1;
/** Versión de un primer upgrade: `upgrades[i].version` = `FIRST_UPGRADE_VERSION + i` (consecutivas, como las valida `check`). */
const FIRST_UPGRADE_VERSION = 2;
/** Identificador Move (módulo o struct de `typeOrigins`), como lo valida `contracts/scripts/deployment.mjs`. */
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** `chainId` del despliegue: 8 hex en minúsculas (`.hex` de `sui client chain-identifier`). */
const CHAIN_ID_RE = /^[0-9a-f]{8}$/;
/** IDs de paquete y objeto en el formato exacto del productor: `0x` + 64 hex en minúsculas (ya normalizados, D12). */
const OBJECT_ID_RE = /^0x[0-9a-f]{64}$/;

const CHAIN_ID_FORMAT = '8 caracteres hex en minúsculas';
const OBJECT_ID_FORMAT = '0x seguido de 64 caracteres hex en minúsculas';
const TX_DIGEST_FORMAT = 'digest base58 de transacción';
const REGENERATE_HINT = 'regenerarlo con el script de #7 (contracts/scripts/publish.mjs), nunca a mano';

/** Un upgrade del paquete (`upgrades[]` de `deployments/<red>.json`): su versión, su ID de almacenamiento y su digest. */
export type PackageUpgrade = { version: number; packageId: string; txDigest: string };

/** Configuración de la app para la red del build: red, endpoint gRPC e IDs del despliegue. */
export type AppConfig = {
  network: Network;
  /** `NETWORKS[network].grpcUrl`. */
  grpcUrl: string;
  /** 8 hex, del JSON de despliegue. */
  chainId: string;
  /** Versión vigente del paquete: **solo** target de las llamadas (#11, #12). Los tipos salen de `typeOrigins`. */
  packageId: string;
  /**
   * Paquete original: ID de definición de los tipos que existen desde la v1 (`house`, `game`) y, junto con `upgrades`, los
   * IDs con los que puede informar un abort (V-5). El tipo de un módulo introducido en un upgrade lleva el ID del upgrade
   * (H-2): se obtiene con el registro de juegos (`gameRegistry.ts`), nunca de este campo.
   */
  originalPackageId: string;
  /**
   * Un upgrade por entrada, en orden (`version` 2..`packageVersion`); el último tiene el `packageId` vigente. `resolveConfig`
   * siempre lo completa (vacío con `packageVersion` 1); es opcional en el tipo porque una config armada a mano, como las de
   * los tests anteriores a #73, equivale a "sin upgrades".
   */
  upgrades?: readonly PackageUpgrade[];
  /**
   * Tabla de orígenes del paquete (plan §4.4): ID de definición de cada tipo por **(módulo, nombre)**. `resolveConfig`
   * siempre la completa (vacía si el JSON no la trae, solo válido con `packageVersion` 1); opcional en el tipo por la misma
   * razón que `upgrades`.
   */
  typeOrigins?: readonly TypeOrigin[];
  houseId: string;
  /**
   * Digest de la transacción de **publicación original**: alimenta la cota inferior del escaneo del lobby (M-1). No cambia
   * en un upgrade (campo de la "publicación original" de `contracts/README.md`).
   */
  publishTxDigest: string;
  /** Burner wallet solo en localnet y en `npm run dev` (D5). */
  burnerWalletEnabled: boolean;
};

/** Resultado de resolver la configuración: la config o un mensaje en español que nombra la causa y la acción. */
export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; error: string };

function fail(error: string): ConfigResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matches(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value);
}

function describeValue(value: unknown): string {
  return value === undefined ? 'ausente' : JSON.stringify(value);
}

function fieldErrorMessage(file: string, field: string, value: unknown, format: string): string {
  return `${file}: el campo ${field} (${describeValue(value)}) no tiene el formato esperado (${format}); ${REGENERATE_HINT}`;
}

function fieldError(file: string, field: string, value: unknown, format: string): ConfigResult {
  return fail(fieldErrorMessage(file, field, value, format));
}

/** Resultado de leer un campo opcional del JSON: el valor o el mensaje de error de configuración. */
type Parsed<T> = { value: T } | { error: string };

/** `packageVersion` del JSON: ausente = publicación original (1); si está, un entero ≥ 1. */
function readPackageVersion(file: string, value: unknown): Parsed<number> {
  if (value === undefined) return { value: PUBLISHED_PACKAGE_VERSION };
  if (typeof value !== 'number' || !Number.isInteger(value) || value < PUBLISHED_PACKAGE_VERSION) {
    return { error: fieldErrorMessage(file, 'packageVersion', value, 'entero mayor o igual que 1') };
  }
  return { value };
}

/**
 * `upgrades`: obligatorio con `packageVersion > 1` (error de configuración, nunca "no hay partidas"); con 1 puede faltar.
 * Mismas reglas que `check` de la CI: entradas consecutivas desde la versión 2, `packageId` distintos y distintos del
 * original, tantas entradas como `packageVersion - 1` y el último `packageId` = el vigente.
 */
function readUpgrades(
  file: string,
  value: unknown,
  ids: { packageId: string; originalPackageId: string; packageVersion: number },
): Parsed<readonly PackageUpgrade[]> {
  if (value === undefined) {
    return ids.packageVersion > PUBLISHED_PACKAGE_VERSION
      ? { error: `${file}: con packageVersion ${String(ids.packageVersion)} falta upgrades; ${REGENERATE_HINT}` }
      : { value: [] };
  }
  if (!Array.isArray(value)) return { error: fieldErrorMessage(file, 'upgrades', value, 'arreglo de {version, packageId, txDigest}') };
  const entries: unknown[] = value;
  const upgrades: PackageUpgrade[] = [];
  const seen = new Set<string>([ids.originalPackageId]);
  for (const [i, entry] of entries.entries()) {
    const field = `upgrades[${String(i)}]`;
    if (!isRecord(entry)) return { error: fieldErrorMessage(file, field, entry, 'objeto {version, packageId, txDigest}') };
    const { version, packageId, txDigest } = entry;
    if (version !== FIRST_UPGRADE_VERSION + i) {
      return { error: fieldErrorMessage(file, `${field}.version`, version, `${String(FIRST_UPGRADE_VERSION + i)} (consecutivas desde 2)`) };
    }
    if (!matches(packageId, OBJECT_ID_RE) || seen.has(packageId)) {
      return { error: fieldErrorMessage(file, `${field}.packageId`, packageId, `${OBJECT_ID_FORMAT}, distinto del original y de los otros upgrades`) };
    }
    if (typeof txDigest !== 'string' || !isValidTransactionDigest(txDigest)) {
      return { error: fieldErrorMessage(file, `${field}.txDigest`, txDigest, TX_DIGEST_FORMAT) };
    }
    seen.add(packageId);
    upgrades.push({ version: FIRST_UPGRADE_VERSION + i, packageId, txDigest });
  }
  if (upgrades.length !== ids.packageVersion - PUBLISHED_PACKAGE_VERSION) {
    return {
      error: `${file}: upgrades tiene ${String(upgrades.length)} entradas y packageVersion es ${String(ids.packageVersion)} (una por upgrade); ${REGENERATE_HINT}`,
    };
  }
  const last = upgrades.at(-1);
  if (last !== undefined && last.packageId !== ids.packageId) {
    return { error: `${file}: el último upgrade (${last.packageId}) no es el packageId vigente (${ids.packageId}); ${REGENERATE_HINT}` };
  }
  return { value: upgrades };
}

/**
 * `typeOrigins`: obligatorio con `packageVersion > 1`; con 1 puede faltar (todo cae al ID original). Si está: entradas
 * `{ module, name, definingId }` con el ID de definición en el original o en un upgrade, sin pares (módulo, nombre)
 * repetidos (la clave es el **par**, S-2), y **una entrada por cada tipo del registro** (`registryTypeKeys`): si falta,
 * error de configuración. Los tipos de la v1 llevan el ID original (H-2): un valor distinto lo delata como mal editado.
 */
function readTypeOrigins(
  file: string,
  value: unknown,
  ids: { originalPackageId: string; packageVersion: number; upgrades: readonly PackageUpgrade[] },
): Parsed<readonly TypeOrigin[]> {
  if (value === undefined) {
    return ids.packageVersion > PUBLISHED_PACKAGE_VERSION
      ? { error: `${file}: con packageVersion ${String(ids.packageVersion)} falta typeOrigins; ${REGENERATE_HINT}` }
      : { value: [] };
  }
  if (!Array.isArray(value) || value.length === 0) {
    return { error: fieldErrorMessage(file, 'typeOrigins', value, 'arreglo no vacío de {module, name, definingId}') };
  }
  const entries: unknown[] = value;
  const allowedIds = new Set([ids.originalPackageId, ...ids.upgrades.map((upgrade) => upgrade.packageId)]);
  const origins: TypeOrigin[] = [];
  for (const [i, entry] of entries.entries()) {
    const field = `typeOrigins[${String(i)}]`;
    if (!isRecord(entry)) return { error: fieldErrorMessage(file, field, entry, 'objeto {module, name, definingId}') };
    const { module, name, definingId } = entry;
    if (!matches(module, IDENTIFIER_RE) || !matches(name, IDENTIFIER_RE)) {
      return { error: fieldErrorMessage(file, field, entry, 'module y name son identificadores Move') };
    }
    if (!matches(definingId, OBJECT_ID_RE) || !allowedIds.has(definingId)) {
      return { error: fieldErrorMessage(file, `${field}.definingId`, definingId, 'el ID original o el de un upgrade') };
    }
    if (origins.some((origin) => origin.module === module && origin.name === name)) {
      return { error: `${file}: typeOrigins repite el tipo ${module}::${name}; ${REGENERATE_HINT}` };
    }
    origins.push({ module, name, definingId });
  }
  const v1Keys = registryTypeKeys(false);
  for (const key of registryTypeKeys(ids.upgrades.length > 0)) {
    const origin = origins.find((candidate) => candidate.module === key.module && candidate.name === key.name);
    if (origin === undefined) {
      return { error: `${file}: typeOrigins no tiene una entrada para ${key.module}::${key.name}; ${REGENERATE_HINT}` };
    }
    const isV1Type = v1Keys.some((v1Key) => v1Key.module === key.module && v1Key.name === key.name);
    if (isV1Type && origin.definingId !== ids.originalPackageId) {
      return {
        error: `${file}: el tipo ${key.module}::${key.name} existe desde la v1 y lleva el ID original, no ${origin.definingId}; ${REGENERATE_HINT}`,
      };
    }
  }
  return { value: origins };
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Resuelve la configuración a partir de la variable de entorno y de los JSON de despliegue. Pura (ARQ-3): `env` y
 * `deployments` (ruta del glob → contenido JSON sin tipar) se inyectan. Valida solo lo que la app usa, rechaza un
 * `schemaVersion` distinto de 1 e ignora claves desconocidas (`contracts/README.md`, "Compatibilidad", regla 3).
 *
 * `upgrades` y `typeOrigins` (#73, plan §4.4) son opcionales **solo** con `packageVersion` 1 (o ausente: el `testnet.json` de
 * antes del upgrade sigue siendo válido y el registro queda con la fuente `legacy`). Con `packageVersion > 1` su falta, o la
 * falta de una entrada de un tipo del registro, es un error de configuración y nunca "no hay partidas".
 */
export function resolveConfig(
  env: { VITE_SUI_NETWORK?: string; DEV: boolean },
  deployments: Record<string, unknown>,
): ConfigResult {
  const requested = env.VITE_SUI_NETWORK;
  if (requested === undefined || requested === '') {
    return fail('Falta VITE_SUI_NETWORK (localnet o testnet); ver app/.env.example');
  }
  if (requested === 'mainnet') {
    return fail('VITE_SUI_NETWORK=mainnet está fuera de alcance del MVP: usar localnet o testnet');
  }
  if (!isNetwork(requested)) {
    return fail(`VITE_SUI_NETWORK=${JSON.stringify(requested)} no es una red admitida: usar localnet o testnet`);
  }
  const network = requested;

  const fileName = `${network}.json`;
  const file = `contracts/deployments/${fileName}`;
  const entry = Object.entries(deployments).find(([path]) => basename(path) === fileName);
  if (entry === undefined) {
    return fail(
      `Falta ${file}: en localnet, generarlo con el script de #7 (agents.md §3, paso 4, variante B); en testnet lo publica #8`,
    );
  }

  const data = entry[1];
  if (!isRecord(data)) {
    return fail(`${file} no contiene un objeto JSON; ${REGENERATE_HINT}`);
  }
  if (data.schemaVersion !== SCHEMA_VERSION) {
    return fail(
      `${file} tiene schemaVersion ${describeValue(data.schemaVersion)} y la app solo admite ${String(SCHEMA_VERSION)}: actualizar la app o ${REGENERATE_HINT}`,
    );
  }
  if (data.network !== network) {
    return fail(
      `${file} declara network ${describeValue(data.network)}, distinta de VITE_SUI_NETWORK=${network}: revisar la variable o ${REGENERATE_HINT}`,
    );
  }

  const { chainId, packageId, originalPackageId, houseId, publishTxDigest } = data;
  if (!matches(chainId, CHAIN_ID_RE)) {
    return fieldError(file, 'chainId', chainId, CHAIN_ID_FORMAT);
  }
  if (!matches(packageId, OBJECT_ID_RE)) {
    return fieldError(file, 'packageId', packageId, OBJECT_ID_FORMAT);
  }
  if (!matches(originalPackageId, OBJECT_ID_RE)) {
    return fieldError(file, 'originalPackageId', originalPackageId, OBJECT_ID_FORMAT);
  }
  if (!matches(houseId, OBJECT_ID_RE)) {
    return fieldError(file, 'houseId', houseId, OBJECT_ID_FORMAT);
  }
  if (typeof publishTxDigest !== 'string' || !isValidTransactionDigest(publishTxDigest)) {
    return fieldError(file, 'publishTxDigest', publishTxDigest, TX_DIGEST_FORMAT);
  }

  const packageVersion = readPackageVersion(file, data.packageVersion);
  if ('error' in packageVersion) return fail(packageVersion.error);
  const upgrades = readUpgrades(file, data.upgrades, { packageId, originalPackageId, packageVersion: packageVersion.value });
  if ('error' in upgrades) return fail(upgrades.error);
  const typeOrigins = readTypeOrigins(file, data.typeOrigins, {
    originalPackageId,
    packageVersion: packageVersion.value,
    upgrades: upgrades.value,
  });
  if ('error' in typeOrigins) return fail(typeOrigins.error);

  return {
    ok: true,
    config: {
      network,
      grpcUrl: NETWORKS[network].grpcUrl,
      chainId,
      packageId,
      originalPackageId,
      upgrades: upgrades.value,
      typeOrigins: typeOrigins.value,
      houseId,
      publishTxDigest,
      burnerWalletEnabled: network === 'localnet' && env.DEV,
    },
  };
}

/**
 * Único punto de la app que lee `import.meta.env` y los JSON de `contracts/deployments/` (ARQ-8, PROY-15). El glob
 * se resuelve al compilar: un `<red>.json` ausente deja el registro sin esa clave y `resolveConfig` lo reporta.
 */
export function loadConfig(): ConfigResult {
  return resolveConfig(
    { VITE_SUI_NETWORK: import.meta.env.VITE_SUI_NETWORK, DEV: import.meta.env.DEV },
    import.meta.glob<unknown>('../../../contracts/deployments/*.json', { eager: true, import: 'default' }),
  );
}
