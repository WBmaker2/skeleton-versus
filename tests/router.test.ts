// tests/router.test.ts
import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/ui/router';

describe('parseHash', () => {
  it('maps #/fruit to fruit', () => {
    expect(parseHash('#/fruit')).toBe('fruit');
  });
  it('maps unknown to home', () => {
    expect(parseHash('#/nope')).toBe('home');
  });
  it('maps empty to home', () => {
    expect(parseHash('')).toBe('home');
  });
});
