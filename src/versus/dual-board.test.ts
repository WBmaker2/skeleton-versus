import { describe, it, expect } from 'vitest';
import { DualBoard } from './dual-board';

describe('DualBoard', () => {
  it('승자를 판정한다', () => {
    const b = new DualBoard();
    b.p1.add(30);
    b.p2.add(20);
    expect(b.winner).toBe('p1');
    expect(b.winnerLabel()).toBe('P1 승리!');
  });
  it('동점이면 무승부', () => {
    const b = new DualBoard();
    expect(b.winner).toBe('draw');
  });
});
