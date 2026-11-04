import { useLocation, useParams } from 'react-router';
import { readCreatedNotice } from '../components/createdNotice';
import { GameActions } from '../components/GameActions';
import { GameDetail } from '../components/GameDetail';
import { ReadState } from '../components/ReadState';
import { TransactionStatus } from '../components/TransactionStatus';
import { useAppConfig } from '../hooks/useAppConfig';
import { useGame } from '../hooks/useGame';
import { useTransactionTime } from '../hooks/useTransactionTime';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { formatBps } from '../sui/format';

/**
 * Detalle de una partida en `#/game/:id`. El ID se valida en el hook; uno inválido no consulta la red. Debajo, las
 * acciones (aceptar, cancelar, rechazar) y, si se llegó desde el formulario, el aviso de creación del `state` del router
 * (DL-14). El detalle recibe la cuenta conectada para "Resultado para ti" (DL-12 de #12).
 */
export function GameDetailPage() {
  const { id = '' } = useParams();
  const created = readCreatedNotice(useLocation().state);
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const result = useGame(id);
  const { timestampMs } = useTransactionTime(result.kind === 'read' ? result.previousTransaction : null);

  if (result.kind === 'invalid_id') {
    return (
      <section>
        <h2>Partida</h2>
        <p role="alert">ID de partida inválido</p>
      </section>
    );
  }
  return (
    <section>
      <h2>Partida</h2>
      {created !== null && (
        <TransactionStatus
          stage="done"
          outcome={{ kind: 'success', digest: created.digest, value: null, indexed: true, cost: created.cost }}
          network={network}
          successText="Partida creada"
          costNote="(incluye el depósito de almacenamiento, que no se recupera)"
        >
          {created.invitation && <p>Comparte el enlace de esta página con el invitado; guárdalo, o encuéntrala en «Mis partidas»</p>}
          {created.feeChanged !== null && (
            <p>
              La partida se creó con comisión {formatBps(created.feeChanged.to)} (el formulario mostraba{' '}
              {formatBps(created.feeChanged.from)})
            </p>
          )}
        </TransactionStatus>
      )}
      <ReadState status={result.status} onRetry={result.refetch} busy={result.isFetching} />
      {result.game !== null && (
        <>
          <GameDetail game={result.game} lastActivityMs={timestampMs} network={network} account={address} />
          <GameActions game={result.game} />
        </>
      )}
    </section>
  );
}
