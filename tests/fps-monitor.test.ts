import { describe, expect, it } from 'vitest';
import { FpsMonitor } from '../src/perf/fps-monitor';

describe('FpsMonitor', () => {
  it('stays healthy at display rate', () => {
    const m = new FpsMonitor();
    for (let i = 0; i < 120; i++) m.sample(i * 16.7);
    expect(m.degraded).toBe(false);
    expect(m.fps).toBeGreaterThan(30);
  });
  it('degrades after sustained 5fps', () => {
    const m = new FpsMonitor();
    for (let i = 0; i < 80; i++) m.sample(i * 200);
    expect(m.fps).toBeLessThan(12);
    expect(m.degraded).toBe(true);
  });
  it('reset clears degraded', () => {
    const m = new FpsMonitor();
    for (let i = 0; i < 80; i++) m.sample(i * 200);
    m.reset();
    expect(m.degraded).toBe(false);
    expect(m.fps).toBe(30);
  });
});
