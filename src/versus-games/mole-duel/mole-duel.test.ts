import { describe, it, expect } from 'vitest';
import { MoleDuelSide, stayMsFor, gapMsFor, slotToPos, MOLE_R } from './mole-duel';
import { SharedMoleRing } from './mole-ring';
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

function floorMole(side: MoleDuelSide, x = 160, y = 394): void {
  side.slot = 1;
  side.moleX = x;
  side.moleY = y;
  side.phase = 'staying';
  side.phaseMs = 0;
  side.face = 'idle';
}

function wallMoleP1(side: MoleDuelSide, x = 38, y = 240): void {
  side.slot = 4;
  side.moleX = x;
  side.moleY = y;
  side.phase = 'staying';
  side.phaseMs = 0;
  side.face = 'idle';
}

describe('MoleDuelSide', () => {
  it('바닥 두더지는 위로 들었다가 내려찍으면 +10점', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    floorMole(side);
    const mx = side.moleX;
    const my = side.moleY;
    // 위에서 시작 → 아래로 내려찍기 (위로 0.4어깨너비 이상 갔다가 내려옴).
    // 접근 중에는 판정 반경(48) 밖에 둔다.
    side.tick(frame({ x: mx, y: my - 100 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my - 70 }, { x: 100, y: 300 }), 100);
    const ev = side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(ev.some((e) => e.type === 'mole')).toBe(true);
    expect(side.catches).toBe(1);
    expect(side.face).toBe('hit');
  });

  it('바닥 두더지는 아래에서 좌우로만 비비면 무효', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    floorMole(side);
    const mx = side.moleX;
    const my = side.moleY;
    // 같은 높이에서 좌우로만 이동 (수직 범위 없음)
    side.tick(frame({ x: mx - 30, y: my }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx - 10, y: my }, { x: 100, y: 300 }), 100);
    const ev = side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(ev.some((e) => e.type === 'mole')).toBe(false);
    expect(side.catches).toBe(0);
    expect(side.hint).toContain('내려찍');
  });

  it('측면 두더지는 반대쪽으로 갔다가 휘두르면 +10점', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    wallMoleP1(side);
    const mx = side.moleX;
    const my = side.moleY;
    // P1 왼쪽 벽: 오른쪽으로 갔다가 왼쪽으로 휘두르기 (접근 중 반경 밖).
    side.tick(frame({ x: mx + 80, y: my }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx + 55, y: my }, { x: 100, y: 300 }), 100);
    const ev = side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(ev.some((e) => e.type === 'mole')).toBe(true);
    expect(side.catches).toBe(1);
  });

  it('측면 두더지는 측면에서만 왔다갔다하면 무효', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    wallMoleP1(side);
    const mx = side.moleX;
    const my = side.moleY;
    // 수직으로만 움직임 (수평 범위 없음)
    side.tick(frame({ x: mx, y: my - 30 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my - 10 }, { x: 100, y: 300 }), 100);
    const ev = side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(ev.some((e) => e.type === 'mole')).toBe(false);
    expect(side.catches).toBe(0);
    expect(side.hint).toContain('반대쪽');
  });

  it('맞은 두더지는 hit 표정으로 내려가고 놓치면 miss 표정', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    floorMole(side);
    const mx = side.moleX;
    const my = side.moleY;
    side.tick(frame({ x: mx, y: my - 100 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my - 70 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(side.face).toBe('hit');
    expect(side.phase).toBe('falling');

    const side2 = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side2.start();
    floorMole(side2);
    // 가만히 두면 유지시간이 지나 놓침 (가속 없음, 1500ms+ 필요)
    for (let i = 0; i < 20; i++) {
      side2.tick(frame({ x: 500, y: 100 }, { x: 500, y: 100 }), 100);
    }
    expect(side2.face).toBe('miss');
  });

  it('난이도가 시간이 지날수록 빨라진다', () => {
    expect(stayMsFor(0, false)).toBe(1500);
    expect(stayMsFor(55, false)).toBe(700);
    expect(stayMsFor(0, false)).toBeGreaterThan(stayMsFor(50, false));
    expect(gapMsFor(0, false)).toBeGreaterThan(gapMsFor(55, false));
  });

  it('5연속이면 상대 두더지 가속', () => {
    const bus = new AttackBus();
    const side = new MoleDuelSide('p1', bus, new SharedMoleRing(3));
    side.start();
    for (let i = 0; i < 5; i++) {
      floorMole(side);
      const mx = side.moleX;
      const my = side.moleY;
      side.tick(frame({ x: mx, y: my - 100 }, { x: 100, y: 300 }), 100);
      side.tick(frame({ x: mx, y: my - 70 }, { x: 100, y: 300 }), 100);
      side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
      // 내려감+쉼을 넘긴다
      for (let j = 0; j < 15; j++) {
        side.tick(frame({ x: 500, y: 100 }, { x: 500, y: 100 }), 100);
      }
    }
    expect(side.catches).toBe(5);
    expect(bus.onP2?.kind).toBe('rush');
  });

  it('맞은 뒤 300ms 안 추가 타격 무시', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    floorMole(side);
    const mx = side.moleX;
    const my = side.moleY;
    side.tick(frame({ x: mx, y: my - 100 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my - 70 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 100);
    expect(side.catches).toBe(1);
    // falling 중에는 때려도 추가 인정 없음
    const ev = side.tick(frame({ x: mx, y: my }, { x: 100, y: 300 }), 50);
    expect(ev.some((e) => e.type === 'mole')).toBe(false);
    expect(side.catches).toBe(1);
  });

  it('같은 자리가 연속으로 나오지 않는다', () => {
    const ring = new SharedMoleRing(7);
    let prev: number | null = null;
    for (let i = 0; i < 100; i++) {
      const a = ring.nextFor('p1');
      const b = ring.nextFor('p2');
      expect(a).toBe(b);
      if (prev !== null) expect(a).not.toBe(prev);
      prev = a;
    }
  });

  it('양쪽 구멍 위치가 가운데선 대칭이다', () => {
    for (let s = 0 as 0; s < 6; s = (s + 1) as 0) {
      const slot = s as Parameters<typeof slotToPos>[1];
      const p1 = slotToPos('p1', slot, 640, 480);
      const p2 = slotToPos('p2', slot, 640, 480);
      expect(p1.x + p2.x).toBeCloseTo(640, 6);
      expect(p1.y).toBeCloseTo(p2.y, 6);
    }
  });

  it('구멍 반경 안에 손이 닿아야 인정된다', () => {
    const side = new MoleDuelSide('p1', new AttackBus(), new SharedMoleRing(3));
    side.start();
    floorMole(side);
    const mx = side.moleX;
    // 멀리서 예비동작만 하고 닿지 않으면 무효
    side.tick(frame({ x: mx, y: 100 }, { x: 100, y: 300 }), 100);
    side.tick(frame({ x: mx, y: 120 }, { x: 100, y: 300 }), 100);
    const ev = side.tick(frame({ x: mx + MOLE_R * 3, y: 100 }, { x: 100, y: 300 }), 100);
    expect(ev.some((e) => e.type === 'mole')).toBe(false);
    expect(side.catches).toBe(0);
  });

  it('메타가 18번 두더지 대전으로 등록된다', async () => {
    const { moleDuelMeta } = await import('./meta');
    expect(moleDuelMeta.id).toBe('versus-mole');
    expect(moleDuelMeta.no).toBe(18);
  });
});
