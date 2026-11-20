import type { QueryKey } from '@tanstack/react-query';
import type { Network } from '../sui/networks';
import { queryKeys } from './queryKeys';
import type { TxAction } from './txSession';

/** Claves a reiniciar (`resetQueries`: el lobby vuelve a su primera página) y a invalidar (`invalidateQueries`). */
export type TxInvalidations = { reset: QueryKey[]; invalidate: QueryKey[] };

/**
 * Acciones de #73 sobre un duelo con reloj: reclamar la victoria por tiempo (`claim_timeout`) y reembolsar un duelo
 * estancado (`refund_stalled`). Viven acá y no en `TxAction` (`txSession.ts`, fuera del alcance de TASK-7b); TASK-8 las suma
 * a `TxAction` junto con sus hooks y esta unión pasa a ser redundante.
 */
export type DuelClockAction = { kind: 'claim'; gameId: string } | { kind: 'refundStalled'; gameId: string };

/**
 * Tabla única de invalidación tras una transacción propia (DL-6), con las claves de `queryKeys`. Crear: el lobby se
 * reinicia (como "Actualizar") y el saldo cambia. Cancelar/rechazar: además, la partida. Aceptar (DL-6 de #12): además, la
 * House, que cobró la comisión (`fees_collected`). Todas las de partidas terminan con "Mis partidas" de la cuenta (DL-7
 * de #13): va **al final** porque relee en serie todas sus páginas cargadas, y así lo demás ya está fresco. Las de la
 * House (H-5 de #14) no reinician nada y no tocan partidas: comisión y límites invalidan la House y el `HouseCap` de la
 * cuenta; el retiro, además, el saldo (recibió el `Coin`). Nunca claves inmutables (`txInfo`, `publishCheckpoint`,
 * `checkpointTime`) ni ajenas (`nodeInfo`). Sin cuenta, no hay saldo, "Mis partidas" ni `HouseCap` que invalidar.
 *
 * #73: reclamar por tiempo y reembolsar (`DuelClockAction`) se invalidan como aceptar (plan §8.3): la partida, el saldo de
 * quien llama, la House (el reclamo cobra comisión; el reembolso no toca la House, pero invalidarla de más es inocuo) y "Mis
 * partidas". Las claves de lista llevan la dimensión del juego (`queryKeys`): el reinicio del lobby usa la clave base, que
 * es el prefijo de las de cada juego, así que alcanza todos los filtros.
 */
export function transactionInvalidations(
  action: TxAction | DuelClockAction,
  ctx: { network: Network; originalPackageId: string; houseId: string; address: string | null },
): TxInvalidations {
  const balance = ctx.address === null ? [] : [queryKeys.balance(ctx.network, ctx.address)];
  const myGames = ctx.address === null ? [] : [queryKeys.myGames(ctx.network, ctx.originalPackageId, ctx.address)];
  const houseCap = ctx.address === null ? [] : [queryKeys.houseCap(ctx.network, ctx.originalPackageId, ctx.address)];
  const house = queryKeys.house(ctx.network, ctx.houseId);
  const reset = [queryKeys.lobby(ctx.network, ctx.originalPackageId)];
  switch (action.kind) {
    case 'create':
      return { reset, invalidate: [...balance, ...myGames] };
    case 'cancel':
    case 'reject':
      return { reset, invalidate: [queryKeys.game(ctx.network, action.gameId), ...balance, ...myGames] };
    case 'accept':
    case 'claim':
    case 'refundStalled':
      return {
        reset,
        invalidate: [queryKeys.game(ctx.network, action.gameId), ...balance, house, ...myGames],
      };
    case 'updateFeeRate':
    case 'updateBetLimits':
      return { reset: [], invalidate: [house, ...houseCap] };
    case 'withdrawFees':
      return { reset: [], invalidate: [house, ...balance, ...houseCap] };
  }
}
