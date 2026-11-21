import type { ReactNode } from 'react';
import type { GameTarget, TxView } from '../hooks/txSession';
import { useAppConfig } from '../hooks/useAppConfig';
import { useDeadlinePhase, type DeadlinePhase } from '../hooks/useChainNow';
import { useClaimTimeout } from '../hooks/useClaimTimeout';
import { useRefundStalled } from '../hooks/useRefundStalled';
import { shortAddress } from '../sui/format';
import { Countdown } from './Countdown';
import {
  ACTION_TEXT,
  BOTH_NOTE,
  GRACE_NOTE,
  NOT_YET_PREFIX,
  UNAVAILABLE_TEXT,
  claimDescription,
  claimedText,
  refundDescription,
  refundedText,
  type ActiveDuelRow,
  type UnavailableCause,
} from './gameTexts';
import { TransactionStatus } from './TransactionStatus';

const TO_MOVE_BOTH = 3;

/** Una acción de tiempo disponible o no, con su motivo cuando no (UX-9). */
type Availability = { available: true } | { available: false; cause: UnavailableCause };

function reasonOf(
  cause: UnavailableCause,
  deadlineMs: bigint,
): ReactNode {
  if (cause !== 'not_yet') return UNAVAILABLE_TEXT[cause];
  return (
    <>
      {NOT_YET_PREFIX} (<Countdown deadlineMs={deadlineMs} withMoment={false} />)
    </>
  );
}

/**
 * Un botón de acción de tiempo con lo que pasará con los fondos (UX-8) y, si no está disponible, el motivo en texto visible
 * (UX-9). Los dos textos son nodos visibles junto al botón y se enlazan con `aria-describedby` (un botón `disabled` no recibe
 * foco, así que `title` no alcanzaría). En una lista, el nombre accesible suma la partida (UX-10).
 */
function TimeButton({
  idBase,
  label,
  accessibleName,
  description,
  reason,
  disabled,
  onClick,
}: {
  /** Base de los `id` de los textos enlazados: única por partida y acción (sin `useId`: M-4 de #12). */
  idBase: string;
  label: string;
  accessibleName: string | undefined;
  description: string;
  reason: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  const reasonId = `${idBase}-reason`;
  const descriptionId = `${idBase}-description`;
  return (
    <div className="duel-action-block">
      <button
        type="button"
        className="duel-action"
        disabled={disabled}
        aria-label={accessibleName}
        aria-describedby={reason === null ? descriptionId : `${reasonId} ${descriptionId}`}
        onClick={onClick}
      >
        {label}
      </button>
      {reason !== null && (
        <p id={reasonId} className="duel-reason">
          {reason}
        </p>
      )}
      <p id={descriptionId} className="duel-fund-note">
        {description}
      </p>
    </div>
  );
}

/** Si una acción se puede usar y, si no, por qué (la primera causa que aplique, en el orden de UX-9). */
function availabilityOf({
  done,
  hasAccount,
  unconfirmed,
  busy,
  phase,
  needs,
}: {
  done: boolean;
  hasAccount: boolean;
  unconfirmed: boolean;
  busy: boolean;
  phase: DeadlinePhase;
  needs: 'expired' | 'stalled';
}): Availability {
  if (done) return { available: false, cause: 'done' };
  if (!hasAccount) return { available: false, cause: 'no_account' };
  if (unconfirmed) return { available: false, cause: 'unconfirmed' };
  if (busy) return { available: false, cause: 'busy' };
  if (phase === 'unknown') return { available: false, cause: 'unknown_time' };
  const reached = needs === 'expired' ? phase === 'expired' || phase === 'stalled' : phase === 'stalled';
  return reached ? { available: true } : { available: false, cause: 'not_yet' };
}

/**
 * Las acciones de tiempo de una partida activa con reloj (#73, TASK-8b): **Reclamar victoria** (el rival de quien no movió
 * cobra el pozo menos la comisión; cualquiera puede ejecutarla) y **Reembolsar** (cada jugador recupera su apuesta: cuando
 * deben mover los dos y venció el plazo, o cuando pasó la gracia). Van por la misma máquina de transacciones que las demás
 * (`useClaimTimeout` y `useRefundStalled`, con el candado y el "sin confirmar" del objetivo). La elegibilidad la decide la
 * cadena en la preflight (que muestra su mensaje); acá el botón solo se ofrece cuando la hora de la red ya pasó el plazo.
 * Un plazo vencido no ofrece "jugar": no hay ningún botón de jugada.
 */
export function TimeoutActions({
  game,
  view,
  address,
  busy,
  unconfirmed,
  adoptedDone,
  variant,
}: {
  game: ActiveDuelRow;
  view: TxView<GameTarget>;
  address: string | null;
  /** Hay una transacción de la cuenta en curso. */
  busy: boolean;
  /** Esta partida quedó con una transacción sin confirmar. */
  unconfirmed: boolean;
  /** Otra pestaña ya reclamó o reembolsó esta partida (resultado adoptado). */
  adoptedDone: boolean;
  variant: 'detail' | 'row';
}) {
  const { network } = useAppConfig();
  const claim = useClaimTimeout(view, game);
  const refund = useRefundStalled(view, game);
  const phase = useDeadlinePhase(game.state.deadlineMs);
  const bothPending = game.state.toMove === TO_MOVE_BOTH;
  const claimValue = claim.outcome?.kind === 'success' ? claim.outcome.value : null;
  const refundValue = refund.outcome?.kind === 'success' ? refund.outcome.value : null;
  const done = adoptedDone || claim.outcome?.kind === 'success' || refund.outcome?.kind === 'success';
  const common = { done, hasAccount: address !== null, unconfirmed, busy, phase };
  const claimState = availabilityOf({ ...common, needs: 'expired' });
  const refundState = availabilityOf({ ...common, needs: bothPending ? 'expired' : 'stalled' });
  const showClaim = !bothPending;
  const showRefund = bothPending || phase === 'stalled';
  const inList = variant === 'row';
  const named = (verb: string) => (inList ? `${verb} (partida ${shortAddress(game.id)})` : undefined);
  const { deadlineMs } = game.state;

  return (
    <div className="duel-actions">
      {bothPending ? <p className="duel-note">{BOTH_NOTE}</p> : phase !== 'stalled' && <p className="duel-note">{GRACE_NOTE}</p>}
      {showClaim && (
        <TimeButton
          idBase={`duel-claim-${game.id}`}
          label={ACTION_TEXT.claim}
          accessibleName={named(ACTION_TEXT.claim)}
          description={claimDescription(game, game.state, address)}
          reason={claimState.available ? null : reasonOf(claimState.cause, deadlineMs)}
          disabled={!claimState.available}
          onClick={claim.claim}
        />
      )}
      {showRefund && (
        <TimeButton
          idBase={`duel-refund-${game.id}`}
          label={ACTION_TEXT.refund}
          accessibleName={named(ACTION_TEXT.refund)}
          description={refundDescription(game)}
          reason={refundState.available ? null : reasonOf(refundState.cause, deadlineMs)}
          disabled={!refundState.available}
          onClick={refund.refund}
        />
      )}
      <TransactionStatus stage={claim.stage} outcome={claim.outcome} network={network} successText={claimedText(claimValue, address)} />
      <TransactionStatus stage={refund.stage} outcome={refund.outcome} network={network} successText={refundedText(refundValue)} />
    </div>
  );
}
