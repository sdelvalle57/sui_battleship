/**
 * Aviso de creación que el formulario deja en el `state` del router al navegar al detalle (DL-14): vive en esa entrada
 * del historial (también tras recargar), no en la URL. El costo viaja como string de MIST: react-router serializa la
 * ubicación con `JSON.stringify` al navegar con el router por hash (aviso de rutas relativas), y `JSON.stringify` no
 * acepta `bigint`.
 */
export type CreatedNoticeState = {
  digest: string;
  costMist: string;
  invitation: boolean;
  feeChanged: { from: number; to: number } | null;
};

/** El aviso ya leído, con el costo en `bigint` (PROY-12). */
export type CreatedNotice = Omit<CreatedNoticeState, 'costMist'> & { cost: bigint };

const MIST_PATTERN = /^-?\d+$/;

/** Arma el `state` del router con el aviso de creación. */
export function createdNoticeState(notice: CreatedNotice): { created: CreatedNoticeState } {
  const { cost, ...rest } = notice;
  return { created: { ...rest, costMist: cost.toString() } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Lee el aviso del `state` del router, que es `unknown` (lo puede escribir cualquier navegación). Una forma inesperada
 * se ignora: el aviso es informativo y el detalle se lee igual del nodo.
 */
export function readCreatedNotice(state: unknown): CreatedNotice | null {
  if (!isRecord(state) || !isRecord(state.created)) return null;
  const { digest, costMist, invitation, feeChanged } = state.created;
  if (
    typeof digest !== 'string' ||
    !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(digest) ||
    typeof costMist !== 'string' ||
    !MIST_PATTERN.test(costMist) ||
    typeof invitation !== 'boolean'
  ) {
    return null;
  }
  const fee =
    isRecord(feeChanged) && typeof feeChanged.from === 'number' && typeof feeChanged.to === 'number'
      ? { from: feeChanged.from, to: feeChanged.to }
      : null;
  return { digest, cost: BigInt(costMist), invitation, feeChanged: fee };
}
