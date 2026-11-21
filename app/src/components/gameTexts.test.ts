import { describe, expect, it } from 'vitest';
import type { DuelGameRow } from '../hooks/gameRow';
import type { DeadlinePhase } from '../hooks/useChainNow';
import type { DuelState } from '../sui/duel';
import { shortAddress } from '../sui/format';
import { CLAIM_GRACE_MS } from '../sui/gameRegistry';
import type { ExpiredGame, TimedOutGame } from '../sui/gameTx';
import { ACCEPTOR, CREATOR, GAME_ID, INVITEE, THIRD, activeState, duelRow } from '../test/duelRows';
import {
  ACTION_TEXT,
  BOTH_NOTE,
  GRACE_NOTE,
  GRACE_TEXT,
  NOT_YET_PREFIX,
  SOURCE_TEXT,
  STATE_TEXT,
  UNAVAILABLE_TEXT,
  asActiveDuel,
  claimDescription,
  claimedText,
  controlText,
  expiredText,
  expiryAnnouncement,
  nextStepText,
  refundDescription,
  refundedText,
  stateSentence,
  timedOutText,
  turnText,
  viewerOf,
  winnerOnTimeout,
} from './gameTexts';

/** Lo que nunca puede verse en pantalla (UX-6): jerga del contrato. */
const CONTRACT_JARGON = /claim_timeout|refund_stalled|to_move|deadline_ms|TimedOut|Expired|DuelState/;

const DEADLINE = 1_800_000_000_000n;
const PHASES: DeadlinePhase[] = ['unknown', 'running', 'expired', 'stalled'];
const ACCOUNTS: [string, string | null][] = [
  ['sin cuenta', null],
  ['creador', CREATOR],
  ['aceptante', ACCEPTOR],
  ['invitado', INVITEE],
  ['tercero', THIRD],
];

function activeRow(toMove: number): DuelGameRow & { state: Extract<DuelState, { kind: 'active' }> } {
  const row = asActiveDuel(duelRow(activeState(toMove, DEADLINE), { opponent: INVITEE }));
  if (row === null) throw new Error('debe ser una partida activa');
  return row;
}

describe('verbs and states (UX-6)', () => {
  it('UX-6: keeps the fixed verbs and the three states 8b adds, in one module', () => {
    expect(ACTION_TEXT).toEqual({ accept: 'Aceptar', cancel: 'Cancelar', reject: 'Rechazar', claim: 'Reclamar victoria', refund: 'Reembolsar' });
    expect(STATE_TEXT).toEqual({
      active: 'En juego',
      timedOut: 'Ganó por tiempo',
      expired: 'Nadie movió a tiempo: cada jugador recuperó su apuesta',
    });
    expect(SOURCE_TEXT).toEqual({ legacy: 'anterior', duel: 'nueva' });
  });

  it('UX-6: the grace text mirrors CLAIM_GRACE_MS (7 days)', () => {
    expect(CLAIM_GRACE_MS).toBe(7n * 24n * 60n * 60n * 1000n);
    expect(GRACE_TEXT).toBe('7 días');
  });

  it('UX-6: the time control reads "sin reloj" for the previous source and the label for the new one', () => {
    expect(controlText({ ...duelRow({ kind: 'pending' }), source: 'legacy', control: null })).toBe('sin reloj');
    expect(controlText(duelRow({ kind: 'pending' }))).toBe('10 min por jugada');
    expect(controlText(duelRow({ kind: 'pending' }, { control: { id: 0, turnMs: 0n, label: 'sin reloj' } }))).toBe('sin reloj');
  });
});

describe('who is who (UX-1)', () => {
  it.each([
    [null, 'none'],
    [CREATOR, 'creator'],
    [ACCEPTOR, 'acceptor'],
    [INVITEE, 'invitee'],
    [THIRD, 'other'],
  ])('reads %s as %s in an active game with an invitation', (account, expected) => {
    expect(viewerOf(activeRow(1), account)).toBe(expected);
  });
});

