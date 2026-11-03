import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { SimulationError } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { findMoveAbort, transactionErrorMessage } from '../sui/errors';
import {
  classifyExecution,
  confirmTransaction,
  digestFromError,
  networkCost,
  PREFLIGHT_NETWORK_MESSAGE,
  PreflightNetworkError,
  preflightTransaction,
  waitForCheckpoint,
  type NodeTransactionResult,
} from '../sui/execution';
import { isTransientReadError } from '../sui/readPolicy';
import { transactionInvalidations, type TxAction } from './txInvalidation';
import { useAppConfig } from './useAppConfig';

/** Etapa visible de una transacción (DL-11). */
export type TxStage = 'idle' | 'preflight' | 'signing' | 'confirming' | 'indexing' | 'done';

/**
 * Resultado honesto de una transacción (DL-2, M-3). `success` y `failure` con `cost` los decide la lectura del nodo;
 * `failure` sin digest es un fallo antes de ejecutar; `unconfirmed` = hay digest pero el nodo no respondió a tiempo.
 * `value: null` en un éxito = el nodo confirmó pero no se pudo interpretar el resultado (NIT-1 de v1.1).
 */
export type TxOutcome<T> =
  | { kind: 'success'; digest: string; value: T | null; indexed: boolean; cost: bigint }
  | { kind: 'failure'; message: string; digest: string | null; cost: bigint | null }
  | { kind: 'unconfirmed'; digest: string };

/** Corte previo a la preflight (M-2): un texto para el usuario y las claves a invalidar. */
export type TxPrecheckStop = { stop: string; invalidate?: QueryKey[] };

/** Lo que cada acción aporta a la máquina común: la acción, el builder, el chequeo previo y la lectura del resultado. */
export type ExecuteInput<T> = {
  action: TxAction;
  build: () => Transaction;
  precheck?: (signal: AbortSignal) => Promise<TxPrecheckStop | null>;
  interpret: (nodeResult: NodeTransactionResult) => T;
};

/** API del hook: etapa, resultado, si hay una transacción en curso, ejecutar y volver a `idle`. */
export type UseExecuteTransaction<T> = {
  stage: TxStage;
  outcome: TxOutcome<T> | null;
  isBusy: boolean;
  execute: (input: ExecuteInput<T>) => void;
  reset: () => void;
};

/** Sin wallet conectada no hay `sender`: se corta antes de cualquier pedido. */
export const CONNECT_WALLET_MESSAGE = 'Conecta tu wallet';
/** Prefijo de un fallo al preparar la transacción que no es de simulación ni de red (v1.3): la wallet nunca se abrió. */
export const PREPARE_FAILED_PREFIX = 'No se pudo preparar la transacción';

function errorText(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  return typeof error === 'string' && error !== '' ? error : 'error desconocido';
}

/**
 * Máquina común de transacciones de #11, #12 y #14 (DL-11): verifica (precheck + preflight propia), firma con la wallet,
 * **confirma con el nodo** (éxito solo con su `status.success`, DL-2), espera la indexación si hace falta (DL-5) e
 * invalida las claves de la acción (DL-6). Todo corre dentro de la `mutationFn` (sin reintentos: el usuario decide), así
 * que termina aunque el componente se desmonte; nunca lanza hacia el componente (LIM-8). Un candado síncrono impide el
 * doble envío (M-1). Ningún `failure` sale de un error de la wallet o del SDK cuando ya hay digest (M-3 (b)).
 */
