import { Link } from 'react-router';
import { useAppConfig } from '../hooks/useAppConfig';
import { useCheckpointTime } from '../hooks/useCheckpointTime';
import { useLobby, type LobbyRow } from '../hooks/useLobby';
import { useTransactionTime } from '../hooks/useTransactionTime';
import { formatBps, formatMist, formatTimestamp, shortAddress } from '../sui/format';
import { readErrorMessage } from '../sui/readErrors';
import { ReadState } from './ReadState';

/** Hora de creación de una fila: la de su transacción, o "—" mientras carga, si falla o si no hay digest. */
function CreatedAt({ txDigest }: { txDigest: string }) {
  const { timestampMs } = useTransactionTime(txDigest);
  return <span className="lobby-time">{timestampMs === null ? '—' : formatTimestamp(timestampMs)}</span>;
}

/** " (desde <fecha>)" del piso de historial del nodo; sin fecha si la hora no llega (nunca "cargando"). */
function FloorSince({ checkpoint }: { checkpoint: bigint }) {
  const { timestampMs } = useCheckpointTime(checkpoint);
  return timestampMs === null ? null : <> (desde {formatTimestamp(timestampMs)})</>;
}

function LobbyRowView({ row }: { row: LobbyRow }) {
  if (row.kind === 'unreadable') {
    return (
      <li className="lobby-row unreadable">
        Partida ilegible
        {row.gameId !== null && (
          <>
            {' '}
            <Link to={`/game/${row.gameId}`} title={row.gameId}>
              {shortAddress(row.gameId)}
            </Link>
          </>
        )}
      </li>
    );
  }
  const { game } = row;
  return (
    <li className="lobby-row">
      <span className="lobby-bet">{formatMist(game.bet)} SUI</span> · comisión {formatBps(game.feeRate)} · creada por{' '}
      <span title={game.creator}>{shortAddress(game.creator)}</span>
      {row.isMine && <strong className="lobby-mine"> (tuya)</strong>} · <CreatedAt txDigest={row.createdTxDigest} /> ·{' '}
      <Link to={`/game/${game.id}`}>Ver partida</Link>
    </li>
  );
}

/**
 * Lobby de partidas abiertas, las más recientes primero (DL-2, DL-3). Nunca dice "No hay partidas abiertas" mientras
 * quede historial por revisar; con la cota en el piso del nodo lo aclara (P-1 (a), D-20261102-04). Un cursor que no
 * avanza (M-2) muestra el error y solo deja "Actualizar".
 */
export function LobbyList() {
  const { network } = useAppConfig();
  const lobby = useLobby();
  const { items, status, hasNextPage, isFetchingNextPage, nextPageError, stalled, lowerBound, end } = lobby;
  const floorBased = lowerBound?.kind === 'node_floor' || end === 'history_pruned';

  return (
    <section className="lobby" aria-label="Partidas abiertas">
      <h3>Partidas abiertas</h3>
      <button type="button" onClick={lobby.refresh} disabled={lobby.isFetching}>
        Actualizar
      </button>
      {status.kind !== 'ready' ? (
        <ReadState status={status} onRetry={lobby.refresh} busy={lobby.isFetching} />
      ) : (
        <>
          {items.length > 0 && (
            <ul className="lobby-rows">
              {items.map((row) => (
                <LobbyRowView key={row.kind === 'game' ? row.game.id : `${row.txDigest}:${row.gameId ?? ''}`} row={row} />
              ))}
            </ul>
          )}
          {items.length === 0 && !hasNextPage && !stalled && nextPageError === null && (
            <p>
              {floorBased && lowerBound !== null ? (
                <>
                  No hay partidas abiertas en el historial disponible del nodo
                  <FloorSince checkpoint={lowerBound.checkpoint} />
                </>
              ) : (
                'No hay partidas abiertas'
              )}
            </p>
          )}
          {items.length === 0 && hasNextPage && <p>Sin partidas abiertas en lo revisado</p>}
          {items.length > 0 && floorBased && lowerBound !== null && (
            <p className="lobby-note">
              Solo se muestra el historial disponible del nodo
              <FloorSince checkpoint={lowerBound.checkpoint} />
            </p>
          )}
          {nextPageError !== null && (
            <p role="alert" className="read-error">
              {readErrorMessage(nextPageError, network)}
            </p>
          )}
          {isFetchingNextPage && <p role="status">Cargando más…</p>}
          {hasNextPage && !stalled && (
            <button type="button" onClick={lobby.loadMore} disabled={isFetchingNextPage}>
              {items.length === 0 ? 'Buscar más atrás' : 'Cargar más'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
