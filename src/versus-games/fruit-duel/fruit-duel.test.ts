import { describe, it, expect } from 'vitest';
import { FruitDuelSide } from './fruit-duel';
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

describe('FruitDuelSide', () => {
  it('과일을 베면 +10점', () => {
    const bus = new AttackBus();
    const side = new FruitDuelSide('p1', bus);
    side.start();
    side.fruits = [{ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true }];
    const ev = side.tick(frameWithPalms(100, 100), 16);
    expect(side.board.score).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'slice')).toBe(true);
  });
  it('3콤보마다 썩은 과일이 상대에게 간다', () => {
    const bus = new AttackBus();
    const p1 = new FruitDuelSide('p1', bus);
    p1.start();
    for (let i = 0; i < 3; i++) {
      p1.fruits = [{ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true }];
      p1.tick(frameWithPalms(100, 100), 16);
    }
    expect(bus.pendingRottenP2).toBe(1);
  });
  it('썩은 과일을 베면 -5점', () => {
    const bus = new AttackBus();
    const side = new FruitDuelSide('p2', bus);
    side.start();
    side.fruits = [{ x: 500, y: 100, vx: 0, vy: 0, kind: 'rotten', alive: true }];
    side.tick(frameWithPalms(500, 100), 16);
    expect(side.board.score).toBe(-5);
  });
});
