// tests/smoothing.test.ts
import { describe, expect, it } from 'vitest';
import { EmaFilter } from '../src/pose/smoothing';

describe('EmaFilter', () => {
  it('converges toward constant input', () => {
    const f = new EmaFilter(0.5);
    let v = 0;
    for (let i = 0; i < 10; i++) v = f.next(10);
    expect(v).toBeCloseTo(10, 1);
  });
});
