import { useWalletAccount } from '../hooks/useWalletAccount';

/** Dirección abreviada de la cuenta conectada (completa en el `title`); no renderiza nada sin cuenta. */
export function AccountBadge() {
  const { address, short } = useWalletAccount();
  if (address === null || short === null) {
    return null;
  }
  return (
    <span className="account-badge" title={address}>
      {short}
    </span>
  );
}
