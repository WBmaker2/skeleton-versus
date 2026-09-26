import { describe, it, expect } from 'vitest';
import { FruitDuelSide } from './fruit-duel';
import { SharedFruitPattern, mulberry32 } from './spawner';
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

function duelSide(side: 'p1' | 'p2', seed = 42): FruitDuelSide {
  return new FruitDuelSide(side, new AttackBus(), new SharedFruitPattern(seed));
}

describe('FruitDuelSide', () => {
  it('과일을 베면 +10점', () => {
    const side = duelSide('p1');
    side.start();
    side.fruits = [{ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true }];
    const ev = side.tick(frameWithPalms(100, 100), 16);
    expect(side.board.score).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'slice')).toBe(true);
  });
  it('3콤보마다 썩은 과일이 상대에게 간다', () => {
    const bus = new AttackBus();
    const pattern = new SharedFruitPattern(7);
    const p1 = new FruitDuelSide('p1', bus, pattern);
    p1.start();
    for (let i = 0; i < 3; i++) {
      p1.fruits = [{ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true }];
      p1.tick(frameWithPalms(100, 100), 16);
    }
    expect(bus.pendingRottenP2).toBe(1);
  });
  it('썩은 과일을 베면 -5점', () => {
    const side = duelSide('p2');
    side.start();
    side.fruits = [{ x: 500, y: 100, vx: 0, vy: 0, kind: 'rotten', alive: true }];
    side.tick(frameWithPalms(500, 100), 16);
    expect(side.board.score).toBe(-5);
  });
});

describe('SharedFruitPattern', () => {
  it('같은 시드면 같은 순서가 나온다', () => {
    const a = new SharedFruitPattern(123);
    const b = new SharedFruitPattern(123);
    for (let i = 0; i < 20; i++) {
      // 루프 순서대로 p1→p2가 번갈아 가져가면 양쪽 인스턴스가 같은 스펙을 낸다
      expect(a.nextFor('p1')).toEqual(b.nextFor('p1'));
      expect(a.nextFor('p2')).toEqual(b.nextFor('p2'));
    }
  });
  it('mulberry32는 0~1 범위로 나온다', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('양쪽 스폰 위치가 가운데선 대칭이다', () => {
    const bus = new AttackBus();
    const pattern = new SharedFruitPattern(5);
    const p1 = new FruitDuelSide('p1', bus, pattern);
    const p2 = new FruitDuelSide('p2', bus, pattern);
    p1.start(); p2.start();
    for (let i = 0; i < 10; i++) {
      p1.spawn(640);
      p2.spawn(640);
      const f1 = p1.fruits[p1.fruits.length - 1];
      const f2 = p2.fruits[p2.fruits.length - 1];
      // 같은 종류, 위치는 가운데선(x=320) 대칭
      expect(f1.kind).toBe(f2.kind);
      expect(f1.x + f2.x).toBeCloseTo(640, 6);
    }
  });
});
