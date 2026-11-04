import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Link } from 'react-router';
import { useHouseCap } from '../hooks/useHouseCap';
import { AccountBadge } from './AccountBadge';
import { NetworkBadge } from './NetworkBadge';

/**
 * Encabezado de todas las páginas: título, enlace a "Mis partidas" (DL-10 de #13), red y estado del nodo, cuenta
 * conectada y botón de la wallet. "Administrar House" (D-2 de #14) solo aparece cuando se **sabe** que la cuenta tiene el
 * `HouseCap` (`known` + cap): ni sin cuenta, ni mientras no se sabe, ni sin cap (P-1). Una relectura fallida no lo quita.
 */
export function Header() {
  const houseCap = useHouseCap();
  const isAdmin = houseCap.kind === 'account' && houseCap.cap.kind === 'known' && houseCap.cap.cap !== null;
  return (
    <header className="app-header">
      <h1>Sui Battleship</h1>
      <nav>
        <Link to="/my-games">Mis partidas</Link>
        {isAdmin && <Link to="/admin">Administrar House</Link>}
      </nav>
      <NetworkBadge />
      <AccountBadge />
      {/* DL-11 (D-20261102-04 (2)): el kit solo deja cambiar el texto del botón; su modal y su menú quedan en inglés. */}
      <ConnectButton>Conectar wallet</ConnectButton>
    </header>
  );
}