export function useExecuteTransaction<T>(): UseExecuteTransaction<T> {
  const config = useAppConfig();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<TxStage>('idle');
  const [locked, setLocked] = useState(false);
  const lock = useRef(false);

  const ids = { packageId: config.packageId, originalPackageId: config.originalPackageId };

  async function applyKeys(reset: QueryKey[], invalidate: QueryKey[]): Promise<void> {
    await Promise.all([
      ...reset.map((queryKey) => queryClient.resetQueries({ queryKey })),
      ...invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ]);
  }

  async function run(
    input: ExecuteInput<T>,
    progress: { digest: string | null; invalidate: (() => Promise<void>) | null },
  ): Promise<TxOutcome<T>> {
    const signal = new AbortController().signal;
    const sender = account?.address ?? null;
    const invalidateAction = async () => {
      const keys = transactionInvalidations(input.action, {
        network: config.network,
        originalPackageId: config.originalPackageId,
        houseId: config.houseId,
        address: sender,
      });
      await applyKeys(keys.reset, keys.invalidate);
    };
    progress.invalidate = invalidateAction;
    const failure = (message: string, digest: string | null = null, cost: bigint | null = null): TxOutcome<T> => ({
      kind: 'failure',
      message,
      digest,
      cost,
    });

    // preflight: nada de esto abre la wallet.
    setStage('preflight');
    if (sender === null) return failure(CONNECT_WALLET_MESSAGE);
    if (input.precheck) {
      let stop: TxPrecheckStop | null;
      try {
        stop = await input.precheck(signal);
      } catch (error) {
        return failure(isTransientReadError(error) ? PREFLIGHT_NETWORK_MESSAGE : `${PREPARE_FAILED_PREFIX}: ${errorText(error)}`);
      }
      if (stop) {
        await applyKeys([], stop.invalidate ?? []);
        return failure(stop.stop);
      }
    }
    try {
      await preflightTransaction(client, input.build(), sender, signal);
    } catch (error) {
      if (error instanceof PreflightNetworkError) return failure(PREFLIGHT_NETWORK_MESSAGE);
      if (error instanceof SimulationError) {
        // Un abort dice que el estado on-chain no es el que se mostró: se refresca.
        if (findMoveAbort(error)) await invalidateAction();
        return failure(transactionErrorMessage(error, ids));
      }
      return failure(`${PREPARE_FAILED_PREFIX}: ${errorText(error)}`);
    }

    // signing: el `Transaction` sin construir (V-1); la wallet resuelve gas y pago.
    setStage('signing');
    let digest: string;
    try {
      const result = await dAppKit.signAndExecuteTransaction({ transaction: input.build() });
      digest = (result.Transaction ?? result.FailedTransaction).digest;
    } catch (error) {
      const fromError = digestFromError(error);
      if (fromError === null) return failure(transactionErrorMessage(error, ids));
      digest = fromError;
    }

    // confirming: desde aquí hay digest; el resultado sale solo de la lectura del nodo.
    progress.digest = digest;
    setStage('confirming');
    let nodeResult: NodeTransactionResult;
    try {
      nodeResult = await confirmTransaction(client, { digest, signal });
    } catch {
      await invalidateAction();
      return { kind: 'unconfirmed', digest };
    }
    const tx = nodeResult.Transaction ?? nodeResult.FailedTransaction;
    const cost = networkCost(tx.effects.gasUsed);
    const verdict = classifyExecution(nodeResult);
    if (verdict.kind === 'failure') {
      await invalidateAction();
      return failure(transactionErrorMessage(verdict.error, ids), digest, cost);
    }

    // indexing: con `checkpoint` ya está indexada (S-1 bis) y no hace falta pedir nada.
    setStage('indexing');
    let indexed = true;
    if (tx.checkpoint === null) {
      try {
        indexed = await waitForCheckpoint(client, { digest, signal });
      } catch {
        indexed = false;
      }
    }
    let value: T | null;
    try {
      value = input.interpret(nodeResult);
    } catch {
      value = null;
    }
    await invalidateAction();
    return { kind: 'success', digest, value, indexed, cost };
  }

  const mutation = useMutation<TxOutcome<T>, never, ExecuteInput<T>>({
    retry: false,
    mutationFn: async (input) => {
      const progress: { digest: string | null; invalidate: (() => Promise<void>) | null } = { digest: null, invalidate: null };
      try {
        return await run(input, progress);
      } catch (error) {
        // Red de seguridad (LIM-8): nada llega al componente como excepción. Con un digest ya conocido (o en el error),
        // la transacción pudo ejecutarse: nunca `failure` (M-3 (b)); se invalida lo de la acción y queda sin confirmar.
        const digest = progress.digest ?? digestFromError(error);
        if (digest === null) {
          return { kind: 'failure', message: `${PREPARE_FAILED_PREFIX}: ${errorText(error)}`, digest: null, cost: null };
        }
        await progress.invalidate?.().catch(() => undefined);
        return { kind: 'unconfirmed', digest };
      } finally {
        setStage('done');
      }
    },
  });

  const execute = (input: ExecuteInput<T>) => {
    // Candado síncrono (M-1): se toma antes de cualquier `await`, así dos clics en el mismo tick no envían dos veces.
    if (lock.current) return;
    lock.current = true;
    setLocked(true);
    void mutation
      .mutateAsync(input)
      .catch(() => undefined)
      .finally(() => {
        lock.current = false;
        setLocked(false);
      });
  };

  return {
    stage,
    outcome: mutation.data ?? null,
    isBusy: locked || mutation.isPending,
    execute,
    reset: () => {
      if (lock.current) return;
      mutation.reset();
      setStage('idle');
    },
  };
}
