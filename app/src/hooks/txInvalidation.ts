import type { QueryKey } from '@tanstack/react-query';
import type { Network } from '../sui/networks';
import { queryKeys } from './queryKeys';

/** Acción de una transacción propia: decide qué datos quedaron viejos (DL-6). */
export type TxAction = { kind: 'create' } | { kind: 'cancel'; gameId: string } | { kind: 'reject'; gameId: string };

/** Claves a reiniciar (`resetQueries`: el lobby vuelve a su primera página) y a invalidar (`invalidateQueries`). */
export type TxInvalidations = { reset: QueryKey[]; invalidate: QueryKey[] };

/**
 * Tabla única de invalidación tras una transacción propia (DL-6), con las claves de `queryKeys`. Crear: el lobby se
 * reinicia (como "Actualizar") y el saldo cambia. Cancelar/rechazar: además, la partida. Nunca claves inmutables
 * (`txInfo`, `publishCheckpoint`, `checkpointTime`) ni ajenas (`nodeInfo`). #12 y #14 suman la House aquí. Sin cuenta, no
 * hay saldo que invalidar.
 */
export function transactionInvalidations(
  action: TxAction,
  ctx: { network: Network; originalPackageId: string; houseId: string; address: string | null },
): TxInvalidations {
  const balance = ctx.address === null ? [] : [queryKeys.balance(ctx.network, ctx.address)];
  const reset = [queryKeys.lobby(ctx.network, ctx.originalPackageId)];
  switch (action.kind) {
    case 'create':
      return { reset, invalidate: balance };
    case 'cancel':
    case 'reject':
      return { reset, invalidate: [queryKeys.game(ctx.network, action.gameId), ...balance] };
  }
}
