// @vitest-environment happy-dom
// tests/calibration-apply.test.ts
import { describe, expect, it } from 'vitest';
import { FruitNinja } from '../src/games/fruit';
import { BodyABC } from '../src/games/abc';
import { drawZones } from '../src/ui/renderer';
import type { PoseFrame } from '../src/pose/types';

function wristFrame(x: number, y: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_wrist', x, y, score: 1 },
      { name: 'right_wrist', x: 500, y: 400, score: 1 }
    ]
  };
}

describe('calibration application', () => {
  it('fruit hit radius scales with radiusScale', () => {
    const g = new FruitNinja();
    g.start();
    g.radiusScale = 2;
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(180, 100), 16);
    expect(events.some((e) => e.type === 'slice')).toBe(true);
  });
  it('body abc defaults to standing mode', () => {
    expect(new BodyABC().mode).toBe('standing');
  });
  it('drawZones does not throw without 2d context', () => {
    const canvas = document.createElement('canvas');
    expect(() => drawZones(canvas, 600)).not.toThrow();
  });
});
