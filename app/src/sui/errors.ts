import { normalizeSuiAddress } from '@mysten/sui/utils';
import { shortAddress } from './format';

/**
 * Mensajes de los abort codes del contrato por **módulo + código** (DL-4; tabla de `contracts/README.md`, "Abort codes").
 * Único lugar con estos textos: el número 3 existe en los dos módulos con significados distintos.
 */
export const ABORT_MESSAGES: Record<'house' | 'game', Record<number, string>> = {
  game: {
    0: 'La apuesta es menor que el mínimo de la House.',
    1: 'La apuesta supera el máximo de la House.',
    2: 'No puedes invitarte a ti mismo.',
    3: 'Solo quien creó la partida puede cancelarla.',
    4: 'La partida ya no está pendiente: se canceló, se rechazó o se aceptó antes.',
    5: 'Esta invitación es para otra dirección.',
    6: 'La partida es abierta: no hay invitación que rechazar.',
    7: 'La partida es de otra versión del juego: solo se puede cancelar o rechazar.',
    8: 'La partida pertenece a otra House.',
    9: 'No puedes aceptar tu propia partida.',
    10: 'El pago tiene que igualar exactamente la apuesta.',
  },
  house: {
    0: 'La comisión supera el máximo que permite el contrato.',
    1: 'Límites inválidos: el mínimo tiene que ser mayor que 0 y no superar el máximo.',
    2: 'No hay comisiones para retirar.',
    3: 'La House está en una versión distinta de la de esta app: hay que actualizar la app.',
    4: 'La House ya está en la versión de este paquete.',
  },
};

/** Un `MoveAbort` reconocido: paquete normalizado, módulo y código (como string, igual que el SDK). */
export type MoveAbortInfo = { packageId: string; module: string; code: string };

/** Hasta cuántos niveles de `cause` se recorren (además del error recibido). */
const MAX_CAUSE_DEPTH = 5;

/** Formato del SDK (`formatMoveAbortMessage`, V-6): `… abort code: 3, in '0x…::game::cancel_game' …`. */
const SDK_ABORT_RE = /abort code: (\d+), in '(0x[0-9a-fA-F]+)::(\w+)::/;
/**
 * Formato Rust del `effects.status.error` del nodo (= `description` de gRPC y lo que imprime `sui client tx-block`, V-12):
 * `MoveAbort(MoveLocation { module: ModuleId { address: <hex>, name: Identifier("game") }, … }, 3) in command 0`.
 */
const RUST_ABORT_RE = /ModuleId \{ address: (?:0x)?([0-9a-fA-F]+), name: Identifier\("(\w+)"\) \}.*?\}, (\d+)\)/;

/** `$kind` de `SuiClientTypes.ExecutionError` en `@mysten/sui` 2.37 (V-5). */
const EXECUTION_ERROR_KINDS = new Set([
  'MoveAbort',
  'SizeError',
  'CommandArgumentError',
  'TypeArgumentError',
  'PackageUpgradeError',
  'IndexError',
  'CoinDenyListError',
  'CongestedObjects',
  'ObjectIdError',
  'Unknown',
]);

type ExecutionErrorLike = { $kind: string; message: string; MoveAbort?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asExecutionError(value: unknown): ExecutionErrorLike | null {
  if (!isRecord(value)) return null;
  const { $kind, message } = value;
  if (typeof $kind !== 'string' || typeof message !== 'string' || !EXECUTION_ERROR_KINDS.has($kind)) return null;
  return { $kind, message, MoveAbort: value.MoveAbort };
}

/**
 * Candidatos estructurados de un nodo de la cadena: él mismo (un `ExecutionError`), su `executionError`
 * (`SimulationError`), su `error` (un `ExecutionStatus` fallido), su `status.error` (una transacción del nodo) y el de
 * `FailedTransaction` (un `TransactionResult`).
 */
function structuredCandidates(node: unknown): ExecutionErrorLike[] {
  if (!isRecord(node)) return [];
  const status = isRecord(node.status) ? node.status : null;
  const failed = isRecord(node.FailedTransaction) && isRecord(node.FailedTransaction.status) ? node.FailedTransaction.status : null;
  const ownError = node.success === false ? node.error : undefined;
  return [node, node.executionError, ownError, status?.error, failed?.error]
    .map(asExecutionError)
    .filter((candidate): candidate is ExecutionErrorLike => candidate !== null);
}

function abortFromStructured(error: ExecutionErrorLike): MoveAbortInfo | null {
  if (error.$kind !== 'MoveAbort' || !isRecord(error.MoveAbort)) return null;
  const { abortCode, location } = error.MoveAbort;
  if (typeof abortCode !== 'string' || !isRecord(location)) return null;
  const { package: pkg, module } = location;
  if (typeof pkg !== 'string' || typeof module !== 'string') return null;
  return { packageId: normalizeSuiAddress(pkg), module, code: abortCode };
}

function abortFromText(text: string): MoveAbortInfo | null {
  const sdk = SDK_ABORT_RE.exec(text);
  if (sdk) {
    const [, code = '', pkg = '', module = ''] = sdk;
    return { packageId: normalizeSuiAddress(pkg), module, code };
  }
  const rust = RUST_ABORT_RE.exec(text);
  if (rust) {
    const [, pkg = '', module = '', code = ''] = rust;
    return { packageId: normalizeSuiAddress(pkg), module, code };
  }
  return null;
}

function messageOf(node: unknown): string | null {
  if (typeof node === 'string') return node;
  if (node instanceof Error) return node.message;
  if (isRecord(node) && typeof node.message === 'string') return node.message;
  return null;
}

/** El error recibido y sus `cause`, hasta `MAX_CAUSE_DEPTH` niveles. */
function causeChain(source: unknown): unknown[] {
  const chain: unknown[] = [];
  let node = source;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH && node !== undefined && node !== null; depth++) {
    chain.push(node);
    node = isRecord(node) ? node.cause : undefined;
  }
  return chain;
}

