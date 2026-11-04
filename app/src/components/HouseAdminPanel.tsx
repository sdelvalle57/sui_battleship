import { useState } from 'react';
import type { AdoptedTx, TxOutcome } from '../hooks/txSession';
import { useAppConfig } from '../hooks/useAppConfig';
import { useHouse } from '../hooks/useHouse';
import { useHouseCap } from '../hooks/useHouseCap';
import { useTxTarget } from '../hooks/useTxTarget';
import { useUpdateBetLimits } from '../hooks/useUpdateBetLimits';
import { useUpdateFeeRate } from '../hooks/useUpdateFeeRate';
import { useWithdrawFees } from '../hooks/useWithdrawFees';
import { formatBps, formatMist } from '../sui/format';
import type { House } from '../sui/house';
import {
  canWithdraw,
  validateBetLimits,
  validateFeeRate,
  type BetLimitFieldError,
  type BetLimitsUpdatedEvent,
  type FeeRateError,
  type FeeRateUpdatedEvent,
} from '../sui/houseAdmin';
import { ReadState } from './ReadState';
import { TransactionStatus } from './TransactionStatus';
import { IN_FLIGHT_TEXT } from './txNotice';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;
const bps = (value: number) => `${String(value)} bps (${formatBps(value)})`;
const range = (min: bigint, max: bigint) => `${formatMist(min)}–${formatMist(max)} SUI`;

/** Sin comisiones: el mismo texto que `ABORT_MESSAGES.house[2]` (`ENoFeesToWithdraw`). */
const NO_FEES_TEXT = 'No hay comisiones para retirar.';

function feeErrorText(error: FeeRateError): string {
  switch (error) {
    case 'empty':
      return 'Escribe la comisión en bps';
    case 'invalid':
      return 'Solo números enteros (bps), sin signo, decimales ni espacios';
    case 'too_high':
      return 'El máximo es 1000 bps (10 %)';
    case 'unchanged':
      return 'Es la comisión actual';
  }
}

function limitErrorText(error: BetLimitFieldError): string {
  switch (error) {
    case 'empty':
      return 'Escribe un monto';
    case 'negative':
      return 'El monto no puede ser negativo';
    case 'invalid':
      return 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles';
    case 'too_many_decimals':
      return 'Máximo 9 decimales';
    case 'too_large':
      return 'Monto demasiado grande';
    case 'zero_min':
      return 'El mínimo tiene que ser mayor que 0';
  }
}

function pairErrorText(error: 'min_above_max' | 'unchanged'): string {
  return error === 'min_above_max' ? 'El mínimo no puede superar el máximo' : 'Son los límites actuales';
}

/** Textos de éxito (H-6, SEG-10): salen **solo** del evento de la transacción que confirmó el nodo. */
function feeUpdatedText(event: FeeRateUpdatedEvent | null): string {
  return event === null
    ? 'Comisión actualizada; no se pudo leer el evento: la configuración de arriba muestra el valor vigente'
    : `Comisión actualizada: de ${bps(event.oldFeeRate)} a ${bps(event.newFeeRate)}. Las partidas ya creadas conservan la suya.`;
}
function limitsUpdatedText(event: BetLimitsUpdatedEvent | null): string {
  return event === null
    ? 'Límites actualizados; no se pudo leer el evento: la configuración de arriba muestra el valor vigente'
    : `Límites actualizados: mínimo ${sui(event.newMinBet)}, máximo ${sui(event.newMaxBet)} (antes ${range(event.oldMinBet, event.oldMaxBet)}).`;
}
function withdrawnText(amount: bigint | null): string {
  return amount === null
    ? 'Comisiones retiradas; no se pudo leer el monto: revisa la transacción'
    : `Retiraste ${formatMist(amount)} SUI de comisiones a tu cuenta.`;
}

type HouseActionKind = 'updateFeeRate' | 'updateBetLimits' | 'withdrawFees';

/**
 * Resultado adoptado de una acción de la House (M-2 de #12), con el mismo texto que el propio. Las acciones de partidas
 * nunca llegan aquí (otro objetivo): un `case` por acción y sin `default`, como `adoptedStatus` de `GameActions`.
 */
function adoptedHouseStatus(adopted: AdoptedTx): { action: HouseActionKind; outcome: TxOutcome<unknown>; text: string } | null {
  switch (adopted.action) {
    case 'updateFeeRate':
      return { action: adopted.action, outcome: adopted.outcome, text: feeUpdatedText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null) };
    case 'updateBetLimits':
      return { action: adopted.action, outcome: adopted.outcome, text: limitsUpdatedText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null) };
    case 'withdrawFees':
      return { action: adopted.action, outcome: adopted.outcome, text: withdrawnText(adopted.outcome.kind === 'success' ? adopted.outcome.value : null) };
    case 'create':
    case 'cancel':
    case 'reject':
    case 'accept':
      return null;
  }
}

