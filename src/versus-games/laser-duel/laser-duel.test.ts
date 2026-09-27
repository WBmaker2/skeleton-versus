import { describe, it, expect } from 'vitest';
import { LaserDuelSide, headSlot } from './laser-duel';
import { SharedLaserWall } from './laser-wall';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(headY: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [k('nose', 320, headY)]
  };
}

describe('headSlot', () => {
  it('머리 높이를 3슬롯으로 나눈다', () => {
    expect(headSlot(100, 480)).toBe(0);
    expect(headSlot(240, 480)).toBe(1);
    expect(headSlot(400, 480)).toBe(2);
  });
});

describe('LaserDuelSide', () => {
  it('레이저 없는 높이에 있으면 통과 +10점', () => {
    const side = new LaserDuelSide('p1', new AttackBus(), new SharedLaserWall(3));
    side.start();
    side.slot = 0; // 위 레이저
    const ev = side.tick(frame(400), 2100); // 아래에 머리
    expect(ev.some((e) => e.type === 'dodge')).toBe(true);
    expect(side.board.score).toBeGreaterThan(0);
  });
  it('레이저 높이에 있으면 -5점·콤보 리셋', () => {
    const side = new LaserDuelSide('p1', new AttackBus(), new SharedLaserWall(3));
    side.start();
    side.slot = 2; // 아래 레이저
    const ev = side.tick(frame(400), 2100); // 아래에 머리
    expect(ev.some((e) => e.type === 'laser-hit')).toBe(true);
    expect(side.board.score).toBe(-5);
    expect(side.board.combo).toBe(0);
  });
  it('양쪽 레이저 순서가 같다', () => {
    const wall = new SharedLaserWall(5);
    const a = new SharedLaserWall(5);
    for (let i = 0; i < 10; i++) {
      expect(wall.nextFor('p1')).toBe(a.nextFor('p1'));
      expect(wall.nextFor('p2')).toBe(a.nextFor('p2'));
    }
  });
});
