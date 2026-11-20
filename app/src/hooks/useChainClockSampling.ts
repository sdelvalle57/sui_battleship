import { useCurrentClient } from '@mysten/dapp-kit-react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { fetchCheckpointTime } from '../sui/transactionInfo';
import { queryKeys } from './queryKeys';
import { useAppConfig } from './useAppConfig';
import { useNodeStatus } from './useNodeStatus';
import { useScreenClock } from './useChainNow';

/**
 * Alimenta el reloj de pantalla con la **hora de la cadena** (#73, TASK-8b; PROY-14): el estado del nodo (que ya consulta el
 * indicador de red cada 20 s, con la misma clave y sin pedidos de más) informa la altura del último checkpoint, y la hora de
 * ese checkpoint es la muestra. La muestra se anota dentro del `queryFn` de TanStack Query (parte del pedido, no un efecto):
 * el reloj la usa de referencia y la hora local solo la hace avanzar entre muestras. Sin altura (nodo sin conexión o sin
 * informarla) no pide nada y la cuenta regresiva queda "sin hora de la red". Lo montan las vistas que cuentan un plazo.
 */
export function useChainClockSampling(): void {
  const config = useAppConfig();
  const client = useCurrentClient();
  const clock = useScreenClock();
  const status = useNodeStatus();
  const height = status.kind === 'ok' ? status.checkpointHeight : null;
  useQuery({
    queryKey: queryKeys.chainClock(config.network, height ?? 0n),
    queryFn:
      height === null
        ? skipToken
        : async ({ signal }) => {
            const chainMs = await fetchCheckpointTime(client, { sequenceNumber: height, signal });
            if (chainMs !== null) clock.observe(chainMs, clock.localNow());
            return chainMs;
          },
    staleTime: Infinity,
  });
}
