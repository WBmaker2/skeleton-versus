import { describe, it, expect } from 'vitest';
import { BalanceDuelSide } from './balance-duel';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(lifted: boolean, anklesOut = false): PoseFrame {
  const k = (name: string, x: number, y: number, score = 1) => ({ name, x, y, score });
  const ankleScore = anklesOut ? 0 : 1;
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', 140, 200), k('right_shoulder', 180, 200),
      k('left_knee', 140, 320), k('right_knee', 180, 320),
      // 왼발을 들어 올림 (오른 무릎보다 위)
      k('left_ankle', 140, lifted ? 280 : 420, ankleScore),
      k('right_ankle', 180, 420, ankleScore)
    ]
  };
}

describe('BalanceDuelSide', () => {
  it('1초 버티면 +2점 합산', () => {
    const side = new BalanceDuelSide('p1', new AttackBus());
    side.start();
    let ticks = 0;
    for (let i = 0; i < 15 && side.totalMs === 0; i++) {
      side.tick(frame(true), 100);
      ticks += 1;
    }
    expect(side.totalMs).toBe(1000);
    expect(side.board.score).toBeGreaterThan(0);
    expect(ticks).toBeLessThanOrEqual(12);
  });
  it('발이 내려오면 이번 버티기 리셋 (누적 유지)', () => {
    const side = new BalanceDuelSide('p1', new AttackBus());
    side.start();
    side.tick(frame(true), 500);
    expect(side.holdMs).toBe(500);
    side.tick(frame(false), 16);
    expect(side.holdMs).toBe(0);
    expect(side.totalMs).toBe(0);
  });
  it('발목이 안 보이면 게이트 (측정 안 함)', () => {
    const side = new BalanceDuelSide('p1', new AttackBus());
    side.start();
    const ev = side.tick(frame(true, true), 100);
    expect(ev).toEqual([]);
    expect(side.gated).toBe(true);
    expect(side.totalMs).toBe(0);
  });
  it('누적 20초에 상대 화면 흔들림', () => {
    const bus = new AttackBus();
    const side = new BalanceDuelSide('p1', bus);
    side.start();
    side.totalMs = 19900;
    side.holdMs = 900;
    const ev = side.tick(frame(true), 200);
    expect(ev.some((e) => e.type === 'balance-tick')).toBe(true);
    expect(ev.some((e) => e.type === 'attack')).toBe(true);
    expect(bus.onP2?.kind).toBe('shake');
  });
});
