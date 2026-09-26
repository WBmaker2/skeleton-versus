import { describe, it, expect } from 'vitest';
import { MathDashSide } from './math-dash';
import { SharedMathRound } from './shared-round';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function frameAt(x: number, hands: boolean): PoseFrame {
  const yS = 200;
  const yW = hands ? 150 : 250;
  const kp = (name: string, px: number, py: number) => ({ name, x: px, y: py, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      kp('left_shoulder', x - 20, yS), kp('right_shoulder', x + 20, yS),
      kp('left_hip', x - 15, 300), kp('right_hip', x + 15, 300),
      kp('left_wrist', x - 30, yW), kp('right_wrist', x + 30, yW)
    ]
  };
}

// p1 반쪽(0~320) 3등분 중 정답 구역 x좌표
function answerX(side: MathDashSide): number {
  const zone = side.round.quiz.answerIndex;
  return side.side === 'p1' ? [53, 160, 267][zone] : [373, 480, 587][zone];
}

function solve(side: MathDashSide): void {
  for (let i = 0; i < 10; i++) side.tick(frameAt(answerX(side), true), 100);
}

describe('MathDashSide', () => {
  it('정답 구역에서 손들면 점수', () => {
    const bus = new AttackBus();
    const p1 = new MathDashSide('p1', bus, new SharedMathRound());
    p1.start();
    p1.thinkMs = 0;
    let sawCorrect = false;
    for (let i = 0; i < 10; i++) {
      const ev = p1.tick(frameAt(answerX(p1), true), 100);
      if (ev.some((e) => e.type === 'correct')) sawCorrect = true;
    }
    expect(p1.solved).toBeGreaterThan(0);
    expect(sawCorrect).toBe(true);
  });
  it('먼저 맞추면 상대에게 안개', () => {
    const bus = new AttackBus();
    const p1 = new MathDashSide('p1', bus, new SharedMathRound());
    p1.start();
    p1.thinkMs = 0;
    solve(p1);
    expect(bus.onP2?.kind).toBe('fog');
  });
});

describe('SharedMathRound', () => {
  it('양쪽이 같은 문제를 본다', () => {
    const bus = new AttackBus();
    const round = new SharedMathRound();
    const p1 = new MathDashSide('p1', bus, round);
    const p2 = new MathDashSide('p2', bus, round);
    p1.start(); p2.start();
    expect(p1.round.quiz.q).toBe(p2.round.quiz.q);
  });
  it('먼저 맞추면 +20, 같은 문제에 뒤따르면 +10', () => {
    const bus = new AttackBus();
    const round = new SharedMathRound();
    const p1 = new MathDashSide('p1', bus, round);
    const p2 = new MathDashSide('p2', bus, round);
    p1.start(); p2.start();
    p1.thinkMs = 0; p2.thinkMs = 0;
    // 루프 순서대로: p1이 풀면 correct 이벤트 +20점
    const x1 = answerX(p1);
    let p1pts = 0;
    for (let i = 0; i < 8 && p1pts === 0; i++) {
      const c = p1.tick(frameAt(x1, true), 100).find((e) => e.type === 'correct');
      if (c) p1pts = c.points;
    }
    expect(p1pts).toBe(20);
    // 같은 프레임에 p2가 옛 문제로 뒤따라 풀면 +10 (p1이 다시 tick하기 전)
    const x2 = answerX(p2);
    let p2pts = 0;
    for (let i = 0; i < 8 && p2pts === 0; i++) {
      const c = p2.tick(frameAt(x2, true), 100).find((e) => e.type === 'correct');
      if (c) p2pts = c.points;
    }
    expect(p2pts).toBe(10);
  });
  it('다음 tick에 양쪽이 함께 새 문제로 넘어간다', () => {
    const bus = new AttackBus();
    const round = new SharedMathRound();
    const p1 = new MathDashSide('p1', bus, round);
    const p2 = new MathDashSide('p2', bus, round);
    p1.start(); p2.start();
    p1.thinkMs = 0;
    const before = round.quiz.q;
    const x1 = answerX(p1);
    for (let i = 0; i < 8 && p1.solved === 0; i++) p1.tick(frameAt(x1, true), 100);
    expect(p1.solved).toBe(1);
    // p1이 다시 tick하면 새 문제로, p2는 따라간다
    p1.tick(frameAt(53, false), 16);
    p2.tick(frameAt(373, false), 16);
    expect(round.quiz.q).not.toBe(before);
    expect(round.claimed).toBe(false);
    expect(p1.round.quiz.q).toBe(p2.round.quiz.q);
  });
});
