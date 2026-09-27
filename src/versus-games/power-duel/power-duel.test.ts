import { describe, it, expect } from 'vitest';
import { PowerDuelSide, elbowAngle } from './power-duel';
import { TugRope } from '../squat-tug';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function armFrame(elbowX: number): PoseFrame {
  // 어깨(140,200)-팔꿈치(elbowX,260)-손목(140,320): elbowX로 각도 조절
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('left_shoulder', 140, 200), k('left_elbow', elbowX, 260), k('left_wrist', 140, 320),
      k('right_shoulder', 180, 200), k('right_elbow', elbowX + 40, 260), k('right_wrist', 180, 320)
    ]
  };
}

describe('elbowAngle', () => {
  it('팔꿈치 각도를 잰다', () => {
    // 일직선에 가까우면 140 이상
    expect(elbowAngle(armFrame(160), 'left')).toBeGreaterThan(140);
  });
  it('팔꿈치가 안 보이면 어깨·손목으로 어림잡는다', () => {
    const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
    const bent = {
      width: 640, height: 480, timestamp: 0,
      keypoints: [
        k('left_shoulder', 140, 200), k('left_wrist', 150, 210),
        k('right_shoulder', 180, 200), k('right_wrist', 190, 210)
      ]
    } as PoseFrame;
    expect(elbowAngle(bent, 'left')).toBeLessThan(100);
  });
});

describe('PowerDuelSide', () => {
  it('굽혔다 펴면 당기기 1회', () => {
    const rope = new TugRope();
    const side = new PowerDuelSide('p1', rope, new AttackBus());
    side.start();
    side.tick(armFrame(160), 16); // 폄
    side.tick(armFrame(60), 16); // 굽힘 (각도 작아짐)
    expect(side.pulls).toBe(0);
    const ev = side.tick(armFrame(160), 16); // 다시 폄 → 1회
    expect(side.pulls).toBe(1);
    expect(ev.some((e) => e.type === 'pull')).toBe(true);
    expect(rope.pos).toBeLessThan(0);
  });
  it('5연속이면 상대 화면 흔들림', () => {
    const bus = new AttackBus();
    const rope = new TugRope();
    const side = new PowerDuelSide('p1', rope, bus);
    side.start();
    for (let i = 0; i < 5; i++) {
      side.tick(armFrame(60), 16);
      side.tick(armFrame(160), 16);
    }
    expect(side.pulls).toBe(5);
    expect(bus.onP2?.kind).toBe('shake');
  });
});
