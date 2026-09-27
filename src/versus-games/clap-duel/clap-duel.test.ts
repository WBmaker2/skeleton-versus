import { describe, it, expect } from 'vitest';
import { ClapDuelSide } from './clap-duel';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frame(gapPx: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', 140, 200), k('right_shoulder', 180, 200),
      k('left_wrist', 160 - gapPx / 2, 250), k('right_wrist', 160 + gapPx / 2, 250)
    ]
  };
}

describe('ClapDuelSide', () => {
  it('떼었다 합치면 1회 +3점', () => {
    const side = new ClapDuelSide('p1', new AttackBus());
    side.start();
    side.tick(frame(100), 16); // 벌림
    const ev = side.tick(frame(8), 16); // 합침 (8px < 0.3*40=12px)
    expect(ev.some((e) => e.type === 'clap')).toBe(true);
    expect(side.claps).toBe(1);
  });
  it('붙인 채로는 카운트 안 됨', () => {
    const side = new ClapDuelSide('p1', new AttackBus());
    side.start();
    side.tick(frame(8), 16);
    side.tick(frame(8), 16);
    side.tick(frame(8), 16);
    expect(side.claps).toBe(1);
  });
  it('20연속이면 상대 박수 판정 강화', () => {
    const bus = new AttackBus();
    const side = new ClapDuelSide('p1', bus);
    side.start();
    for (let i = 0; i < 20; i++) {
      side.tick(frame(100), 16);
      side.tick(frame(8), 16);
    }
    expect(side.claps).toBe(20);
    expect(bus.onP2?.kind).toBe('strict');
  });
});
