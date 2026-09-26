import { describe, expect, it } from 'vitest';
import { RhythmDance, wristPattern, type DanceMove } from './rhythm-dance';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

// 해당 동작을 통과시키는 프레임 (어깨 (220,120)·(420,120), 엉덩이 y=300, 코 (320,60), 어깨너비 200).
const WRISTS: Record<DanceMove, [[number, number], [number, number]]> = {
  left: [[220, 60], [420, 200]],
  right: [[220, 200], [420, 60]],
  both: [[220, 60], [420, 60]],
  down: [[220, 200], [420, 200]],
  t: [[60, 120], [560, 120]],
  y: [[140, 10], [500, 10]],
  circle: [[290, 0], [350, 0]],
  clap: [[300, 210], [340, 210]],
  hips: [[200, 300], [440, 300]],
  head: [[310, 70], [420, 200]]
};

function frameFor(move: DanceMove): PoseFrame {
  const [[lx, ly], [rx, ry]] = WRISTS[move];
  return frame([
    kp('left_shoulder', 220, 120), kp('right_shoulder', 420, 120),
    kp('left_hip', 220, 300), kp('right_hip', 420, 300),
    kp('nose', 320, 60),
    kp('left_wrist', lx, ly), kp('right_wrist', rx, ry)
  ]);
}

const ALL_MOVES: DanceMove[] = [
  'left', 'right', 'both', 'down',
  't', 'y', 'circle', 'clap', 'hips', 'head'
];

describe('RhythmDance', () => {
  it('classifies all 10 moves', () => {
    for (const move of ALL_MOVES) {
      expect(wristPattern(frameFor(move))).toBe(move);
    }
  });
  it('hits left beat with left wrist up', () => {
    const g = new RhythmDance();
    g.start();
    expect(g.move).toBe('left');
    const events = g.tick(frameFor('left'), 16);
    expect(events.some((e) => e.type === 'beat')).toBe(true);
    // 랜덤 출제: 직전(left)과 다른 동작 중 하나가 다음으로 나온다.
    expect(g.move).not.toBe('left');
  });
  it('never repeats the same move consecutively', () => {
    const g = new RhythmDance();
    g.start();
    let prev = g.move;
    for (let i = 0; i < 50; i++) {
      const events = g.tick(frameFor(g.move), 16);
      expect(events.some((e) => e.type === 'beat')).toBe(true);
      expect(g.move).not.toBe(prev);
      prev = g.move;
    }
  });
  it('misses after 1.8s without match', () => {
    const g = new RhythmDance();
    g.start();
    const downFrame = frame([
      kp('left_shoulder', 220, 120), kp('right_shoulder', 420, 120),
      kp('left_wrist', 220, 200), kp('right_wrist', 420, 200)
    ]);
    const seen: string[] = [];
    for (let i = 0; i < 120; i++) seen.push(...g.tick(downFrame, 16).map((e) => e.type));
    expect(seen).toContain('miss');
  });
});
