import { describe, it, expect } from 'vitest';
import { drawDanceGuide, DANCE_MOVES, DANCE_MOVE_LABEL } from './dance-guide';

function stubCtx(): { ctx: CanvasRenderingContext2D; count: { arcs: number; texts: string[] } } {
  const count = { arcs: 0, texts: [] as string[] };
  const fn = (..._args: unknown[]): undefined => undefined;
  const ctx = new Proxy({}, {
    get: (_t, p) => {
      if (p === 'arc') {
        return (..._a: unknown[]): undefined => {
          count.arcs += 1;
          return undefined;
        };
      }
      if (p === 'fillText') {
        return (t: string) => {
          count.texts.push(t);
          return undefined;
        };
      }
      return fn;
    },
    set: () => true
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, count };
}

describe('drawDanceGuide', () => {
  it('10종 동작이 라벨과 함께 그려진다', () => {
    expect(DANCE_MOVES).toHaveLength(10);
    for (const move of DANCE_MOVES) {
      const s = stubCtx();
      expect(() => drawDanceGuide(s.ctx, move, 0, 0, 140, 180)).not.toThrow();
      expect(s.count.texts).toContain(DANCE_MOVE_LABEL[move]);
      expect(s.count.arcs).toBeGreaterThan(0);
    }
  });
});
