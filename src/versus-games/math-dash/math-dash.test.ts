import { describe, it, expect } from 'vitest';
import { MathDashSide } from './math-dash';
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

describe('MathDashSide', () => {
  it('정답 구역에서 손들면 점수', () => {
    const bus = new AttackBus();
    const p1 = new MathDashSide('p1', bus);
    p1.start();
    p1.thinkMs = 0;
    // 정답 구역 x좌표 계산: p1 반쪽(0~320) 3등분
    const zone = p1.quiz.answerIndex;
    const x = [53, 160, 267][zone];
    let sawCorrect = false;
    for (let i = 0; i < 10; i++) {
      const ev = p1.tick(frameAt(x, true), 100);
      if (ev.some((e) => e.type === 'correct')) sawCorrect = true;
    }
    expect(p1.solved).toBeGreaterThan(0);
    expect(sawCorrect).toBe(true);
  });
  it('먼저 맞추면 상대에게 안개', () => {
    const bus = new AttackBus();
    const p1 = new MathDashSide('p1', bus);
    p1.start();
    p1.thinkMs = 0;
    const zone = p1.quiz.answerIndex;
    const x = [53, 160, 267][zone];
    for (let i = 0; i < 10; i++) p1.tick(frameAt(x, true), 100);
    expect(bus.onP2?.kind).toBe('fog');
  });
});
