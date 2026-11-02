import { ObjectError } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { gameType, isExactType, parseGameObject, type Game } from './game';
import { GameNotFoundError, NotAGameError } from './readErrors';
import { withReadTimeout } from './readPolicy';

/** Cada cuánto se vuelve a leer el detalle de una partida. */
export const GAME_REFETCH_MS = 15_000;

/**
 * Lee una partida por ID. Inexistente o borrada ⇒ `GameNotFoundError`; otro tipo de objeto ⇒ `NotAGameError` (antes de
 * parsear); el resto lo valida `parseGameObject`. `previousTransaction` es la **última** transacción que tocó el objeto,
 * también una fallida (sonda P6 de #10): sirve solo para "Última actividad", nunca como "la que la resolvió".
 */
export async function fetchGame(
  client: Pick<SuiGrpcClient, 'getObject'>,
  { id, originalPackageId, signal }: { id: string; originalPackageId: string; signal?: AbortSignal },
): Promise<{ game: Game; previousTransaction: string | null }> {
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
  if (!isExactType(object.type, gameType(originalPackageId))) throw new NotAGameError(id, object.type);
  return { game: parseGameObject(object, originalPackageId), previousTransaction: object.previousTransaction ?? null };
}
