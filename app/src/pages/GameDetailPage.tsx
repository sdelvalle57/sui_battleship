import { useParams } from 'react-router';
import { GameDetail } from '../components/GameDetail';
import { ReadState } from '../components/ReadState';
import { useAppConfig } from '../hooks/useAppConfig';
import { useGame } from '../hooks/useGame';
import { useTransactionTime } from '../hooks/useTransactionTime';

/** Detalle de una partida en `#/game/:id`. El ID se valida en el hook; uno inválido no consulta la red. */
export function GameDetailPage() {
  const { id = '' } = useParams();
  const { network } = useAppConfig();
  const result = useGame(id);
  const { timestampMs } = useTransactionTime(result.kind === 'read' ? result.previousTransaction : null);

  if (result.kind === 'invalid_id') {
    return (
      <section>
        <h2>Partida</h2>
        <p role="alert">ID de partida inválido</p>
      </section>
    );
  }
  return (
    <section>
      <h2>Partida</h2>
      <ReadState status={result.status} onRetry={result.refetch} busy={result.isFetching} />
      {result.game !== null && <GameDetail game={result.game} lastActivityMs={timestampMs} network={network} />}
    </section>
  );
}
