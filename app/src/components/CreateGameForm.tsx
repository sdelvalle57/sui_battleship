import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCreateGame } from '../hooks/useCreateGame';
import { useHouse } from '../hooks/useHouse';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useWalletAccount } from '../hooks/useWalletAccount';
import {
  CREATE_GAS_RESERVE_MIST,
  GAME_STORAGE_DEPOSIT_MIST,
  validateCreateGame,
  type CreateAmountError,
  type CreateOpponentError,
  type HouseTerms,
} from '../sui/createGame';
import { formatBps, formatMist } from '../sui/format';
import { resolutionAmounts } from '../sui/game';
import type { House } from '../sui/house';
import { createdNoticeState } from './createdNotice';
import { ReadState } from './ReadState';
import { TransactionStatus } from './TransactionStatus';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;

function amountErrorText(reason: CreateAmountError, house: HouseTerms): string {
  switch (reason) {
    case 'empty':
      return 'Escribe la apuesta en SUI';
    case 'invalid':
      return 'Monto inválido: solo números y punto decimal, sin espacios ni separador de miles';
    case 'too_many_decimals':
      return 'Como máximo 9 decimales';
    case 'below_min':
      return `La apuesta mínima es ${sui(house.minBet)}`;
    case 'above_max':
      return `La apuesta máxima es ${sui(house.maxBet)}`;
    case 'insufficient_balance':
      return `Saldo insuficiente: necesitas la apuesta más ≈ ${sui(CREATE_GAS_RESERVE_MIST)} para el gas`;
  }
}

function opponentErrorText(reason: CreateOpponentError): string {
  return reason === 'invalid' ? 'Dirección inválida' : 'No puedes invitarte a ti mismo';
}

const STORAGE_NOTE =
  `Además del gas, crear la partida deja un depósito de almacenamiento (≈ ${sui(GAME_STORAGE_DEPOSIT_MIST.open)} abierta, ` +
  `≈ ${sui(GAME_STORAGE_DEPOSIT_MIST.invitation)} con invitación, al precio actual de testnet) que no se recupera. ` +
  `El saldo tiene que cubrir la apuesta más ≈ ${sui(CREATE_GAS_RESERVE_MIST)} de reserva para el gas.`;

/** Campos sin cuenta: visibles pero deshabilitados, con el motivo (DL-8). */
function DisconnectedForm() {
  return (
    <form className="create-game" aria-label="Crear partida">
      <h3>Crear partida</h3>
      <p role="status">Conecta tu wallet para crear una partida</p>
      <fieldset disabled>
        <label>
          Apuesta (SUI) <input inputMode="decimal" />
        </label>
        <label>
          Invitar a (opcional) <input />
        </label>
        <button type="submit">Crear partida</button>
      </fieldset>
    </form>
  );
}

