import { describe, it, expect } from 'vitest';
import { RunDuelSide } from './run-duel';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(lkY: number, rkY: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', 140, 200), k('right_shoulder', 180, 200),
      k('left_knee', 140, lkY), k('right_knee', 180, rkY)
    ]
  };
}

describe('RunDuelSide', () => {
  it('좌우 번갈아 들면 2스텝=1m +5점', () => {
    const side = new RunDuelSide('p1', new AttackBus());
    side.start();
    side.tick(frame(400, 400), 16); // 기준
    side.tick(frame(340, 400), 16); // 왼발 듦 (60px > 0.2*40=8px)
    expect(side.steps).toBe(1);
    side.tick(frame(340, 400), 16); // 유지 (엣지 없음)
    expect(side.steps).toBe(1);
    side.tick(frame(400, 340), 16); // 오른발 듦 (교대)
    expect(side.steps).toBe(2);
    expect(side.meters).toBe(1);
    expect(side.board.score).toBeGreaterThan(0);
  });
  it('같은 발 연속은 카운트 안 됨', () => {
    const side = new RunDuelSide('p1', new AttackBus());
    side.start();
    side.tick(frame(400, 400), 16);
    side.tick(frame(340, 400), 16);
    side.tick(frame(400, 400), 16); // 내림
    side.tick(frame(340, 400), 16); // 왼발 또 듦 (교대 아님)
    expect(side.steps).toBe(1);
  });
  it('막판 10초는 2배 + 스프린트 알림', () => {
    const side = new RunDuelSide('p1', new AttackBus());
    side.start();
    side.elapsedMs = 50 * 1000;
    const ev = side.tick(frame(400, 400), 16);
    expect(ev.some((e) => e.type === 'sprint')).toBe(true);
    expect(side.sprint).toBe(true);
  });
});