describe('the turn (UX-1)', () => {
  it('UX-1: "Te toca a ti" for the one who must move, "Le toca a <contraparte>" for the other and "Les toca a los dos"', () => {
    const creatorMoves = activeRow(1);
    expect(turnText(creatorMoves, creatorMoves.state, CREATOR)).toBe('Te toca a ti');
    expect(turnText(creatorMoves, creatorMoves.state, ACCEPTOR)).toBe(`Le toca a ${shortAddress(CREATOR)}`);
    const acceptorMoves = activeRow(2);
    expect(turnText(acceptorMoves, acceptorMoves.state, ACCEPTOR)).toBe('Te toca a ti');
    expect(turnText(acceptorMoves, acceptorMoves.state, CREATOR)).toBe(`Le toca a ${shortAddress(ACCEPTOR)}`);
    const both = activeRow(3);
    for (const [, account] of ACCOUNTS) expect(turnText(both, both.state, account)).toBe('Les toca a los dos');
  });

  it('UX-1: an account that does not play (or has none) is told whose turn it is by role', () => {
    const creatorMoves = activeRow(1);
    expect(turnText(creatorMoves, creatorMoves.state, THIRD)).toBe(`Le toca a ${shortAddress(CREATOR)} (quien creó la partida)`);
    expect(turnText(creatorMoves, creatorMoves.state, null)).toBe(`Le toca a ${shortAddress(CREATOR)} (quien creó la partida)`);
    const acceptorMoves = activeRow(2);
    expect(turnText(acceptorMoves, acceptorMoves.state, THIRD)).toBe(`Le toca a ${shortAddress(ACCEPTOR)} (quien la aceptó)`);
  });

  it('who wins on a timeout: the rival of the one who had to move, and nobody when both had to', () => {
    expect(winnerOnTimeout(activeRow(1), activeRow(1).state)).toBe(ACCEPTOR);
    expect(winnerOnTimeout(activeRow(2), activeRow(2).state)).toBe(CREATOR);
    expect(winnerOnTimeout(activeRow(3), activeRow(3).state)).toBeNull();
  });
});

