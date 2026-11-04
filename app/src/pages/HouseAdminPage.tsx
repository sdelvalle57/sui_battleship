import { HouseAdminPanel } from '../components/HouseAdminPanel';
import { ReadState } from '../components/ReadState';
import { useHouseCap } from '../hooks/useHouseCap';
import { useWalletAccount } from '../hooks/useWalletAccount';

const NO_ACCOUNT_TEXT = 'Conecta la wallet que tiene el HouseCap para administrar la House';
const NO_PERMISSION_TEXT = 'Sin permisos: esta cuenta no tiene el HouseCap de esta House.';

/**
 * Contenido de la página para la cuenta conectada (H-2): mientras no hay una lectura exitosa del cap (`unknown`) solo se
 * ve el estado de la lectura, así un error nunca parece "sin permisos". Con `known` + `null`, "Sin permisos" con "Volver a
 * comprobar" (el índice de dueños puede ir atrás tras recibir el cap, V-12), sin datos de la House (P-1). Con el cap, el
 * panel; una relectura que falla pone el aviso encima y **no** lo desmonta.
 */
function HouseAdminView() {
  const houseCap = useHouseCap();
  if (houseCap.kind === 'no_account') return <p>{NO_ACCOUNT_TEXT}</p>;
  const { cap, status, isFetching, refetch } = houseCap;
  const readState = <ReadState status={status} onRetry={refetch} busy={isFetching} />;
  if (cap.kind === 'unknown') return readState;
  if (cap.cap === null) {
    return (
      <>
        {readState}
        <div className="house-no-permission">
          <p>{NO_PERMISSION_TEXT}</p>
          <button type="button" onClick={refetch} disabled={isFetching}>
            Volver a comprobar
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      {readState}
      <HouseAdminPanel capId={cap.cap.id} />
    </>
  );
}

/**
 * "Administrar House" en `#/admin` (D-2): solo la cuenta con el `HouseCap` ve el panel. Se monta con `key={address}`,
 * como "Mis partidas" (DL-9 de #13): al cambiar de cuenta se remonta y la detección arranca de cero para la nueva.
 */
export function HouseAdminPage() {
  const { address } = useWalletAccount();
  return (
    <section className="house-admin">
      <h2>Administrar House</h2>
      {address === null ? <p>{NO_ACCOUNT_TEXT}</p> : <HouseAdminView key={address} />}
    </section>
  );
}