type Adopted = ReturnType<typeof adoptedHouseStatus>;

/** El resultado adoptado, si es de esta acción, como un estado terminado más del bloque. */
function AdoptedStatus({ adopted, action }: { adopted: Adopted; action: HouseActionKind }) {
  const { network } = useAppConfig();
  if (adopted?.action !== action) return null;
  return <TransactionStatus stage="done" outcome={adopted.outcome} network={network} successText={adopted.text} />;
}

/** Comisión en bps enteros con el % al lado en vivo (D-20261104-02 (2)) y el resumen "de X a Y" junto al botón (P-3). */
function FeeBlock({
  house,
  capId,
  busy,
  tx,
  adopted,
}: {
  house: House;
  capId: string;
  busy: boolean;
  tx: ReturnType<typeof useUpdateFeeRate>;
  adopted: Adopted;
}) {
  const { network } = useAppConfig();
  const [text, setText] = useState(String(house.feeRate));
  const [touched, setTouched] = useState(false);
  const validation = validateFeeRate(text, house.feeRate);
  const live = validation.ok ? validation.bps : validation.error === 'unchanged' ? house.feeRate : null;
  const error = !validation.ok && touched ? validation.error : undefined;
  return (
    <form
      data-house-action="fee"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation.ok && !busy) tx.update({ capId, feeRate: validation.bps });
      }}
    >
      <h3>Comisión</h3>
      <label>
        Nueva comisión (bps){' '}
        <input
          inputMode="numeric"
          value={text}
          aria-invalid={error !== undefined}
          onChange={(event) => {
            setText(event.target.value);
            setTouched(true);
          }}
        />
      </label>
      {live !== null && <span className="hint">{` = ${formatBps(live)}`}</span>}
      {error !== undefined && <p className="field-error">{feeErrorText(error)}</p>}
      <p className="hint">
        Las partidas ya creadas conservan la comisión con que se crearon; la nueva se aplica a las que se creen desde ahora.
      </p>
      {validation.ok && <p className="house-summary">{`De ${bps(house.feeRate)} a ${bps(validation.bps)}`}</p>}
      <button type="submit" disabled={busy || !validation.ok}>
        Actualizar comisión
      </button>
      <TransactionStatus
        stage={tx.stage}
        outcome={tx.outcome}
        network={network}
        successText={feeUpdatedText(tx.outcome?.kind === 'success' ? tx.outcome.value : null)}
      />
      <AdoptedStatus adopted={adopted} action="updateFeeRate" />
    </form>
  );
}

/** Límites de apuesta en SUI con errores por campo y del par, y el resumen "de X a Y" junto al botón. */
function LimitsBlock({
  house,
  capId,
  busy,
  tx,
  adopted,
}: {
  house: House;
  capId: string;
  busy: boolean;
  tx: ReturnType<typeof useUpdateBetLimits>;
  adopted: Adopted;
}) {
  const { network } = useAppConfig();
  const [minText, setMinText] = useState(formatMist(house.minBet));
  const [maxText, setMaxText] = useState(formatMist(house.maxBet));
  const [touched, setTouched] = useState(false);
  const validation = validateBetLimits(minText, maxText, { minBet: house.minBet, maxBet: house.maxBet });
  const errors = !validation.ok && touched ? validation.errors : {};
  return (
    <form
      data-house-action="limits"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation.ok && !busy) tx.update({ capId, minBet: validation.minBet, maxBet: validation.maxBet });
      }}
    >
      <h3>Límites de apuesta</h3>
      <label>
        Mínimo (SUI){' '}
        <input
          inputMode="decimal"
          value={minText}
          aria-invalid={errors.min !== undefined}
          onChange={(event) => {
            setMinText(event.target.value);
            setTouched(true);
          }}
        />
      </label>
      {errors.min !== undefined && <p className="field-error">{limitErrorText(errors.min)}</p>}
      <label>
        Máximo (SUI){' '}
        <input
          inputMode="decimal"
          value={maxText}
          aria-invalid={errors.max !== undefined}
          onChange={(event) => {
            setMaxText(event.target.value);
            setTouched(true);
          }}
        />
      </label>
      {errors.max !== undefined && <p className="field-error">{limitErrorText(errors.max)}</p>}
      {errors.pair !== undefined && <p className="field-error">{pairErrorText(errors.pair)}</p>}
      <p className="hint">Los límites solo se aplican al crear partidas: las pendientes no cambian.</p>
      {validation.ok && (
        <p className="house-summary">{`De ${range(house.minBet, house.maxBet)} a ${range(validation.minBet, validation.maxBet)}`}</p>
      )}
      <button type="submit" disabled={busy || !validation.ok}>
        Actualizar límites
      </button>
      <TransactionStatus
        stage={tx.stage}
        outcome={tx.outcome}
        network={network}
        successText={limitsUpdatedText(tx.outcome?.kind === 'success' ? tx.outcome.value : null)}
      />
      <AdoptedStatus adopted={adopted} action="updateBetLimits" />
    </form>
  );
}

