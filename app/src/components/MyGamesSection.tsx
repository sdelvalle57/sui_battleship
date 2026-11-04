import { Link } from 'react-router';
import { useAppConfig } from '../hooks/useAppConfig';
import type { MyGamesSource } from '../hooks/useMyGames';
import { playerResult } from '../sui/acceptGame';
import { formatMist, shortAddress } from '../sui/format';
import { resolutionAmounts, type Game } from '../sui/game';
import { sameAddress } from '../sui/ids';
import { sectionFooter, type MyGameItem, type MyGamesSection as SectionKey } from '../sui/myGames';
import { readErrorMessage } from '../sui/readErrors';
import { GameActions } from './GameActions';
import { CreatedAt, FloorSince } from './HistoryTime';
import { ReadState } from './ReadState';

const sui = (mist: bigint) => `${formatMist(mist)} SUI`;

/** Textos fijos de cada sección (§1 del handoff de #13: los usan los tests y el smoke). */
const TEXTS: Record<SectionKey, { title: string; definitive: string; reviewed: string }> = {
  invitations: {
    title: 'Invitaciones recibidas',
    definitive: 'No tienes invitaciones pendientes',
    reviewed: 'Sin invitaciones pendientes en lo revisado',
  },
  pending: { title: 'Tus partidas pendientes', definitive: 'No tienes partidas pendientes', reviewed: 'Sin partidas pendientes en lo revisado' },
  finished: {
    title: 'Terminadas',
    definitive: 'Todavía no hay partidas terminadas',
    reviewed: 'Sin partidas terminadas en lo revisado',
  },
};

function Short({ address }: { address: string }) {
  return <span title={address}>{shortAddress(address)}</span>;
}

/** Contraparte de la fila según quién es la cuenta en la partida (leído del objeto). */
function Counterpart({ game, address }: { game: Game; address: string }) {
  if (!sameAddress(game.creator, address)) {
    if (game.state.kind === 'resolved' && sameAddress(game.state.acceptor, address)) {
      return (
        <>
          Aceptaste la de <Short address={game.creator} />
        </>
      );
    }
    return (
      <>
        Te invitó <Short address={game.creator} />
      </>
    );
  }
  if (game.opponent === null) return <>Abierta</>;
  return (
    <>
      Invitación a <Short address={game.opponent} />
    </>
  );
}

function stateLabel(game: Game): string {
  switch (game.state.kind) {
    case 'pending':
      return 'Pendiente';
    case 'cancelled':
      return 'Cancelada';
    case 'resolved':
      return 'Resuelta';
  }
}

/** Resultado de "Terminadas" leído del objeto (DL-14): ganaste o perdiste, con el pozo y el pago de la fórmula v1. */
function FinishedResult({ game, address }: { game: Game; address: string }) {
  if (game.state.kind === 'cancelled') return <p className="my-game-result">Cancelada: la apuesta volvió a quien la creó</p>;
  const result = playerResult(game, address);
  if (result === null) return null;
  const { pot, payout } = resolutionAmounts(game.bet, game.feeRate);
  return (
    <p className="my-game-result">
      {result === 'won' ? 'Ganaste' : 'Perdiste'} · pozo {sui(pot)} · al ganador {sui(payout)} <small>(según la fórmula del contrato)</small>
    </p>
  );
}

/**
 * Una fila de "Mis partidas": contraparte, apuesta, estado, hora del evento que la trajo y "Ver partida". En "Terminadas",
 * el rol y el resultado del objeto; en las otras dos, las acciones de la fila (`GameActions` con `variant='row'`, una
 * `useTxTarget` por fila). Una partida ilegible no se muestra como sana (SEG-10).
 */
