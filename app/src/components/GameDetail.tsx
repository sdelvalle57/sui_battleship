import { resolutionAmounts, type Game } from '../sui/game';
import { explorerObjectUrl } from '../sui/explorer';
import { formatBps, formatMist, formatTimestamp, shortAddress } from '../sui/format';
import type { Network } from '../sui/networks';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;

function Address({ value }: { value: string }) {
  return <span title={value}>{shortAddress(value)}</span>;
}

function stateLabel(game: Game) {
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
  }
}

/**
 * Detalle de una partida (presentacional). En `Pending` muestra la estimación del reparto y, en `Resolved`, los montos
 * cobrados, ambos con la fórmula de la v1 (`resolutionAmounts`). "Última actividad" es la hora de la última transacción
 * que tocó el objeto, que puede ser una fallida (sonda P6 de #10): nunca se presenta como la que la resolvió.
 */
export function GameDetail({ game, lastActivityMs, network }: { game: Game; lastActivityMs: number | null; network: Network }) {
  const { pot, fee, payout } = resolutionAmounts(game.bet, game.feeRate);
  const explorerUrl = explorerObjectUrl(network, game.id);
  return (
    <article className="game-detail">
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
        {game.state.kind === 'resolved' && (
          <>
            <dt>Aceptante</dt>
            <dd>
              <Address value={game.state.acceptor} />
            </dd>
            <dt>Ganador</dt>
            <dd>
              <Address value={game.state.winner} />
            </dd>
            <dt>Pozo</dt>
            <dd>{sui(pot)}</dd>
            <dt>Comisión cobrada</dt>
            <dd>{sui(fee)}</dd>
            <dt>Pago al ganador</dt>
            <dd>
              {sui(payout)} <small>(según la fórmula del contrato)</small>
            </dd>
          </>
        )}
        <dt>Última actividad</dt>
        <dd>{lastActivityMs === null ? '—' : formatTimestamp(lastActivityMs)}</dd>
      </dl>
      {game.state.kind === 'pending' && (
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
