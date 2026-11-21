import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCreateGame } from '../hooks/useCreateGame';
import { useGameCatalog } from '../hooks/useGameCatalog';
import { useHouse } from '../hooks/useHouse';
import { useSuiBalance } from '../hooks/useSuiBalance';
import { useTxTarget } from '../hooks/useTxTarget';
import { useWalletAccount } from '../hooks/useWalletAccount';
import {
  CREATE_GAS_RESERVE_MIST,
  storageDepositFor,
  validateCreateGame,
  type CreateAmountError,
  type CreateOpponentError,
  type CreateSourceKind,
  type HouseTerms,
} from '../sui/createGame';
import { formatBps, formatMist } from '../sui/format';
import { resolutionAmounts } from '../sui/game';
import { timeControlById, type GameDef, type GameKey } from '../sui/gameRegistry';
import type { House } from '../sui/house';
import { createdNoticeState } from './createdNotice';
import { ReadState } from './ReadState';
import { TransactionStatus } from './TransactionStatus';
import { IN_FLIGHT_TEXT } from './txNotice';

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

/**
 * Nota de costo de crear (DL-13): el depósito de almacenamiento de la **fuente a la que va "crear"** (`GameDef.createSource`;
 * el selector puro `storageDepositFor` decide la cifra: el componente no ramifica por fuente, ARQ-1). Con la fuente anterior
 * es el texto de siempre.
 */
function storageNote(createSource: CreateSourceKind): string {
  const deposit = storageDepositFor(createSource);
  return (
    `Además del gas, crear la partida deja un depósito de almacenamiento (≈ ${sui(deposit.open)} abierta, ` +
    `≈ ${sui(deposit.invitation)} con invitación, al precio actual de testnet) que no se recupera. ` +
    `El saldo tiene que cubrir la apuesta más ≈ ${sui(CREATE_GAS_RESERVE_MIST)} de reserva para el gas.`
  );
}

/** Por qué no se puede crear una partida de un juego con reloj desde la app todavía (UX-9). */
const CLOCK_GAME_NOT_CREATABLE_TEXT = 'Este juego todavía no se puede crear desde la app';

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
  const catalog = useGameCatalog();
  const target = useTxTarget({ kind: 'create' });
  const [amountText, setAmountText] = useState('');
  const [opponentText, setOpponentText] = useState('');
  const [touched, setTouched] = useState(false);
  // #73 (TASK-8b): el juego a crear (el selector solo existe con más de uno creable) y su control de tiempo (solo un juego
  // con reloj ofrece los 7; el coinflip crea con el control 0 y no muestra ninguna opción).
  const [gameKey, setGameKey] = useState<GameKey | null>(null);
  const [controlId, setControlId] = useState<number | null>(null);
  const def: GameDef | undefined = catalog.creatable.find((game) => game.key === gameKey) ?? catalog.creatable[0];
  const tx = useCreateGame(target.view, def?.key);
  const controls = def?.usesClock === true ? def.controlIds.flatMap((id) => timeControlById(id) ?? []) : [];
  const defaultControl = controls[0];
  const selectedControl = controlId ?? defaultControl?.id ?? null;
  // Un juego con reloj necesita su propio constructor de la creación (lo agrega el juego que lo use, #18): hasta entonces no
  // se ofrece crearlo, en vez de ofrecer un control de tiempo que no viaja a la transacción.
  const clockBlocked = def?.usesClock === true;

  const shown: HouseTerms = { feeRate: house.feeRate, minBet: house.minBet, maxBet: house.maxBet };
  const validation = validateCreateGame({ amountText, opponentText, house: shown, balance: balance.balance, account });
  const amountError = !validation.ok && touched ? validation.errors.amount : undefined;
  const opponentError = !validation.ok && opponentText.trim() !== '' ? validation.errors.opponent : undefined;
  const estimate = validation.ok ? resolutionAmounts(validation.bet, house.feeRate) : null;

  // Un crear ajeno adoptado (M-2 (b)) se trata igual que el propio; solo existe si es más nuevo que el propio.
  const adopted = target.notice?.kind === 'adopted' && target.notice.adopted.action === 'create' ? target.notice.adopted.outcome : null;
  const outcome = adopted ?? tx.outcome;
  // Sin confirmar (M-3 (b) de #11): la transacción pudo ejecutarse; no se ofrece crear otra hasta que el usuario lo
  // decida. También bloquea una transacción de la cuenta en curso (DL-7 de #12).
  const blocked = target.busy || target.unconfirmed !== null;
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
        if (validation.ok && !blocked) tx.create({ bet: validation.bet, opponent: validation.opponent, shown });
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
      {catalog.creatable.length > 1 && (
        <label>
          Juego{' '}
          <select
            className="duel-select"
            value={def?.key ?? ''}
            onChange={(event) => {
              setGameKey(catalog.creatable.find((game) => game.key === event.target.value)?.key ?? null);
            }}
          >
            {catalog.creatable.map((game) => (
              <option key={game.key} value={game.key}>
                {game.label}
              </option>
            ))}
          </select>
        </label>
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
      {controls.length > 0 && (
        <fieldset className="duel-controls">
          <legend>Tiempo por jugada</legend>
          {controls.map((control) => (
            <label key={control.id} className="duel-radio">
              <input
                type="radio"
                name="time-control"
                value={control.id}
                checked={selectedControl === control.id}
                onChange={() => {
                  setControlId(control.id);
                }}
              />{' '}
              {control.label}
            </label>
          ))}
          <p className="hint">
            Por defecto: {defaultControl?.label}. Quien no mueve antes de que venza su plazo pierde: su rival puede reclamar la
            partida.
          </p>
        </fieldset>
      )}
      {estimate !== null && (
        <p className="game-estimate">
          Si alguien acepta: pozo {sui(estimate.pot)} · comisión {sui(estimate.fee)} · al ganador {sui(estimate.payout)}
        </p>
      )}
      <p className="hint">{storageNote(def?.createSource ?? 'legacy')}</p>
      <button
        type="submit"
        disabled={!validation.ok || blocked || clockBlocked}
        aria-describedby={clockBlocked ? 'create-blocked-reason' : undefined}
      >
        Crear partida
      </button>
      {clockBlocked && (
        <p id="create-blocked-reason" className="duel-reason">
          {CLOCK_GAME_NOT_CREATABLE_TEXT}
        </p>
      )}
      {target.notice?.kind === 'in_flight' && <p role="status">{IN_FLIGHT_TEXT}</p>}
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
      {target.unconfirmed !== null && (
        <>
          <TransactionStatus stage="done" outcome={{ kind: 'unconfirmed', digest: target.unconfirmed.digest }} network={network} successText="" />
          <button type="button" onClick={target.acknowledge}>
            Ya la revisé: crear otra partida
          </button>
        </>
      )}
    </form>
  );
}

/**
 * Formulario de creación en la portada (DL-8, DL-13, M-2). Sin cuenta, deshabilitado. Con cuenta, muestra límites y
 * comisión de la House, saldo, estimación del reparto y la nota de costo; valida con `validateCreateGame` y crea con
 * `useCreateGame`, pasando los términos que se están mostrando. Con la partida identificada navega al detalle con el
 * aviso en el `state` del router (DL-14); sin identificarla, se queda con "Partida creada" y el digest (DL-9). TASK-8b: la
 * nota de costo usa el depósito de la fuente a la que va "crear"; el selector de juego aparece solo con más de uno creable;
 * un juego con reloj ofrece sus controles de tiempo (`fieldset` con `legend` y radios) y el coinflip no muestra ninguno.
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
