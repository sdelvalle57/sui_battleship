import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { rowControlOf, rowFromDuel, type GameRow } from '../hooks/gameRow';
import { duelType, parseDuelObject, type Duel } from '../sui/duel';
import { shortAddress } from '../sui/format';
import { definingIdOf, type TypeOrigin } from '../sui/gameRegistry';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { GameDetail } from './GameDetail';

// UX-1, UX-2 y UX-6 (#73, TASK-8b) con **objetos reales** capturados en la localnet aislada (`duel-clock`, una fixture de
// ENSAYO: solo el mecanismo del reloj; sus tiempos no son los de producción y ningún test toma de ella una constante de
// producción). Los valores salen del objeto leído, por valor: el plazo, las cuentas y la apuesta no se escriben acá.
type DuelInput = Parameters<typeof parseDuelObject>[0];
type FixtureObject = { objectId: string; version: string; owner: DuelInput['owner']; type: string; content: string };
/** base64 → bytes sin el SDK (components/ no importa `@mysten/*`). */
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
type ClockFixture = {
  _meta: { sandbox: boolean };
  ids: Record<string, unknown>;
  typeOrigins: TypeOrigin[];
  objects: Record<'activeOnePending' | 'activeBothPending' | 'timedOut' | 'expiredBothPending' | 'expiredOnePending', FixtureObject>;
};
const clock = import.meta.glob<ClockFixture>('../../../contracts/fixtures/duel-clock.localnet.json', { eager: true, import: 'default' })[
  '../../../contracts/fixtures/duel-clock.localnet.json'
] as ClockFixture;

// El juego de la fixture de ensayo no es el coinflip: el tag sale de `ids` (la única cadena con la forma de un tag de tipo).
const GAME_TAG = Object.values(clock.ids).find((value): value is string => typeof value === 'string' && /^0x[0-9a-f]{64}::\w+::\w+$/.test(value)) ?? '';
const DUEL_TYPE = duelType(definingIdOf(clock.typeOrigins, 'duel', 'Duel') ?? '', GAME_TAG);

function duelOf(name: keyof ClockFixture['objects']): Duel {
  const object = clock.objects[name];
  return parseDuelObject({ owner: object.owner, type: object.type, content: fromBase64(object.content) }, DUEL_TYPE);
}
function rowOf(duel: Duel): GameRow {
  return rowFromDuel(duel, 'coinflip', rowControlOf(duel.turnMs));
}
function view(row: GameRow, account: string | null, chainNowMs: number) {
  const fake = createFakeScreenClock();
  fake.sample(chainNowMs);
  render(withScreenClock(fake.clock, <GameDetail game={row} lastActivityMs={null} network="localnet" account={account} />));
}
const field = (name: string) => screen.getByText(name).nextElementSibling;

describe('GameDetail with the real objects of the clock fixture', () => {
  it('is the fixture of the trial game: it is marked as such', () => {
    expect(clock._meta.sandbox).toBe(true);
    expect(GAME_TAG).not.toBe('');
  });

  it('UX-1: an active game with one pending shows the turn of its creator, the time left and the next step', () => {
    const duel = duelOf('activeOnePending');
    if (duel.state.kind !== 'active') throw new Error('el objeto debe estar activo');
    const deadline = Number(duel.state.deadlineMs);
    view(rowOf(duel), duel.creator, deadline - 65_000);
    expect(field('Estado')).toHaveTextContent('En juego');
    expect(document.querySelector('.duel-turn')).toHaveTextContent('Te toca a ti');
    expect(screen.getByRole('timer')).toHaveTextContent('quedan 1 min 5 s');
    expect(document.querySelector('.duel-next')).toHaveTextContent('Es tu turno: mueve antes de que venza el plazo');
    expect(field('Aceptante')).toHaveTextContent(shortAddress(duel.state.acceptor));
  });

  it('UX-2: the time control of a value outside the mirror is written in the generic format, "<N> s por jugada"', () => {
    const duel = duelOf('activeOnePending');
    view(rowOf(duel), null, Number((duel.state as { deadlineMs: bigint }).deadlineMs) - 1_000);
    expect(field('Reloj')).toHaveTextContent(new RegExp(`^${String(duel.turnMs / 1_000n)} s por jugada$`));
  });

  it('UX-1: once the deadline passed, the account that was waiting is told to claim', () => {
    const duel = duelOf('activeOnePending');
    if (duel.state.kind !== 'active') throw new Error('el objeto debe estar activo');
    view(rowOf(duel), duel.state.acceptor, Number(duel.state.deadlineMs) + 30_000);
    expect(screen.getByRole('timer')).toHaveTextContent('venció hace 30 s');
    expect(document.querySelector('.duel-next')).toHaveTextContent('Tu rival no movió a tiempo: ya puedes reclamar la victoria.');
  });

  it('UX-1: an active game with both pending says both have to move', () => {
    const duel = duelOf('activeBothPending');
    if (duel.state.kind !== 'active') throw new Error('el objeto debe estar activo');
    view(rowOf(duel), duel.creator, Number(duel.state.deadlineMs) - 5_000);
    expect(document.querySelector('.duel-turn')).toHaveTextContent('Les toca a los dos');
  });

  it('a game won by time shows the winner of the object and the split with its own fee rate', () => {
    const duel = duelOf('timedOut');
    if (duel.state.kind !== 'timed_out') throw new Error('el objeto debe estar terminado por tiempo');
    view(rowOf(duel), duel.state.winner, Date.now());
    expect(field('Estado')).toHaveTextContent('Ganó por tiempo');
    expect(field('Ganador')).toHaveTextContent(shortAddress(duel.state.winner));
    expect(field('Pozo')).toHaveTextContent('0.02 SUI');
    expect(field('Comisión cobrada')).toHaveTextContent('0.001 SUI');
    expect(field('Pago al ganador')).toHaveTextContent('0.019 SUI');
    expect(field('Resultado para ti')).toHaveTextContent('ganaste por tiempo');
  });

  it.each(['expiredBothPending', 'expiredOnePending'] as const)('%s: each player recovered their bet and there is no winner', (name) => {
    const duel = duelOf(name);
    view(rowOf(duel), duel.creator, Date.now());
    expect(field('Estado')).toHaveTextContent('Nadie movió a tiempo: cada jugador recuperó su apuesta');
    expect(field('Devuelto a cada jugador')).toHaveTextContent('0.01 SUI (sin comisión)');
    expect(screen.queryByText('Ganador')).not.toBeInTheDocument();
  });
});
