// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderLanding, filterGames, pickRandomGame, LANDING_GAMES } from '../src/landing/landing';

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.location.hash = '';
});

function app(): HTMLElement {
  const el = document.getElementById('app');
  if (!el) throw new Error('no app');
  return el;
}

describe('landing filters', () => {
  it('전체 17종목을 보여준다', () => {
    expect(LANDING_GAMES).toHaveLength(17);
    renderLanding(app());
    expect(app().querySelectorAll('#duel-grid .game-card')).toHaveLength(17);
  });
  it('카테고리로 고른다', () => {
    expect(filterGames('speed')).toHaveLength(6);
    expect(filterGames('power')).toHaveLength(3);
    expect(filterGames('accuracy')).toHaveLength(3);
    expect(filterGames('brain')).toHaveLength(5);
    renderLanding(app());
    const btn = app().querySelector<HTMLButtonElement>('[data-filter="speed"]');
    btn?.click();
    expect(app().querySelectorAll('#duel-grid .game-card')).toHaveLength(6);
    expect(app().querySelector('#duel-count')?.textContent).toContain('6종목');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
  });
  it('랜덤 대전은 해시를 바꾼다', () => {
    renderLanding(app());
    app().querySelector<HTMLButtonElement>('#random-duel')?.click();
    expect(window.location.hash).toMatch(/^#\/versus-/);
  });
  it('pickRandomGame은 해당 카테고리에서 고른다', () => {
    for (let i = 0; i < 20; i++) {
      const pick = pickRandomGame('power');
      expect(['versus-tug', 'versus-run', 'versus-power']).toContain(pick.id);
    }
  });
});
