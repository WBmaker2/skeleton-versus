import '../ui/theme.css';
import './landing.css';
import updateLogRaw from '../../docs/UPDATELOG.md?raw';
import { openModal, parseUpdateLog, updateLogHTML } from '../ui/modal';
import { adminDotHTML, wireAdminDot } from '../ui/leaderboard';
import { VERSUS_METAS } from '../versus/metas';

export interface LandingGame {
  id: 'versus-fruit' | 'versus-tug' | 'versus-math';
  no: number;
  name: string;
  rule: string;
  effect: string;
}

// 대전 3종만 보여준다 (1인 12종 코드는 그대로 두되 랜딩에서는 숨김).
export const LANDING_GAMES: LandingGame[] = VERSUS_METAS.map((m) => ({
  id: m.id as LandingGame['id'],
  no: m.no,
  name: m.name,
  rule: m.rule,
  effect: m.effect
}));

function placeholderFace(): string {
  return `<svg class="art-fallback" viewBox="0 0 200 200" aria-hidden="true" focusable="false">`
    + `<circle cx="70" cy="105" r="40" fill="#ffffff" stroke="#22303c" stroke-width="7"/>`
    + `<circle cx="130" cy="105" r="40" fill="#ffffff" stroke="#22303c" stroke-width="7"/>`
    + `<circle cx="60" cy="98" r="6" fill="#22303c"/>`
    + `<circle cx="120" cy="98" r="6" fill="#22303c"/>`
    + `<path d="M55 118 Q70 130 85 118" fill="none" stroke="#22303c" stroke-width="5" stroke-linecap="round"/>`
    + `<path d="M115 118 Q130 130 145 118" fill="none" stroke="#22303c" stroke-width="5" stroke-linecap="round"/>`
    + `</svg>`;
}

function card(game: LandingGame): string {
  return `<li>`
    + `<a class="game-card" style="--i: ${game.no - 1}" href="#/${game.id}">`
    + `<div class="art-frame">${placeholderFace()}</div>`
    + `<span class="game-card__badge">대전 ${game.no} · ${game.effect}</span>`
    + `<h2 class="game-card__title">${game.name}</h2>`
    + `<p class="game-card__rule">${game.rule}</p>`
    + `<span class="game-card__cta">대전 시작</span>`
    + `</a></li>`;
}

export function renderLanding(app: HTMLElement): void {
  document.title = '대전 고르기 | Skeleton Versus';
  app.innerHTML =
    `<div class="landing"><div class="landing__inner">`
    + `<header><p class="landing__kicker">카메라 1대 · 둘이 함께 · 60초 승부</p>`
    + `<h1 class="landing__title">어떤 대결을 할까?</h1>`
    + `<p class="landing__sub">왼쪽에 한 명, 오른쪽에 한 명. 카메라 앞에 나란히 서서 시작하세요 (2.5~3.5m).</p></header>`
    + `<main aria-label="대전 목록"><ul class="landing__grid">`
    + LANDING_GAMES.map(card).join('')
    + `</ul></main>`
    + `<footer><p class="landing__foot">TIP: 둘이 다 화면에 보여야 점수가 올라가요. `
    + `<button type="button" id="updatelog" class="btn-small">업데이트 내역</button> ${adminDotHTML()}</p>`
    + `<p class="landing__readiness" id="readiness">인식 모델 확인 중…</p></footer>`
    + `</div></div>`;
  wireUpdateLog();
  wireAdminDot(app, () => {});
  void refreshReadiness(app);
}

async function refreshReadiness(app: HTMLElement): Promise<void> {
  const el = app.querySelector('#readiness');
  if (!el) return;
  try {
    const { checkReadiness, readinessMessage } = await import('../ui/readiness');
    el.textContent = readinessMessage(await checkReadiness());
  } catch {
    el.textContent = '인식 모델 확인 중…';
  }
}

export function wireUpdateLog(root: ParentNode = document): void {
  root.querySelector('#updatelog')?.addEventListener('click', () => {
    openModal({
      title: '업데이트 내역',
      bodyHTML: updateLogHTML(parseUpdateLog(updateLogRaw))
    });
  });
}
