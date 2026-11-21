import type { GameRow } from '../hooks/gameRow';
import { useDeadlinePhase } from '../hooks/useChainNow';
import { Countdown } from './Countdown';
import { asActiveDuel, expiryAnnouncement, nextStepText, stateSentence, turnText, type ActiveDuelRow } from './gameTexts';

/**
 * Una partida activa con reloj: de quién es el turno, cuánto tiempo queda y qué puede hacer esta cuenta (UX-1). El plazo y su
 * fase son lo único que cambia con el tiempo; **solo la fase** vuelve a renderizar este bloque (el contador es un nodo
 * aparte, UX-3). Los cambios de estado se anuncian **una sola vez** en la región `status` (UX-4), que existe vacía desde el
 * principio y recibe el mensaje al vencer; el contador, `role="timer"`, no se lee cada segundo.
 */
function ActiveStatus({ game, account, compact }: { game: ActiveDuelRow; account: string | null; compact: boolean }) {
  const { deadlineMs } = game.state;
  const phase = useDeadlinePhase(deadlineMs);
  return (
    <div className="duel-status">
      {!compact && <p className="duel-state">{stateSentence(game)}</p>}
      <p className="duel-turn">{turnText(game, game.state, account)}</p>
      <p className="clock-line">
        Tiempo: <Countdown deadlineMs={deadlineMs} />
      </p>
      <p className="duel-next">{nextStepText(game, account, phase)}</p>
      <div role="status" className="duel-sr-only">
        {expiryAnnouncement(game.state, phase)}
      </div>
    </div>
  );
}

/**
 * Resumen de una partida de la fuente nueva para esta cuenta, en el orden de UX-1: qué está pasando (el estado), de quién es
 * el turno, cuánto tiempo queda y qué sigue; sin jerga del contrato. Una partida activa suma turno y plazo (con la cuenta
 * regresiva); el resto, solo el estado y el siguiente paso. `compact` omite la frase de estado (la fila de "Mis partidas" ya
 * muestra su etiqueta).
 */
export function GameStatus({ game, account, compact = false }: { game: GameRow; account: string | null; compact?: boolean }) {
  const active = asActiveDuel(game);
  if (active !== null) return <ActiveStatus game={active} account={account} compact={compact} />;
  return (
    <div className="duel-status">
      {!compact && <p className="duel-state">{stateSentence(game)}</p>}
      <p className="duel-next">{nextStepText(game, account, 'unknown')}</p>
    </div>
  );
}