export function MyGameRow({ item, section, address }: { item: MyGameItem; section: SectionKey; address: string }) {
  if (item.kind === 'unreadable') {
    return (
      <li className="my-game-row unreadable" {...(item.gameId === null ? {} : { 'data-game-id': item.gameId })}>
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
  const { game } = item;
  return (
    <li className="my-game-row" data-game-id={game.id}>
      <p>
        {section === 'finished' && <strong>{sameAddress(game.creator, address) ? 'Creaste' : 'Aceptaste'} · </strong>}
        <Counterpart game={game} address={address} /> · {sui(game.bet)} · {stateLabel(game)} ·{' '}
        <CreatedAt txDigest={item.txDigest} className="my-game-time" /> · <Link to={`/game/${game.id}`}>Ver partida</Link>
      </p>
      {section === 'finished' ? <FinishedResult game={game} address={address} /> : <GameActions game={game} variant="row" />}
    </li>
  );
}

/**
 * Una sección de "Mis partidas" (DL-4, DL-16, DL-17, H-1). Sin datos de su fuente, el estado de la primera carga. Con
 * datos, las filas siempre: una relectura en reintento o fallida va como nota arriba, sin desmontarlas (PROY-16). El pie
 * sale de `sectionFooter`: nunca "No tienes…" mientras quede historial por revisar.
 */
export function MyGamesSection({
  section,
  items,
  source,
  address,
  moreLabel,
  busy,
}: {
  section: SectionKey;
  items: readonly MyGameItem[];
  source: MyGamesSource;
  address: string;
  /** Texto del botón de paginación de la fuente (con filas en la sección). */
  moreLabel: string;
  /** Hay una lectura en curso: deshabilita "Reintentar" de la primera carga. */
  busy: boolean;
}) {
  const { network } = useAppConfig();
  const texts = TEXTS[section];
  const floorBased = source.lowerBound?.kind === 'node_floor' || source.end === 'history_pruned';
  const footer = sectionFooter({
    itemsInSection: items.length,
    hasNextPage: source.hasNextPage,
    stalled: source.stalled,
    nextPageError: source.nextPageError,
    isFetchingNextPage: source.isFetchingNextPage,
    floorBased,
  });
  const floor = footer.floorNote && source.lowerBound !== null ? source.lowerBound.checkpoint : null;

  return (
    <section className="my-games-section" data-section={section} aria-label={texts.title}>
      <h3>{texts.title}</h3>
      {!source.hasData ? (
        <ReadState status={source.status} onRetry={source.retry} busy={busy} />
      ) : (
        <>
          {source.refreshRetrying !== null && (
            <p role="status" className="my-games-note">
              Reintentando… (intento {source.refreshRetrying.attempt} de {source.refreshRetrying.max})
            </p>
          )}
          {source.refreshRetrying === null && source.refreshError !== null && (
            <div role="alert" className="read-error my-games-note">
              <p>
                No se pudo actualizar la lista: {readErrorMessage(source.refreshError, network)}; los datos pueden estar
                desactualizados
              </p>
              <button type="button" onClick={source.retry} disabled={busy}>
                Reintentar
              </button>
            </div>
          )}
          {items.length > 0 && (
            <ul className="my-game-rows">
              {items.map((item, index) => (
                <MyGameRow
                  // Dos ilegibles de la misma transacción sin ID (un PTB con varios eventos) no deben compartir key.
                  key={item.kind === 'game' ? item.game.id : `${item.txDigest}:${item.gameId ?? `i${String(index)}`}`}
                  item={item}
                  section={section}
                  address={address}
                />
              ))}
            </ul>
          )}
          {footer.empty !== null && (
            <p>
              {footer.empty === 'definitive' ? texts.definitive : texts.reviewed}
              {floor !== null && (
                <>
                  {' '}
                  en el historial disponible del nodo
                  <FloorSince checkpoint={floor} />
                </>
              )}
            </p>
          )}
          {footer.empty === null && floor !== null && (
            <p className="my-games-note">
              Solo se muestra el historial disponible del nodo
              <FloorSince checkpoint={floor} />
            </p>
          )}
          {footer.alert && (
            <p role="alert" className="read-error">
              {readErrorMessage(source.nextPageError, network)}
            </p>
          )}
          {source.isFetchingNextPage && <p role="status">Cargando más…</p>}
          {footer.showMore && (
            <button type="button" onClick={source.loadMore} disabled={footer.moreDisabled}>
              {section === 'invitations' && items.length === 0 ? 'Buscar más atrás' : moreLabel}
            </button>
          )}
        </>
      )}
    </section>
  );
}
