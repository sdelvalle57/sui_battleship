import { bcs } from '@mysten/sui/bcs';
import { ObjectError, type SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
import { isExactType, parseExactBcs } from './game';
import { sameAddress } from './ids';
import { ReadDataError } from './readErrors';
import { withReadTimeout } from './readPolicy';

/**
 * Tope de pedidos de `fetchHouseCap` (H-1): el nodo puede devolver páginas vacías con cursor (V-2), así que un
 * `hasNextPage` no prueba que haya algo; tres pedidos sin respuesta cierta ⇒ `ReadDataError('incomplete')`.
 */
export const HOUSE_CAP_MAX_PAGES = 3;

/** Tamaño de página: alcanza para distinguir "un cap" de "dos caps" (invariante roto) en un solo pedido. */
const HOUSE_CAP_PAGE_SIZE = 2;

/** Texto del `precheck` de las acciones de admin cuando la cuenta ya no tiene el cap (H-3). */
export const HOUSE_CAP_LOST_MESSAGE = 'Esta cuenta ya no tiene el HouseCap: no puede administrar la House.';

/** El `HouseCap` de la cuenta conectada: su ID y su dueño (la cuenta), normalizados. */
export type HouseCap = { id: string; owner: string };

/** Lo que `parseHouseCapObject` necesita de un objeto del SDK (`listOwnedObjects` con `include: { content: true }`). */
export type HouseCapObjectInput = Pick<SuiClientTypes.Object<{ content: true }>, 'objectId' | 'type' | 'owner' | 'content'>;

// Layout BCS de `house::HouseCap` (`contracts/sources/house.move`): solo el `UID`, una dirección de 32 bytes.
const HouseCapBcs = bcs.struct('HouseCap', { id: bcs.Address });

/** Tipo Move normalizado de `HouseCap` para el paquete original (los tipos conservan el ID original tras un upgrade). */
export function houseCapType(originalPackageId: string): string {
  return normalizeStructTag(`${originalPackageId}::house::HouseCap`);
}

/**
 * La dirección dueña de un objeto, o `null` si no es de una dirección. El tipo del SDK dice que `owner` nunca es `null`,
 * pero `mapOwner` lo devuelve ante un dueño que no reconoce (V-5): por eso se acepta `null` aquí.
 */
function addressOwnerOf(owner: SuiClientTypes.ObjectOwner | null): string | null {
  return owner !== null && owner.$kind === 'AddressOwner' ? owner.AddressOwner : null;
}

/**
 * Convierte un objeto del nodo en `HouseCap` de `owner`. Exige tipo exacto, dueño `AddressOwner` = `owner`, BCS canónico
 * y `id` = `objectId`. Lanza `ReadDataError` (`wrong_type`, `invariant` o `malformed`); nunca da por buena una lectura
 * dudosa, porque decide si la cuenta ve el panel de admin.
 */
export function parseHouseCapObject(
  object: HouseCapObjectInput,
  { originalPackageId, owner }: { originalPackageId: string; owner: string },
): HouseCap {
  const expected = houseCapType(originalPackageId);
  if (!isExactType(object.type, expected)) {
    throw new ReadDataError('wrong_type', `se esperaba ${expected} y llegó ${object.type}`);
  }
  const addressOwner = addressOwnerOf(object.owner);
  if (addressOwner === null || !sameAddress(addressOwner, owner)) {
    throw new ReadDataError('invariant', `el HouseCap no es de la cuenta ${owner}`);
  }
  const raw = parseExactBcs(HouseCapBcs, object.content, 'HouseCap');
  if (!sameAddress(raw.id, object.objectId)) {
    throw new ReadDataError('invariant', `el id del HouseCap ${raw.id} no es su objectId ${object.objectId}`);
  }
  return { id: raw.id, owner: normalizeSuiAddress(addressOwner) };
}

/**
 * Busca el `HouseCap` de `owner` por tipo en el índice de dueños del nodo (D-1, H-1), con la **regla de certeza**: `null`
 * ("esta cuenta no lo tiene") solo si no apareció ninguno y el nodo dijo que no hay más páginas. Dos o más ⇒ invariante
 * roto (el contrato crea uno solo). Si el tope de páginas o un cursor `null` cortan la búsqueda sin esa respuesta ⇒
 * `ReadDataError('incomplete')`, nunca `null`. Cada pedido lleva el corte de `withReadTimeout`.
 */
export async function fetchHouseCap(
  client: Pick<SuiGrpcClient, 'listOwnedObjects'>,
  { owner, originalPackageId, signal }: { owner: string; originalPackageId: string; signal?: AbortSignal },
): Promise<HouseCap | null> {
  const type = houseCapType(originalPackageId);
  const found: HouseCapObjectInput[] = [];
  let cursor: string | null = null;
  for (let page = 1; ; page++) {
    const pageCursor: string | null = cursor;
    const result: SuiClientTypes.ListOwnedObjectsResponse<{ content: true }> = await withReadTimeout(signal, (abort) =>
      client.listOwnedObjects({
        owner,
        type,
        limit: HOUSE_CAP_PAGE_SIZE,
        include: { content: true },
        ...(pageCursor === null ? {} : { cursor: pageCursor }),
        signal: abort,
      }),
    );
    found.push(...result.objects);
    if (found.length >= 2) {
      throw new ReadDataError('invariant', `la cuenta tiene ${String(found.length)} o más HouseCap`);
    }
    if (!result.hasNextPage) break;
    if (result.cursor === null) {
      throw new ReadDataError('incomplete', 'el nodo indicó más páginas sin cursor');
    }
    if (page === HOUSE_CAP_MAX_PAGES) {
      throw new ReadDataError('incomplete', `sin respuesta cierta en ${String(HOUSE_CAP_MAX_PAGES)} páginas`);
    }
    cursor = result.cursor;
  }
  const [only] = found;
  return only === undefined ? null : parseHouseCapObject(only, { originalPackageId, owner });
}

/**
 * `precheck` de las acciones de admin (H-3): lee el cap por ID en el store de objetos, que va por delante del índice de
 * dueños (V-12), sin `listOwnedObjects`. `'owned'` si existe, es del tipo exacto y su dueño `AddressOwner` es `owner`;
 * `'not_owned'` si el tipo o el dueño no cumplen o si el nodo dice que no existe (`ObjectError` `notFound`/`deleted`).
 * Cualquier otro error (también `ObjectError` `unknown` y el corte por tiempo) se relanza: no prueba que el cap se perdió.
 */
export async function checkHouseCapOwnership(
  client: Pick<SuiGrpcClient, 'getObject'>,
  { capId, owner, originalPackageId, signal }: { capId: string; owner: string; originalPackageId: string; signal?: AbortSignal },
): Promise<'owned' | 'not_owned'> {
  let object;
  try {
    ({ object } = await withReadTimeout(signal, (abort) =>
      client.getObject({ objectId: capId, include: { content: false }, signal: abort }),
    ));
  } catch (error) {
    if (error instanceof ObjectError && (error.reason === 'notFound' || error.reason === 'deleted')) return 'not_owned';
    throw error;
  }
  if (!isExactType(object.type, houseCapType(originalPackageId))) return 'not_owned';
  const addressOwner = addressOwnerOf(object.owner);
  return addressOwner !== null && sameAddress(addressOwner, owner) ? 'owned' : 'not_owned';
}
