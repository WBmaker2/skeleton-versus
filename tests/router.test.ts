// tests/router.test.ts
import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/ui/router';

describe('parseHash', () => {
  it('maps #/versus-fruit to versus-fruit', () => {
    expect(parseHash('#/versus-fruit')).toBe('versus-fruit');
  });
  it('maps #/versus-tug to versus-tug', () => {
    expect(parseHash('#/versus-tug')).toBe('versus-tug');
  });
  it('maps #/versus-math to versus-math', () => {
    expect(parseHash('#/versus-math')).toBe('versus-math');
  });
  it('maps old 1P routes and unknown to home', () => {
    expect(parseHash('#/fruit')).toBe('home');
    expect(parseHash('#/nope')).toBe('home');
  });
  it('maps empty to home', () => {
    expect(parseHash('')).toBe('home');
  });
});
