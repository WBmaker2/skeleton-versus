import { describe, it, expect } from 'vitest';
import { ZombieDuelSide } from './zombie-duel';
import { SharedZombieHorde } from './zombie-horde';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frameAt(cx: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', cx - 20, 200), k('right_shoulder', cx + 20, 200),
      k('left_hip', cx - 15, 300), k('right_hip', cx + 15, 300)
    ]
  };
}

// p1 반쪽(0~320) 3레인 중앙 x좌표
function laneX(side: 'p1' | 'p2', zone: 0 | 1 | 2): number {
  const lo = side === 'p1' ? 0 : 320;
  return lo + 320 * ((zone * 2 + 1) / 6);
}

describe('ZombieDuelSide', () => {
  it('좀비와 다른 레인이면 회피 +10점', () => {
    const side = new ZombieDuelSide('p1', new AttackBus(), new SharedZombieHorde(3));
    side.start();
    side.ghouls = [{ zone: 0, y: 470, alive: true }];
    const ev = side.tick(frameAt(laneX('p1', 2)), 16);
    expect(ev.some((e) => e.type === 'dodge')).toBe(true);
    expect(side.board.score).toBeGreaterThan(0);
  });
  it('같은 레인이면 잡히고 콤보 리셋', () => {
    const side = new ZombieDuelSide('p1', new AttackBus(), new SharedZombieHorde(3));
    side.start();
    side.ghouls = [{ zone: 1, y: 470, alive: true }];
    const ev = side.tick(frameAt(laneX('p1', 1)), 16);
    expect(ev.some((e) => e.type === 'caught')).toBe(true);
    expect(side.board.combo).toBe(0);
  });
  it('5연속 회피면 상대 좀비 가속', () => {
    const bus = new AttackBus();
    const horde = new SharedZombieHorde(3);
    const p1 = new ZombieDuelSide('p1', bus, horde);
    p1.start();
    for (let i = 0; i < 5; i++) {
      p1.ghouls = [{ zone: 0, y: 470, alive: true }];
      p1.tick(frameAt(laneX('p1', 2)), 16);
    }
    expect(bus.onP2?.kind).toBe('rush');
  });
  it('가속 중에는 좀비가 1.5배 빨리 내려온다', () => {
    const bus = new AttackBus();
    const p2 = new ZombieDuelSide('p2', bus, new SharedZombieHorde(3));
    p2.start();
    bus.send('rush', 'p1');
    p2.ghouls = [{ zone: 0, y: 0, alive: true }];
    p2.tick(frameAt(laneX('p2', 2)), 1000);
    expect(p2.ghouls[0].y).toBeCloseTo(220 * 1.5, 0);
  });
  it('양쪽 좀비 줄이 가운데선 대칭이다', () => {
    const horde = new SharedZombieHorde(5);
    for (let i = 0; i < 20; i++) {
      const z1 = horde.nextFor('p1');
      const z2 = horde.nextFor('p2');
      expect(z1 + z2).toBe(2);
    }
  });
});
