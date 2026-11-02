import { isValidSuiObjectId, normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui/utils';

/** Al menos un dígito hex, con o sin `0x`: `''` y `'0x'` se rechazan antes de normalizar (normalizarían al ID cero). */
const HAS_HEX_DIGITS = /^(0x)?[0-9a-f]+$/i;

/**
 * Valida y normaliza un ID de objeto escrito por el usuario o tomado de la URL, en el borde de entrada (D12, SEG-9):
 * forma corta y mayúsculas se aceptan y se normalizan; vacío, espacios, no hex o más de 64 dígitos ⇒ `null`.
 */
export function parseObjectIdInput(raw: string): string | null {
  if (!HAS_HEX_DIGITS.test(raw)) return null;
  const normalized = normalizeSuiObjectId(raw);
  return isValidSuiObjectId(normalized) ? normalized : null;
}

/** Compara dos direcciones de Sui sin importar mayúsculas ni ceros a la izquierda. */
export function sameAddress(a: string, b: string): boolean {
  return normalizeSuiAddress(a) === normalizeSuiAddress(b);
}
