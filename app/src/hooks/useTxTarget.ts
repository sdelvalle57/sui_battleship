import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { normalizeSuiAddress, normalizeSuiObjectId } from '@mysten/sui/utils';
import { hashKey, useIsMutating, useMutationState, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { queryKeys } from './queryKeys';
import {
  deriveTargetState,
  mountSnapshot,
  toTxEntry,
  type CreateTarget,
  type GameTarget,
  type TxNotice,
  type TxTarget,
  type TxView,
} from './txSession';
import { useAppConfig } from './useAppConfig';

/**
 * Identidad de cada montaje de una vista (M-4): contador de módulo, leído solo a través de esta función (así nada se
 * reasigna dentro del hook). Ni `crypto.randomUUID()` (no existe fuera de contextos seguros) ni `useId()` (un remontaje
 * en la misma posición repetiría el id y una mutación ajena pasaría por propia).
 */
let lastViewId = 0;
function nextViewId(): number {
  return ++lastViewId;
}

/** Lo que una vista necesita para sus botones sobre un objetivo (DL-8). */
export type TxTargetState<T extends TxTarget> = {
  /** Vista para los hooks de acción (`useCreateGame(view)`, …). */
  view: TxView<T>;
  /** Hay una transacción de la cuenta en curso (de esta vista o de otra, de cualquier objetivo). */
  busy: boolean;
  /** "Hay una transacción en curso desde esta cuenta" o el resultado adoptado de una ajena del objetivo. */
  notice: TxNotice | null;
  /** La última del objetivo que quedó "sin confirmar": bloquea los botones del objetivo hasta `acknowledge`. */
  unconfirmed: { digest: string } | null;
  /** "Ya la revisé": borra esa mutación del caché y desbloquea el objetivo. */
  acknowledge: () => void;
};

/**
 * Fuente única de bloqueo y avisos de una vista sobre su objetivo (DL-8 de #12), leída del `MutationCache` de la cuenta
 * conectada. Cada vista con acciones la llama **una** vez y pasa `view` a sus hooks de acción. La clave se deriva por
 * valor (red, cuenta y `gameId` normalizados, M-5), no por identidad del objeto `target`. Al montar toma una foto pura
 * de todo el caché (`mountSnapshot`, M-2 (c)) para adoptar solo lo que empezó después o estaba en curso; nada se muta
 * en el render ni hay `useEffect`.
 */
export function useTxTarget(target: CreateTarget): TxTargetState<CreateTarget>;
export function useTxTarget(target: GameTarget): TxTargetState<GameTarget>;
export function useTxTarget(target: TxTarget): TxTargetState<TxTarget>;
export function useTxTarget(target: TxTarget): TxTargetState<TxTarget> {
  const { network } = useAppConfig();
  const account = useCurrentAccount();
  const queryClient = useQueryClient();
  const [viewId] = useState(nextViewId);
  const [mount] = useState(() => mountSnapshot(queryClient.getMutationCache().getAll()));

  const address = account === null ? null : normalizeSuiAddress(account.address);
  const gameId = target.kind === 'game' ? normalizeSuiObjectId(target.gameId) : null;
  const view = useMemo((): TxView => {
    const normalized: TxTarget = gameId === null ? { kind: 'create' } : { kind: 'game', gameId };
    const key = queryKeys.txTarget(network, address, normalized);
    return { target: normalized, viewId, key, accountKey: queryKeys.txAccount(network, address), targetHash: hashKey(key) };
  }, [network, address, gameId, viewId]);

  const entries = useMutationState({ filters: { mutationKey: view.accountKey }, select: toTxEntry(view) });
  const { notice, unconfirmed } = deriveTargetState({ entries, viewId, mount });
  const busy = useIsMutating({ mutationKey: view.accountKey }) > 0;

  const acknowledge = () => {
    if (unconfirmed === null) return;
    const cache = queryClient.getMutationCache();
    const mutation = cache.getAll().find((m) => m.mutationId === unconfirmed.mutationId);
    if (mutation) cache.remove(mutation);
  };

  return { view, busy, notice, unconfirmed: unconfirmed === null ? null : { digest: unconfirmed.digest }, acknowledge };
}