/**
 * Busca un `MoveAbort` en cualquier forma que lo traiga (DL-4), recorriendo `cause` hasta 5 niveles. En cada nivel, primero
 * lo estructurado (`ExecutionError`, `SimulationError.executionError`, `status.error` de un resultado) y después el
 * **mensaje** con dos formatos: el del SDK y el Rust del nodo. Las wallets de extensión serializan el error y solo
 * conservan el texto (R-1). Cualquier otro texto (p. ej. cómo presenta la CLI un abort) no se reconoce.
 */
export function findMoveAbort(source: unknown): MoveAbortInfo | null {
  for (const node of causeChain(source)) {
    for (const candidate of structuredCandidates(node)) {
      const info = abortFromStructured(candidate);
      if (info) return info;
    }
    const text = messageOf(node);
    if (text !== null) {
      const info = abortFromText(text);
      if (info) return info;
    }
  }
  return null;
}

/** Sufijo de diagnóstico de un abort, con formato fijo `(código <módulo>/<n>)` (M-5; lo reutilizan #12 y #14). */
export function abortCodeSuffix(info: MoveAbortInfo): string {
  return `(código ${info.module}/${info.code})`;
}

function findExecutionError(source: unknown): ExecutionErrorLike | null {
  for (const node of causeChain(source)) {
    const [candidate] = structuredCandidates(node);
    if (candidate) return candidate;
  }
  return null;
}

/**
 * Textos de las cancelaciones del runtime (DL-11 de #12): la red no ejecutó la transacción y solo cobró el costo de red.
 * Neutros respecto de la acción (crear, cancelar, rechazar o aceptar): el botón de la acción sigue siendo el reintento.
 */
export const RUNTIME_CANCELLED_MESSAGES = {
  randomness:
    'La red canceló la transacción sin ejecutarla (la aleatoriedad de la red todavía no está disponible): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos',
  congestion:
    'La red canceló la transacción sin ejecutarla (hay congestión en un objeto compartido): no cambió nada salvo el costo de red; intenta de nuevo en unos segundos',
} as const;

/** Las dos formas conocidas de la falta de aleatoriedad (V-6): el nombre de la variante (BCS) y el texto Rust. */
const RANDOMNESS_UNAVAILABLE_RE = /ExecutionCancelledDueToRandomnessUnavailable|randomness could not be generated/i;

/**
 * Cancelación del runtime en un fallo (DL-11, V-6): sobre el `ExecutionError` que encuentra `findExecutionError`,
 * `'congestion'` si es `CongestedObjects` (`&mut House` u otro objeto compartido congestionado) y `'randomness'` si es
 * `Unknown` con el texto de la falta de aleatoriedad (DKG de la época sin terminar). Cualquier otro ⇒ `null`. Llegan como
 * `effects.status = failure` **sin** `MoveAbort`: nunca son éxito ni error del contrato (SEG-10).
 */
export function runtimeCancellation(source: unknown): 'randomness' | 'congestion' | null {
  const execution = findExecutionError(source);
  if (execution === null) return null;
  if (execution.$kind === 'CongestedObjects') return 'congestion';
  if (execution.$kind === 'Unknown' && RANDOMNESS_UNAVAILABLE_RE.test(execution.message)) return 'randomness';
  return null;
}

function isOwnModule(module: string): module is 'house' | 'game' {
  return module === 'house' || module === 'game';
}

/**
 * Mensaje en español para cualquier fallo de una transacción (DL-4). Un abort solo se traduce si viene de **nuestro**
 * paquete (`packageId` u `originalPackageId`, normalizados: tras un upgrade el abort puede informar cualquiera de los
 * dos); de otro paquete se muestra crudo. Sin abort: una cancelación del runtime tiene su texto de "intenta de nuevo"
 * (DL-11); otro `ExecutionError` (gas, objetos) es "la red no ejecutó"; cualquier otro error viene de la wallet o del
 * SDK y se muestra con su mensaje.
 */
export function transactionErrorMessage(source: unknown, ids: { packageId: string; originalPackageId: string }): string {
  const abort = findMoveAbort(source);
  if (abort) {
    const own = new Set([normalizeSuiAddress(ids.packageId), normalizeSuiAddress(ids.originalPackageId)]);
    if (!own.has(abort.packageId)) {
      return `La transacción abortó en ${shortAddress(abort.packageId)}::${abort.module} (código ${abort.code})`;
    }
    const known = isOwnModule(abort.module) ? ABORT_MESSAGES[abort.module][Number(abort.code)] : undefined;
    return known === undefined
      ? `El contrato rechazó la operación ${abortCodeSuffix(abort)}`
      : `${known} ${abortCodeSuffix(abort)}`;
  }
  const cancellation = runtimeCancellation(source);
  if (cancellation) return RUNTIME_CANCELLED_MESSAGES[cancellation];
  const execution = findExecutionError(source);
  if (execution) return `La red no ejecutó la transacción: ${execution.message}`;
  const detail = messageOf(source);
  return detail === null || detail === ''
    ? 'La wallet no completó la operación (sin detalle del error)'
    : `La wallet no completó la operación: ${detail}`;
}
