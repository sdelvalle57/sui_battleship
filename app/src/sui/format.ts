import { formatAddress, MIST_PER_SUI, parseToMist, SUI_DECIMALS } from '@mysten/sui/utils';

/** Máximo de un `u64` de Move: tope de cualquier monto en MIST que acepta el contrato (LIM-6). */
export const U64_MAX = 2n ** 64n - 1n;

/** Monto decimal sin signo: entero, entero con decimales o solo decimales (`.5`). Sin espacios ni exponentes. */
const SUI_AMOUNT_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

/** Resultado de `parseSuiToMist`: el monto en MIST o el motivo del rechazo, para que la UI muestre un mensaje claro. */
export type ParseResult =
  | { ok: true; mist: bigint }
  | { ok: false; reason: 'empty' | 'negative' | 'too_many_decimals' | 'too_large' | 'invalid' };

/**
 * Convierte un monto en SUI escrito por el usuario a MIST (`bigint`, sin floats). La clasificación usa chequeos
 * propios antes de `parseToMist`, que acepta negativos y no acota a u64, y nunca depende del texto de sus errores.
 * No hace `trim`: un espacio es `invalid`.
 */
export function parseSuiToMist(input: string): ParseResult {
  if (input === '') {
    return { ok: false, reason: 'empty' };
  }
  if (input.startsWith('-')) {
    return { ok: false, reason: 'negative' };
  }
  if (!SUI_AMOUNT_PATTERN.test(input)) {
    return { ok: false, reason: 'invalid' };
  }
  const fraction = input.split('.')[1] ?? '';
  if (fraction.length > SUI_DECIMALS) {
    return { ok: false, reason: 'too_many_decimals' };
  }
  const mist = parseToMist(input);
  if (mist > U64_MAX) {
    return { ok: false, reason: 'too_large' };
  }
  return { ok: true, mist };
}

/**
 * Formatea MIST como SUI: parte entera y hasta 9 decimales, sin ceros finales ni punto colgante; negativos con signo.
 * Solo aritmética `bigint`, sin pasar por floats.
 */
export function formatMist(mist: bigint): string {
  const negative = mist < 0n;
  const abs = negative ? -mist : mist;
  const whole = (abs / MIST_PER_SUI).toString();
  const fraction = (abs % MIST_PER_SUI).toString().padStart(SUI_DECIMALS, '0').replace(/0+$/, '');
  const body = fraction === '' ? whole : `${whole}.${fraction}`;
  return negative ? `-${body}` : body;
}

/** Dirección abreviada para mostrar (`0x1234…abcd`): re-export de `formatAddress` del SDK. */
export const shortAddress: (address: string) => string = formatAddress;
