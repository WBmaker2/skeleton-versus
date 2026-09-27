import { describe, it, expect } from 'vitest';
import { PunchDuelSide } from './punch-duel';
import { SharedPunchRing } from './punch-ring';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(lw: { x: number; y: number }, rw: { x: number; y: number }): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', 140, 200), k('right_shoulder', 180, 200),
      k('left_elbow', lw.x - 20, lw.y), k('left_wrist', lw.x, lw.y),
      k('right_elbow', rw.x - 20, rw.y), k('right_wrist', rw.x, rw.y)
    ]
  };
}

describe('PunchDuelSide', () => {
  it('빠르게 치면 펀치 인정 +2점', () => {
    const side = new PunchDuelSide('p1', new AttackBus(), new SharedPunchRing(3));
    side.start();
    side.target = { x: 200, y: 200, alive: true };
    // 1틱: 손을 멀리 둔다 (prev 기록)
    side.tick(frame({ x: 100, y: 200 }, { x: 100, y: 300 }), 16);
    // 2틱: 타겟으로 휙 뻗는다 (100px/16ms, 어깨너비 40px → 156/s)
    const ev = side.tick(frame({ x: 200, y: 200 }, { x: 100, y: 300 }), 16);
    expect(ev.some((e) => e.type === 'punch')).toBe(true);
    expect(side.punches).toBe(1);
  });
  it('천천히 대면 무효', () => {
    const side = new PunchDuelSide('p1', new AttackBus(), new SharedPunchRing(3));
    side.start();
    side.target = { x: 200, y: 200, alive: true };
    side.tick(frame({ x: 190, y: 200 }, { x: 100, y: 300 }), 16);
    // 10px/1000ms = 0.25/s → 무효
    const ev = side.tick(frame({ x: 200, y: 200 }, { x: 100, y: 300 }), 1000);
    expect(ev.some((e) => e.type === 'punch')).toBe(false);
    expect(side.punches).toBe(0);
  });
  it('10연속이면 상대 타겟 축소', () => {
    const bus = new AttackBus();
    const side = new PunchDuelSide('p1', bus, new SharedPunchRing(3));
    side.start();
    for (let i = 0; i < 10; i++) {
      side.target = { x: 200, y: 200, alive: true };
      side.tick(frame({ x: 100, y: 200 }, { x: 100, y: 300 }), 16);
      // 쿨타임(300ms)을 넘긴다
      side.tick(frame({ x: 200, y: 200 }, { x: 100, y: 300 }), 400);
    }
    expect(side.punches).toBe(10);
    expect(bus.onP2?.kind).toBe('tiny');
  });
  it('양쪽 타겟 위치가 가운데선 대칭이다', () => {
    const ring = new SharedPunchRing(5);
    const bus = new AttackBus();
    const p1 = new PunchDuelSide('p1', bus, ring);
    const p2 = new PunchDuelSide('p2', bus, ring);
    p1.start(); p2.start();
    for (let i = 0; i < 5; i++) {
      p1.respawn(640, 480);
      p2.respawn(640, 480);
      expect(p1.target.x + p2.target.x).toBeCloseTo(640, 6);
    }
  });
});