describe('what comes next, for every state and account (UX-1, UX-5, UX-6)', () => {
  const states: [string, DuelState, string | null][] = [
    ['pending (open)', { kind: 'pending' }, null],
    ['pending (invitation)', { kind: 'pending' }, INVITEE],
    ['cancelled', { kind: 'cancelled' }, null],
    ['resolved', { kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR }, null],
    ['timed out', { kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR }, null],
    ['expired', { kind: 'expired', acceptor: ACCEPTOR }, null],
    ['active (creator to move)', activeState(1, DEADLINE), null],
    ['active (acceptor to move)', activeState(2, DEADLINE), null],
    ['active (both)', activeState(3, DEADLINE), null],
  ];

  it('UX-1: every state × account × phase has a sentence that says what comes next, in Spanish and without contract jargon', () => {
    for (const [name, state, opponent] of states) {
      const row = duelRow(state, { opponent });
      expect(stateSentence(row), name).toMatch(/^La partida /);
      expect(stateSentence(row), name).not.toMatch(CONTRACT_JARGON);
      for (const [who, account] of ACCOUNTS) {
        for (const phase of PHASES) {
          const next = nextStepText(row, account, phase);
          expect(next.length, `${name} / ${who} / ${phase}`).toBeGreaterThan(20);
          expect(next, `${name} / ${who} / ${phase}`).not.toMatch(CONTRACT_JARGON);
          expect(next).toMatch(/[.!]$/);
        }
      }
    }
  });

  it.each([
    ['sin cuenta', null, 'Conecta tu wallet para aceptar la partida.'],
    ['creador', CREATOR, 'Espera a que alguien la acepte; mientras tanto puedes cancelarla y recuperar tu apuesta.'],
    ['tercero', THIRD, 'Puedes aceptar la partida apostando lo mismo que quien la creó.'],
  ])('UX-1: pending (open) for %s', (_who, account, text) => {
    expect(nextStepText(duelRow({ kind: 'pending' }), account, 'unknown')).toBe(text);
  });

  it.each([
    ['sin cuenta', null, 'Es una invitación: conecta tu wallet para ver si es para ti.'],
    ['creador', CREATOR, `Espera a que ${shortAddress(INVITEE)} la acepte; mientras tanto puedes cancelarla y recuperar tu apuesta.`],
    ['invitado', INVITEE, 'Te invitaron: puedes aceptar la partida apostando lo mismo o rechazarla.'],
    ['tercero', THIRD, 'Es una invitación para otra cuenta: solo ella puede aceptarla.'],
  ])('UX-1: pending (invitation) for %s', (_who, account, text) => {
    expect(nextStepText(duelRow({ kind: 'pending' }, { opponent: INVITEE }), account, 'unknown')).toBe(text);
  });

  it('UX-1: cancelled and resolved say that nothing is left to do, and who won', () => {
    expect(nextStepText(duelRow({ kind: 'cancelled' }), CREATOR, 'unknown')).toBe(
      'La partida se canceló y la apuesta volvió a quien la creó. No hay nada más que hacer.',
    );
    const resolved = duelRow({ kind: 'resolved', acceptor: ACCEPTOR, winner: CREATOR });
    expect(nextStepText(resolved, CREATOR, 'unknown')).toBe('Ganaste el sorteo y se te pagó. No hay nada más que hacer.');
    expect(nextStepText(resolved, ACCEPTOR, 'unknown')).toBe('Perdiste el sorteo: el pozo fue para tu rival. No hay nada más que hacer.');
    expect(nextStepText(resolved, THIRD, 'unknown')).toBe('Ya se sorteó y se pagó al ganador. No hay nada más que hacer.');
  });

  it('UX-1: timed out says who won by time, what they received and that nothing is left to do', () => {
    const row = duelRow({ kind: 'timed_out', acceptor: ACCEPTOR, winner: ACCEPTOR });
    expect(nextStepText(row, ACCEPTOR, 'unknown')).toBe(
      'Ganaste por tiempo: tu rival no movió a tiempo. Recibiste 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI). No hay nada más que hacer.',
    );
    expect(nextStepText(row, CREATOR, 'unknown')).toBe(
      'Perdiste por tiempo: no moviste a tiempo. Tu rival recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI). No hay nada más que hacer.',
    );
    expect(nextStepText(row, THIRD, 'unknown')).toBe(
      `Ganó por tiempo ${shortAddress(ACCEPTOR)}: su rival no movió a tiempo. Recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI). No hay nada más que hacer.`,
    );
    expect(timedOutText(row, ACCEPTOR, null)).toMatch(/^Ganó por tiempo /);
  });

  it('UX-1: expired says that each player got their bet back, without a fee', () => {
    const row = duelRow({ kind: 'expired', acceptor: ACCEPTOR });
    expect(expiredText(row)).toBe('Nadie movió a tiempo: cada jugador recuperó su apuesta (0.002 SUI). Sin comisión.');
    expect(nextStepText(row, CREATOR, 'unknown')).toBe(`${expiredText(row)} No hay nada más que hacer.`);
  });

  it('UX-1: an active game tells each account what to do in each phase of the deadline', () => {
    const one = duelRow(activeState(1, DEADLINE));
    expect(nextStepText(one, CREATOR, 'running')).toBe('Es tu turno: mueve antes de que venza el plazo o tu rival podrá reclamar la victoria.');
    expect(nextStepText(one, ACCEPTOR, 'running')).toBe('Espera a que mueva tu rival; si no lo hace a tiempo, podrás reclamar la victoria.');
    expect(nextStepText(one, THIRD, 'running')).toMatch(/^Partida en curso: si vence el plazo, cualquiera podrá reclamar la victoria/);
    expect(nextStepText(one, CREATOR, 'expired')).toBe('Se te venció el plazo: tu rival ya puede reclamar la victoria y no puedes mover.');
    expect(nextStepText(one, ACCEPTOR, 'expired')).toBe('Tu rival no movió a tiempo: ya puedes reclamar la victoria.');
    expect(nextStepText(one, THIRD, 'expired')).toBe(`Venció el plazo: cualquiera puede reclamar la victoria, que cobra ${shortAddress(ACCEPTOR)}.`);
    expect(nextStepText(one, ACCEPTOR, 'stalled')).toBe(
      `Pasó la espera de ${GRACE_TEXT} tras el plazo: ya se puede reclamar la victoria o reembolsar a cada jugador su apuesta.`,
    );
    expect(nextStepText(one, ACCEPTOR, 'unknown')).toBe('Leyendo la hora de la red para saber si venció el plazo.');
    const both = duelRow(activeState(3, DEADLINE));
    expect(nextStepText(both, CREATOR, 'running')).toMatch(/^Les toca a los dos: muevan antes de que venza el plazo/);
    expect(nextStepText(both, THIRD, 'running')).toMatch(/^Les toca a los dos: si el plazo vence sin que muevan/);
    expect(nextStepText(both, CREATOR, 'expired')).toBe('Venció el plazo y nadie movió: ya se puede reembolsar a cada jugador su apuesta.');
  });

  it('UX-4: announces the expiry once, only after the deadline, with the action that is now possible', () => {
    const one = activeRow(1);
    const both = activeRow(3);
    expect(expiryAnnouncement(one.state, 'unknown')).toBeNull();
    expect(expiryAnnouncement(one.state, 'running')).toBeNull();
    expect(expiryAnnouncement(one.state, 'expired')).toBe('Venció el plazo: ya se puede reclamar la victoria.');
    expect(expiryAnnouncement(one.state, 'stalled')).toBe('Venció el plazo: ya se puede reclamar la victoria.');
    expect(expiryAnnouncement(both.state, 'expired')).toBe('Venció el plazo: ya se puede reembolsar la partida.');
  });
});

