// tests/game-engine.test.ts
import { describe, expect, it } from 'vitest';
import { ScoreBoard } from '../src/game/engine';

describe('ScoreBoard', () => {
  it('accumulates combo bonus', () => {
    const s = new ScoreBoard();
    s.add(10);
    s.comboHit();
    s.comboHit();
    s.add(10);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(2);
  });
  it('resets combo on miss', () => {
    const s = new ScoreBoard();
    s.comboHit();
    s.comboMiss();
    expect(s.combo).toBe(0);
  });
});
