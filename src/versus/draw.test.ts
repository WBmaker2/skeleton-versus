import { describe, it, expect } from 'vitest';
import { drawVersusLabel, drawStar } from './draw';

function stubCtx(): { ctx: CanvasRenderingContext2D; calls: Array<{ m: string; a: unknown[] }> } {
  const calls: Array<{ m: string; a: unknown[] }> = [];
  const fn = (..._args: unknown[]): undefined => undefined;
  const ctx = new Proxy({}, {
    get: (_t, p) => (...a: unknown[]): undefined => {
      calls.push({ m: String(p), a });
      return undefined;
    },
    set: () => true
  }) as unknown as CanvasRenderingContext2D;
  void fn;
  return { ctx, calls };
}

describe('drawVersusLabel', () => {
  it('미러 상쇄 순서로 그린다 (save→translate→scale→fillText→restore)', () => {
    const s = stubCtx();
    drawVersusLabel(s.ctx, '7+8=?', 320, 52, 30);
    expect(s.calls.map((c) => c.m)).toEqual([
      'save', 'translate', 'scale', 'fillText', 'restore'
    ]);
    expect(s.calls[1].a).toEqual([320, 52]);
    expect(s.calls[2].a).toEqual([-1, 1]);
    expect(s.calls[3].a).toEqual(['7+8=?', 0, 0]);
  });
});

describe('drawStar', () => {
  it('별을 그린다', () => {
    const s = stubCtx();
    expect(() => drawStar(s.ctx, 100, 100, 30, '#dfff00')).not.toThrow();
    expect(s.calls.map((c) => c.m)).toContain('fill');
  });
});
