import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress, isValidSuiObjectId } from '@mysten/sui/utils';
import { U64_MAX } from '../format';

/**
 * Builders puros de las transacciones de admin de `battleship::house` (D-4). Igual que los de `game.ts`: reciben IDs ya
 * validados (el `capId` sale de `fetchHouseCap`) y **lanzan** ante un dato inválido, que es un error de programación. No
 * fijan `sender` ni gas: los pone la preflight y la wallet. Los rangos son los del tipo Move (`u16`, `u64`), no los del
 * contrato: así una comisión de 1001 llega a la red y aborta con `house`/0, que es la verdad (SEG-1).
 */

/** Máximo de un `u16` de Move (`fee_rate`). */
const U16_MAX = 65_535;

function assertObjectId(name: string, value: string): void {
  if (!isValidSuiObjectId(value)) throw new Error(`${name} inválido: ${value}`);
}

function assertU64(name: string, value: bigint): void {
  if (value < 0n || value > U64_MAX) throw new Error(`${name} fuera de rango (0..U64_MAX): ${String(value)}`);
}

function moveTarget(
  packageId: string,
  fn: 'update_fee_rate' | 'update_bet_limits' | 'withdraw_fees',
): `${string}::${string}::${string}` {
  return `${packageId}::house::${fn}`;
}

type HouseCallIds = { packageId: string; houseId: string; capId: string };

function assertIds({ packageId, houseId, capId }: HouseCallIds): void {
  assertObjectId('packageId', packageId);
  assertObjectId('houseId', houseId);
  assertObjectId('capId', capId);
}

/** Cambiar la comisión: `update_fee_rate(house, cap, fee_rate)`, con `feeRate` en bps (entero `u16`). */
export function buildUpdateFeeRateTx({ feeRate, ...ids }: HouseCallIds & { feeRate: number }): Transaction {
  assertIds(ids);
  if (!Number.isInteger(feeRate) || feeRate < 0 || feeRate > U16_MAX) {
    throw new Error(`feeRate fuera de rango (entero 0..${String(U16_MAX)}): ${String(feeRate)}`);
  }
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget(ids.packageId, 'update_fee_rate'),
    arguments: [tx.object(ids.houseId), tx.object(ids.capId), tx.pure.u16(feeRate)],
  });
  return tx;
}

/** Cambiar los límites de apuesta: `update_bet_limits(house, cap, min_bet, max_bet)`, en MIST. */
export function buildUpdateBetLimitsTx({ minBet, maxBet, ...ids }: HouseCallIds & { minBet: bigint; maxBet: bigint }): Transaction {
  assertIds(ids);
  assertU64('minBet', minBet);
  assertU64('maxBet', maxBet);
  const tx = new Transaction();
  tx.moveCall({
    target: moveTarget(ids.packageId, 'update_bet_limits'),
    arguments: [tx.object(ids.houseId), tx.object(ids.capId), tx.pure.u64(minBet), tx.pure.u64(maxBet)],
  });
  return tx;
}

/**
 * Retirar todas las comisiones a `recipient` (N-2, D-20261104-02 (5)): exactamente dos comandos, `withdraw_fees(house,
 * cap)`, que devuelve el `Coin<SUI>`, y `TransferObjects([ese coin], recipient)`. Quien llama pasa la cuenta que firma
 * (`build(sender)`): no hay retiro parcial ni a otra dirección.
 */
export function buildWithdrawFeesTx({ recipient, ...ids }: HouseCallIds & { recipient: string }): Transaction {
  assertIds(ids);
  if (!isValidSuiAddress(recipient)) throw new Error('recipient inválido: no es una dirección de Sui');
  const tx = new Transaction();
  // El resultado entero del `MoveCall` (`Result 0`): `withdraw_fees` devuelve un solo valor, el `Coin<SUI>`.
  const coin = tx.moveCall({
    target: moveTarget(ids.packageId, 'withdraw_fees'),
    arguments: [tx.object(ids.houseId), tx.object(ids.capId)],
  });
  tx.transferObjects([coin], tx.pure.address(recipient));
  return tx;
}
