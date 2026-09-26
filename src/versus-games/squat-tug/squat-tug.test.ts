import { describe, it, expect } from 'vitest';
import { SquatTugSide, TugRope } from './squat-tug';
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
    rope.pos = -40;
    expect(rope.winner()).toBe('p1');
    rope.pos = 40;
    expect(rope.winner()).toBe('p2');
  });
});
