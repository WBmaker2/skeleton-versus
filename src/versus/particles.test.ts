import { describe, it, expect } from 'vitest';
import { spawnBurst, tickParticles, drawParticles, type Particle } from './particles';

function stubCtx(): { ctx: CanvasRenderingContext2D; count: { arcs: number } } {
  const count = { arcs: 0 };
  const fn = (..._args: unknown[]): undefined => undefined;
  const ctx = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'arc') {
        return (..._a: unknown[]): undefined => {
          count.arcs += 1;
          return undefined;
        };
      }
      return fn;
    },
    set: () => true
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, count };
}

describe('particles', () => {
  it('지정한 개수만큼 터뜨린다', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 100, 100, 18);
    expect(ps).toHaveLength(18);
  });
  it('시간이 지나면 사라진다', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 100, 100, 10);
    expect(tickParticles(ps, 200).length).toBe(10);
    expect(tickParticles(ps, 10000)).toEqual([]);
  });
  it('살아있는 만큼 동그라미를 그린다', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 100, 100, 5);
    const s = stubCtx();
    drawParticles(s.ctx, ps);
    expect(s.count.arcs).toBe(5);
  });
});
