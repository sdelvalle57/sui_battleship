import { describe, expect, it } from 'vitest';
import { deadlineIso, formatDeadline, formatDeadlineMoment, formatSpan } from './deadlineFormat';

const S = 1_000;
const MIN = 60 * S;
const H = 60 * MIN;
const DAY = 24 * H;

// UX-2 (#73, TASK-8b): el plazo legible, por tabla. `remainingMs` = plazo − ahora.
describe('formatDeadline (UX-2)', () => {
  it.each([
    // Con tiempo por delante: granularidad decreciente (días y horas, horas y minutos, minutos y segundos, segundos).
    [1, 'quedan 1 s'],
    [999, 'quedan 1 s'],
    [1_000, 'quedan 1 s'],
    [1_001, 'quedan 2 s'],
    [45 * S, 'quedan 45 s'],
    [59 * S, 'quedan 59 s'],
    [60 * S, 'quedan 1 min'],
    [9 * MIN + 30 * S, 'quedan 9 min 30 s'],
    [59 * MIN + 59 * S, 'quedan 59 min 59 s'],
    [H, 'quedan 1 h'],
    [5 * H + 12 * MIN, 'quedan 5 h 12 min'],
    [23 * H + 59 * MIN + 59 * S, 'quedan 23 h 59 min'],
    [DAY, 'quedan 1 día'],
    [2 * DAY + 3 * H, 'quedan 2 días 3 h'],
    [3 * DAY, 'quedan 3 días'],
    [7 * DAY, 'quedan 7 días'],
    [7 * DAY + 4 * H + 30 * MIN, 'quedan 7 días 4 h'],
    // Vencido: "venció hace N" sin segundos desde el minuto.
    [0, 'venció ahora'],
    [-1, 'venció ahora'],
    [-999, 'venció ahora'],
    [-1_000, 'venció hace 1 s'],
    [-45 * S, 'venció hace 45 s'],
    [-60 * S, 'venció hace 1 min'],
    [-5 * MIN, 'venció hace 5 min'],
    [-(5 * MIN + 59 * S), 'venció hace 5 min'],
    [-H, 'venció hace 1 h'],
    [-(2 * H + 15 * MIN), 'venció hace 2 h 15 min'],
    [-DAY, 'venció hace 1 día'],
    [-(8 * DAY + 2 * H), 'venció hace 8 días 2 h'],
  ])('writes %d ms as "%s"', (remainingMs, text) => {
    expect(formatDeadline(remainingMs)).toBe(text);
  });

  it('never says "0 s" or "quedan 0" while there is time left, and never "hace 0" once it expired', () => {
    for (const ms of [1, 10, 500, 999, 1_500, MIN - 1, MIN + 1]) {
      expect(formatDeadline(ms)).not.toMatch(/\b0 (s|min|h)\b/);
    }
    for (const ms of [0, -1, -999]) expect(formatDeadline(ms)).not.toMatch(/hace/);
  });

  it('keeps the span without the verb for the places that add their own text', () => {
    expect(formatSpan(5 * H + 12 * MIN)).toBe('5 h 12 min');
    expect(formatSpan(-5 * MIN)).toBe('5 min');
    expect(formatSpan(0)).toBeNull();
  });
});

describe('the absolute moment of a deadline (UX-2)', () => {
  it('gives an ISO 8601 UTC dateTime and a readable text with the same instant', () => {
    const deadline = 1_800_000_000_000n;
    expect(deadlineIso(deadline)).toBe(new Date(1_800_000_000_000).toISOString());
    expect(deadlineIso(deadline)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(formatDeadlineMoment(deadline)).toMatch(/2027/);
  });
});