function ConnectedForm({ account, house }: { account: string; house: House }) {
  const { network } = useAppConfig();
  const balance = useSuiBalance();
  const tx = useCreateGame();
  const [amountText, setAmountText] = useState('');
  const [opponentText, setOpponentText] = useState('');
  const [touched, setTouched] = useState(false);

  const shown: HouseTerms = { feeRate: house.feeRate, minBet: house.minBet, maxBet: house.maxBet };
  const validation = validateCreateGame({ amountText, opponentText, house: shown, balance: balance.balance, account });
  const amountError = !validation.ok && touched ? validation.errors.amount : undefined;
  const opponentError = !validation.ok && opponentText.trim() !== '' ? validation.errors.opponent : undefined;
  const estimate = validation.ok ? resolutionAmounts(validation.bet, house.feeRate) : null;

  const outcome = tx.outcome;
  // Sin confirmar (M-3 (b)): la transacción pudo ejecutarse; no se ofrece crear otra hasta que el usuario lo decida.
  const pendingReview = outcome?.kind === 'unconfirmed';
  if (outcome?.kind === 'success' && outcome.value?.created) {
    const state = createdNoticeState({
      digest: outcome.digest,
      cost: outcome.cost,
      invitation: outcome.value.created.opponent !== null,
      feeChanged: outcome.value.feeChanged,
    });
    return <Navigate to={`/game/${outcome.value.created.gameId}`} state={state} />;
  }

  return (
    <form
      className="create-game"
      aria-label="Crear partida"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (validation.ok && !tx.isBusy && !pendingReview) tx.create({ bet: validation.bet, opponent: validation.opponent, shown });
      }}
    >
      <h3>Crear partida</h3>
      <p>
        Mínimo {sui(house.minBet)} · máximo {sui(house.maxBet)}
      </p>
      <p>Comisión {formatBps(house.feeRate)} (la partida guarda esta comisión)</p>
      {balance.balance !== null ? (
        <p>Saldo: {sui(balance.balance)}</p>
      ) : balance.status.kind === 'error' ? (
        <p role="alert">No se pudo leer tu saldo: no se verificó si alcanza (la wallet lo hará al firmar)</p>
      ) : (
        <p>Saldo: leyendo…</p>
      )}
      <label>
        Apuesta (SUI){' '}
        <input
          inputMode="decimal"
          value={amountText}
          aria-invalid={amountError !== undefined}
          onChange={(event) => {
            setAmountText(event.target.value);
            setTouched(true);
          }}
        />
      </label>
      {amountError !== undefined && <p className="field-error">{amountErrorText(amountError, shown)}</p>}
      <label>
        Invitar a (opcional){' '}
        <input
          value={opponentText}
          aria-invalid={opponentError !== undefined}
          onChange={(event) => {
            setOpponentText(event.target.value);
          }}
        />
      </label>
      {opponentError !== undefined && <p className="field-error">{opponentErrorText(opponentError)}</p>}
      {estimate !== null && (
        <p className="game-estimate">
          Si alguien acepta: pozo {sui(estimate.pot)} · comisión {sui(estimate.fee)} · al ganador {sui(estimate.payout)}
        </p>
      )}
      <p className="hint">{STORAGE_NOTE}</p>
      <button type="submit" disabled={!validation.ok || tx.isBusy || pendingReview}>
        Crear partida
      </button>
      <TransactionStatus
        stage={tx.stage}
        outcome={outcome}
        network={network}
        successText="Partida creada"
      >
        <p>No se pudo identificar la partida creada: búscala con el digest en tu wallet o en el explorador</p>
        {outcome?.kind === 'success' && outcome.value?.feeChanged && (
          <p>
            La partida se creó con comisión {formatBps(outcome.value.feeChanged.to)} (el formulario mostraba{' '}
            {formatBps(outcome.value.feeChanged.from)})
          </p>
        )}
      </TransactionStatus>
      {pendingReview && (
        <button type="button" onClick={tx.reset}>
          Ya la revisé: crear otra partida
        </button>
      )}
    </form>
  );
}

/**
 * Formulario de creación en la portada (DL-8, DL-13, M-2). Sin cuenta, deshabilitado. Con cuenta, muestra límites y
 * comisión de la House, saldo, estimación del reparto y la nota de costo; valida con `validateCreateGame` y crea con
 * `useCreateGame`, pasando los términos que se están mostrando. Con la partida identificada navega al detalle con el
 * aviso en el `state` del router (DL-14); sin identificarla, se queda con "Partida creada" y el digest (DL-9).
 */
export function CreateGameForm() {
  const { address } = useWalletAccount();
  if (address === null) return <DisconnectedForm />;
  return <HouseGate account={address} />;
}

function HouseGate({ account }: { account: string }) {
  const house = useHouse();
  if (house.house === null) {
    return (
      <section className="create-game" aria-label="Crear partida">
        <h3>Crear partida</h3>
        <ReadState status={house.status} onRetry={house.refetch} busy={house.isFetching} />
      </section>
    );
  }
  return <ConnectedForm account={account} house={house.house} />;
}
