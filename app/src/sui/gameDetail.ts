import { ObjectError } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { Duel } from './duel';
import { isExactType, type Game } from './game';
import type { GameKey, GameRegistry } from './gameRegistry';
import { GameNotFoundError, NotAGameError } from './readErrors';
import { isTransientReadError, withReadTimeout } from './readPolicy';

/** Cada cuánto se vuelve a leer el detalle de una partida. */
export const GAME_REFETCH_MS = 15_000;

/**
 * Intervalo de relectura del detalle (DL-7): se corta (`false`) ante un error definitivo (no existe, no es una partida,
 * datos ilegibles), que no mejora releyendo; con éxito o con un error transitorio (red caída) sigue cada
 * `GAME_REFETCH_MS`. Mismo criterio de "transitorio" que la política de lecturas.
 */
export function gameRefetchInterval(state: { status: string; error: unknown }): number | false {
  return state.status === 'error' && !isTransientReadError(state.error) ? false : GAME_REFETCH_MS;
}

/**
 * Detalle de una partida de cualquiera de las dos fuentes (#73, TASK-8a): el objeto leído por su **tipo exacto**, con el
 * juego al que pertenece y su versión (Lamport, solo comparable entre dos lecturas del mismo objeto).
 */
export type GameDetailObject =
  | { kind: 'game'; game: Game; gameKey: GameKey; objectVersion: bigint }
  | { kind: 'duel'; duel: Duel; gameKey: GameKey; objectVersion: bigint };

/**
 * Lo que devuelve `fetchGameDetail`: el objeto y la última transacción que lo tocó. `previousTransaction` es la **última**
 * que tocó el objeto, también una fallida (sonda P6 de #10): sirve solo para "Última actividad", nunca como "la que la
 * resolvió".
 */
export type GameDetailRead = { detail: GameDetailObject; previousTransaction: string | null };

/**
 * Lee una partida por ID decidiendo la fuente por el **tipo exacto del objeto** (el `objectType` de cada fuente del
 * registro; nunca se arma un tag a mano): un `game::Game` o un `Duel<G>` de un juego registrado. Inexistente o borrada ⇒
 * `GameNotFoundError`; un objeto de otro tipo (también un `Duel` de un `G` que el registro no conoce) ⇒ `NotAGameError`
 * antes de parsear; el resto lo valida el parser de la fuente (`ReadDataError`).
 */
export async function fetchGameDetail(
  client: Pick<SuiGrpcClient, 'getObject'>,
  { id, registry, signal }: { id: string; registry: GameRegistry; signal?: AbortSignal },
): Promise<GameDetailRead> {
  let object;
  try {
    ({ object } = await withReadTimeout(signal, (abort) =>
      client.getObject({ objectId: id, include: { content: true, previousTransaction: true }, signal: abort }),
    ));
  } catch (error) {
    if (error instanceof ObjectError && (error.reason === 'notFound' || error.reason === 'deleted')) {
      throw new GameNotFoundError(id, { cause: error });
    }
    throw error;
  }
  const previousTransaction = object.previousTransaction ?? null;
  const objectVersion = BigInt(object.version);
  for (const def of registry) {
    for (const source of def.sources) {
      if (!isExactType(object.type, source.objectType)) continue;
      const detail: GameDetailObject =
        source.kind === 'legacy'
          ? { kind: 'game', game: source.parseObject(object), gameKey: def.key, objectVersion }
          : { kind: 'duel', duel: source.parseObject(object), gameKey: def.key, objectVersion };
      return { detail, previousTransaction };
    }
  }
  throw new NotAGameError(id, object.type);
}
