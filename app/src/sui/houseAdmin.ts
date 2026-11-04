import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { parseSuiToMist } from './format';
import { isExactType, parseExactBcs } from './game';
import type { House } from './house';
import { sameAddress } from './ids';

/**
 * Comisión máxima en bps: espejo de `house::MAX_FEE_BPS` (10 %) solo para la validación de cortesía del panel (D-3,
 * SEG-1); el contrato es la verdad y aborta con `house`/0 si cambia en un upgrade. Por replicarlo, entra en la tabla de
 * `agents.md` §5 (TASK-6 de #14).
 */
export const HOUSE_MAX_FEE_BPS = 1000;

/** Motivo por el que la comisión escrita no vale (los textos los pone la UI). */
export type FeeRateError = 'empty' | 'invalid' | 'too_high' | 'unchanged';

/** Bps enteros sin signo, sin espacios, punto ni exponente (D-20261104-02 (2)). */
const BPS_PATTERN = /^\d+$/;

/**
 * Valida la comisión escrita en bps (D-3): vacía ⇒ `empty`; no son solo dígitos ⇒ `invalid`; más de `HOUSE_MAX_FEE_BPS`
 * ⇒ `too_high` (comparado como `bigint`, sin perder precisión con textos largos); igual a la actual ⇒ `unchanged`.
 */
export function validateFeeRate(
  text: string,
  currentBps: number,
): { ok: true; bps: number } | { ok: false; error: FeeRateError } {
  if (text === '') return { ok: false, error: 'empty' };
  if (!BPS_PATTERN.test(text)) return { ok: false, error: 'invalid' };
  const value = BigInt(text);
  if (value > BigInt(HOUSE_MAX_FEE_BPS)) return { ok: false, error: 'too_high' };
  const bps = Number(value);
  if (bps === currentBps) return { ok: false, error: 'unchanged' };
  return { ok: true, bps };
}

/** Motivo por el que un límite escrito no vale: los de `parseSuiToMist` tal cual, más `zero_min` (espejo del contrato). */
export type BetLimitFieldError = 'empty' | 'negative' | 'invalid' | 'too_many_decimals' | 'too_large' | 'zero_min';

/** Resultado de validar los límites: los montos en MIST o los errores por campo y del par. */
export type BetLimitsValidation =
  | { ok: true; minBet: bigint; maxBet: bigint }
  | { ok: false; errors: { min?: BetLimitFieldError; max?: BetLimitFieldError; pair?: 'min_above_max' | 'unchanged' } };

function parseLimit(text: string): { mist: bigint } | { error: BetLimitFieldError } {
  const parsed = parseSuiToMist(text);
  return parsed.ok ? { mist: parsed.mist } : { error: parsed.reason };
}

/**
 * Valida los límites escritos en SUI (D-3, espejo de `0 < min_bet <= max_bet` de `update_bet_limits`): cada campo con
 * `parseSuiToMist` (sin `trim`), el mínimo en 0 ⇒ `zero_min`; con los dos válidos, `min > max` ⇒ `min_above_max` e
 * iguales a los actuales ⇒ `unchanged` (el botón no envía una transacción que no cambia nada).
 */
export function validateBetLimits(
  minText: string,
  maxText: string,
  current: { minBet: bigint; maxBet: bigint },
): BetLimitsValidation {
  const min = parseLimit(minText);
  const max = parseLimit(maxText);
  if ('error' in min || 'error' in max || min.mist === 0n) {
    const minError = 'error' in min ? min.error : min.mist === 0n ? 'zero_min' : undefined;
    return {
      ok: false,
      errors: { ...(minError === undefined ? {} : { min: minError }), ...('error' in max ? { max: max.error } : {}) },
    };
  }
  if (min.mist > max.mist) return { ok: false, errors: { pair: 'min_above_max' } };
  if (min.mist === current.minBet && max.mist === current.maxBet) return { ok: false, errors: { pair: 'unchanged' } };
  return { ok: true, minBet: min.mist, maxBet: max.mist };
}

/** Hay algo que retirar: espejo de `ENoFeesToWithdraw` (`house`/2), que aborta con la House en 0. */
export function canWithdraw(house: Pick<House, 'feesCollected'>): boolean {
  return house.feesCollected > 0n;
}

/** Eventos de admin de `battleship::house` que lee el panel. */
export type HouseEventName = 'FeeRateUpdated' | 'BetLimitsUpdated' | 'FeesWithdrawn';

