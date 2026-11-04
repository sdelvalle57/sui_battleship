import type { UiWalletAccount } from '@mysten/dapp-kit-react';
import type { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import type { Mutation, MutationStatus, QueryKey } from '@tanstack/react-query';
import { hashKey } from '@tanstack/react-query';
import type { GameCreatedEvent, GameResolvedEvent } from '../sui/events';
import type { NodeTransactionResult } from '../sui/execution';
import type { BetLimitsUpdatedEvent, FeeRateUpdatedEvent } from '../sui/houseAdmin';

/**
 * Sesión de transacciones de la pestaña (DL-7/DL-8 de #12), en funciones puras sin React: qué ve una vista de las
 * mutaciones del `MutationCache` de su cuenta. El caché (un `QueryClient` por carga de página) es la única fuente: así
 * salir de la pantalla y volver no permite un segundo envío ni pierde el resultado de la que estaba en curso.
 */

// Tipos de la máquina de transacciones (DL-12 de #13, NIT-1 de #12): viven aquí para que `txSession.ts` no importe nada de
// `hooks/` y no haya ciclos de imports de tipos (`txSession` ↔ `useExecuteTransaction`, `queryKeys` → `txSession` →
// `txInvalidation` → `queryKeys`).

/**
 * Acción de una transacción propia: decide qué datos quedaron viejos (DL-6 de #11). Las de la House (#14) no llevan
 * `gameId`: su objetivo es la House de la config.
 */
export type TxAction =
  | { kind: 'create' }
  | { kind: 'cancel'; gameId: string }
  | { kind: 'reject'; gameId: string }
  | { kind: 'accept'; gameId: string }
  | { kind: 'updateFeeRate' }
  | { kind: 'updateBetLimits' }
  | { kind: 'withdrawFees' };

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

/**
 * Lo que cada acción aporta a la máquina común: la acción, el builder, el chequeo previo y la lectura del resultado.
 * `build`, `precheck` e `interpret` reciben la dirección que firma (DL-11 de #13; D-5 de #14): la de la cuenta capturada
 * al lanzar, no la que esté conectada cuando la transacción termina. Así el retiro de comisiones va a la cuenta que firma
 * por construcción (N-2) y el `precheck` del `HouseCap` mira a esa misma cuenta.
 */
export type ExecuteInput<T> = {
  action: TxAction;
  build: (sender: string) => Transaction;
  precheck?: (signal: AbortSignal, sender: string) => Promise<TxPrecheckStop | null>;
  interpret: (nodeResult: NodeTransactionResult, signer: string) => T;
};

/** Objetivo de una transacción: el formulario de creación, una partida o la House (panel de admin, #14). */
export type TxTarget = { kind: 'create' } | { kind: 'game'; gameId: string } | { kind: 'house' };
export type CreateTarget = Extract<TxTarget, { kind: 'create' }>;
export type GameTarget = Extract<TxTarget, { kind: 'game' }>;
export type HouseTarget = Extract<TxTarget, { kind: 'house' }>;

/**
 * Una vista con acciones sobre un objetivo (M-5): `key` = clave de mutación del objetivo (`queryKeys.txTarget`),
 * `accountKey` = la de la cuenta (`queryKeys.txAccount`), `targetHash` = `hashKey(key)` para comparar claves sin
 * recorrerlas, `viewId` = identidad del montaje (M-4).
 */
export type TxView<T extends TxTarget = TxTarget> = {
  target: T;
  viewId: number;
  key: QueryKey;
  accountKey: QueryKey;
  targetHash: string;
};

/**
 * Variables de cada mutación: la entrada de la acción, quién la lanzó (vista y ejecución) y, capturados en el clic
 * (DL-11 de #13), la cuenta que firma y el `targetHash` del objetivo: preflight, firma, `interpret` e invalidación usan
 * esa cuenta por construcción, y la etapa queda ligada a ese objetivo aunque la vista pase a otra cuenta.
 */
export type TxVariables<T> = {
  input: ExecuteInput<T>;
  viewId: number;
  runId: number;
  action: TxAction;
  account: UiWalletAccount | null;
  targetHash: string;
};

/**
 * Lo que se lee de una creación exitosa: la partida creada (DL-9 de #11; `null` si no se pudo identificar) y si la
 * comisión guardada difiere de la mostrada (M-2 de #11).
 */
export type CreateGameValue = {
  created: GameCreatedEvent | null;
  feeChanged: { from: number; to: number } | null;
};

/** Valor del resultado de cada acción (lo que devuelve su `interpret`). No se exporta: se lee por `TxValueByAction`. */
type TxValueMap = {
  create: CreateGameValue;
  cancel: bigint | null;
  reject: bigint | null;
  accept: GameResolvedEvent | null;
  updateFeeRate: FeeRateUpdatedEvent | null;
  updateBetLimits: BetLimitsUpdatedEvent | null;
  withdrawFees: bigint | null;
};

/**
 * Valor del resultado de cada acción, indexado por `TxAction['kind']` (H-4 de #14): una acción sin su valor en
 * `TxValueMap` rompe el `typecheck`.
 */
export type TxValueByAction = { [K in TxAction['kind']]: TxValueMap[K] };

/** Una mutación ajena adoptada (M-2): su acción y su resultado, con el tipo de valor de esa acción. */
export type AdoptedTx = {
  [K in keyof TxValueByAction]: { action: K; outcome: TxResult<TxValueByAction[K]> };
}[keyof TxValueByAction];

/** Aviso de la vista: hay una transacción ajena de la cuenta en curso, o se adoptó el resultado de una ajena. */
export type TxNotice = { kind: 'in_flight' } | { kind: 'adopted'; adopted: AdoptedTx };

/** Proyección plana de una mutación del caché (la misma para `useMutationState` y para la foto de montaje). */
export type TxEntry = {
  id: number;
  status: MutationStatus;
  viewId: number | null;
  runId: number | null;
  action: TxAction | null;
  sameTarget: boolean;
  outcome: TxOutcome<unknown> | null;
};

/** Lo mínimo de una `Mutation` que se lee (una `Mutation` real cumple este tipo). */
export type MutationLike = Pick<Mutation, 'mutationId' | 'state'> & { options: { mutationKey?: QueryKey } };

// Toda acción de `TxAction`: una que falte haría que la mutación propia se viera como ajena (sin `viewId`/`runId`), como
// el panel de la House con su propia transacción (NIT-3 de #12). `satisfies` ata las claves a `TxAction['kind']`: una que
// falte o sobre rompe el `typecheck` (H-4 de #14).
const TX_ACTION_KINDS = {
  create: true,
  cancel: true,
  reject: true,
  accept: true,
  updateFeeRate: true,
  updateBetLimits: true,
  withdrawFees: true,
} satisfies Record<TxAction['kind'], true>;
const ACTION_KINDS: ReadonlySet<string> = new Set(Object.keys(TX_ACTION_KINDS));
const OUTCOME_KINDS = new Set(['success', 'failure', 'unconfirmed']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** `viewId`, `runId` y `action` de las variables de una mutación propia de la app; `null` si no tienen esa forma. */
export function txVariablesOf(value: unknown): { viewId: number; runId: number; action: TxAction } | null {
  if (!isRecord(value)) return null;
  const { viewId, runId, action } = value;
  if (typeof viewId !== 'number' || typeof runId !== 'number') return null;
  if (!isRecord(action) || typeof action.kind !== 'string' || !ACTION_KINDS.has(action.kind)) return null;
  // La forma de cada acción la fijó `execute` al lanzar la mutación (TxVariables).
  return { viewId, runId, action: action as TxAction };
}

/** El resultado guardado por la `mutationFn` (`TxOutcome`), o `null` si todavía no hay o no tiene esa forma. */
export function txOutcomeOf(data: unknown): TxOutcome<unknown> | null {
  if (!isRecord(data) || typeof data.kind !== 'string' || !OUTCOME_KINDS.has(data.kind)) return null;
  // Lo escribió la `mutationFn` de `useExecuteTransaction`, que siempre devuelve un `TxOutcome`.
  return data as TxOutcome<unknown>;
}

/** Proyección de una mutación para una vista: campos planos y si es del mismo objetivo (por `hashKey`). */
export function toTxEntry(view: Pick<TxView, 'targetHash'>): (m: MutationLike) => TxEntry {
  return (m) => {
    const variables = txVariablesOf(m.state.variables);
    return {
      id: m.mutationId,
      status: m.state.status,
      viewId: variables?.viewId ?? null,
      runId: variables?.runId ?? null,
      action: variables?.action ?? null,
      sameTarget: m.options.mutationKey !== undefined && hashKey(m.options.mutationKey) === view.targetHash,
      outcome: txOutcomeOf(m.state.data),
    };
  };
}

/** Foto del caché al montar una vista (M-2 (c)): el mayor `mutationId` y los que estaban en curso. */
export type MountSnapshot = { maxId: number; pendingIds: ReadonlySet<number> };

/**
 * Foto pura del `MutationCache` **entero** al montar (M-2 (c), v1.2): sin filtrar por cuenta ni objetivo. Al montar,
 * todas son ajenas (la vista todavía no lanzó nada). Como los `mutationId` son monótonos, una mutación con `id >
 * maxId` empezó después de montar, aunque haya empezado y terminado entre dos renders.
 */
export function mountSnapshot(mutations: readonly Pick<Mutation, 'mutationId' | 'state'>[]): MountSnapshot {
  let maxId = 0;
  const pendingIds = new Set<number>();
  for (const m of mutations) {
    maxId = Math.max(maxId, m.mutationId);
    if (m.state.status === 'pending') pendingIds.add(m.mutationId);
  }
  return { maxId, pendingIds };
}

/** Proyección de una mutación para el fijado de "Mis partidas" (H-6 de #13): su id, su estado y la partida que toca. */
export type TxGameEntry = { id: number; status: MutationStatus; gameId: string | null };

/**
 * La partida que toca una acción, normalizada (como la clave de `myGameKey`), o `null` si no toca ninguna. Un `case` por
 * acción y sin `default` (MINOR-2 de v1.1 de #14): una acción nueva sin su `case` rompe el `typecheck`.
 */
function actionGameId(action: TxAction): string | null {
  switch (action.kind) {
    case 'cancel':
    case 'reject':
    case 'accept':
      return normalizeSuiAddress(action.gameId);
    case 'create':
      return null;
    case 'updateFeeRate':
      return null;
    case 'updateBetLimits':
      return null;
    case 'withdrawFees':
      return null;
  }
}

/**
 * Proyección de una mutación del caché para H-6: el `gameId` normalizado de su acción, o `null` para una acción que no
 * toca una partida (crear, las de la House) o para variables sin la forma de la app.
 */
export function toTxGameEntry(m: MutationLike): TxGameEntry {
  const action = txVariablesOf(m.state.variables)?.action;
  return { id: m.mutationId, status: m.state.status, gameId: action === undefined ? null : actionGameId(action) };
}

/**
 * Partidas con una transacción "viva" para la vista (H-6 de #13), con el criterio de adopción de #12: en curso, en curso
 * al montar, o empezada después de montar. "Mis partidas" las fija en seguida con los datos que haya, para que la fila no
 * cambie de sección (y pierda su resultado) con la relectura que trae el estado ya ejecutado. Las terminadas antes de
 * montar no cuentan: esas se reagrupan con datos frescos (H-5).
 */
export function liveTxGameIds(entries: readonly TxGameEntry[], mount: MountSnapshot): ReadonlySet<string> {
  const live = new Set<string>();
  for (const entry of entries) {
    if (entry.gameId === null) continue;
    if (entry.status === 'pending' || mount.pendingIds.has(entry.id) || entry.id > mount.maxId) live.add(entry.gameId);
  }
  return live;
}

/** Estado derivado de una vista sobre su objetivo. */
export type TargetState = {
  inFlightForeign: boolean;
  notice: TxNotice | null;
  unconfirmed: { digest: string; mutationId: number } | null;
};

/**
 * Deriva lo que muestra una vista (DL-8, M-1, M-2) de las mutaciones de su **cuenta** (`entries`):
 * - `inFlightForeign`: una mutación de la cuenta en curso, de cualquier objetivo, que no lanzó esta vista;
 * - `unconfirmed`: la más nueva del objetivo que terminó "sin confirmar", propia o ajena (bloquea el objetivo hasta
 *   `acknowledge`);
 * - `notice`: `in_flight` si hay una ajena en curso; si no, la ajena del objetivo más nueva que se puede adoptar
 *   (terminada, no "sin confirmar", y que empezó después de montar o estaba en curso al montar), solo si es más nueva
 *   que toda mutación propia de la vista (M-2 (a): lanzar una propia la descarta). Lo terminado antes de montar nunca se
 *   adopta, así el formulario no navega dos veces.
 */
export function deriveTargetState({
  entries,
  viewId,
  mount,
}: {
  entries: readonly TxEntry[];
  viewId: number;
  mount: MountSnapshot;
}): TargetState {
  let inFlightForeign = false;
  let unconfirmed: TargetState['unconfirmed'] = null;
  let ownMaxId = 0;
  let adoptable: { entry: TxEntry; outcome: TxOutcome<unknown>; action: TxAction } | null = null;
  for (const entry of entries) {
    const own = entry.viewId === viewId;
    if (own) ownMaxId = Math.max(ownMaxId, entry.id);
    if (entry.status === 'pending' && !own) inFlightForeign = true;
    if (!entry.sameTarget) continue;
    const { outcome, action } = entry;
    if (outcome?.kind === 'unconfirmed' && (unconfirmed === null || entry.id > unconfirmed.mutationId)) {
      unconfirmed = { digest: outcome.digest, mutationId: entry.id };
    }
    const finished = entry.status === 'success' || entry.status === 'error';
    const startedAfterMount = entry.id > mount.maxId || mount.pendingIds.has(entry.id);
    if (
      !own &&
      finished &&
      outcome !== null &&
      outcome.kind !== 'unconfirmed' &&
      action !== null &&
      startedAfterMount &&
      (adoptable === null || entry.id > adoptable.entry.id)
    ) {
      adoptable = { entry, outcome, action };
    }
  }
  let notice: TxNotice | null = null;
  if (inFlightForeign) notice = { kind: 'in_flight' };
  else if (adoptable !== null && adoptable.entry.id > ownMaxId) {
    // El valor del resultado es el de la acción de esa mutación: su `interpret` lo produjo con ese tipo.
    notice = { kind: 'adopted', adopted: { action: adoptable.action.kind, outcome: adoptable.outcome } as AdoptedTx };
  }
  return { inFlightForeign, notice, unconfirmed };
}
