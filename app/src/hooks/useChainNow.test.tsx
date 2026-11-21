import { act, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { CLAIM_GRACE_MS } from '../sui/gameRegistry';
import { createFakeScreenClock, withScreenClock } from '../test/clockHarness';
import { COARSE_TICK_MS, LIVE_TICK_MS } from './screenClock';
import { deadlinePhase, useChainNow, useDeadlinePhase } from './useChainNow';

// UX-3 (#73, TASK-8b): las fases de un plazo y los hooks que cuentan con el reloj de pantalla inyectado.
const CHAIN_NOW = 5_000_000;
const DEADLINE = BigInt(CHAIN_NOW + 10_000);

describe('deadlinePhase (UX-3)', () => {
  it.each([
    [null, 'unknown'],
    [CHAIN_NOW, 'running'],
    [Number(DEADLINE) - 1, 'running'],
    [Number(DEADLINE), 'expired'],
    [Number(DEADLINE) + Number(CLAIM_GRACE_MS) - 1, 'expired'],
    [Number(DEADLINE) + Number(CLAIM_GRACE_MS), 'stalled'],
  ])('puts a chain time of %s in the phase %s', (now, phase) => {
    expect(deadlinePhase(now, DEADLINE)).toBe(phase);
  });
});

describe('useDeadlinePhase and useChainNow (UX-3)', () => {
  it('UX-3: re-renders its component only when the phase changes, not on every tick', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    let renders = 0;
    function Probe() {
      renders += 1;
      return <p data-testid="phase">{useDeadlinePhase(DEADLINE)}</p>;
    }
    render(withScreenClock(fake.clock, <Probe />));
    expect(screen.getByTestId('phase')).toHaveTextContent('running');
    const initial = renders;
    act(() => {
      fake.advance(5_000);
    });
    expect(renders).toBe(initial);
    act(() => {
      fake.advance(4_000);
    });
    expect(renders).toBe(initial);
    act(() => {
      fake.advance(1_000);
    });
    expect(screen.getByTestId('phase')).toHaveTextContent('expired');
    expect(renders).toBe(initial + 1);
  });

  it('UX-3: asks for the 1 s tick while the deadline runs and drops to one tick per minute once it expired', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    renderHook(() => useDeadlinePhase(DEADLINE), { wrapper: ({ children }) => withScreenClock(fake.clock, children) });
    expect(fake.periods()).toEqual([LIVE_TICK_MS]);
    act(() => {
      fake.advance(10_000);
    });
    expect(fake.periods()).toEqual([COARSE_TICK_MS]);
  });

  it('UX-3: without a chain sample the phase is "unknown" and no 1 s tick is requested', () => {
    const fake = createFakeScreenClock();
    const { result } = renderHook(() => useDeadlinePhase(DEADLINE), { wrapper: ({ children }) => withScreenClock(fake.clock, children) });
    expect(result.current).toBe('unknown');
    expect(fake.periods()).toEqual([COARSE_TICK_MS]);
    act(() => {
      fake.sample(CHAIN_NOW);
    });
    expect(result.current).toBe('running');
    expect(fake.periods()).toEqual([LIVE_TICK_MS]);
  });

  it('UX-3: the chain time advances with the tick and never goes back after a fresh sample that is older', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    const { result } = renderHook(() => useChainNow(DEADLINE), { wrapper: ({ children }) => withScreenClock(fake.clock, children) });
    expect(result.current).toBe(CHAIN_NOW);
    act(() => {
      fake.advance(4_000);
    });
    expect(result.current).toBe(CHAIN_NOW + 4_000);
    act(() => {
      fake.sample(CHAIN_NOW + 1_000);
    });
    expect(result.current).toBe(CHAIN_NOW + 4_000);
  });

  it('UX-3: many components with a deadline share ONE interval, and unmounting them all clears it', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    function Row({ n }: { n: number }) {
      return <li data-testid={`row-${String(n)}`}>{useDeadlinePhase(DEADLINE + BigInt(n))}</li>;
    }
    const { unmount } = render(
      withScreenClock(
        fake.clock,
        <ul>
          {Array.from({ length: 25 }, (_, n) => (
            <Row key={n} n={n} />
          ))}
        </ul>,
      ),
    );
    expect(fake.createdCount()).toBe(1);
    expect(fake.alive()).toBe(1);
    unmount();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: under StrictMode (double mount) it still leaves a single interval and none after unmounting', () => {
    const fake = createFakeScreenClock();
    fake.sample(CHAIN_NOW);
    function Probe() {
      return <p>{String(useChainNow(DEADLINE))}</p>;
    }
    const { unmount } = render(<StrictMode>{withScreenClock(fake.clock, <Probe />)}</StrictMode>);
    expect(fake.alive()).toBe(1);
    unmount();
    expect(fake.alive()).toBe(0);
  });
});
