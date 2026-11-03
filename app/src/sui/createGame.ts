import { formatBps, formatMist, parseSuiToMist } from './format';
import { parseAddressInput, sameAddress } from './ids';

/**
 * Reserva de gas de cortesía al validar el saldo (DL-8): 0,01 SUI ≈ 2,5 × el gas medido de crear en #6. No es una regla
 * del contrato: el contrato y la wallet son la verdad (R-8).
 */
export const CREATE_GAS_RESERVE_MIST = 10_000_000n;

/**
 * Depósito de storage de crear que no se recupera (DL-13, D-20261030-15 D3), medido en #6 al precio de storage de
 * testnet (`contracts/README.md`): partida abierta e invitación.
 */
export const GAME_STORAGE_DEPOSIT_MIST = { open: 1_953_200n, invitation: 2_196_400n } as const;

/** Lo que el formulario muestra de la House: comisión y límites de apuesta. */
export type HouseTerms = { feeRate: number; minBet: bigint; maxBet: bigint };

/** Motivo por el que el monto no vale (los textos los pone la UI). */
export type CreateAmountError = 'empty' | 'invalid' | 'too_many_decimals' | 'below_min' | 'above_max' | 'insufficient_balance';
/** Motivo por el que la invitación no vale. */
export type CreateOpponentError = 'invalid' | 'self_invite';

/**
 * Resultado de validar el formulario. `balanceUnknown`: el saldo no se pudo leer, así que no se bloqueó por saldo (la UI
 * lo avisa; la preflight y la wallet deciden).
 */
export type CreateGameValidation =
  | { ok: true; bet: bigint; opponent: string | null; balanceUnknown: boolean }
  | { ok: false; errors: { amount?: CreateAmountError; opponent?: CreateOpponentError }; balanceUnknown: boolean };

function validateAmount(amountText: string, house: HouseTerms, balance: bigint | null): { bet: bigint } | { error: CreateAmountError } {
  const parsed = parseSuiToMist(amountText);
  if (!parsed.ok) {
    switch (parsed.reason) {
      case 'empty':
        return { error: 'empty' };
      case 'too_many_decimals':
        return { error: 'too_many_decimals' };
      case 'too_large':
        return { error: 'above_max' };
      case 'negative':
      case 'invalid':
        return { error: 'invalid' };
    }
  }
  const bet = parsed.mist;
  if (bet < house.minBet) return { error: 'below_min' };
  if (bet > house.maxBet) return { error: 'above_max' };
  if (balance !== null && bet + CREATE_GAS_RESERVE_MIST > balance) return { error: 'insufficient_balance' };
  return { bet };
}

function validateOpponent(opponentText: string, account: string): { opponent: string | null } | { error: CreateOpponentError } {
  const trimmed = opponentText.trim();
  if (trimmed === '') return { opponent: null };
  const opponent = parseAddressInput(trimmed);
  if (opponent === null) return { error: 'invalid' };
  if (sameAddress(opponent, account)) return { error: 'self_invite' };
  return { opponent };
}

/**
 * Valida el formulario de creación (DL-8, SEG-1: cortesía; el contrato es la verdad). Monto: `parseSuiToMist`, límites
 * **inclusive** de la House y `bet + CREATE_GAS_RESERVE_MIST <= saldo` (con saldo `null` no bloquea). Invitación: vacía
 * ⇒ abierta; si no, `trim` + `parseAddressInput`; la propia cuenta ⇒ `self_invite` (espejo de `ESelfInvite`).
 */
export function validateCreateGame({
  amountText,
  opponentText,
  house,
  balance,
  account,
}: {
  amountText: string;
  opponentText: string;
  house: HouseTerms;
  balance: bigint | null;
  account: string;
}): CreateGameValidation {
  const amount = validateAmount(amountText, house, balance);
  const opponent = validateOpponent(opponentText, account);
  const balanceUnknown = balance === null;
  if ('bet' in amount && 'opponent' in opponent) {
    return { ok: true, bet: amount.bet, opponent: opponent.opponent, balanceUnknown };
  }
  return {
    ok: false,
    errors: {
      ...('error' in amount ? { amount: amount.error } : {}),
      ...('error' in opponent ? { opponent: opponent.error } : {}),
    },
    balanceUnknown,
  };
}

/** Diferencia entre lo que mostró el formulario y la House releída antes de firmar (M-2). */
export type HouseTermsChange = {
  fee?: { from: number; to: number };
  limits?: { from: { minBet: bigint; maxBet: bigint }; to: { minBet: bigint; maxBet: bigint } };
};

/**
 * Compara la comisión y los límites mostrados con los releídos (M-2): `null` si coinciden. Si cambiaron, la acción se
 * detiene sin abrir la wallet: la partida guardaría una comisión que el usuario no vio.
 */
export function houseTermsChanges(shown: HouseTerms, fresh: HouseTerms): HouseTermsChange | null {
  const change: HouseTermsChange = {};
  if (shown.feeRate !== fresh.feeRate) change.fee = { from: shown.feeRate, to: fresh.feeRate };
  if (shown.minBet !== fresh.minBet || shown.maxBet !== fresh.maxBet) {
    change.limits = { from: { minBet: shown.minBet, maxBet: shown.maxBet }, to: { minBet: fresh.minBet, maxBet: fresh.maxBet } };
  }
  return change.fee || change.limits ? change : null;
}

/**
 * Texto para el usuario de un cambio de la House (M-2): primero la comisión y después los límites, con un solo cierre
 * "revisa y vuelve a confirmar".
 */
export function houseChangeMessage(change: HouseTermsChange): string {
  const parts: string[] = [];
  if (change.fee) parts.push(`La comisión cambió de ${formatBps(change.fee.from)} a ${formatBps(change.fee.to)}`);
  if (change.limits) {
    const { from, to } = change.limits;
    parts.push(
      `Los límites de apuesta cambiaron (mínimo ${formatMist(from.minBet)} → ${formatMist(to.minBet)} SUI, ` +
        `máximo ${formatMist(from.maxBet)} → ${formatMist(to.maxBet)} SUI)`,
    );
  }
  return `${parts.join('. ')}; revisa y vuelve a confirmar`;
}
