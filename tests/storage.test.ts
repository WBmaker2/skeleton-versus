// @vitest-environment happy-dom
// tests/storage.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { saveScore, topScores, shareLink, updateScore, removeScore } from '../src/game/storage';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('keeps top 5 sorted desc', () => {
    saveScore('fruit', { name: 'a', score: 10 });
    saveScore('fruit', { name: 'b', score: 50 });
    saveScore('fruit', { name: 'c', score: 30 });
    expect(topScores('fruit')[0]).toMatchObject({ name: 'b', score: 50 });
  });
  it('builds share link with hash', () => {
    expect(shareLink('fruit')).toContain('#/fruit');
  });
  it('merges duplicate names keeping the higher score', () => {
    saveScore('fruit', { name: '나', score: 50 });
    saveScore('fruit', { name: '나', score: 30 });
    const top = topScores('fruit');
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ name: '나', score: 50 });
  });
  it('replaces with a higher score for the same name', () => {
    saveScore('fruit', { name: '나', score: 30 });
    const saved = saveScore('fruit', { name: '나', score: 70 });
    expect(saved.score).toBe(70);
    expect(topScores('fruit')).toHaveLength(1);
  });
  it('merges legacy duplicates on read', () => {
    localStorage.setItem(
      'skelplay:fruit',
      JSON.stringify([
        { name: '나', score: 20 },
        { name: '나', score: 60 },
        { name: '너', score: 10 }
      ])
    );
    expect(topScores('fruit').map((s) => s.score)).toEqual([60, 10]);
  });
  it('trims names when merging', () => {
    saveScore('fruit', { name: '나', score: 10 });
    saveScore('fruit', { name: ' 나 ', score: 20 });
    expect(topScores('fruit')).toHaveLength(1);
  });
  it('returns [] on corrupted JSON', () => {
    localStorage.setItem('skelplay:fruit', 'not-json{{{');
    expect(topScores('fruit')).toEqual([]);
    saveScore('fruit', { name: 'recovered', score: 7 });
    expect(topScores('fruit')).toMatchObject([{ name: 'recovered', score: 7 }]);
  });
});

describe('admin storage ops', () => {
  beforeEach(() => localStorage.clear());
  it('updates a score and re-sorts', () => {
    saveScore('math', { name: 'a', score: 10 });
    saveScore('math', { name: 'b', score: 50 });
    updateScore('math', 1, { name: 'a+', score: 80 });
    expect(topScores('math').map((s) => s.name)).toEqual(['a+', 'b']);
  });
  it('ignores out-of-range update and remove', () => {
    saveScore('math', { name: 'a', score: 10 });
    updateScore('math', 5, { name: 'x', score: 99 });
    removeScore('math', -1);
    expect(topScores('math')).toHaveLength(1);
  });
  it('removes a score', () => {
    saveScore('math', { name: 'a', score: 10 });
    saveScore('math', { name: 'b', score: 50 });
    removeScore('math', 0);
    expect(topScores('math').map((s) => s.name)).toEqual(['a']);
  });
});
