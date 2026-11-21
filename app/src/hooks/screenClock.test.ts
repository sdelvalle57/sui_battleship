import { describe, expect, it, vi } from 'vitest';
import { createFakeScreenClock } from '../test/clockHarness';
import { COARSE_TICK_MS, LIVE_TICK_MS, createScreenClock } from './screenClock';

// UX-3 (#73, TASK-8b): el reloj de pantalla de la cuenta regresiva. Un solo intervalo inyectable, derivado de la hora de la
// cadena como referencia, monótono, que se detiene al vencer y al desmontar y que nunca pide datos.
describe('createScreenClock (UX-3)', () => {
  it('UX-3: has no snapshot without a chain sample and starts no interval without subscribers', () => {
    const fake = createFakeScreenClock();
    expect(fake.clock.getSnapshot()).toBeNull();
    expect(fake.alive()).toBe(0);
    expect(fake.createdCount()).toBe(0);
  });

  it('UX-3: estimates the chain time from a sample and advances it with the local clock on every 1 s tick', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    expect(fake.clock.getSnapshot()).toBe(5_000_000);
    const listener = vi.fn();
    fake.clock.subscribe('live', listener);
    expect(fake.periods()).toEqual([LIVE_TICK_MS]);
    fake.advance(1_000);
    expect(fake.clock.getSnapshot()).toBe(5_001_000);
    expect(listener).toHaveBeenCalledTimes(1);
    fake.advance(3_000);
    expect(fake.clock.getSnapshot()).toBe(5_004_000);
  });

  it('UX-3: shares ONE interval among any number of subscribers and clears it with the last one', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    const unsubscribers = Array.from({ length: 50 }, () => fake.clock.subscribe('live', vi.fn()));
    expect(fake.createdCount()).toBe(1);
    expect(fake.alive()).toBe(1);
    for (const unsubscribe of unsubscribers.slice(0, 49)) unsubscribe();
    expect(fake.alive()).toBe(1);
    unsubscribers[49]?.();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: a second unsubscribe of the same subscription does nothing', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    const first = fake.clock.subscribe('live', vi.fn());
    const second = fake.clock.subscribe('live', vi.fn());
    first();
    first();
    expect(fake.alive()).toBe(1);
    second();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: stops the 1 s tick when only expired deadlines remain (it drops to one tick per minute) and clears at the end', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    const live = fake.clock.subscribe('live', vi.fn());
    const coarse = fake.clock.subscribe('coarse', vi.fn());
    expect(fake.periods()).toEqual([LIVE_TICK_MS]);
    live();
    expect(fake.periods()).toEqual([COARSE_TICK_MS]);
    expect(fake.createdCount()).toBe(2);
    coarse();
    expect(fake.alive()).toBe(0);
  });

  it('UX-3: is monotonic: an older sample received later never makes the estimate go back', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    fake.clock.subscribe('live', vi.fn());
    fake.advance(10_000);
    expect(fake.clock.getSnapshot()).toBe(5_010_000);
    // Otra muestra recibida ahora pero de un checkpoint 4 s más viejo que la primera extrapolación: no retrocede.
    fake.sample(5_006_000 - 4_000);
    expect(fake.clock.getSnapshot()).toBe(5_010_000);
    fake.advance(1_000);
    expect(fake.clock.getSnapshot()).toBe(5_011_000);
  });

  it('UX-3: a fresher sample (a younger checkpoint) moves the estimate forward and tells the subscribers', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    const listener = vi.fn();
    fake.clock.subscribe('live', listener);
    fake.advance(1_000);
    listener.mockClear();
    fake.sample(5_002_500);
    expect(fake.clock.getSnapshot()).toBe(5_002_500);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('UX-3: never goes back if the local clock does', () => {
    let local = 1_000_000;
    const clock = createScreenClock({ now: () => local, setIntervalFn: () => 1, clearIntervalFn: () => undefined });
    clock.observe(5_000_000, local);
    clock.subscribe('live', vi.fn());
    local += 5_000;
    clock.subscribe('live', vi.fn());
    expect(clock.getSnapshot()).toBe(5_005_000);
    local -= 20_000;
    const listener = vi.fn();
    clock.subscribe('live', listener);
    expect(clock.getSnapshot()).toBe(5_005_000);
  });

  it('UX-3: refreshes a stale estimate when someone subscribes after a quiet period', () => {
    const fake = createFakeScreenClock();
    fake.sample(5_000_000);
    fake.advance(60_000);
    expect(fake.clock.getSnapshot()).toBe(5_000_000);
    fake.clock.subscribe('live', vi.fn());
    expect(fake.clock.getSnapshot()).toBe(5_060_000);
  });

  it('UX-3: the clock only moves time: it takes no client and no query function (it never asks for data)', () => {
    expect(createScreenClock.length).toBeLessThanOrEqual(1);
    const fake = createFakeScreenClock();
    expect(Object.keys(fake.clock).sort()).toEqual(['getSnapshot', 'localNow', 'observe', 'subscribe']);
  });
});