/** `FeeRateUpdated`: cambio de comisión, en bps. */
export type FeeRateUpdatedEvent = { houseId: string; oldFeeRate: number; newFeeRate: number };

/** `BetLimitsUpdated`: cambio de límites, en MIST. */
export type BetLimitsUpdatedEvent = { houseId: string; oldMinBet: bigint; oldMaxBet: bigint; newMinBet: bigint; newMaxBet: bigint };

// Layout BCS de los eventos de `contracts/sources/house.move` (`ID` = dirección de 32 bytes).
const FeeRateUpdatedBcs = bcs.struct('FeeRateUpdated', {
  house_id: bcs.Address,
  old_fee_rate: bcs.u16(),
  new_fee_rate: bcs.u16(),
});
const BetLimitsUpdatedBcs = bcs.struct('BetLimitsUpdated', {
  house_id: bcs.Address,
  old_min_bet: bcs.u64(),
  old_max_bet: bcs.u64(),
  new_min_bet: bcs.u64(),
  new_max_bet: bcs.u64(),
});
const FeesWithdrawnBcs = bcs.struct('FeesWithdrawn', { house_id: bcs.Address, amount: bcs.u64() });

/** Tipo Move normalizado de un evento de admin para el paquete original. */
export function houseEventType(originalPackageId: string, name: HouseEventName): string {
  return normalizeStructTag(`${originalPackageId}::house::${name}`);
}

/** Resultado del nodo con los eventos de la transacción (lo que devuelve `confirmTransaction`). */
type ResultWithEvents = SuiClientTypes.TransactionResult<{ events: true }>;
type HouseEventIds = { originalPackageId: string; houseId: string };

/**
 * El **único** evento `name` del paquete original con `house_id` = `houseId`, parseado con el BCS exacto. Un evento
 * ilegible no cuenta; cero o más de uno ⇒ `null`: la acción sigue siendo un éxito honesto, sin valor que mostrar.
 */
function onlyHouseEvent<T extends { house_id: string }>(
  result: ResultWithEvents,
  name: HouseEventName,
  parse: (bytes: Uint8Array) => T,
  { originalPackageId, houseId }: HouseEventIds,
): T | null {
  const tx = result.Transaction ?? result.FailedTransaction;
  const type = houseEventType(originalPackageId, name);
  const matches = tx.events
    .filter((event) => isExactType(event.eventType, type))
    .map((event) => {
      try {
        return parse(event.bcs);
      } catch {
        return null;
      }
    })
    .filter((event): event is T => event !== null && sameAddress(event.house_id, houseId));
  const [only] = matches;
  return matches.length === 1 && only !== undefined ? only : null;
}

/** Comisión anterior y nueva del `FeeRateUpdated` de la transacción (el texto de éxito sale de aquí, SEG-10). */
export function parseFeeRateUpdated(result: ResultWithEvents, ids: HouseEventIds): FeeRateUpdatedEvent | null {
  const raw = onlyHouseEvent(result, 'FeeRateUpdated', (b) => parseExactBcs(FeeRateUpdatedBcs, b, 'FeeRateUpdated'), ids);
  return raw === null ? null : { houseId: raw.house_id, oldFeeRate: raw.old_fee_rate, newFeeRate: raw.new_fee_rate };
}

/** Límites anteriores y nuevos del `BetLimitsUpdated` de la transacción, en MIST. */
export function parseBetLimitsUpdated(result: ResultWithEvents, ids: HouseEventIds): BetLimitsUpdatedEvent | null {
  const raw = onlyHouseEvent(result, 'BetLimitsUpdated', (b) => parseExactBcs(BetLimitsUpdatedBcs, b, 'BetLimitsUpdated'), ids);
  return raw === null
    ? null
    : {
        houseId: raw.house_id,
        oldMinBet: BigInt(raw.old_min_bet),
        oldMaxBet: BigInt(raw.old_max_bet),
        newMinBet: BigInt(raw.new_min_bet),
        newMaxBet: BigInt(raw.new_max_bet),
      };
}

/** Monto retirado según el `FeesWithdrawn` de la transacción: lo retirado al ejecutarse, no lo leído antes. */
export function parseFeesWithdrawn(result: ResultWithEvents, ids: HouseEventIds): bigint | null {
  const raw = onlyHouseEvent(result, 'FeesWithdrawn', (b) => parseExactBcs(FeesWithdrawnBcs, b, 'FeesWithdrawn'), ids);
  return raw === null ? null : BigInt(raw.amount);
}
