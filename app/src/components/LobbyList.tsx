import { useState } from 'react';
import { Link } from 'react-router';
import type { ListedRow } from '../hooks/gameRow';
import { useAppConfig } from '../hooks/useAppConfig';
import { useGameCatalog, type GameCatalog } from '../hooks/useGameCatalog';
import { useLobby } from '../hooks/useLobby';
import { formatBps, formatMist, shortAddress } from '../sui/format';
import type { GameSelection } from '../sui/gameRegistry';
import { readErrorMessage } from '../sui/readErrors';
import { controlText, SOURCE_TEXT } from './gameTexts';
import { CreatedAt, FloorSince } from './HistoryTime';
import { ReadState } from './ReadState';

/**
 * Una fila del lobby, con el mismo marcado para una partida de la fuente anterior y de la nueva (modelo neutral, TASK-8a).
 * Con las dos fuentes en el registro (`multi`, TASK-8b) suma, como **texto**, el rótulo "anterior"/"nueva" y el control de
 * tiempo ("10 min por jugada", "sin reloj"); con una sola fuente, la fila es la de siempre.
 */
function LobbyRowView({ item, multi }: { item: ListedRow; multi: boolean }) {
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
      {item.role === 'creator' && <strong className="lobby-mine"> (tuya)</strong>} ·{' '}
      {multi && (
        <>
          <span className="duel-source">{SOURCE_TEXT[row.source]}</span> · <span className="duel-control">{controlText(row)}</span> ·{' '}
        </>
      )}
      <CreatedAt txDigest={item.txDigest} /> · <Link to={`/game/${row.id}`}>Ver partida</Link>
    </li>
  );
}

/** El valor del `<select>` como selección de juegos: un juego del registro o "Todos" (nunca un valor ajeno). */
function selectionOf(catalog: GameCatalog, value: string): GameSelection {
  return catalog.games.find((game) => game.key === value)?.key ?? 'all';
}

/** El nombre de un juego del registro. La clave se recibe como `string`: con un solo juego, `GameKey` es un literal único. */
function gameLabel(catalog: GameCatalog, key: string): string {
  return catalog.games.find((game) => game.key === key)?.label ?? key;
}

/** "3 partidas" (con más páginas por cargar, "3 partidas; puede haber más"): la cantidad de lo que se ve, siempre como texto. */
function countText(count: number, hasMore: boolean): string {
  const base = `${String(count)} ${count === 1 ? 'partida' : 'partidas'}`;
  return hasMore ? `${base}; puede haber más` : base;
}

/**
 * Filtro por juego del lobby (UX-14, D9): un `<select>` con su `<label>`, "Todos" por defecto, y la cantidad visible. Solo
 * existe con las dos fuentes en el registro (tras el upgrade).
 */
function GameFilter({
  catalog,
  selection,
  onChange,
  count,
  hasMore,
}: {
  catalog: GameCatalog;
  selection: GameSelection;
  onChange: (selection: GameSelection) => void;
  count: number | null;
  hasMore: boolean;
}) {
  return (
    <div className="duel-filter">
      <label>
        Juego{' '}
        <select
          className="duel-select"
          value={selection}
          onChange={(event) => {
            onChange(selectionOf(catalog, event.target.value));
          }}
        >
          <option value="all">Todos</option>
          {catalog.games.map((game) => (
            <option key={game.key} value={game.key}>
              {game.label}
            </option>
          ))}
        </select>
      </label>
      {count !== null && <p className="duel-count">{countText(count, hasMore)}</p>}
    </div>
  );
}

/**
 * Lobby de partidas abiertas, las más recientes primero (DL-2, DL-3). Nunca dice "No hay partidas abiertas" mientras
 * quede historial por revisar; con la cota en el piso del nodo lo aclara (P-1 (a), D-20261102-04). Un cursor que no
 * avanza (M-2) muestra el error y solo deja "Actualizar". TASK-8b: con las dos fuentes en el registro, filtro por juego
 * ("Todos" por defecto, con la cantidad), rótulo "anterior"/"nueva" y control de tiempo por fila; el vacío de un juego
 * elegido dice "No hay partidas abiertas de `<juego>`".
 */
export function LobbyList() {
  const { network } = useAppConfig();
  const catalog = useGameCatalog();
  const [selection, setSelection] = useState<GameSelection>('all');
  const lobby = useLobby(selection);
  const { items, status, hasNextPage, isFetchingNextPage, nextPageError, stalled, lowerBound, end } = lobby;
  const floorBased = lowerBound?.kind === 'node_floor' || end === 'history_pruned';
  // "No hay partidas abiertas de Coinflip": el vacío de un juego elegido se distingue del vacío global (UX-7).
  const scope = selection === 'all' ? '' : ` de ${gameLabel(catalog, selection)}`;
  const readable = items.filter((item) => item.kind === 'game').length;

  return (
    <section className="lobby" aria-label="Partidas abiertas">
      <h3>Partidas abiertas</h3>
      <button type="button" onClick={lobby.refresh} disabled={lobby.isFetching}>
        Actualizar
      </button>
      {catalog.multiSource && <GameFilter catalog={catalog} selection={selection} onChange={setSelection} count={status.kind === 'ready' ? readable : null} hasMore={hasNextPage} />}
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
                  multi={catalog.multiSource}
                />
              ))}
            </ul>
          )}
          {items.length === 0 && !hasNextPage && !stalled && nextPageError === null && (
            <p>
              {floorBased && lowerBound !== null ? (
                <>
                  No hay partidas abiertas{scope} en el historial disponible del nodo
                  <FloorSince checkpoint={lowerBound.checkpoint} />
                </>
              ) : (
                `No hay partidas abiertas${scope}`
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
