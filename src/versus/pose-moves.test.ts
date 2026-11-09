import { describe, it, expect } from 'vitest';
import { pointSpeed, pushTimedTrail, recentTravelRatio, type TimedTrailPoint } from './pose-moves';

describe('trail helpers', () => {
  it('가만히 둔 손의 이동량은 어깨너비 대비 작다', () => {
    const trail: TimedTrailPoint[] = [];
    pushTimedTrail(trail, 100, 100, 16);
    pushTimedTrail(trail, 102, 100, 16);
    expect(recentTravelRatio(trail, { x: 102, y: 100 }, 100)).toBeLessThan(0.3);
  });
  it('휘두른 손의 이동량은 크다', () => {
    const trail: TimedTrailPoint[] = [];
    pushTimedTrail(trail, 0, 100, 16);
    pushTimedTrail(trail, 100, 100, 16);
    expect(recentTravelRatio(trail, { x: 100, y: 100 }, 100)).toBeGreaterThanOrEqual(0.3);
  });
});

describe('pointSpeed', () => {
  it('어깨너비/s 단위로 잰다', () => {
    // 어깨너비 40px, 100ms에 16px 이동 = 4/s
    expect(pointSpeed({ x: 0, y: 0 }, { x: 16, y: 0 }, 100, 40)).toBeCloseTo(4, 5);
  });
  it('결측·0으로 나누기에서 0을 돌려준다', () => {
    expect(pointSpeed(null, { x: 1, y: 1 }, 100, 40)).toBe(0);
    expect(pointSpeed({ x: 0, y: 0 }, { x: 1, y: 1 }, 0, 40)).toBe(0);
    expect(pointSpeed({ x: 0, y: 0 }, { x: 1, y: 1 }, 100, 0)).toBe(0);
  });
});
