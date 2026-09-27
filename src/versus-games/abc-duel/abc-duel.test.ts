import { describe, it, expect } from 'vitest';
import { AbcDuelSide } from './abc-duel';
import { SharedAbcRound } from './shared-letter';
import { ABC_TARGETS, anglesFromFrame, matchesTarget } from './angles';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function tPose(cx: number): PoseFrame {
  const yS = 200;
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('nose', cx, 100),
      k('left_shoulder', cx - 20, yS), k('right_shoulder', cx + 20, yS),
      k('left_wrist', cx - 80, yS), k('right_wrist', cx + 80, yS)
    ]
  };
}

describe('abc angles', () => {
  it('T자세를 알아본다', () => {
    expect(matchesTarget(anglesFromFrame(tPose(160)), 'T')).toBe(true);
    expect(matchesTarget(anglesFromFrame(tPose(160)), 'Y')).toBe(false);
  });
  it('X·A를 출제하지 않는다 (반쪽 화면)', () => {
    expect(ABC_TARGETS).toEqual(['T', 'Y', 'O', 'L', 'I', 'K']);
  });
});

describe('AbcDuelSide', () => {
  it('1초 버티면 완성 +20점 이벤트', () => {
    const bus = new AttackBus();
    const p1 = new AbcDuelSide('p1', bus, new SharedAbcRound());
    p1.start();
    expect(p1.round.target).toBe('T');
    let pts = 0;
    for (let i = 0; i < 15 && pts === 0; i++) {
      const ok = p1.tick(tPose(160), 100).find((e) => e.type === 'pose-ok');
      if (ok) pts = ok.points;
    }
    expect(pts).toBe(20);
  });
  it('뒤따라 완성하면 +10점', () => {
    const bus = new AttackBus();
    const round = new SharedAbcRound();
    const p1 = new AbcDuelSide('p1', bus, round);
    const p2 = new AbcDuelSide('p2', bus, round);
    p1.start(); p2.start();
    for (let i = 0; i < 15 && p1.solved === 0; i++) p1.tick(tPose(160), 100);
    expect(p1.solved).toBe(1);
    let pts = 0;
    for (let i = 0; i < 15 && pts === 0; i++) {
      const ok = p2.tick(tPose(480), 100).find((e) => e.type === 'pose-ok');
      if (ok) pts = ok.points;
    }
    expect(pts).toBe(10);
  });
});
