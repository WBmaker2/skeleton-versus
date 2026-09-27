import { describe, it, expect } from 'vitest';
import { SimonDuelSide } from './simon-duel';
import { SharedSimonRound } from './shared-command';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(cmd: 'left' | 'both' | 'down', cx: number): PoseFrame {
  const yS = 200;
  const pos = {
    left: { lw: 120, rw: 260 },
    both: { lw: 120, rw: 120 },
    down: { lw: 260, rw: 260 }
  }[cmd];
  const kp = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      kp('nose', cx, 100),
      kp('left_shoulder', cx - 20, yS), kp('right_shoulder', cx + 20, yS),
      kp('left_hip', cx - 15, 300), kp('right_hip', cx + 15, 300),
      kp('left_wrist', cx - 30, pos.lw), kp('right_wrist', cx + 30, pos.rw)
    ]
  };
}

describe('SimonDuelSide', () => {
  it('같은 지시를 먼저 맞추면 +20점 이벤트', () => {
    const bus = new AttackBus();
    const round = new SharedSimonRound();
    const p1 = new SimonDuelSide('p1', bus, round);
    const p2 = new SimonDuelSide('p2', bus, round);
    p1.start(); p2.start();
    expect(round.command).toBe('left');
    const ev = p1.tick(frame('left', 160), 16);
    const correct = ev.find((e) => e.type === 'correct');
    expect(correct?.points).toBe(20);
    // 뒤따라 맞추면 +10
    const ev2 = p2.tick(frame('left', 480), 16);
    expect(ev2.find((e) => e.type === 'correct')?.points).toBe(10);
  });
  it('먼저 맞추면 상대에게 안개', () => {
    const bus = new AttackBus();
    const p1 = new SimonDuelSide('p1', bus, new SharedSimonRound());
    p1.start();
    p1.tick(frame('left', 160), 16);
    expect(bus.onP2?.kind).toBe('fog');
  });
  it('2.5초 초과하면 다음 지시로 넘어간다', () => {
    const bus = new AttackBus();
    const round = new SharedSimonRound();
    const p1 = new SimonDuelSide('p1', bus, round);
    p1.start();
    const gen0 = round.gen;
    let sawTimeout = false;
    for (let i = 0; i < 30; i++) {
      const ev = p1.tick(frame('down', 160), 100);
      if (ev.some((e) => e.type === 'timeout')) sawTimeout = true;
    }
    expect(sawTimeout).toBe(true);
    // 다음 지시로 넘어감 (같은 지시가 다시 나와도 세대는 전진한다).
    expect(round.gen).toBeGreaterThan(gen0);
  });
});
