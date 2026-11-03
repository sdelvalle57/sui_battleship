import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import { useRejectGame } from '../hooks/useRejectGame';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { formatMist } from '../sui/format';
import type { Game } from '../sui/game';
import { canCancel, canReject } from '../sui/gameActions';
import { TransactionStatus } from './TransactionStatus';

function cancelledText(refund: bigint | null): string {
  return refund === null ? 'Partida cancelada' : `Partida cancelada: se devolvieron ${formatMist(refund)} SUI a tu cuenta`;
}
function rejectedText(refund: bigint | null): string {
  return refund === null ? 'Invitación rechazada' : `Invitación rechazada: se devolvieron ${formatMist(refund)} SUI a quien te invitó`;
}

/**
 * Acciones sobre una partida en el detalle (DL-10, D-20261102-05): "Cancelar" para el creador y "Rechazar" para el
 * invitado, solo en `Pending` (`canCancel`/`canReject`; el contrato valida igual). Cada una con su estado de
 * transacción, que sigue a la vista aunque el botón desaparezca al refrescarse la partida.
 */
export function GameActions({ game }: { game: Game }) {
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const cancel = useCancelGame();
  const reject = useRejectGame();
  const busy = cancel.isBusy || reject.isBusy;
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
            cancel.cancel(game.id);
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
            reject.reject(game.id);
          }}
        >
          Rechazar
        </button>
      )}
      <TransactionStatus stage={cancel.stage} outcome={cancel.outcome} network={network} successText={cancelledText(cancelValue)} />
      <TransactionStatus stage={reject.stage} outcome={reject.outcome} network={network} successText={rejectedText(rejectValue)} />
    </div>
  );
}
