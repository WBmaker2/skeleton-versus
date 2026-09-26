import { describe, expect, it } from 'vitest';
import { ZombieSteps } from './zombie-steps';
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

describe('ZombieSteps', () => {
  it('dodges ghoul in another zone', () => {
    const g = new ZombieSteps();
    g.start();
    g.ghouls.length = 0;
    g.ghouls.push({ zone: 0, y: 460, alive: true });
    const events = g.tick(frame(torso(550)), 16);
    expect(events.some((e) => e.type === 'dodge')).toBe(true);
  });
  it('gets caught in same zone', () => {
    const g = new ZombieSteps();
    g.start();
    g.ghouls.length = 0;
    g.ghouls.push({ zone: 0, y: 460, alive: true });
    const events = g.tick(frame(torso(100)), 16);
    expect(events.some((e) => e.type === 'caught')).toBe(true);
  });
});

describe('ZombieSteps judge line', () => {
  it('waits until the tall stage floor', () => {
    const g = new ZombieSteps();
    g.start();
    g.ghouls.length = 0;
    g.ghouls.push({ zone: 0, y: 460, alive: true });
    const tall = {
      width: 1280, height: 720, timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 500, y: 100, score: 1 },
        { name: 'right_shoulder', x: 600, y: 100, score: 1 },
        { name: 'left_hip', x: 510, y: 200, score: 1 },
        { name: 'right_hip', x: 590, y: 200, score: 1 }
      ]
    };
    expect(g.tick(tall, 16)).toEqual([]);
    expect(g.ghouls[0].alive).toBe(true);
  });
});
