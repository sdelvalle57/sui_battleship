import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { shortAddress } from '../sui/format';

/** Cuenta conectada en la wallet: dirección completa y abreviada, o ambas `null` si no hay cuenta. */
export function useWalletAccount(): { address: string | null; short: string | null } {
  const account = useCurrentAccount();
  if (account === null) {
    return { address: null, short: null };
  }
  return { address: account.address, short: shortAddress(account.address) };
}
