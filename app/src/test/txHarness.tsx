import { useCancelGame } from '../hooks/useCancelGame';
import { useRejectGame } from '../hooks/useRejectGame';
import { useTxTarget } from '../hooks/useTxTarget';
import { useUpdateBetLimits } from '../hooks/useUpdateBetLimits';
import { useUpdateFeeRate } from '../hooks/useUpdateFeeRate';
import { useWithdrawFees } from '../hooks/useWithdrawFees';

/** Una vista de partida como la de `GameActions`: una fuente (`useTxTarget`) y sus dos acciones con la misma `view`. */
export function useGameView(gameId: string) {
  const target = useTxTarget({ kind: 'game', gameId });
  const cancel = useCancelGame(target.view);
  const reject = useRejectGame(target.view);
  return { target, cancel, reject };
}

/** Una vista del panel de la House (#14): una fuente (`useTxTarget({ kind: 'house' })`) y sus tres acciones con la misma `view`. */
export function useHouseView() {
  const target = useTxTarget({ kind: 'house' });
  const fee = useUpdateFeeRate(target.view);
  const limits = useUpdateBetLimits(target.view);
  const withdraw = useWithdrawFees(target.view);
  return { target, fee, limits, withdraw };
}

/** Promesa que el test resuelve o rechaza cuando quiere (para dejar una etapa "en curso"). */
export function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
