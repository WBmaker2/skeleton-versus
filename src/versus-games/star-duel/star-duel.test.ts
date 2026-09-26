import { describe, it, expect } from 'vitest';
import { StarDuelSide } from './star-duel';
import { SharedStarField } from './star-field';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frameWithPalms(px: number, py: number): PoseFrame {
  const kp = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      kp('left_elbow', px - 20, py), kp('left_wrist', px, py),
      kp('right_elbow', px - 20, py), kp('right_wrist', px, py)
    ]
  };
}

function starSide(side: 'p1' | 'p2', seed = 42): StarDuelSide {
  return new StarDuelSide(side, new AttackBus(), new SharedStarField(seed));
}

function catchOnce(side: StarDuelSide): void {
  for (let i = 0; i < 10; i++) {
    const ev = side.tick(frameWithPalms(side.star.x, side.star.y), 100);
    if (ev.some((e) => e.type === 'catch')) return;
  }
  throw new Error('catch timeout');
}

describe('StarDuelSide', () => {
  it('별을 잡으면 +10점', () => {
    const side = starSide('p1');
    side.start();
    const before = side.board.score;
    catchOnce(side);
    expect(side.caught).toBe(1);
    expect(side.board.score).toBeGreaterThan(before);
  });
  it('3콤보마다 먹별이 상대에게 간다', () => {
    const bus = new AttackBus();
    const field = new SharedStarField(7);
    const p1 = new StarDuelSide('p1', bus, field);
    p1.start();
    for (let i = 0; i < 3; i++) {
      for (let t = 0; t < 10; t++) {
        const ev = p1.tick(frameWithPalms(p1.star.x, p1.star.y), 100);
        if (ev.some((e) => e.type === 'catch')) break;
      }
    }
    expect(bus.pendingDarkP2).toBe(1);
  });
  it('먹별을 잡으면 -5점', () => {
    const side = starSide('p2');
    side.start();
    side.spawnDark(640, 480);
    const frame = frameWithPalms(side.star.x, side.star.y);
    for (let i = 0; i < 10; i++) side.tick(frame, 100);
    expect(side.board.score).toBe(-5);
  });
});

describe('SharedStarField', () => {
  it('양쪽 별 위치가 가운데선 대칭이다', () => {
    const bus = new AttackBus();
    const field = new SharedStarField(5);
    const p1 = new StarDuelSide('p1', bus, field);
    const p2 = new StarDuelSide('p2', bus, field);
    p1.start(); p2.start();
    for (let i = 0; i < 5; i++) {
      p1.respawn(640, 480);
      p2.respawn(640, 480);
      expect(p1.star.x + p2.star.x).toBeCloseTo(640, 6);
      expect(p1.star.y).toBeCloseTo(p2.star.y, 6);
    }
  });
});
