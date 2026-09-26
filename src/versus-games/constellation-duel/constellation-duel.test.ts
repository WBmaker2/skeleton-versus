import { describe, it, expect } from 'vitest';
import { ConstellDuelSide } from './constellation-duel';
import { SharedConstellation } from './shared-sky';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frameWithPalms(px: number, py: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_elbow', px - 20, py), k('left_wrist', px, py),
      k('right_elbow', px - 20, py), k('right_wrist', px, py)
    ]
  };
}

function touchTarget(side: ConstellDuelSide): void {
  const t = side.point(side.index, 640, 480);
  for (let i = 0; i < 10; i++) {
    side.tick(frameWithPalms(t.x, t.y), 100);
    const nt = side.point(Math.min(side.index, side.sky.points.length - 1), 640, 480);
    if (nt.x !== t.x || nt.y !== t.y) return;
    if (side.pairs > 0) return;
  }
}

describe('ConstellDuelSide', () => {
  it('별을 순서대로 이으면 완성 점수', () => {
    const bus = new AttackBus();
    const side = new ConstellDuelSide('p1', bus, new SharedConstellation());
    side.start();
    const count = side.sky.points.length;
    for (let i = 0; i < count; i++) touchTarget(side);
    expect(side.pairs).toBe(1);
    expect(side.board.score).toBeGreaterThan(0);
  });
  it('먼저 완성하면 ×10점과 안개, 뒤따르면 ×5점', () => {
    const bus = new AttackBus();
    const sky = new SharedConstellation();
    const p1 = new ConstellDuelSide('p1', bus, sky);
    const p2 = new ConstellDuelSide('p2', bus, sky);
    p1.start(); p2.start();
    const count = sky.points.length;
    for (let i = 0; i < count; i++) touchTarget(p1);
    const first = p1.board.score;
    expect(first).toBe(count * 10 + 5); // 콤보 보너스 1×5
    expect(bus.onP2?.kind).toBe('fog');
    for (let i = 0; i < count; i++) touchTarget(p2);
    expect(p2.board.score).toBe(count * 5 + 5);
  });
  it('양쪽 별 배치가 가운데선 대칭이다', () => {
    const bus = new AttackBus();
    const sky = new SharedConstellation();
    const p1 = new ConstellDuelSide('p1', bus, sky);
    const p2 = new ConstellDuelSide('p2', bus, sky);
    p1.start(); p2.start();
    for (let i = 0; i < sky.points.length; i++) {
      const a = p1.point(i, 640, 480);
      const b = p2.point(i, 640, 480);
      expect(a.x + b.x).toBeCloseTo(640, 6);
      expect(a.y).toBeCloseTo(b.y, 6);
    }
  });
});
