import { isValidTransactionDigest } from '@mysten/sui/utils';
import { isLoopbackUrl } from './localnetUrl.mjs';
import { isNetwork, NETWORKS, type Network } from './networks';

/** Única versión del esquema de `contracts/deployments/<red>.json` que entiende la app (`contracts/README.md`). */
const SCHEMA_VERSION = 1;
/** `chainId` del despliegue: 8 hex en minúsculas (`.hex` de `sui client chain-identifier`). */
const CHAIN_ID_RE = /^[0-9a-f]{8}$/;
/** IDs de paquete y objeto en el formato exacto del productor: `0x` + 64 hex en minúsculas (ya normalizados, D12). */
const OBJECT_ID_RE = /^0x[0-9a-f]{64}$/;

const CHAIN_ID_FORMAT = '8 caracteres hex en minúsculas';
const OBJECT_ID_FORMAT = '0x seguido de 64 caracteres hex en minúsculas';
const TX_DIGEST_FORMAT = 'digest base58 de transacción';
const REGENERATE_HINT = 'regenerarlo con el script de #7 (contracts/scripts/publish.mjs), nunca a mano';

/** Configuración de la app para la red del build: red, endpoint gRPC e IDs del despliegue. */
export type AppConfig = {
  network: Network;
  /**
   * Endpoint **efectivo** de gRPC-web: `NETWORKS[network].grpcUrl` (el por defecto de la red) o, solo en localnet y con
   * `VITE_LOCALNET_URL` definida, esa URL de loopback (#77).
   */
  grpcUrl: string;
  /** 8 hex, del JSON de despliegue. */
  chainId: string;
  /** Versión vigente del paquete: target de las llamadas (#11, #12). */
  packageId: string;
  /** Paquete original: prefijo de los tipos de eventos y objetos (#10, #13, #14). */
  originalPackageId: string;
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

function fieldError(file: string, field: string, value: unknown, format: string): ConfigResult {
  return fail(
    `${file}: el campo ${field} (${describeValue(value)}) no tiene el formato esperado (${format}); ${REGENERATE_HINT}`,
  );
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Resuelve la configuración a partir de la variable de entorno y de los JSON de despliegue. Pura (ARQ-3): `env` y
 * `deployments` (ruta del glob → contenido JSON sin tipar) se inyectan. Valida solo lo que la app usa, rechaza un
 * `schemaVersion` distinto de 1 e ignora claves desconocidas (`contracts/README.md`, "Compatibilidad", regla 3).
 *
 * `VITE_LOCALNET_URL` (#77) solo se lee con `VITE_SUI_NETWORK=localnet`: `undefined` es el único valor que significa "el
 * puerto por defecto"; cualquier otro (incluida la cadena vacía) tiene que cumplir `isLoopbackUrl` o es un error, nunca un
 * regreso silencioso al 9000. Con testnet se ignora por completo (ni se valida ni da error).
 */
export function resolveConfig(
  env: { VITE_SUI_NETWORK?: string; VITE_LOCALNET_URL?: string; DEV: boolean },
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

  let grpcUrl = NETWORKS[network].grpcUrl;
  if (network === 'localnet' && env.VITE_LOCALNET_URL !== undefined) {
    const localnetUrl = env.VITE_LOCALNET_URL;
    if (!isLoopbackUrl(localnetUrl)) {
      return fail(
        `VITE_LOCALNET_URL=${JSON.stringify(localnetUrl)} no es válida: solo se admite http://127.0.0.1:<puerto> (loopback, puerto 1024-65535); sin la variable, la app usa el puerto 9000`,
      );
    }
    grpcUrl = localnetUrl;
  }

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

  return {
    ok: true,
    config: {
      network,
      grpcUrl,
      chainId,
      packageId,
      originalPackageId,
      houseId,
      publishTxDigest,
      burnerWalletEnabled: network === 'localnet' && env.DEV,
    },
  };
}

/**
 * Único punto de la app que lee las variables `import.meta.env.*` y los JSON de `contracts/deployments/` (ARQ-8,
 * PROY-15). El glob se resuelve al compilar: un `<red>.json` ausente deja el registro sin esa clave y `resolveConfig` lo
 * reporta.
 *
 * Las variables se leen **solo por propiedad** (nunca el objeto del entorno entero: ni spread ni alias ni argumento) y
 * `VITE_LOCALNET_URL` solo se pasa con `VITE_SUI_NETWORK === 'localnet'`: Vite reemplaza cada `import.meta.env.VITE_*`
 * por un literal y esa comparación por una constante, así que un build de testnet no embebe el valor de la variable
 * aunque esté definida en el entorno (#77, D1).
 */
export function loadConfig(): ConfigResult {
  return resolveConfig(
    {
      VITE_SUI_NETWORK: import.meta.env.VITE_SUI_NETWORK,
      VITE_LOCALNET_URL:
        import.meta.env.VITE_SUI_NETWORK === 'localnet' ? import.meta.env.VITE_LOCALNET_URL : undefined,
      DEV: import.meta.env.DEV,
    },
    import.meta.glob<unknown>('../../../contracts/deployments/*.json', { eager: true, import: 'default' }),
  );
}
