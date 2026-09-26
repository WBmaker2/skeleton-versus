// tests/fruit-ninja.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FruitNinja } from './fruit-ninja';
import type { PoseFrame } from '../../pose/types';

afterEach(() => {
  vi.restoreAllMocks();
});

function wristFrame(x: number, y: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_wrist', x, y, score: 1 },
      { name: 'right_wrist', x: 500, y: 400, score: 1 }
    ]
  };
}

describe('FruitNinja', () => {
  it('slices fruit when wrist passes through', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(100, 100), 16);
    expect(events.some((e) => e.type === 'slice')).toBe(true);
  });
  it('does not slice when far away', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(500, 400), 16);
    expect(events.length).toBe(0);
  });
  it('spawns at lively pace (600ms interval)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const g = new FruitNinja();
    g.start();
    for (let i = 0; i < 44; i++) g.tick(wristFrame(0, 0), 16);
    // 704ms → exactly one spawn at the 600ms mark, far from both wrists.
    expect(g.fruits.length).toBe(1);
  });
  it('bursts extra fruits every 10 slices', () => {
    const g = new FruitNinja();
    g.start();
    g.slices = 9;
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    g.tick(wristFrame(100, 100), 16);
    expect(g.slices).toBe(10);
    expect(g.fruits.length).toBeGreaterThanOrEqual(2);
  });
});

describe('FruitNinja spawn spread', () => {
  it('cycles left, center, right zones in order', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const g = new FruitNinja();
    g.start();
    g.spawn();
    g.spawn();
    g.spawn();
    const xs = g.fruits.map((f) => f.x);
    expect(xs[0]).toBeCloseTo(640 / 6, 0);
    expect(xs[1]).toBeCloseTo(320, 0);
    expect(xs[2]).toBeCloseTo((640 * 5) / 6, 0);
  });
});

describe('FruitNinja spawn spread', () => {
  it('distributes hundreds of spawns evenly across thirds', () => {
    const g = new FruitNinja();
    g.start();
    const zones = [0, 0, 0];
    for (let i = 0; i < 300; i++) {
      g.spawn();
      const x = g.fruits[g.fruits.length - 1].x;
      zones[x < 213 ? 0 : x < 427 ? 1 : 2] += 1;
    }
    for (const z of zones) {
      expect(z).toBeGreaterThan(60);
      expect(z).toBeLessThan(140);
    }
  });
});

describe('FruitNinja floor', () => {
  it('keeps falling fruit above a tall stage floor', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 320, y: 600, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const tall: PoseFrame = {
      width: 1280, height: 720, timestamp: 0,
      keypoints: [
        { name: 'left_wrist', x: 0, y: 0, score: 1 },
        { name: 'right_wrist', x: 1279, y: 0, score: 1 }
      ]
    };
    g.tick(tall, 16);
    expect(g.fruits.length).toBe(1);
  });
});

describe('FruitNinja wide stage', () => {
  it('spreads zones across 1280 width', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const g = new FruitNinja();
    g.start();
    g.spawn(1280);
    g.spawn(1280);
    g.spawn(1280);
    const xs = g.fruits.map((f) => f.x);
    expect(xs[0]).toBeCloseTo(1280 / 6, 0);
    expect(xs[1]).toBeCloseTo(640, 0);
    expect(xs[2]).toBeCloseTo((1280 * 5) / 6, 0);
  });
});
