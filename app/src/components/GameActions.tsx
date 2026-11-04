import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import { useRejectGame } from '../hooks/useRejectGame';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { formatMist } from '../sui/format';
import type { Game } from '../sui/game';
import { canCancel, canReject } from '../sui/gameActions';
import { TransactionStatus } from './TransactionStatus';
import { IN_FLIGHT_TEXT } from './txNotice';

function cancelledText(refund: bigint | null): string {
  return refund === null ? 'Partida cancelada' : `Partida cancelada: se devolvieron ${formatMist(refund)} SUI a tu cuenta`;
}
function rejectedText(refund: bigint | null): string {
  return refund === null ? 'Invitación rechazada' : `Invitación rechazada: se devolvieron ${formatMist(refund)} SUI a quien te invitó`;
}

/**
 * Acciones sobre una partida en el detalle (DL-10, D-20261102-05): "Cancelar" para el creador y "Rechazar" para el
 * invitado, solo en `Pending` (`canCancel`/`canReject`; el contrato valida igual). Cada una con su estado de
 * transacción, que sigue a la vista aunque el botón desaparezca al refrescarse la partida. Una sola fuente de bloqueo
 * para la partida (`useTxTarget`, DL-8 de #12): una transacción de la cuenta en curso o un "sin confirmar" de esta
 * partida deshabilitan los botones; la alerta "sin confirmar" y "Ya la revisé" salen una vez.
 */
export function GameActions({ game }: { game: Game }) {
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const target = useTxTarget({ kind: 'game', gameId: game.id });
  const cancel = useCancelGame(target.view);
  const reject = useRejectGame(target.view);
  const busy = target.busy || target.unconfirmed !== null;
  // Resultado adoptado de cancelar o rechazar (M-2), con el texto de su acción, como el propio.
  const adopted = target.notice?.kind === 'adopted' && target.notice.adopted.action !== 'create' ? target.notice.adopted : null;
  const adoptedValue = adopted?.outcome.kind === 'success' ? adopted.outcome.value : null;
  const adoptedText = adopted?.action === 'reject' ? rejectedText(adoptedValue) : cancelledText(adoptedValue);
  const showCancel = canCancel(game, address);
  const showReject = canReject(game, address);
  const cancelValue = cancel.outcome?.kind === 'success' ? cancel.outcome.value : null;
  const rejectValue = reject.outcome?.kind === 'success' ? reject.outcome.value : null;

  return (
    <div className="game-actions">
      {address === null && game.state.kind === 'pending' && (
        <p className="hint">Conecta tu wallet para cancelar la partida si es tuya o rechazarla si te invitaron</p>
      )}
      {showCancel && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            cancel.cancel();
          }}
        >
          Cancelar
        </button>
      )}
      {showReject && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            reject.reject();
          }}
        >
          Rechazar
        </button>
      )}
      <TransactionStatus stage={cancel.stage} outcome={cancel.outcome} network={network} successText={cancelledText(cancelValue)} />
      <TransactionStatus stage={reject.stage} outcome={reject.outcome} network={network} successText={rejectedText(rejectValue)} />
      {target.notice?.kind === 'in_flight' && <p role="status">{IN_FLIGHT_TEXT}</p>}
      {adopted !== null && <TransactionStatus stage="done" outcome={adopted.outcome} network={network} successText={adoptedText} />}
      {target.unconfirmed !== null && (
        <>
          <TransactionStatus stage="done" outcome={{ kind: 'unconfirmed', digest: target.unconfirmed.digest }} network={network} successText="" />
          <button type="button" onClick={target.acknowledge}>
            Ya la revisé
          </button>
        </>
      )}
    </div>
  );
}
