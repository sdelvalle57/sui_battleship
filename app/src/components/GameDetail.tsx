import { acceptorOf, rowPlayerResult, type GameRow } from '../hooks/gameRow';
import { resolutionAmounts } from '../sui/game';
import { explorerObjectUrl } from '../sui/explorer';
import { formatBps, formatMist, formatTimestamp, shortAddress } from '../sui/format';
import { sameAddress } from '../sui/ids';
import type { Network } from '../sui/networks';
import { controlText, STATE_TEXT, viewerOf } from './gameTexts';
import { GameStatus } from './GameStatus';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;

function Address({ value }: { value: string }) {
  return <span title={value}>{shortAddress(value)}</span>;
}

function stateLabel(game: GameRow) {
  switch (game.state.kind) {
    case 'pending':
      return game.opponent === null ? (
        'Abierta'
      ) : (
        <>
          Invitación a <Address value={game.opponent} />
        </>
      );
    case 'cancelled':
      return 'Cancelada';
    case 'resolved':
      return 'Resuelta';
    case 'active':
      return STATE_TEXT.active;
    case 'timed_out':
      return STATE_TEXT.timedOut;
    case 'expired':
      return STATE_TEXT.expired;
  }
}

/** Resultado de una partida ganada por tiempo para la cuenta (de la variante del objeto): ganó, perdió o es un tercero. */
function timedOutResult(game: GameRow, winner: string, account: string | null): 'won' | 'lost' | null {
  if (account === null) return null;
  if (sameAddress(account, winner)) return 'won';
  const viewer = viewerOf(game, account);
  return viewer === 'creator' || viewer === 'acceptor' ? 'lost' : null;
}

/**
 * Detalle de una partida (presentacional), de cualquiera de las dos fuentes (fila neutral, #73 TASK-8a). En `Pending`
 * muestra la estimación del reparto y, en `Resolved`, los montos cobrados, ambos con la fórmula de la v1
 * (`resolutionAmounts`, la misma de la fuente nueva). "Última actividad" es la hora de la última transacción que tocó el
 * objeto, que puede ser una fallida (sonda P6 de #10): nunca se presenta como la que la resolvió. Con la partida resuelta y
 * la cuenta conectada como creador o aceptante, "Resultado para ti" (DL-12 de #12), leído del objeto.
 *
 * TASK-8b: una partida de la **fuente nueva** suma el resumen de `GameStatus` (estado, turno, plazo con su cuenta regresiva
 * y qué sigue para esta cuenta, UX-1), el control de tiempo y el detalle de cada estado terminal, distinguidos por la
 * variante del **objeto**: `Resolved`, `TimedOut` ("Ganó por tiempo": el pozo menos la comisión al rival del que no movió)
 * y `Expired` ("Nadie movió a tiempo": cada jugador recupera su apuesta, sin comisión). Una partida de la fuente anterior
 * se dibuja como siempre.
 */
export function GameDetail({
  game,
  lastActivityMs,
  network,
  account,
}: {
  game: GameRow;
  lastActivityMs: number | null;
  network: Network;
  account: string | null;
}) {
  const { pot, fee, payout } = resolutionAmounts(game.bet, game.feeRate);
  const result = rowPlayerResult(game, account);
  const explorerUrl = explorerObjectUrl(network, game.id);
  const { state } = game;
  const acceptor = acceptorOf(state);
  const timedOut = state.kind === 'timed_out' ? timedOutResult(game, state.winner, account) : null;
  const viewer = viewerOf(game, account);
  const isPlayer = viewer === 'creator' || viewer === 'acceptor';
  return (
    <article className="game-detail">
      {game.source === 'duel' && <GameStatus game={game} account={account} />}
      <dl>
        <dt>Estado</dt>
        <dd>{stateLabel(game)}</dd>
        <dt>Creador</dt>
        <dd>
          <Address value={game.creator} />
        </dd>
        <dt>Oponente</dt>
        <dd>{game.opponent === null ? 'abierta' : <Address value={game.opponent} />}</dd>
        <dt>Apuesta</dt>
        <dd>{sui(game.bet)}</dd>
        <dt>Comisión</dt>
        <dd>{formatBps(game.feeRate)}</dd>
        {game.source === 'duel' && (
          <>
            <dt>Reloj</dt>
            <dd>{controlText(game)}</dd>
          </>
        )}
        {state.kind === 'resolved' && (
          <>
            <dt>Aceptante</dt>
            <dd>
              <Address value={state.acceptor} />
            </dd>
            <dt>Ganador</dt>
            <dd>
              <Address value={state.winner} />
            </dd>
            <dt>Pozo</dt>
            <dd>{sui(pot)}</dd>
            <dt>Comisión cobrada</dt>
            <dd>{sui(fee)}</dd>
            <dt>Pago al ganador</dt>
            <dd>
              {sui(payout)} <small>(según la fórmula del contrato)</small>
            </dd>
            {result !== null && (
              <>
                <dt>Resultado para ti</dt>
                <dd>{result === 'won' ? 'ganaste' : 'perdiste'}</dd>
              </>
            )}
          </>
        )}
        {state.kind === 'timed_out' && (
          <>
            <dt>Aceptante</dt>
            <dd>
              <Address value={state.acceptor} />
            </dd>
            <dt>Ganador</dt>
            <dd>
              <Address value={state.winner} />
            </dd>
            <dt>Pozo</dt>
            <dd>{sui(pot)}</dd>
            <dt>Comisión cobrada</dt>
            <dd>{sui(fee)}</dd>
            <dt>Pago al ganador</dt>
            <dd>
              {sui(payout)} <small>(según la fórmula del contrato)</small>
            </dd>
            {timedOut !== null && (
              <>
                <dt>Resultado para ti</dt>
                <dd>{timedOut === 'won' ? 'ganaste por tiempo' : 'perdiste por tiempo'}</dd>
              </>
            )}
          </>
        )}
        {state.kind === 'expired' && (
          <>
            <dt>Aceptante</dt>
            <dd>
              <Address value={state.acceptor} />
            </dd>
            <dt>Devuelto a cada jugador</dt>
            <dd>
              {sui(game.bet)} <small>(sin comisión)</small>
            </dd>
            {isPlayer && (
              <>
                <dt>Resultado para ti</dt>
                <dd>recuperaste tu apuesta</dd>
              </>
            )}
          </>
        )}
        {state.kind === 'active' && acceptor !== null && (
          <>
            <dt>Aceptante</dt>
            <dd>
              <Address value={acceptor} />
            </dd>
          </>
        )}
        <dt>Última actividad</dt>
        <dd>{lastActivityMs === null ? '—' : formatTimestamp(lastActivityMs)}</dd>
      </dl>
      {state.kind === 'pending' && (
        <p className="game-estimate">
          Pozo {sui(pot)} · comisión {sui(fee)} · al ganador {sui(payout)}
        </p>
      )}
      {explorerUrl !== null && (
        <p>
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            Ver en el explorador
          </a>
        </p>
      )}
    </article>
  );
}
