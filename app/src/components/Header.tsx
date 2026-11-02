import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { AccountBadge } from './AccountBadge';
import { NetworkBadge } from './NetworkBadge';

/** Encabezado de todas las páginas: título, red y estado del nodo, cuenta conectada y botón de la wallet. */
export function Header() {
  return (
    <header className="app-header">
      <h1>Sui Battleship</h1>
      <NetworkBadge />
      <AccountBadge />
      {/* DL-11 (D-20261102-04 (2)): el kit solo deja cambiar el texto del botón; su modal y su menú quedan en inglés. */}
      <ConnectButton>Conectar wallet</ConnectButton>
    </header>
  );
}
