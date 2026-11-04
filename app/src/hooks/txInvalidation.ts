import type { QueryKey } from '@tanstack/react-query';
import type { Network } from '../sui/networks';
import { queryKeys } from './queryKeys';
import type { TxAction } from './txSession';

/** Claves a reiniciar (`resetQueries`: el lobby vuelve a su primera página) y a invalidar (`invalidateQueries`). */
export type TxInvalidations = { reset: QueryKey[]; invalidate: QueryKey[] };

/**
 * Tabla única de invalidación tras una transacción propia (DL-6), con las claves de `queryKeys`. Crear: el lobby se
 * reinicia (como "Actualizar") y el saldo cambia. Cancelar/rechazar: además, la partida. Aceptar (DL-6 de #12): además, la
 * House, que cobró la comisión (`fees_collected`). Todas terminan con "Mis partidas" de la cuenta (DL-7 de #13): va **al
 * final** porque relee en serie todas sus páginas cargadas, y así lo demás ya está fresco. Nunca claves inmutables
 * (`txInfo`, `publishCheckpoint`, `checkpointTime`) ni ajenas (`nodeInfo`). #14 suma aquí las acciones de la House. Sin
 * cuenta, no hay saldo ni "Mis partidas" que invalidar.
 */
export function transactionInvalidations(
  action: TxAction,
  ctx: { network: Network; originalPackageId: string; houseId: string; address: string | null },
): TxInvalidations {
  const balance = ctx.address === null ? [] : [queryKeys.balance(ctx.network, ctx.address)];
  const myGames = ctx.address === null ? [] : [queryKeys.myGames(ctx.network, ctx.originalPackageId, ctx.address)];
  const reset = [queryKeys.lobby(ctx.network, ctx.originalPackageId)];
  switch (action.kind) {
    case 'create':
      return { reset, invalidate: [...balance, ...myGames] };
    case 'cancel':
    case 'reject':
      return { reset, invalidate: [queryKeys.game(ctx.network, action.gameId), ...balance, ...myGames] };
    case 'accept':
      return {
        reset,
        invalidate: [queryKeys.game(ctx.network, action.gameId), ...balance, queryKeys.house(ctx.network, ctx.houseId), ...myGames],
      };
  }
}
