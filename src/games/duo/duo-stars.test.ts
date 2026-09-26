import { describe, expect, it } from 'vitest';
import { DuoStars } from './duo-stars';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[], width = 640, height = 480): PoseFrame {
  return { width, height, timestamp: 0, keypoints: kps };
}

// 별 하나를 0.3초 이상 대고 있는 프레임으로 진행 (16ms씩 25틱 = 400ms).
function touch(g: DuoStars, x: number, y: number, w = 640, h = 480) {
  const f = frame([kp('left_wrist', 0, 0), kp('right_wrist', x, y)], w, h);
  let out: string[] = [];
  for (let i = 0; i < 25; i++) out.push(...g.tick(f, 16).map((e) => e.type));
  return out;
}

describe('DuoStars', () => {
  it('starts with 3-5 reachable stars', () => {
    const g = new DuoStars();
    g.start();
    expect(g.stars.length).toBeGreaterThanOrEqual(3);
    expect(g.stars.length).toBeLessThanOrEqual(5);
    for (const s of g.stars) {
      expect(s.x).toBeGreaterThanOrEqual(640 * 0.12 - 1);
      expect(s.x).toBeLessThanOrEqual(640 * 0.88 + 1);
      expect(s.y).toBeGreaterThanOrEqual(480 * 0.15 - 1);
      expect(s.y).toBeLessThanOrEqual(480 * 0.6 + 1);
    }
  });

  it('completes a pair by touching stars in order', () => {
    const g = new DuoStars();
    g.start();
    const count = g.stars.length;
    const seen: string[] = [];
    for (const s of [...g.stars]) seen.push(...touch(g, s.x, s.y));
    expect(seen).toContain('pair');
    expect(g.pairs).toBe(1);
    // 완성하면 새 별자리가 바로 출제된다 (별 개수 × 10점).
    expect(g.board.score).toBe(count * 10 + 5);
  });

  it('ignores out-of-order touches', () => {
    const g = new DuoStars();
    g.start();
    const second = g.stars[1];
    const f = frame([kp('left_wrist', second.x, second.y), kp('right_wrist', 0, 0)]);
    for (let i = 0; i < 25; i++) g.tick(f, 16);
    expect(g.index).toBe(0);
    expect(g.pairs).toBe(0);
  });

  it('accepts either hand on the current star', () => {
    const g = new DuoStars();
    g.start();
    // 오른손 하나로 전부 잇기 (왼손은 멀리).
    const seen: string[] = [];
    for (const s of [...g.stars]) {
      const f = frame([kp('left_wrist', 0, 479), kp('right_wrist', s.x, s.y)]);
      for (let i = 0; i < 25; i++) seen.push(...g.tick(f, 16).map((e) => e.type));
    }
    expect(seen).toContain('pair');
    expect(g.pairs).toBe(1);
  });

  it('hides face mask for readability of stars and lines', () => {
    expect(new DuoStars().hideFace).toBe(true);
  });
});

describe('DuoStars wide stage', () => {
  it('keeps new rounds inside reachable bounds', () => {
    const g = new DuoStars();
    g.start();
    g.newRound(1280, 720);
    expect(g.stars.length).toBeGreaterThanOrEqual(3);
    for (const s of g.stars) {
      expect(s.x).toBeGreaterThanOrEqual(1280 * 0.12 - 1);
      expect(s.x).toBeLessThanOrEqual(1280 * 0.88 + 1);
      expect(s.y).toBeGreaterThanOrEqual(720 * 0.15 - 1);
      expect(s.y).toBeLessThanOrEqual(720 * 0.6 + 1);
    }
  });
});