/** Retiro total a la cuenta que firma (N-2): sin destino ni monto; el monto real sale de la transacción. */
function WithdrawBlock({
  house,
  capId,
  busy,
  tx,
  adopted,
}: {
  house: House;
  capId: string;
  busy: boolean;
  tx: ReturnType<typeof useWithdrawFees>;
  adopted: Adopted;
}) {
  const { network } = useAppConfig();
  const available = canWithdraw(house);
  return (
    <div data-house-action="withdraw">
      <h3>Comisiones</h3>
      <button
        type="button"
        disabled={busy || !available}
        onClick={() => {
          tx.withdraw({ capId });
        }}
      >
        {`Retirar ${sui(house.feesCollected)} a tu cuenta`}
      </button>
      {!available && <p className="hint">{NO_FEES_TEXT}</p>}
      <p className="hint">Se retira todo lo acumulado al momento de ejecutarse; el monto real sale de la transacción.</p>
      <TransactionStatus
        stage={tx.stage}
        outcome={tx.outcome}
        network={network}
        successText={withdrawnText(tx.outcome?.kind === 'success' ? tx.outcome.value : null)}
      />
      <AdoptedStatus adopted={adopted} action="withdrawFees" />
    </div>
  );
}

/**
 * Panel de administración de la House (D-2, D-3) para la cuenta con el cap `capId`: la configuración leída del nodo y
 * las tres acciones sobre la máquina común. Una sola fuente de bloqueo (`useTxTarget({ kind: 'house' })`): una
 * transacción de la cuenta en curso o un "sin confirmar" del panel deshabilitan los tres botones; el aviso "en curso",
 * el resultado adoptado y la alerta "sin confirmar" salen una vez. La House sigue H-2: `ReadState` solo sin dato, y con
 * dato el aviso encima de la configuración. Los textos de resultado salen solo del evento que confirmó el nodo (H-6).
 */
export function HouseAdminPanel({ capId }: { capId: string }) {
  const { network } = useAppConfig();
  const house = useHouse();
  const houseCap = useHouseCap();
  const target = useTxTarget({ kind: 'house' });
  const fee = useUpdateFeeRate(target.view);
  const limits = useUpdateBetLimits(target.view);
  const withdraw = useWithdrawFees(target.view);
  const busy = target.busy || target.unconfirmed !== null;
  const adopted = target.notice?.kind === 'adopted' ? adoptedHouseStatus(target.notice.adopted) : null;
  const refresh = () => {
    house.refetch();
    if (houseCap.kind === 'account') houseCap.refetch();
  };

  if (house.house === null) {
    return (
      <div className="house-config">
        <h3>Configuración</h3>
        <ReadState status={house.status} onRetry={house.refetch} busy={house.isFetching} />
      </div>
    );
  }
  const data = house.house;
  return (
    <>
      <div className="house-config">
        <h3>Configuración</h3>
        <ReadState status={house.status} onRetry={house.refetch} busy={house.isFetching} />
        <p>{`Comisión: ${bps(data.feeRate)}`}</p>
        <p>{`Apuesta mínima: ${sui(data.minBet)}`}</p>
        <p>{`Apuesta máxima: ${sui(data.maxBet)}`}</p>
        <p>{`Comisiones acumuladas: ${sui(data.feesCollected)}`}</p>
        <p>{`Versión de la House: ${String(data.version)}`}</p>
        <button type="button" onClick={refresh} disabled={house.isFetching}>
          Actualizar
        </button>
      </div>
      {target.notice?.kind === 'in_flight' && <p role="status">{IN_FLIGHT_TEXT}</p>}
      <FeeBlock house={data} capId={capId} busy={busy} tx={fee} adopted={adopted} />
      <LimitsBlock house={data} capId={capId} busy={busy} tx={limits} adopted={adopted} />
      <WithdrawBlock house={data} capId={capId} busy={busy} tx={withdraw} adopted={adopted} />
      {target.unconfirmed !== null && (
        <>
          <TransactionStatus stage="done" outcome={{ kind: 'unconfirmed', digest: target.unconfirmed.digest }} network={network} successText="" />
          <button type="button" onClick={target.acknowledge}>
            Ya la revisé
          </button>
        </>
      )}
    </>
  );
}
