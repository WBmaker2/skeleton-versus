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
  it('전체 18종목을 보여준다', () => {
    expect(LANDING_GAMES).toHaveLength(18);
    renderLanding(app());
    expect(app().querySelectorAll('#duel-grid .game-card')).toHaveLength(18);
  });
  it('카테고리로 고른다', () => {
    expect(filterGames('speed')).toHaveLength(7);
    expect(filterGames('power')).toHaveLength(3);
    expect(filterGames('accuracy')).toHaveLength(3);
    expect(filterGames('brain')).toHaveLength(5);
    renderLanding(app());
    const btn = app().querySelector<HTMLButtonElement>('[data-filter="speed"]');
    btn?.click();
    expect(app().querySelectorAll('#duel-grid .game-card')).toHaveLength(7);
    expect(app().querySelector('#duel-count')?.textContent).toContain('7종목');
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
  it('제목 오른쪽에 1인 게임 이동 버튼이 있다', () => {
    renderLanding(app());
    const link = app().querySelector<HTMLAnchorElement>('.landing__solo-link');
    expect(link?.textContent).toContain('1인 게임으로 이동');
    expect(link?.getAttribute('href')).toBe('https://wbmaker2.github.io/skeleton-games/');
    expect(link?.closest('.landing__title-row')?.querySelector('.landing__title')).not.toBe(null);
  });
  it('카드는 생성 이미지 + SVG 폴백을 함께 가진다', () => {
    renderLanding(app());
    const frames = app().querySelectorAll('#duel-grid .art-frame');
    expect(frames).toHaveLength(18);
    frames.forEach((f) => {
      const img = f.querySelector('img');
      const svg = f.querySelector('svg.art-fallback');
      expect(img?.getAttribute('src')).toMatch(/^art\/versus-.+\.jpg$/);
      expect(img?.getAttribute('alt')).toContain('카드 그림');
      expect(svg).not.toBe(null);
    });
  });
});
