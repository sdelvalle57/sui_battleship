import type { AdoptedTx, TxOutcome } from '../hooks/txSession';
import { useAcceptGame } from '../hooks/useAcceptGame';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCancelGame } from '../hooks/useCancelGame';
import { useRejectGame } from '../hooks/useRejectGame';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import { ACCEPT_GAS_RESERVE_MIST, acceptBalanceCheck, wonBy } from '../sui/acceptGame';
import type { GameResolvedEvent } from '../sui/events';
import { formatMist } from '../sui/format';
import type { Game } from '../sui/game';
import { acceptState, canCancel, canReject, NOT_INVITED_HINT } from '../sui/gameActions';
import { TransactionStatus } from './TransactionStatus';
import { IN_FLIGHT_TEXT } from './txNotice';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;

function cancelledText(refund: bigint | null): string {
  return refund === null ? 'Partida cancelada' : `Partida cancelada: se devolvieron ${formatMist(refund)} SUI a tu cuenta`;
}
function rejectedText(refund: bigint | null): string {
  return refund === null ? 'Invitación rechazada' : `Invitación rechazada: se devolvieron ${formatMist(refund)} SUI a quien te invitó`;
}
/**
 * Resultado de una aceptación (DL-5, SEG-10): solo con el `GameResolved` de la confirmación del nodo, con sus montos;
 * sin evento, un éxito honesto que remite al detalle.
 */
function acceptedText(event: GameResolvedEvent | null, address: string | null): string {
  if (event === null) return 'Partida aceptada; no se pudo leer el resultado de la transacción: el detalle muestra el ganador';
  const amounts = `(pozo ${sui(event.pot)} − comisión ${sui(event.fee)})`;
  return address !== null && wonBy(event, address)
    ? `¡Ganaste! Recibiste ${sui(event.payout)} ${amounts}`
    : `Perdiste: ganó quien creó la partida y recibió ${sui(event.payout)} ${amounts}`;
}

/** Resultado adoptado de una acción sobre la partida (M-2), con el mismo texto que el propio. */
function adoptedStatus(adopted: AdoptedTx, address: string | null): { outcome: TxOutcome<unknown>; text: string } | null {
  switch (adopted.action) {
    case 'cancel':
      return { outcome: adopted.outcome, text: cancelledText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null) };
    case 'reject':
      return { outcome: adopted.outcome, text: rejectedText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null) };
    case 'accept':
      return { outcome: adopted.outcome, text: acceptedText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null, address) };
    case 'create':
      return null;
  }
}

/**
 * Bloque de "Aceptar" (DL-4, DL-5): solo existe cuando la cuenta puede aceptar, así el saldo se consulta solo entonces.
 * La reserva de gas es cortesía (el nodo y la wallet deciden); un saldo sin leer no bloquea.
 */
function AcceptBlock({ bet, disabled, onAccept }: { bet: bigint; disabled: boolean; onAccept: () => void }) {
  const balance = useSuiBalance();
  const check = acceptBalanceCheck(balance.balance, bet);
  return (
    <div className="accept-game">
      <p>
        {`Apuestas ${sui(bet)}, igual que el creador. El ganador se sortea on-chain al ejecutarse la transacción (50 % cada uno) y pagas su gas.`}
      </p>
      <p className="hint">
        Si tu wallet muestra una vista previa con un ganador o un cambio de saldo, es una simulación: el sorteo real ocurre
        cuando la red ejecuta la transacción.
      </p>
      {check === 'insufficient' && (
        <p className="field-error">{`Saldo insuficiente: necesitas ${sui(bet)} de apuesta más ≈ ${sui(ACCEPT_GAS_RESERVE_MIST)} de reserva para el gas`}</p>
      )}
      {check === 'unknown' && balance.status.kind === 'error' && (
        <p className="hint">No se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al firmar)</p>
      )}
      <button
        type="button"
        disabled={disabled || check === 'insufficient'}
        onClick={() => {
          onAccept();
        }}
      >
        Aceptar
      </button>
    </div>
  );
}

/**
 * Acciones sobre una partida en el detalle: "Aceptar" para quien puede (`acceptState`, M-3 y D-20261103-02 de #12),
 * "Cancelar" para el creador y "Rechazar" para el invitado (DL-10, D-20261102-05), solo en `Pending` (el contrato valida
 * igual). Cada una con su estado de transacción, que sigue a la vista aunque el botón desaparezca al refrescarse la
 * partida. Una sola fuente de bloqueo para la partida (`useTxTarget`, DL-8 de #12): una transacción de la cuenta en curso
 * o un "sin confirmar" de esta partida deshabilitan los botones; la alerta "sin confirmar" y "Ya la revisé" salen una
 * vez. El resultado de aceptar solo aparece con la confirmación del nodo (SEG-10).
 */
export function GameActions({ game }: { game: Game }) {
  const { network } = useAppConfig();
  const { address } = useWalletAccount();
  const target = useTxTarget({ kind: 'game', gameId: game.id });
  const cancel = useCancelGame(target.view);
  const reject = useRejectGame(target.view);
  const accept = useAcceptGame(target.view, game);
  const busy = target.busy || target.unconfirmed !== null;
  const adopted = target.notice?.kind === 'adopted' ? adoptedStatus(target.notice.adopted, address) : null;
  const accepting = acceptState(game, address);
  const showCancel = canCancel(game, address);
  const showReject = canReject(game, address);
  const cancelValue = cancel.outcome?.kind === 'success' ? cancel.outcome.value : null;
  const rejectValue = reject.outcome?.kind === 'success' ? reject.outcome.value : null;
  const acceptValue = accept.outcome?.kind === 'success' ? accept.outcome.value : null;

  return (
    <div className="game-actions">
      {accepting === 'no_account' && (
        <p className="hint">Conecta tu wallet para aceptar la partida, cancelarla si es tuya o rechazarla si te invitaron</p>
      )}
      {accepting === 'not_invited' && <p className="hint">{NOT_INVITED_HINT}</p>}
      {accepting === 'available' && <AcceptBlock bet={game.bet} disabled={busy} onAccept={accept.accept} />}
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
      <TransactionStatus stage={accept.stage} outcome={accept.outcome} network={network} successText={acceptedText(acceptValue, address)} />
      <TransactionStatus stage={cancel.stage} outcome={cancel.outcome} network={network} successText={cancelledText(cancelValue)} />
      <TransactionStatus stage={reject.stage} outcome={reject.outcome} network={network} successText={rejectedText(rejectValue)} />
      {target.notice?.kind === 'in_flight' && <p role="status">{IN_FLIGHT_TEXT}</p>}
      {adopted !== null && <TransactionStatus stage="done" outcome={adopted.outcome} network={network} successText={adopted.text} />}
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
