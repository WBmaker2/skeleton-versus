import { describe, expect, it } from 'vitest';
import { StarCatch } from './star-catch';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

function torso(x: number): Keypoint[] {
  return [
    kp('left_shoulder', x - 50, 100),
    kp('right_shoulder', x + 50, 100),
    kp('left_hip', x - 40, 200),
    kp('right_hip', x + 40, 200)
  ];
}

function wrists(lx: number, ly: number, rx: number, ry: number): Keypoint[] {
  return [
    ...torso(320),
    kp('left_wrist', lx, ly),
    kp('right_wrist', rx, ry)
  ];
}

describe('StarCatch', () => {
  it('catches star on 300ms hold', () => {
    const g = new StarCatch();
    g.start();
    g.star = { x: 100, y: 100, alive: true };
    const seen: string[] = [];
    for (let i = 0; i < 20; i++) seen.push(...g.tick(frame(wrists(100, 100, 500, 400)), 16).map((e) => e.type));
    expect(seen).toContain('catch');
    expect(g.caught).toBe(1);
  });
  it('ignores far wrist', () => {
    const g = new StarCatch();
    g.start();
    g.star = { x: 100, y: 100, alive: true };
    expect(g.tick(frame(wrists(500, 400, 550, 420)), 16)).toEqual([]);
  });
});