describe('what happens with the funds, and why a button is not available (UX-8, UX-9)', () => {
  it('UX-8: claiming says the pot minus the fee goes to whoever won by time, not necessarily to who executes it', () => {
    const one = activeRow(1);
    expect(claimDescription(one, one.state, THIRD)).toBe(
      `El pozo (0.004 SUI) menos la comisión (0.0001 SUI) va a ${shortAddress(ACCEPTOR)}; no necesariamente a quien ejecuta.`,
    );
    expect(claimDescription(one, one.state, ACCEPTOR)).toBe(
      'El pozo (0.004 SUI) menos la comisión (0.0001 SUI) va a ti; no necesariamente a quien ejecuta.',
    );
    const two = activeRow(2);
    expect(claimDescription(two, two.state, null)).toContain(shortAddress(CREATOR));
  });

  it('UX-8: refunding says that each player recovers their bet, without a fee', () => {
    expect(refundDescription(duelRow({ kind: 'pending' }))).toBe('Cada jugador recupera su apuesta (0.002 SUI). Sin comisión.');
  });

  it('UX-9: the reasons are plain Spanish, without contract jargon', () => {
    for (const reason of [...Object.values(UNAVAILABLE_TEXT), NOT_YET_PREFIX, GRACE_NOTE, BOTH_NOTE]) {
      expect(reason).not.toMatch(CONTRACT_JARGON);
    }
    expect(UNAVAILABLE_TEXT.no_account).toBe('Conecta tu wallet');
    expect(UNAVAILABLE_TEXT.done).toBe('Esta partida ya terminó');
    expect(NOT_YET_PREFIX).toBe('Aún no venció el plazo');
  });
});

describe('adopted results of a claim and a refund (UX-6, SEG-10)', () => {
  const claim: TimedOutGame = {
    gameId: GAME_ID,
    creator: CREATOR,
    acceptor: ACCEPTOR,
    winner: ACCEPTOR,
    pot: 4_000_000n,
    fee: 100_000n,
    payout: 3_900_000n,
    claimedBy: THIRD,
    transactionDigest: 'tx',
  };
  const refund: ExpiredGame = { gameId: GAME_ID, creator: CREATOR, acceptor: ACCEPTOR, refundEach: 2_000_000n, transactionDigest: 'tx' };

  it('says who won, what they received and that the payment is not for who executed it', () => {
    expect(claimedText(claim, ACCEPTOR)).toBe('¡Ganaste por tiempo! Recibiste 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)');
    expect(claimedText(claim, THIRD)).toBe(
      `Reclamo hecho: ganó por tiempo ${shortAddress(ACCEPTOR)}, el rival de quien no movió, y recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)`,
    );
    expect(claimedText(claim, CREATOR)).toBe(
      `${shortAddress(THIRD)} reclamó: ganó por tiempo ${shortAddress(ACCEPTOR)} y recibió 0.0039 SUI (pozo 0.004 SUI − comisión 0.0001 SUI)`,
    );
    expect(claimedText(claim, null)).toMatch(/reclamó: ganó por tiempo/);
  });

  it('says what each player recovered after a refund', () => {
    expect(refundedText(refund)).toBe('Reembolso hecho: cada jugador recuperó su apuesta (0.002 SUI). Sin comisión.');
  });

  it('with no readable event, it is an honest success that points to the detail', () => {
    expect(claimedText(null, ACCEPTOR)).toBe(
      'Reclamo enviado; no se pudo leer el resultado de la transacción: el detalle muestra cómo terminó la partida',
    );
    expect(refundedText(null)).toBe('Reembolso enviado; no se pudo leer el resultado de la transacción: el detalle muestra cómo terminó la partida');
  });

  it('UX-6: no adopted text has contract jargon', () => {
    for (const text of [claimedText(claim, ACCEPTOR), claimedText(claim, THIRD), claimedText(null, null), refundedText(refund), refundedText(null)]) {
      expect(text).not.toMatch(CONTRACT_JARGON);
    }
  });
});

describe('asActiveDuel', () => {
  it('narrows only an active game of the new source', () => {
    expect(asActiveDuel(duelRow(activeState(1, DEADLINE)))).not.toBeNull();
    expect(asActiveDuel(duelRow({ kind: 'pending' }))).toBeNull();
    expect(asActiveDuel({ ...duelRow(activeState(1, DEADLINE)), source: 'legacy', control: null })).toBeNull();
  });
});
