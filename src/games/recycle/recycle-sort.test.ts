import { describe, expect, it } from 'vitest';
import { RecycleSort } from './recycle-sort';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[], width = 640, height = 480): PoseFrame {
  return { width, height, timestamp: 0, keypoints: kps };
}

function torso(x: number): Keypoint[] {
  return [
    kp('left_shoulder', x - 50, 100),
    kp('right_shoulder', x + 50, 100),
    kp('left_hip', x - 40, 200),
    kp('right_hip', x + 40, 200)
  ];
}

// 손 위치 지정: 왼손은 멀리, 오른손은 (x, y)에.
function hands(x: number, y: number): Keypoint[] {
  return [kp('left_wrist', 0, 0), kp('right_wrist', x, y)];
}

// 지금 나온 쓰레기를 잡아서 toX 자리로 가져가 판정까지 진행한다.
function carryRound(g: RecycleSort, toX: number): string[] {
  g.tick(frame([...torso(320), ...hands(g.item.x, g.item.y)]), 16);
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    seen.push(...g.tick(frame([...torso(toX), ...hands(toX, 300)]), 16).map((e) => e.type));
  }
  return seen;
}

describe('RecycleSort grab-and-carry', () => {
  it('hides face mask for readability', () => {
    expect(new RecycleSort().hideFace).toBe(true);
  });
  it('spawns trash inside the middle bottom area', () => {
    const g = new RecycleSort();
    g.start();
    expect(g.item.x).toBeGreaterThanOrEqual(640 / 3);
    expect(g.item.x).toBeLessThanOrEqual((640 * 2) / 3);
    expect(g.item.y).toBeGreaterThanOrEqual(480 - 240);
    expect(g.item.y).toBeLessThanOrEqual(480 - 180);
    expect(g.carriedBy).toBeNull();
  });
  it('moves the first spawn into the middle when the frame is larger', () => {
    const g = new RecycleSort();
    g.start();
    // 첫 생성은 640×480 기본값 기준. 실제 프레임(1280×720)이 들어오면
    // 비율대로 옮기고 가운데 칸으로 보정해야 옆 칸에 비치지 않는다.
    g.tick(frame([...torso(640), ...hands(100, 100)], 1280, 720), 16);
    expect(g.item.x).toBeGreaterThanOrEqual(1280 / 3);
    expect(g.item.x).toBeLessThanOrEqual((1280 * 2) / 3);
    expect(g.item.y).toBeGreaterThanOrEqual(720 - 240);
    expect(g.item.y).toBeLessThanOrEqual(720 - 140);
    expect(g.carriedBy).toBeNull();
  });
  it('spawns positions randomly within the middle', () => {
    const g = new RecycleSort();
    g.start();
    const xs: number[] = [g.item.x];
    for (let i = 0; i < 5; i++) {
      carryRound(g, 100);
      xs.push(g.item.x);
      expect(g.item.x).toBeGreaterThanOrEqual(640 / 3);
      expect(g.item.x).toBeLessThanOrEqual((640 * 2) / 3);
    }
    expect(new Set(xs.map((x) => Math.round(x))).size).toBeGreaterThan(1);
  });
  it('spawns kinds randomly instead of alternating', () => {
    const g = new RecycleSort();
    g.start();
    const kinds: string[] = [g.item.kind];
    for (let i = 0; i < 5; i++) {
      carryRound(g, 100);
      kinds.push(g.item.kind);
    }
    expect(kinds).toContain('plastic');
    expect(kinds).toContain('can');
  });
  it('grabs trash when a hand touches it', () => {
    const g = new RecycleSort();
    g.start();
    const events = g.tick(frame([...torso(320), ...hands(g.item.x, g.item.y)]), 16);
    expect(events.map((e) => e.type)).toContain('grab');
    expect(g.carriedBy).toBe('right');
  });
  it('carries the item with the hand', () => {
    const g = new RecycleSort();
    g.start();
    g.tick(frame([...torso(320), ...hands(g.item.x, g.item.y)]), 16);
    g.tick(frame([...torso(200), ...hands(200, 280)]), 16);
    expect(g.item.x).toBe(200);
    expect(g.item.y).toBe(280);
  });
  it('sorts plastic carried to the left bin', () => {
    const g = new RecycleSort();
    g.start();
    g.item = { kind: 'plastic', x: 320, y: 300, alive: true };
    const seen = carryRound(g, 100);
    expect(seen).toContain('sorted');
    expect(g.sorted).toBe(1);
    expect(g.carriedBy).toBeNull();
  });
  it('flags wrong bin when carried there', () => {
    const g = new RecycleSort();
    g.start();
    g.item = { kind: 'can', x: 320, y: 300, alive: true };
    const seen = carryRound(g, 100);
    expect(seen).toContain('mixed');
    expect(g.failed).toBe(1);
  });
  it('does not judge when nobody holds the trash', () => {
    const g = new RecycleSort();
    g.start();
    const seen: string[] = [];
    // 몸은 왼쪽에 있지만 손은 쓰레기에서 멀리.
    for (let i = 0; i < 40; i++) {
      seen.push(...g.tick(frame([...torso(100), ...hands(600, 40)]), 16).map((e) => e.type));
    }
    expect(seen).not.toContain('sorted');
    expect(seen).not.toContain('mixed');
    expect(g.carriedBy).toBeNull();
  });
  it('drops in place when the hand is lost', () => {
    const g = new RecycleSort();
    g.start();
    g.tick(frame([...torso(320), ...hands(g.item.x, g.item.y)]), 16);
    expect(g.carriedBy).toBe('right');
    g.tick(frame(torso(320)), 16);
    expect(g.carriedBy).toBeNull();
    expect(g.item.alive).toBe(true);
  });
});
