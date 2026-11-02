import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import { U64_MAX } from '../format';

/**
 * Builders puros de las transacciones de `battleship::game` (DL-1). Reciben IDs ya validados por `config.ts`/`ids.ts`
 * (ARQ-8) y **lanzan** ante un dato inválido: es un error de programación, no del usuario. No fijan `sender` ni gas: los
 * pone la preflight (copia) y la wallet. El target usa el `packageId` vigente; `tx.object(id)` va sin versión porque el
 * resolver del SDK trae la versión compartida inicial y la mutabilidad desde la firma Move.
 */

function assertObjectId(name: string, value: string): void {
  if (!isValidSuiObjectId(value)) throw new Error(`${name} inválido: ${value}`);
}

function moveTarget(packageId: string, fn: 'create_game' | 'cancel_game' | 'reject_game'): `${string}::${string}::${string}` {
  return `${packageId}::game::${fn}`;
}

/**
 * Crear una partida: `splitCoins(gas, [bet])` y `create_game(house, coin, opponent)`. Toda la moneda separada es la
 * apuesta (el contrato toma `stake.value()` como `bet`); `opponent` `null` = abierta, una dirección = invitación.
 */
export function buildCreateGameTx({
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
  if (bet <= 0n || bet > U64_MAX) throw new Error(`bet fuera de rango (1..U64_MAX): ${String(bet)}`);
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(bet)]);
  tx.moveCall({
    target: moveTarget(packageId, 'create_game'),
    arguments: [tx.object(houseId), coin, tx.pure.option('address', opponent)],
  });
  return tx;
}

function buildGameCallTx(packageId: string, gameId: string, fn: 'cancel_game' | 'reject_game'): Transaction {
  assertObjectId('packageId', packageId);
  assertObjectId('gameId', gameId);
  const tx = new Transaction();
  tx.moveCall({ target: moveTarget(packageId, fn), arguments: [tx.object(gameId)] });
  return tx;
}

/** Cancelar una partida pendiente (solo el creador; el contrato lo valida): `cancel_game(game)`. */
export function buildCancelGameTx({ packageId, gameId }: { packageId: string; gameId: string }): Transaction {
  return buildGameCallTx(packageId, gameId, 'cancel_game');
}

/** Rechazar una invitación pendiente (solo el invitado, D-20261102-05; el contrato lo valida): `reject_game(game)`. */
export function buildRejectGameTx({ packageId, gameId }: { packageId: string; gameId: string }): Transaction {
  return buildGameCallTx(packageId, gameId, 'reject_game');
}
