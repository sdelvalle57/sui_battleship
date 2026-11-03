import { bcs } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import { normalizeStructTag } from '@mysten/sui/utils';
import { isExactType, parseExactBcs } from './game';
import { ReadDataError } from './readErrors';
import { withReadTimeout } from './readPolicy';

/** Configuración de la House leída del objeto `house::House` (montos en MIST como `bigint`, PROY-12). */
export type House = {
  id: string;
  version: bigint;
  feeRate: number;
  feesCollected: bigint;
  minBet: bigint;
  maxBet: bigint;
};

/** Lo que `parseHouseObject` necesita de un objeto del SDK (`getObject` con `include: { content: true }`). */
export type HouseObjectInput = Pick<SuiClientTypes.Object<{ content: true }>, 'type' | 'owner' | 'content'>;

// Layout BCS de `contracts/sources/house.move` (orden de campos fijo; se congela con la publicación, PROY-10).
// `UID` se serializa como una dirección de 32 bytes y `Balance<SUI>` como su `value: u64`.
const HouseBcs = bcs.struct('House', {
  id: bcs.Address,
  version: bcs.u64(),
  fee_rate: bcs.u16(),
  fees_collected: bcs.u64(),
  min_bet: bcs.u64(),
  max_bet: bcs.u64(),
});

/** Tipo Move normalizado de `House` para el paquete original (los tipos conservan el ID original tras un upgrade). */
export function houseType(originalPackageId: string): string {
  return normalizeStructTag(`${originalPackageId}::house::House`);
}

/**
 * Convierte un objeto del nodo en `House`. Exige tipo exacto y dueño compartido, BCS canónico y los invariantes de
 * `house.move`: `0 < min_bet <= max_bet`. `fee_rate <= 1000` **no** se valida: es `house::MAX_FEE_BPS`, modificable en
 * un upgrade (`agents.md` §5); la comisión que vale es la que guarda cada partida. Lanza `ReadDataError`.
 */
export function parseHouseObject(object: HouseObjectInput, originalPackageId: string): House {
  const expected = houseType(originalPackageId);
  if (!isExactType(object.type, expected)) {
    throw new ReadDataError('wrong_type', `se esperaba ${expected} y llegó ${object.type}`);
  }
  if (object.owner.$kind !== 'Shared') {
    throw new ReadDataError('not_shared', `la House tiene dueño ${object.owner.$kind}`);
  }
  const raw = parseExactBcs(HouseBcs, object.content, 'House');
  const minBet = BigInt(raw.min_bet);
  const maxBet = BigInt(raw.max_bet);
  if (minBet === 0n) throw new ReadDataError('invariant', 'min_bet es 0');
  if (minBet > maxBet) {
    throw new ReadDataError('invariant', `min_bet ${String(minBet)} > max_bet ${String(maxBet)}`);
  }
  return {
    id: raw.id,
    version: BigInt(raw.version),
    feeRate: raw.fee_rate,
    feesCollected: BigInt(raw.fees_collected),
    minBet,
    maxBet,
  };
}

/**
 * Lee la House por ID (DL-8: límites y comisión del formulario; M-2: relectura antes de firmar). Un `ObjectError` (no
 * existe) se relanza tal cual: no es transitorio, así que la política de lecturas no lo reintenta.
 */
export async function fetchHouse(
  client: Pick<SuiGrpcClient, 'getObject'>,
  { houseId, originalPackageId, signal }: { houseId: string; originalPackageId: string; signal?: AbortSignal },
): Promise<House> {
  const { object } = await withReadTimeout(signal, (abort) =>
    client.getObject({ objectId: houseId, include: { content: true }, signal: abort }),
  );
  return parseHouseObject(object, originalPackageId);
}
