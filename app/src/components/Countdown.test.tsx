import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { Countdown, NO_CHAIN_TIME_TEXT } from './Countdown';
import { deadlineIso, formatDeadlineMoment } from './deadlineFormat';

// UX-2, UX-3 y UX-4 (#73, TASK-8b): la cuenta regresiva con un reloj de pantalla inyectado (sin timers reales).
const CHAIN_NOW = 1_800_000_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 10_000);

function setup(deadline = DEADLINE) {
  const fake = createFakeScreenClock();
  fake.sample(CHAIN_NOW);
  const view = render(withScreenClock(fake.clock, <Countdown deadlineMs={deadline} />));
  return { fake, ...view };
}
const timer = () => screen.getByRole('timer');
const tick = (fake: ReturnType<typeof createFakeScreenClock>, ms: number) => {
  act(() => {
    fake.advance(ms);
  });
};

describe('Countdown', () => {
  it('UX-2: writes the time left in Spanish and the absolute moment in a <time> with its dateTime and title', () => {
    setup();
    expect(timer()).toHaveTextContent('quedan 10 s');
    const time = document.querySelector('time');
    expect(time).toHaveAttribute('datetime', deadlineIso(DEADLINE));
    expect(time).toHaveAttribute('title', formatDeadlineMoment(DEADLINE));
    expect(time).toHaveTextContent(formatDeadlineMoment(DEADLINE));
  });

  it('UX-3: advances one second per tick, switches to "venció ahora" at the deadline and keeps counting what passed by the minute', () => {
    const { fake } = setup();
    tick(fake, 1_000);
    expect(timer()).toHaveTextContent('quedan 9 s');
    tick(fake, 8_000);
    expect(timer()).toHaveTextContent('quedan 1 s');
    tick(fake, 1_000);
    expect(timer()).toHaveTextContent('venció ahora');
    tick(fake, 60_000);
    expect(timer()).toHaveTextContent('venció hace 1 min');
    tick(fake, 120_000);
    expect(timer()).toHaveTextContent('venció hace 3 min');
  });

  it('UX-3: stops the 1 s interval when the deadline expires (one tick per minute remains) and clears it on unmount', () => {
    const { fake, unmount } = setup();
    expect(fake.periods()).toEqual([1_000]);
    tick(fake, 10_000);
    expect(fake.periods()).toEqual([60_000]);
    unmount();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: clears its interval when it is unmounted before the deadline', () => {
    const { fake, unmount } = setup();
    expect(fake.alive()).toBe(1);
    unmount();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: a data refetch (another render with the same deadline and an older sample) does not move the counter back', () => {
    const { fake, rerender } = setup();
    tick(fake, 4_000);
    expect(timer()).toHaveTextContent('quedan 6 s');
    act(() => {
      fake.sample(CHAIN_NOW + 1_000);
    });
    rerender(withScreenClock(fake.clock, <Countdown deadlineMs={DEADLINE} />));
    expect(timer()).toHaveTextContent('quedan 6 s');
  });

  it('UX-3: a real change of the deadline does change the counter', () => {
    const { fake, rerender } = setup();
    tick(fake, 4_000);
    rerender(withScreenClock(fake.clock, <Countdown deadlineMs={DEADLINE + 60_000n} />));
    expect(timer()).toHaveTextContent('quedan 1 min 6 s');
  });

  it('UX-3: 50 counters share one interval', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    render(
      withScreenClock(
        fake.clock,
        <ul>
          {Array.from({ length: 50 }, (_, n) => (
            <li key={n}>
              <Countdown deadlineMs={DEADLINE + BigInt(n * 1_000)} />
            </li>
          ))}
        </ul>,
      ),
    );
    expect(screen.getAllByRole('timer')).toHaveLength(50);
    expect(fake.createdCount()).toBe(1);
    expect(fake.alive()).toBe(1);
  });

  it('UX-3: the tick re-renders only the counter text, never the row or its neighbors', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    const renders = { row: 0, neighbor: 0 };
    function Neighbor() {
      renders.neighbor += 1;
      return <span data-testid="neighbor">vecino</span>;
    }
    function Row() {
      renders.row += 1;
      return (
        <li>
          <Neighbor />
          <Countdown deadlineMs={DEADLINE} />
        </li>
      );
    }
    render(withScreenClock(fake.clock, <Row />));
    const before = { ...renders };
    tick(fake, 5_000);
    expect(timer()).toHaveTextContent('quedan 5 s');
    expect(renders).toEqual(before);
  });

  it('UX-4: the visible counter is a timer with live announcements off, so a screen reader does not read it every second', () => {
    const { fake } = setup();
    expect(timer()).toHaveAttribute('aria-live', 'off');
    tick(fake, 3_000);
    expect(timer()).toHaveAttribute('aria-live', 'off');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('UX-3: uses tabular numbers through its own class, so the width does not change every second', () => {
    setup();
    expect(timer()).toHaveClass('clock-counter');
  });

  it('never invents a time with the local clock: without a chain sample it says it is calculating', () => {
    const fake = createFakeScreenClock();
    render(withScreenClock(fake.clock, <Countdown deadlineMs={DEADLINE} />));
    expect(timer()).toHaveTextContent(NO_CHAIN_TIME_TEXT);
    act(() => {
      fake.sample(CHAIN_NOW);
    });
    expect(timer()).toHaveTextContent('quedan 10 s');
  });

  it('can omit the absolute moment for the places that already give it', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    render(withScreenClock(fake.clock, <Countdown deadlineMs={DEADLINE} withMoment={false} />));
    expect(document.querySelector('time')).toBeNull();
  });
});
