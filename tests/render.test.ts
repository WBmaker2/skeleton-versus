// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createGame, type PlayableId } from '../src/ui/app';
import { drawParticles, spawnBurst, tickParticles, type Particle } from '../src/ui/renderer';

function stubCtx(): CanvasRenderingContext2D {
  const fn = (..._args: unknown[]): undefined => undefined;
  const backing: Record<string | symbol, unknown> = {};
  return new Proxy(backing as object, {
    get: (t, p) => (p in t ? (t as Record<string | symbol, unknown>)[p] : fn),
    set: (t, p, v) => {
      (t as Record<string | symbol, unknown>)[p] = v;
      return true;
    }
  }) as unknown as CanvasRenderingContext2D;
}

const IDS: PlayableId[] = [
  'fruit', 'squat', 'math', 'abc', 'star', 'balloon',
  'zombie', 'dance', 'simon', 'yoga', 'duo', 'recycle'
];

describe('game draw methods', () => {
  it.each(IDS)('%s draws without throwing', (id) => {
    const game = createGame(id);
    game.start();
    expect(() => game.draw?.(stubCtx(), 640, 480)).not.toThrow();
  });
  it('fruit draws one circle per live fruit', () => {
    const calls: string[] = [];
    const ctx = stubCtx();
    const origArc = (..._a: unknown[]): undefined => {
      calls.push('arc');
      return undefined;
    };
    (ctx as unknown as Record<string, unknown>).arc = origArc;
    const game = createGame('fruit');
    game.start();
    if (game.id !== 'fruit' || !('fruits' in game)) throw new Error('factory');
    game.fruits.push(
      { x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true },
      { x: 200, y: 200, vx: 0, vy: 0, kind: 'bomb', alive: true }
    );
    game.draw?.(ctx, 640, 480);
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('mirrored stage text', () => {
  it('drawLabel pre-flips text to cancel the CSS selfie mirror', async () => {
    const { drawLabel } = await import('../src/ui/renderer');
    const calls: Array<{ m: string; a: unknown[] }> = [];
    const ctx = {
      save: () => calls.push({ m: 'save', a: [] }),
      restore: () => calls.push({ m: 'restore', a: [] }),
      translate: (...a: unknown[]) => calls.push({ m: 'translate', a }),
      scale: (...a: unknown[]) => calls.push({ m: 'scale', a }),
      strokeText: (...a: unknown[]) => calls.push({ m: 'strokeText', a }),
      fillText: (...a: unknown[]) => calls.push({ m: 'fillText', a }),
    } as unknown as CanvasRenderingContext2D;
    drawLabel(ctx, '7+8=?', 320, 52, 36);
    // 글자 중심으로 이동 → 좌우반전 → 원점에 그리기 → 복원 순서여야
    // CSS scaleX(-1)와 상쇄되어 사용자에게 정상으로 보인다.
    expect(calls.map((c) => c.m)).toEqual([
      'save', 'translate', 'scale', 'strokeText', 'fillText', 'restore'
    ]);
    expect(calls[1].a).toEqual([320, 52]);
    expect(calls[2].a).toEqual([-1, 1]);
    expect(calls[3].a).toEqual(['7+8=?', 0, 0]);
    expect(calls[4].a).toEqual(['7+8=?', 0, 0]);
  });
});

describe('celebration particles', () => {
  it('spawns and fades bursts', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 320, 240);
    expect(ps.length).toBe(14);
    const after = tickParticles(ps, 200);
    expect(after.length).toBe(14);
    expect(after[0].life).toBeLessThan(after[0].maxLife);
    expect(tickParticles(after, 1000)).toEqual([]);
  });
  it('draws one circle per live particle', () => {
    const ps: Particle[] = [];
    spawnBurst(ps, 320, 240, 5);
    let arcs = 0;
    const ctx = stubCtx();
    (ctx as unknown as Record<string, unknown>).arc = () => {
      arcs += 1;
    };
    drawParticles(ctx, ps);
    expect(arcs).toBe(5);
  });
});

describe('ABC pose guide', () => {
  it.each(['T', 'Y', 'O', 'L', 'I', 'K', 'X', 'A'] as const)('%s guide draws panel, stick figure and label', async (target) => {
    const { drawPoseGuide } = await import('../src/ui/renderer');
    const calls: Array<{ m: string; a: unknown[] }> = [];
    const fn = (..._args: unknown[]): undefined => undefined;
    const ctx = new Proxy({}, {
      get: (_t, p) => {
        if (p === 'scale') return (...a: unknown[]): undefined => {
          calls.push({ m: 'scale', a });
          return undefined;
        };
        if (p === 'arc') return (...a: unknown[]): undefined => {
          calls.push({ m: 'arc', a });
          return undefined;
        };
        if (p === 'fillText') return (...a: unknown[]): undefined => {
          calls.push({ m: 'fillText', a });
          return undefined;
        };
        if (p === 'strokeText') return (...a: unknown[]): undefined => {
          calls.push({ m: 'strokeText', a });
          return undefined;
        };
        return fn;
      },
      set: () => true
    }) as unknown as CanvasRenderingContext2D;
    expect(() => drawPoseGuide(ctx, target, 484, 16, 140, 180)).not.toThrow();
    // 셀카 미러 상쇄용 좌우반전이 1회 포함되어야 함 (L 비대칭 대비)
    expect(calls.some((c) => c.m === 'scale' && c.a[0] === -1 && c.a[1] === 1)).toBe(true);
    // 막대인간 머리
    expect(calls.some((c) => c.m === 'arc')).toBe(true);
    // 패널 하단 목표 글자
    expect(calls.some((c) => (c.m === 'fillText' || c.m === 'strokeText') && c.a[0] === target)).toBe(true);
  });
});

describe('face mask overlay', () => {
  it('skips missing or unloaded images', async () => {
    const { drawFaceMask } = await import('../src/ui/renderer');
    const ctx = stubCtx();
    const frame = {
      width: 640, height: 480, timestamp: 0,
      keypoints: [{ name: 'nose', x: 320, y: 100, score: 1 }]
    };
    expect(() => drawFaceMask(ctx, frame, null)).not.toThrow();
    expect(() => drawFaceMask(ctx, frame, undefined)).not.toThrow();
    expect(() => drawFaceMask(ctx, frame, { complete: false } as HTMLImageElement)).not.toThrow();
  });
  it('draws centered square crop from loaded image', async () => {
    const { drawFaceMask } = await import('../src/ui/renderer');
    const calls: number[][] = [];
    const ctx = stubCtx();
    (ctx as unknown as Record<string, unknown>).drawImage = (...a: unknown[]) => {
      calls.push(a as number[]);
    };
    const img = { complete: true, naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    const frame = {
      width: 640, height: 480, timestamp: 0,
      keypoints: [{ name: 'nose', x: 320, y: 100, score: 1 }]
    };
    drawFaceMask(ctx, frame, img);
    expect(calls).toHaveLength(1);
    // source rect is centered square 600x600, dest centered on nose
    expect(calls[0].slice(1, 5)).toEqual([100, 0, 600, 600]);
  });
});
