import { describe, it, expect } from 'vitest';
import { splitPoses } from './split';
import type { PoseFrame } from '../pose/types';

function frame(noseX: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'nose', x: noseX, y: 100, score: 1 },
      { name: 'left_shoulder', x: noseX - 20, y: 150, score: 1 },
      { name: 'right_shoulder', x: noseX + 20, y: 150, score: 1 },
      { name: 'left_hip', x: noseX - 10, y: 250, score: 1 },
      { name: 'right_hip', x: noseX + 10, y: 250, score: 1 }
    ]
  };
}

describe('splitPoses', () => {
  it('2명을 좌우로 나눈다', () => {
    const s = splitPoses([frame(500), frame(100)], 640);
    expect(s.bothVisible).toBe(true);
    expect(s.left).not.toBeNull();
    expect(s.right).not.toBeNull();
  });
  it('1명만 보이면 bothVisible=false', () => {
    const s = splitPoses([frame(100)], 640);
    expect(s.bothVisible).toBe(false);
    expect(s.left).not.toBeNull();
    expect(s.right).toBeNull();
  });
  it('아무도 없으면 둘 다 null', () => {
    const s = splitPoses([], 640);
    expect(s.left).toBeNull();
    expect(s.right).toBeNull();
  });
});
