import { Link } from 'react-router';
import type { ListedRow } from '../hooks/gameRow';
import { useAppConfig } from '../hooks/useAppConfig';
import { useLobby } from '../hooks/useLobby';
import { formatBps, formatMist, shortAddress } from '../sui/format';
import { readErrorMessage } from '../sui/readErrors';
import { CreatedAt, FloorSince } from './HistoryTime';
import { ReadState } from './ReadState';

/** Una fila del lobby, con el mismo marcado para una partida de la fuente anterior y de la nueva (modelo neutral, TASK-8a). */
function LobbyRowView({ item }: { item: ListedRow }) {
  if (item.kind === 'unreadable') {
    return (
      <li className="lobby-row unreadable">
        Partida ilegible
        {item.gameId !== null && (
          <>
            {' '}
            <Link to={`/game/${item.gameId}`} title={item.gameId}>
              {shortAddress(item.gameId)}
            </Link>
          </>
        )}
      </li>
    );
  }
  const { row } = item;
  return (
    <li className="lobby-row">
      <span className="lobby-bet">{formatMist(row.bet)} SUI</span> · comisión {formatBps(row.feeRate)} · creada por{' '}
      <span title={row.creator}>{shortAddress(row.creator)}</span>
      {item.role === 'creator' && <strong className="lobby-mine"> (tuya)</strong>} · <CreatedAt txDigest={item.txDigest} /> ·{' '}
      <Link to={`/game/${row.id}`}>Ver partida</Link>
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
              {items.map((item, index) => (
                <LobbyRowView
                  // Dos ilegibles de la misma transacción sin ID (un PTB con varios `GameCreated`) no deben compartir key.
                  key={item.kind === 'game' ? item.row.id : `${item.txDigest}:${item.gameId ?? `i${String(index)}`}`}
                  item={item}
                />
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
