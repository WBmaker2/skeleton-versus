import { describe, it, expect } from 'vitest';
import { calibrateDual, clampScale } from './dual-calibration';
import type { PoseFrame } from '../pose/types';

function frame(shoulderW: number, width = 640): PoseFrame {
  const cx = width / 2;
  const kp = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width, height: 480, timestamp: 0,
    keypoints: [
      kp('nose', cx, 100),
      kp('left_shoulder', cx - shoulderW / 2, 200),
      kp('right_shoulder', cx + shoulderW / 2, 200),
      kp('left_hip', cx - 20, 320),
      kp('right_hip', cx + 20, 320)
    ]
  };
}

describe('calibrateDual', () => {
  it('좌우를 따로 보정한다 (어깨너비 200px이면 scale 1)', () => {
    const { p1, p2 } = calibrateDual(
      [frame(200), frame(200), frame(200), frame(200)],
      [frame(100), frame(100), frame(100), frame(100)]
    );
    expect(p1.scale).toBeCloseTo(1, 5);
    expect(p2.scale).toBeCloseTo(0.5, 5);
  });
  it('프레임이 없으면 기본값 1', () => {
    const { p1, p2 } = calibrateDual([], []);
    expect(p1.scale).toBe(1);
    expect(p2.scale).toBe(1);
  });
  it('scale을 0.5~2로 묶는다', () => {
    expect(clampScale(0.1)).toBe(0.5);
    expect(clampScale(5)).toBe(2);
    expect(clampScale(NaN)).toBe(1);
    expect(clampScale(1.2)).toBe(1.2);
  });
});
