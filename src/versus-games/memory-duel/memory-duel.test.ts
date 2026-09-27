import { describe, it, expect } from 'vitest';
import { MemoryDuelSide } from './memory-duel';
import { SharedMemoryDeck } from './shared-deck';
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

function playStep(side: MemoryDuelSide, cmd: 'left' | 'both' | 'down', cx: number): void {
  side.tick(frame(cmd, cx), 16);
  side.tick(frame(cmd, cx), 16);
}

describe('MemoryDuelSide', () => {
  it('순서대로 재현하면 완성 +30점', () => {
    const bus = new AttackBus();
    const deck = new SharedMemoryDeck();
    deck.sequence = ['left', 'both', 'down'];
    const p1 = new MemoryDuelSide('p1', bus, deck);
    p1.start();
    playStep(p1, 'left', 160);
    expect(p1.index).toBe(1);
    playStep(p1, 'both', 160);
    expect(p1.index).toBe(2);
    let pts = 0;
    for (let i = 0; i < 3; i++) {
      const ok = p1.tick(frame('down', 160), 16).find((e) => e.type === 'memory');
      if (ok) pts = ok.points;
    }
    expect(pts).toBe(30);
    expect(bus.onP2?.kind).toBe('fog');
  });
  it('순서가 틀리면 처음부터', () => {
    const bus = new AttackBus();
    const deck = new SharedMemoryDeck();
    deck.sequence = ['left', 'both', 'down'];
    const p1 = new MemoryDuelSide('p1', bus, deck);
    p1.start();
    playStep(p1, 'left', 160);
    expect(p1.index).toBe(1);
    playStep(p1, 'down', 160); // both가 아닌 down
    expect(p1.index).toBe(0);
  });
  it('뒤따라 완성하면 +15점', () => {
    const bus = new AttackBus();
    const deck = new SharedMemoryDeck();
    deck.sequence = ['left', 'both', 'down'];
    const p1 = new MemoryDuelSide('p1', bus, deck);
    const p2 = new MemoryDuelSide('p2', bus, deck);
    p1.start(); p2.start();
    for (const c of ['left', 'both', 'down'] as const) playStep(p1, c, 160);
    expect(p1.solved).toBe(1);
    let pts = 0;
    for (const c of ['left', 'both', 'down'] as const) {
      for (let i = 0; i < 3 && pts === 0; i++) {
        const ok = p2.tick(frame(c, 480), 16).find((e) => e.type === 'memory');
        if (ok) pts = ok.points;
      }
    }
    expect(pts).toBe(15);
  });
});
