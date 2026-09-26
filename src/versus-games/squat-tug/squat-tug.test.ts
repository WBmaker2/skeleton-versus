import { describe, it, expect } from 'vitest';
import {
  SquatTugSide, TugRope, beatError, drawTugOverlay,
  kneeAngle, TUG_BEAT_MS, TUG_PERFECT_MS, TUG_WIN_POS
} from './squat-tug';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function squatFrame(ang: 'up' | 'down'): PoseFrame {
  // 무릎 각도를 흉내: up이면 일직선, down이면 직각
  const hip = { name: 'left_hip', x: 100, y: 100, score: 1 };
  const knee = { name: 'left_knee', x: 100, y: 200, score: 1 };
  const ankleUp = { name: 'left_ankle', x: 100, y: 300, score: 1 };
  const ankleDown = { name: 'left_ankle', x: 200, y: 200, score: 1 };
  const ankle = ang === 'up' ? ankleUp : ankleDown;
  const mirror = (k: { name: string; x: number; y: number; score: number }) => ({
    ...k, name: k.name.replace('left', 'right')
  });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [hip, knee, ankle, mirror(hip), mirror(knee), mirror(ankle)]
  };
}

describe('SquatTug', () => {
  it('앉았다 일어나면 줄이 당겨진다', () => {
    const rope = new TugRope();
    const bus = new AttackBus();
    const p1 = new SquatTugSide('p1', rope, bus);
    p1.start();
    p1.tick(squatFrame('down'), 250);
    p1.tick(squatFrame('down'), 250);
    p1.tick(squatFrame('up'), 16);
    expect(p1.reps).toBe(1);
    expect(rope.pos).toBeLessThan(0);
  });
  it('줄 승자를 판정한다', () => {
    const rope = new TugRope();
    rope.pos = -TUG_WIN_POS - 10;
    expect(rope.winner()).toBe('p1');
    rope.pos = TUG_WIN_POS + 10;
    expect(rope.winner()).toBe('p2');
    rope.pos = 0;
    expect(rope.winner()).toBe('draw');
  });
  it('박자 오차를 잰다 (0=정박)', () => {
    expect(beatError(0)).toBe(0);
    expect(beatError(TUG_PERFECT_MS - 1)).toBeLessThan(TUG_PERFECT_MS);
    expect(beatError(TUG_BEAT_MS / 2)).toBe(TUG_BEAT_MS / 2);
    expect(beatError(TUG_BEAT_MS - 10)).toBe(10);
  });
  it('무릎 각도를 잰다 (일직선 180, 직각 90)', () => {
    expect(kneeAngle(squatFrame('up'))).toBeCloseTo(180, 0);
    expect(kneeAngle(squatFrame('down'))).toBeCloseTo(90, 0);
  });
  it('줄+박자바 오버레이가 예외 없이 그려진다', () => {
    const rope = new TugRope();
    rope.pos = -20;
    const calls: string[] = [];
    const ctx = new Proxy({}, {
      get: (_t, p) => {
        if (p === 'canvas') return undefined;
        calls.push(String(p));
        return (..._a: unknown[]): undefined => undefined;
      },
      set: () => true
    }) as unknown as CanvasRenderingContext2D;
    expect(() => drawTugOverlay(ctx, 960, 480, rope, 500)).not.toThrow();
    expect(calls).toContain('arc');
    expect(calls).toContain('fillRect');
  });
});
