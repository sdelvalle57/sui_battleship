import { bcs } from '@mysten/sui/bcs';
import { normalizeStructTag } from '@mysten/sui/utils';
import { isExactType, parseExactBcs, type GameObjectInput } from './game';
import { ReadDataError } from './readErrors';

// Lectura del objeto `battleship::duel::Duel<G>` (#73, TASK-7a): la base común de los juegos 1 vs 1 con reloj por jugada.
// Espejo del layout congelado por el upgrade (R.1 del handoff, `contracts/sources/duel.move`): el orden de campos y de
// variantes no se cambia nunca (PROY-2, P-13).

/**
 * Máscara de `to_move` (P-13 (v), fija en toda versión futura): quién debe mover. `1` = el creador, `2` = el aceptante y
 * `3` = ambos a la vez (fase simultánea). El `0` solo existe dentro de la transacción de un `activate_atomic`.
 */
export const TO_MOVE_CREATOR = 1;
export const TO_MOVE_ACCEPTOR = 2;
export const TO_MOVE_BOTH = 3;

/** Máscara de un `Active` persistido o de una jugada: solo `1..=3` (INV-D7). */
export function isValidToMove(toMove: number): boolean {
  return toMove >= TO_MOVE_CREATOR && toMove <= TO_MOVE_BOTH;
}

/** Estado de un duelo (`duel::DuelState`, seis variantes en este orden). */
export type DuelState =
  | { kind: 'pending' }
  | { kind: 'cancelled' }
  | { kind: 'active'; acceptor: string; toMove: number; deadlineMs: bigint }
  | { kind: 'resolved'; acceptor: string; winner: string }
  | { kind: 'timed_out'; acceptor: string; winner: string }
  | { kind: 'expired'; acceptor: string };

/**
 * Duelo leído del objeto `duel::Duel<G>` (montos en MIST y plazos en ms como `bigint`, PROY-12). `turnMs` es el que trae
 * la cadena, **sin** contrastarlo con la tabla de controles: lo que no esté en el espejo se muestra en formato genérico
 * (`controlLabel` de `gameRegistry.ts`).
 */
export type Duel = {
  id: string;
  version: bigint;
  houseId: string;
  creator: string;
  opponent: string | null;
  bet: bigint;
  stake: bigint;
  feeRate: number;
  turnMs: bigint;
  state: DuelState;
};

/** Lo que `parseDuelObject` necesita de un objeto del SDK (`getObjects` con `include: { content: true }`). */
export type DuelObjectInput = GameObjectInput;

// Layout BCS de `contracts/sources/duel.move`. `UID`/`ID` se serializan como una dirección de 32 bytes y `Balance<SUI>`
// como su `value: u64`; `G` es `phantom` y no aporta bytes.
const DuelStateBcs = bcs.enum('DuelState', {
  Pending: null,
  Cancelled: null,
  Active: bcs.struct('DuelStateActive', { acceptor: bcs.Address, to_move: bcs.u8(), deadline_ms: bcs.u64() }),
  Resolved: bcs.struct('DuelStateResolved', { acceptor: bcs.Address, winner: bcs.Address }),
  TimedOut: bcs.struct('DuelStateTimedOut', { acceptor: bcs.Address, winner: bcs.Address }),
  Expired: bcs.struct('DuelStateExpired', { acceptor: bcs.Address }),
});
const DuelBcs = bcs.struct('Duel', {
  id: bcs.Address,
  version: bcs.u64(),
  house_id: bcs.Address,
  creator: bcs.Address,
  opponent: bcs.option(bcs.Address),
  bet: bcs.u64(),
  stake: bcs.u64(),
  fee_rate: bcs.u16(),
  turn_ms: bcs.u64(),
  state: DuelStateBcs,
});

/**
 * Tipo Move normalizado de `Duel<G>`: `<ID de definición de duel::Duel>::duel::Duel<<tag de G>>`. Los dos IDs salen de
 * `typeOrigins` (para un módulo introducido en un upgrade, el ID del upgrade que lo introduce; H-2) y pueden ser distintos.
 */
