import { isValidSuiObjectId } from '@mysten/sui/utils';
import { U64_MAX } from '../format';

// Validaciones comunes de los builders de `transactions/` (`game.ts` y `duel.ts`). Reciben IDs que ya validó `config.ts` o
// `ids.ts` (ARQ-8) y **lanzan** ante un dato inválido: es un error de programación, no del usuario.

/** Lanza si `value` no es un ID de objeto o de paquete válido de Sui. */
export function assertObjectId(name: string, value: string): void {
  if (!isValidSuiObjectId(value)) throw new Error(`${name} inválido: ${value}`);
}

/** Lanza si la apuesta no está en `1..U64_MAX` (el rango de la moneda; los límites de la House los valida el contrato). */
export function assertBet(bet: bigint): void {
  if (bet <= 0n || bet > U64_MAX) throw new Error(`bet fuera de rango (1..U64_MAX): ${String(bet)}`);
}
