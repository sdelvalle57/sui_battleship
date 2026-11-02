import { RpcError } from '@mysten/sui/grpc';
import type { Network } from './networks';

/** Motivo de un dato del nodo que la app no acepta (DL-1): nunca se muestra como si fuera válido (SEG-10). */
export type ReadDataReason = 'malformed' | 'wrong_type' | 'not_shared' | 'invariant';

/**
 * El nodo devolvió algo que no encaja con el contrato: tipo o dueño inesperado, BCS que no parsea o no es canónico, o un
 * invariante de `game.move` roto. `detail` es para depurar; la UI muestra `readErrorMessage`.
 */
export class ReadDataError extends Error {
  readonly reason: ReadDataReason;

  constructor(reason: ReadDataReason, detail: string, options?: ErrorOptions) {
    super(`Dato no reconocido (${reason}): ${detail}`, options);
    this.name = 'ReadDataError';
    this.reason = reason;
  }
}

/** No existe un objeto con ese ID en la red (o fue borrado). */
export class GameNotFoundError extends Error {
  readonly id: string;

  constructor(id: string, options?: ErrorOptions) {
    super(`No existe el objeto ${id}`, options);
    this.name = 'GameNotFoundError';
    this.id = id;
  }
}

/** El objeto existe pero no es un `Game` de este paquete. */
export class NotAGameError extends Error {
  readonly id: string;
  readonly type: string;

  constructor(id: string, type: string, options?: ErrorOptions) {
    super(`El objeto ${id} es de tipo ${type}`, options);
    this.name = 'NotAGameError';
    this.id = id;
    this.type = type;
  }
}

/** La paginación no avanzó: el nodo devolvió como cursor final el mismo que recibió (M-2). No se reintenta. */
export class PaginationStalledError extends Error {
  constructor(options?: ErrorOptions) {
    super('El cursor de la paginación no avanzó', options);
    this.name = 'PaginationStalledError';
  }
}

/** Venció el corte por tiempo propio de una lectura (DL-5). Es transitorio: la política lo reintenta. */
export class ReadTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`El nodo no respondió en ${String(timeoutMs / 1000)} s`, options);
    this.name = 'ReadTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/** La transacción existe pero todavía no está en un checkpoint (sin hora ni checkpoint). Transitorio. */
export class NotYetCheckpointedError extends Error {
  readonly digest: string;

  constructor(digest: string, options?: ErrorOptions) {
    super(`La transacción ${digest} todavía no está en un checkpoint`, options);
    this.name = 'NotYetCheckpointedError';
    this.digest = digest;
  }
}

/** La consulta pidió historial que el nodo ya podó (M-4). No es transitorio: marca el fin del historial disponible. */
export class HistoryPrunedError extends Error {
  constructor(detail: string, options?: ErrorOptions) {
    super(`Historial podado: ${detail}`, options);
    this.name = 'HistoryPrunedError';
  }
}

/**
 * Mensaje en español para mostrar un error de lectura. Las clases propias tienen un texto fijo; un `RpcError` del
 * transporte gRPC se muestra con su mensaje; cualquier otro `Error`, con el suyo.
 */
export function readErrorMessage(error: unknown, network: Network): string {
  if (error instanceof ReadDataError) return 'El nodo devolvió datos que la app no reconoce';
  if (error instanceof GameNotFoundError) return `No existe una partida con ese ID en ${network}`;
  if (error instanceof NotAGameError) return 'Ese objeto no es una partida de Sui Battleship';
  if (error instanceof PaginationStalledError) {
    return 'La búsqueda no avanzó: el nodo repitió la posición. Prueba «Actualizar»';
  }
  if (error instanceof ReadTimeoutError) return error.message;
  if (error instanceof NotYetCheckpointedError) return 'La transacción todavía no está en un checkpoint; se reintenta';
  if (error instanceof HistoryPrunedError) return 'El nodo ya no conserva esa parte del historial';
  if (error instanceof RpcError) return `No se pudo leer la red (${error.message})`;
  if (error instanceof Error) return error.message;
  return String(error);
}
