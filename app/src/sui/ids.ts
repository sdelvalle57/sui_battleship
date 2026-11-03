import { isValidSuiAddress, isValidSuiObjectId, normalizeSuiAddress } from '@mysten/sui/utils';

/** Al menos un dígito hex, con o sin `0x`: `''` y `'0x'` se rechazan antes de normalizar (normalizarían al ID cero). */
const HAS_HEX_DIGITS = /^(0x)?[0-9a-f]+$/i;

/**
 * Borde común de IDs y direcciones escritos por el usuario: pre-chequeo hex y normalización (minúsculas, `0x`, 64
 * dígitos). Devuelve `null` si ni siquiera es hex; la validez final la decide quien llama.
 */
function normalizeHexInput(raw: string): string | null {
  return HAS_HEX_DIGITS.test(raw) ? normalizeSuiAddress(raw) : null;
}

/**
 * Valida y normaliza un ID de objeto escrito por el usuario o tomado de la URL, en el borde de entrada (D12, SEG-9):
 * forma corta y mayúsculas se aceptan y se normalizan; vacío, espacios, no hex o más de 64 dígitos ⇒ `null`.
 */
export function parseObjectIdInput(raw: string): string | null {
  const normalized = normalizeHexInput(raw);
  return normalized !== null && isValidSuiObjectId(normalized) ? normalized : null;
}

/**
 * Valida y normaliza una dirección de cuenta escrita por el usuario (la invitación del formulario de creación, DL-8),
 * con el mismo borde que `parseObjectIdInput`: forma corta y mayúsculas se normalizan; vacío, espacios, no hex o más
 * de 64 dígitos ⇒ `null`. El `trim` lo hace quien llama.
 */
export function parseAddressInput(raw: string): string | null {
  const normalized = normalizeHexInput(raw);
  return normalized !== null && isValidSuiAddress(normalized) ? normalized : null;
}

/** Compara dos direcciones de Sui sin importar mayúsculas ni ceros a la izquierda. */
export function sameAddress(a: string, b: string): boolean {
  return normalizeSuiAddress(a) === normalizeSuiAddress(b);
}
