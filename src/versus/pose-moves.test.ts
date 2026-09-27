import { describe, it, expect } from 'vitest';
import { pointSpeed } from './pose-moves';

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
