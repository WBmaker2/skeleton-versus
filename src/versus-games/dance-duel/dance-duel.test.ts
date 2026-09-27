import { describe, it, expect } from 'vitest';
import { DanceDuelSide } from './dance-duel';
import { SharedDanceBeat } from './shared-beat';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(cmd: 'left' | 'both' | 'down', cx: number): PoseFrame {
  const yS = 200;
  const pos = {
    left: { lw: 120, rw: 260 },
    both: { lw: 120, rw: 120 },
    down: { lw: 260, rw: 260 }
  }[cmd];
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('nose', cx, 100),
      k('left_shoulder', cx - 20, yS), k('right_shoulder', cx + 20, yS),
      k('left_hip', cx - 15, 300), k('right_hip', cx + 15, 300),
      k('left_wrist', cx - 30, pos.lw), k('right_wrist', cx + 30, pos.rw)
    ]
  };
}

describe('DanceDuelSide', () => {
  it('먼저 적중하면 +15점, 뒤따르면 +10점', () => {
    const bus = new AttackBus();
    const beat = new SharedDanceBeat();
    const p1 = new DanceDuelSide('p1', bus, beat);
    const p2 = new DanceDuelSide('p2', bus, beat);
    p1.start(); p2.start();
    expect(beat.move).toBe('left');
    const ev = p1.tick(frame('left', 160), 16);
    expect(ev.find((e) => e.type === 'beat')?.points).toBe(15);
    const ev2 = p2.tick(frame('left', 480), 16);
    expect(ev2.find((e) => e.type === 'beat')?.points).toBe(10);
  });
  it('3연속 적중이면 상대 박자 단축', () => {
    const bus = new AttackBus();
    const beat = new SharedDanceBeat();
    const p1 = new DanceDuelSide('p1', bus, beat);
    const p2 = new DanceDuelSide('p2', bus, beat);
    p1.start(); p2.start();
    for (let i = 0; i < 3; i++) {
      beat.move = 'left';
      p1.tick(frame('left', 160), 16); // 적중
      p1.tick(frame('left', 160), 16); // 다음 동작으로
    }
    expect(bus.onP2?.kind).toBe('offbeat');
    expect(p2.beatLimitMs).toBe(1200);
  });
  it('박자를 놓치면 다음 동작으로 넘어간다', () => {
    const bus = new AttackBus();
    const beat = new SharedDanceBeat();
    const p1 = new DanceDuelSide('p1', bus, beat);
    p1.start();
    let sawMiss = false;
    for (let i = 0; i < 25; i++) {
      const ev = p1.tick(frame('down', 160), 100);
      if (ev.some((e) => e.type === 'miss')) sawMiss = true;
    }
    expect(sawMiss).toBe(true);
  });
});
