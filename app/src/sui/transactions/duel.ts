import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress, normalizeStructTag, parseStructTag } from '@mysten/sui/utils';
import { assertBet, assertObjectId } from './validate';

/**
 * Builders puros de las transacciones del coinflip nuevo y de las `entry` genéricas de `battleship::duel` (#73, TASK-7b).
 * Como los de `game.ts`: reciben IDs ya validados por `config.ts`/`ids.ts` (ARQ-8), **lanzan** ante un dato inválido y no
 * fijan `sender` ni gas. El **target** lleva el `packageId` vigente (el original no sirve para un módulo introducido en un
 * upgrade); el **argumento de tipo** `G` de las genéricas lleva el ID de **definición** de `G` (`DuelSource.gameTag`, que
 * sale de `typeOrigins`), nunca `packageId`: es la única forma que no depende de que el runtime normalice un ID de
 * almacenamiento posterior (V-12 de TASK-1b).
 */

type CoinflipFn = 'create' | 'accept';
type DuelFn = 'cancel' | 'reject' | 'claim_timeout' | 'refund_stalled';

function coinflipTarget(packageId: string, fn: CoinflipFn): `${string}::${string}::${string}` {
  return `${packageId}::coinflip::${fn}`;
}

function duelTarget(packageId: string, fn: DuelFn): `${string}::${string}::${string}` {
  return `${packageId}::duel::${fn}`;
}

/**
 * Exige un tag de juego `G` ya normalizado y sin parámetros de tipo (`<ID de definición>::<módulo>::<G>`, con direcciones
 * de 64 hex): el que arma el registro (`DuelSource.gameTag`). Un ID abreviado, un tag con parámetros o uno que no es un
 * tag lanzan.
 */
function assertGameTag(gameTag: string): void {
  if (!isNormalizedGameTag(gameTag)) throw new Error(`gameTag inválido: ${gameTag}`);
}

function isNormalizedGameTag(gameTag: string): boolean {
  try {
    return parseStructTag(gameTag).typeParams.length === 0 && normalizeStructTag(gameTag) === gameTag;
  } catch {
    return false;
  }
}

/**
 * Crear un coinflip nuevo (control 0, sin reloj): `splitCoins(gas, [bet])` y `coinflip::create(house, coin, opponent)`.
 * Toda la moneda separada es la apuesta; `opponent` `null` = abierto, una dirección = invitación. El contrato fija el
 * control en 0: no hay parámetro de control.
 */
export function buildCreateCoinflipTx({
  packageId,
  houseId,
  bet,
  opponent,
}: {
  packageId: string;
  houseId: string;
  bet: bigint;
  opponent: string | null;
}): Transaction {
  assertObjectId('packageId', packageId);
  assertObjectId('houseId', houseId);
  if (opponent !== null && !isValidSuiAddress(opponent)) throw new Error('opponent inválido: no es una dirección de Sui');
  assertBet(bet);
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: coinflipTarget(packageId, 'create'),
    arguments: [tx.object(houseId), coin, tx.pure.option('address', opponent)],
  });
  return tx;
}

/**
 * Aceptar un coinflip nuevo: `splitCoins(gas, [bet])` y `coinflip::accept(duel, house, coin, random)`; el contrato activa,
 * cobra la comisión, sortea y paga en la misma transacción (emite `DuelActivated` y `DuelResolved`). El `MoveCall` con
 * `Random` (`tx.object.random()`, `0x8`) va **último**: después de un comando que usa `Random` el nodo solo admite
 * `TransferObjects` y `MergeCoins` y rechaza la transacción antes de ejecutarla (`PostRandomCommandRestrictions`,
 * `agents.md` §7); el `splitCoins` previo sí está permitido.
 */
export function buildAcceptCoinflipTx({
  packageId,
  houseId,
  duelId,
  bet,
}: {
  packageId: string;
  houseId: string;
  duelId: string;
  bet: bigint;
}): Transaction {
  assertObjectId('packageId', packageId);
  assertObjectId('houseId', houseId);
  assertObjectId('duelId', duelId);
  assertBet(bet);
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: coinflipTarget(packageId, 'accept'),
    arguments: [tx.object(duelId), tx.object(houseId), coin, tx.object.random()],
  });
  return tx;
}

function buildDuelCallTx({
  packageId,
  gameTag,
  duelId,
  fn,
}: {
  packageId: string;
  gameTag: string;
  duelId: string;
  fn: 'cancel' | 'reject' | 'refund_stalled';
}): Transaction {
  assertObjectId('packageId', packageId);
  assertObjectId('duelId', duelId);
  assertGameTag(gameTag);
  const tx = new Transaction();
  tx.moveCall({ target: duelTarget(packageId, fn), typeArguments: [gameTag], arguments: [tx.object(duelId)] });
  return tx;
}

/** Cancelar un duelo pendiente (solo el creador; el contrato lo valida): `duel::cancel<G>(duel)`. */
export function buildCancelDuelTx(args: { packageId: string; gameTag: string; duelId: string }): Transaction {
  return buildDuelCallTx({ ...args, fn: 'cancel' });
}

/** Rechazar una invitación pendiente (solo el invitado; el contrato lo valida): `duel::reject<G>(duel)`. */
export function buildRejectDuelTx(args: { packageId: string; gameTag: string; duelId: string }): Transaction {
  return buildDuelCallTx({ ...args, fn: 'reject' });
}

/**
 * Reembolsar un duelo estancado, 100/100 y sin comisión (ambos pendientes tras el plazo, o uno pendiente tras la gracia;
 * cualquiera puede llamarla y la elegibilidad la decide la cadena): `duel::refund_stalled<G>(duel)`. No recibe la House.
 */
export function buildRefundStalledTx(args: { packageId: string; gameTag: string; duelId: string }): Transaction {
  return buildDuelCallTx({ ...args, fn: 'refund_stalled' });
}

/**
 * Reclamar la victoria por tiempo agotado (cualquiera puede llamarla; el pozo menos la comisión va al **rival** del que
 * debía mover, nunca a quien llama): `duel::claim_timeout<G>(duel, house)`. Lleva la House porque cobra la comisión.
 */
export function buildClaimTimeoutTx({
  packageId,
  gameTag,
  houseId,
  duelId,
}: {
  packageId: string;
  gameTag: string;
  houseId: string;
  duelId: string;
}): Transaction {
  assertObjectId('packageId', packageId);
  assertObjectId('houseId', houseId);
  assertObjectId('duelId', duelId);
  assertGameTag(gameTag);
  const tx = new Transaction();
  tx.moveCall({
    target: duelTarget(packageId, 'claim_timeout'),
    typeArguments: [gameTag],
    arguments: [tx.object(duelId), tx.object(houseId)],
  });
  return tx;
}
