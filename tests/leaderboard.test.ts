// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { isUnlocked, lock, unlock } from '../src/ui/admin';
import { boardHTML, resultDoneHTML, resultFormHTML } from '../src/ui/leaderboard';
import { saveScore } from '../src/game/storage';

afterEach(() => {
  lock();
  localStorage.clear();
});

describe('admin lock', () => {
  it('starts locked and rejects wrong PIN', () => {
    expect(isUnlocked()).toBe(false);
    expect(unlock('0000')).toBe(false);
    expect(isUnlocked()).toBe(false);
  });
  it('unlocks with 0392 and relocks', () => {
    expect(unlock('0392')).toBe(true);
    expect(isUnlocked()).toBe(true);
    lock();
    expect(isUnlocked()).toBe(false);
  });
});

describe('boardHTML', () => {
  it('shows empty state without scores', () => {
    expect(boardHTML('fruit')).toContain('첫 주인공');
  });
  it('escapes names and ranks by score', () => {
    saveScore('fruit', { name: '<b>해커</b>', score: 5 });
    saveScore('fruit', { name: '1등', score: 99 });
    const html = boardHTML('fruit');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;b&gt;');
    expect(html.indexOf('1등')).toBeLessThan(html.indexOf('해커'));
  });
});

describe('boardHTML highlight', () => {
  it('marks the matching entry NEW', () => {
    saveScore('duo', { name: '나', score: 20 });
    saveScore('duo', { name: '너', score: 40 });
    const html = boardHTML('duo', { name: '나', score: 20 });
    expect(html).toContain('board-new');
    expect(html).toContain('NEW');
  });
  it('marks nothing without highlight', () => {
    saveScore('duo', { name: '나', score: 20 });
    expect(boardHTML('duo')).not.toContain('board-new');
  });
});

describe('result overlay states', () => {
  it('registration state shows the form', () => {
    expect(resultFormHTML(100)).toContain('regform');
    expect(resultFormHTML(100)).toContain('다시 도전');
  });
  it('done state hides the form and keeps retry', () => {
    const html = resultDoneHTML(100);
    expect(html).toContain('다시 도전');
    expect(html).not.toContain('regform');
  });
});