export function duelType(duelDefiningId: string, gameTag: string): string {
  return normalizeStructTag(`${duelDefiningId}::duel::Duel<${gameTag}>`);
}

/**
 * Convierte un objeto del nodo en `Duel`. Exige el tipo exacto `expectedType` (ver `duelType`: un `Duel` de otro juego es
 * otro tipo) y dueño compartido, BCS canónico y los invariantes que garantiza `duel.move` (R.6): `stake == bet` en
 * `Pending`, `stake == 2 × bet` en `Active`, `stake == 0` en los estados finales, `turn_ms > 0` y `to_move ∈ 1..=3` en
 * `Active` (un `Active` sin reloj solo vive dentro de la transacción de un `activate_atomic`, INV-D5) y
 * `winner ∈ {creator, acceptor}`. `turn_ms` **no** se valida contra la tabla de controles: la cadena manda. `fee_rate <=
 * 1000` tampoco: es `house::MAX_FEE_BPS`, de otro módulo y modificable en un upgrade (`agents.md` §5). Lanza
 * `ReadDataError`; nunca devuelve un `Pending` por defecto (SEG-10).
 */
export function parseDuelObject(object: DuelObjectInput, expectedType: string): Duel {
  if (!isExactType(object.type, expectedType)) {
    throw new ReadDataError('wrong_type', `se esperaba ${expectedType} y llegó ${object.type}`);
  }
  if (object.owner.$kind !== 'Shared') {
    throw new ReadDataError('not_shared', `el Duel tiene dueño ${object.owner.$kind}`);
  }
  const raw = parseExactBcs(DuelBcs, object.content, 'Duel');
  const bet = BigInt(raw.bet);
  const stake = BigInt(raw.stake);
  const turnMs = BigInt(raw.turn_ms);

  let state: DuelState;
  switch (raw.state.$kind) {
    case 'Pending':
      if (stake !== bet) throw new ReadDataError('invariant', `Pending con stake ${String(stake)} ≠ bet ${String(bet)}`);
      state = { kind: 'pending' };
      break;
    case 'Cancelled':
      assertEmptyStake(stake, 'Cancelled');
      state = { kind: 'cancelled' };
      break;
    case 'Active': {
      const { acceptor, to_move: toMove, deadline_ms: deadlineMs } = raw.state.Active;
      if (stake !== 2n * bet) throw new ReadDataError('invariant', `Active con stake ${String(stake)} ≠ 2 × bet ${String(bet)}`);
      if (turnMs === 0n) throw new ReadDataError('invariant', 'Active sin reloj (turn_ms = 0): no se persiste');
      if (!isValidToMove(toMove)) throw new ReadDataError('invariant', `Active con to_move ${String(toMove)} fuera de 1..=3`);
      state = { kind: 'active', acceptor, toMove, deadlineMs: BigInt(deadlineMs) };
      break;
    }
    case 'Resolved': {
      const { acceptor, winner } = raw.state.Resolved;
      assertEmptyStake(stake, 'Resolved');
      assertWinner(winner, raw.creator, acceptor);
      state = { kind: 'resolved', acceptor, winner };
      break;
    }
    case 'TimedOut': {
      const { acceptor, winner } = raw.state.TimedOut;
      assertEmptyStake(stake, 'TimedOut');
      assertWinner(winner, raw.creator, acceptor);
      state = { kind: 'timed_out', acceptor, winner };
      break;
    }
    case 'Expired': {
      const { acceptor } = raw.state.Expired;
      assertEmptyStake(stake, 'Expired');
      state = { kind: 'expired', acceptor };
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
    turnMs,
    state,
  };
}

function assertEmptyStake(stake: bigint, variant: string): void {
  if (stake !== 0n) throw new ReadDataError('invariant', `${variant} con stake ${String(stake)}`);
}

/** El ganador de un estado final (o de un evento de cierre) es siempre uno de los dos jugadores. */
export function assertWinner(winner: string, creator: string, acceptor: string): void {
  if (winner !== creator && winner !== acceptor) {
    throw new ReadDataError('invariant', 'el ganador no es ni el creador ni el aceptante');
  }
}
