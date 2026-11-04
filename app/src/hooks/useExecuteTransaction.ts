import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { SimulationError } from '@mysten/sui/client';
import type { Transaction } from '@mysten/sui/transactions';
import { useMutation, useMutationState, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
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
import { txOutcomeOf, txVariablesOf, type TxView, type TxVariables } from './txSession';
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

/**
 * Resultado que muestra el hook de una acción (M-1 (b) de #12): nunca `unconfirmed`. La alerta "sin confirmar" la dibuja
 * la vista, desde `useTxTarget().unconfirmed`, una sola vez por objetivo.
 */
export type TxResult<T> = Exclude<TxOutcome<T>, { kind: 'unconfirmed' }>;

/** Corte previo a la preflight (M-2): un texto para el usuario y las claves a invalidar. */
export type TxPrecheckStop = { stop: string; invalidate?: QueryKey[] };

/** Lo que cada acción aporta a la máquina común: la acción, el builder, el chequeo previo y la lectura del resultado. */
export type ExecuteInput<T> = {
  action: TxAction;
  build: () => Transaction;
  precheck?: (signal: AbortSignal) => Promise<TxPrecheckStop | null>;
  interpret: (nodeResult: NodeTransactionResult) => T;
};

/**
 * API del hook: etapa y resultado de **su** última ejecución, y ejecutar. El bloqueo (`busy`, "sin confirmar") y su
 * reconocimiento son de la vista (`useTxTarget`).
 */
export type UseExecuteTransaction<T> = {
  stage: TxStage;
  outcome: TxResult<T> | null;
  execute: (input: ExecuteInput<T>) => void;
};

/** Sin wallet conectada no hay `sender`: se corta antes de cualquier pedido. */
export const CONNECT_WALLET_MESSAGE = 'Conecta tu wallet';
/** Prefijo de un fallo al preparar la transacción que no es de simulación ni de red (v1.3): la wallet nunca se abrió. */
export const PREPARE_FAILED_PREFIX = 'No se pudo preparar la transacción';

/**
 * Identidad de cada ejecución (M-4): contador de módulo, leído solo desde `execute` (un handler, nunca el render). Es
 * único dentro de la carga de la página, que es lo que vive el `QueryClient`.
 */
let lastRunId = 0;
function nextRunId(): number {
  return ++lastRunId;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message !== '') return error.message;
  return typeof error === 'string' && error !== '' ? error : 'error desconocido';
}

/**
 * Máquina común de transacciones de #11, #12 y #14 (DL-11): verifica (precheck + preflight propia), firma con la wallet,
 * **confirma con el nodo** (éxito solo con su `status.success`, DL-2), espera la indexación si hace falta (DL-5) e
 * invalida las claves de la acción (DL-6). Todo corre dentro de la `mutationFn` (sin reintentos: el usuario decide), así
 * que termina aunque el componente se desmonte; nunca lanza hacia el componente (LIM-8). Ningún `failure` sale de un
 * error de la wallet o del SDK cuando ya hay digest (M-3 (b)).
 *
 * Las mutaciones viven en el `MutationCache` con la clave del objetivo de la vista (DL-7 de #12): el candado es global
 * por cuenta (`isMutating` con la clave de la cuenta + `mutateAsync` en el mismo tick, V-8), y un "sin confirmar" del
 * objetivo bloquea hasta que la vista lo reconoce. `gcTime: Infinity` las conserva durante la carga de la página y
 * `networkMode: 'always'` no las pausa sin red: la preflight falla y lo dice (en vez de quedar "en curso" para siempre).
 */
export function useExecuteTransaction<T>(view: TxView): UseExecuteTransaction<T> {
  const config = useAppConfig();
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<TxStage>('idle');
  const [runId, setRunId] = useState<number | null>(null);

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
        if (findMoveAbort(error)) {
          await invalidateAction();
          return failure(transactionErrorMessage(error, ids));
        }
        // DL-10: sin abort ni `executionError`, el nodo rechazó la transacción antes de simularla (p. ej. la regla de
        // `Random` o la selección de gas): no es un error de la wallet, que ni se abrió.
        if (error.executionError === undefined) return failure(`${PREPARE_FAILED_PREFIX}: ${errorText(error)}`);
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
      if (fromError === null) {
        // NIT-2 (DL-9): una wallet que simula por su cuenta puede rechazar con el abort; el estado mostrado está viejo.
        if (findMoveAbort(error)) await invalidateAction();
        return failure(transactionErrorMessage(error, ids));
      }
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

  const mutation = useMutation<TxOutcome<T>, never, TxVariables<T>>({
    mutationKey: view.key,
    retry: false,
    gcTime: Infinity,
    networkMode: 'always',
    mutationFn: async ({ input }) => {
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

  // M-1 (a): el resultado sale del caché por `runId`, no de `useMutation().data`: si la vista reconoce un "sin confirmar"
  // y borra la mutación, el resultado de esta acción pasa a `null` (el observer no se resetea al borrar, V-8).
  const results = useMutationState({
    filters: { mutationKey: view.key, predicate: (m) => runId !== null && txVariablesOf(m.state.variables)?.runId === runId },
    // Lo escribió la `mutationFn` de este hook, con este `T`.
    select: (m) => txOutcomeOf(m.state.data) as TxOutcome<T> | null,
  });
  const last = results.at(-1) ?? null;

  const execute = (input: ExecuteInput<T>) => {
    // Candado global por cuenta (DL-7), síncrono: `mutateAsync` despacha `pending` antes de su primer `await` (V-8), así
    // que un segundo `execute` en el mismo tick, de esta u otra vista, ya lo ve.
    if (queryClient.isMutating({ mutationKey: view.accountKey }) > 0) return;
    const unconfirmed = queryClient
      .getMutationCache()
      .findAll({ mutationKey: view.key })
      .some((m) => txOutcomeOf(m.state.data)?.kind === 'unconfirmed');
    if (unconfirmed) return;
    const id = nextRunId();
    setRunId(id);
    void mutation.mutateAsync({ input, viewId: view.viewId, runId: id, action: input.action }).catch(() => undefined);
  };

  return { stage, outcome: last === null || last.kind === 'unconfirmed' ? null : last, execute };
}
