import { bcs, type BcsType } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { normalizeStructTag } from '@mysten/sui/utils';
import { ReadDataError } from './readErrors';

/** Estado de una partida (`game::GameState`). */
export type GameState = { kind: 'pending' } | { kind: 'cancelled' } | { kind: 'resolved'; acceptor: string; winner: string };

/** Partida leída del objeto `game::Game` (montos en MIST como `bigint`, PROY-12). */
export type Game = {
  id: string;
  version: bigint;
  houseId: string;
  creator: string;
  opponent: string | null;
  bet: bigint;
  stake: bigint;
  feeRate: number;
  state: GameState;
};

/** Lo que `parseGameObject` necesita de un objeto del SDK (`getObjects` con `include: { content: true }`). */
export type GameObjectInput = Pick<SuiClientTypes.Object<{ content: true }>, 'type' | 'owner' | 'content'>;

/** Denominador de los basis points de la comisión (LIM-6). */
const BPS_DENOMINATOR = 10_000n;

// Layout BCS de `contracts/sources/game.move` (orden de campos fijo; se congela con la publicación, PROY-10).
// `UID`/`ID` se serializan como una dirección de 32 bytes y `Balance<SUI>` como su `value: u64`.
const GameStateBcs = bcs.enum('GameState', {
  Pending: null,
  Cancelled: null,
  Resolved: bcs.struct('GameStateResolved', { acceptor: bcs.Address, winner: bcs.Address }),
});
const GameBcs = bcs.struct('Game', {
  id: bcs.Address,
  version: bcs.u64(),
  house_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  stake: bcs.u64(),
  fee_rate: bcs.u16(),
  state: GameStateBcs,
});

/**
 * Parsea BCS exigiendo la forma canónica: además de que `parse` no lance (variante desconocida, bytes truncados),
 * re-serializa y compara byte a byte, porque `@mysten/bcs` acepta bytes sobrantes sin error (DL-1).
 */
export function parseExactBcs<T extends Input, Input>(schema: BcsType<T, Input>, bytes: Uint8Array, what: string): T {
  let parsed: T;
  try {
    parsed = schema.parse(bytes);
  } catch (error) {
    throw new ReadDataError('malformed', `${what}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const reserialized = schema.serialize(parsed).toBytes();
  const identical = reserialized.length === bytes.length && reserialized.every((byte, i) => byte === bytes[i]);
  if (!identical) {
    throw new ReadDataError('malformed', `${what}: los bytes no son la serialización canónica`);
  }
  return parsed;
}

/**
 * Compara un tipo Move recibido con el esperado, normalizando el recibido. Un tipo que ni siquiera se puede
 * normalizar cuenta como tipo equivocado.
 */
export function isExactType(received: string, expected: string): boolean {
  try {
    return normalizeStructTag(received) === expected;
  } catch {
    return false;
  }
}

/** Tipo Move normalizado de `Game` para el paquete original (DL-9: los tipos conservan el ID original tras un upgrade). */
export function gameType(originalPackageId: string): string {
  return normalizeStructTag(`${originalPackageId}::game::Game`);
}

/**
 * Convierte un objeto del nodo en `Game`. Exige tipo exacto y dueño compartido, BCS canónico y los invariantes que
 * garantiza `game.move`: `stake == bet` en `Pending`, `stake == 0` en `Cancelled`/`Resolved` y
 * `winner ∈ {creator, acceptor}`. `fee_rate <= 1000` **no** se valida: es `house::MAX_FEE_BPS`, de otro módulo y
 * modificable en un upgrade (`agents.md` §5). Lanza `ReadDataError`; nunca devuelve un `Pending` por defecto (SEG-10).
 */
export function parseGameObject(object: GameObjectInput, originalPackageId: string): Game {
  if (!isExactType(object.type, gameType(originalPackageId))) {
    throw new ReadDataError('wrong_type', `se esperaba ${gameType(originalPackageId)} y llegó ${object.type}`);
  }
  if (object.owner.$kind !== 'Shared') {
    throw new ReadDataError('not_shared', `el Game tiene dueño ${object.owner.$kind}`);
  }
  const raw = parseExactBcs(GameBcs, object.content, 'Game');
  const bet = BigInt(raw.bet);
  const stake = BigInt(raw.stake);

  let state: GameState;
  switch (raw.state.$kind) {
    case 'Pending':
      if (stake !== bet) throw new ReadDataError('invariant', `Pending con stake ${String(stake)} ≠ bet ${String(bet)}`);
      state = { kind: 'pending' };
      break;
    case 'Cancelled':
      if (stake !== 0n) throw new ReadDataError('invariant', `Cancelled con stake ${String(stake)}`);
      state = { kind: 'cancelled' };
      break;
    case 'Resolved': {
      const { acceptor, winner } = raw.state.Resolved;
      if (stake !== 0n) throw new ReadDataError('invariant', `Resolved con stake ${String(stake)}`);
      if (winner !== raw.creator && winner !== acceptor) {
        throw new ReadDataError('invariant', 'el ganador no es ni el creador ni el aceptante');
      }
      state = { kind: 'resolved', acceptor, winner };
      break;
    }
  }

  return {
    id: raw.id,
    version: BigInt(raw.version),
    houseId: raw.house_id,
    creator: raw.creator,
    opponent: raw.opponent ?? null,
    bet,
    stake,
    feeRate: raw.fee_rate,
    state,
  };
}

/**
 * Montos de la resolución de una partida: pozo `2 × bet`, comisión `⌊pozo × feeRate / 10_000⌋` (hacia abajo) y pago
 * `pozo − comisión`.
 *
 * Fórmula de la v1 del contrato (D-20261030-16 D2/D3). Si un upgrade la cambia, las partidas resueltas con el código
 * viejo siguen necesitando esta fórmula: el issue del upgrade la conserva (por versión del `Game` o leyendo el evento)
 * en el mismo PR (`agents.md` §5).
 */
export function resolutionAmounts(bet: bigint, feeRate: number): { pot: bigint; fee: bigint; payout: bigint } {
  const pot = 2n * bet;
  const fee = (pot * BigInt(feeRate)) / BPS_DENOMINATOR;
  return { pot, fee, payout: pot - fee };
}
