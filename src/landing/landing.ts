import '../ui/theme.css';
import './landing.css';
import updateLogRaw from '../../docs/UPDATELOG.md?raw';
import { openModal, parseUpdateLog, updateLogHTML } from '../ui/modal';
import { VERSUS_METAS, type VersusId } from '../versus/metas';

export interface LandingGame {
  id: VersusId;
  no: number;
  name: string;
  rule: string;
  effect: string;
}

// 대전 전종목을 보여준다 (새 종목은 VERSUS_METAS에만 추가하면 카드가 따라온다).
export const LANDING_GAMES: LandingGame[] = VERSUS_METAS.map((m) => ({
  id: m.id as LandingGame['id'],
  no: m.no,
  name: m.name,
  rule: m.rule,
  effect: m.effect
}));

function artFor(id: LandingGame['id']): string {
  const open = `<svg class="art-fallback" viewBox="0 0 200 160" aria-hidden="true" focusable="false">`;
  const close = `</svg>`;
  if (id === 'versus-fruit') {
    // 과일 2개 + 잎: 베기 대전
    return open
      + `<circle cx="70" cy="95" r="34" fill="#ff5d5d" stroke="#22303c" stroke-width="7"/>`
      + `<ellipse cx="82" cy="66" rx="12" ry="6" fill="#3d9e57" transform="rotate(30 82 66)"/>`
      + `<circle cx="140" cy="75" r="24" fill="#ff8a8a" stroke="#22303c" stroke-width="6"/>`
      + `<ellipse cx="149" cy="54" rx="9" ry="5" fill="#3d9e57" transform="rotate(30 149 54)"/>`
      + `<path d="M30 130 L120 60" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>`
      + close;
  }
  if (id === 'versus-tug') {
    // 줄 + 매듭 + 양쪽 화살표: 줄다리기
    return open
      + `<line x1="20" y1="80" x2="180" y2="80" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>`
      + `<circle cx="100" cy="80" r="14" fill="#dfff00" stroke="#22303c" stroke-width="5"/>`
      + `<path d="M40 50 L25 80 L40 110" fill="none" stroke="#00ffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="M160 50 L175 80 L160 110" fill="none" stroke="#ffd23d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
      + close;
  }
  // 수학 달리기: 문제 + 3구역
  if (id === 'versus-math') {
    return open
      + `<text x="100" y="55" text-anchor="middle" font-size="34" font-weight="800" fill="#ffffff" font-family="sans-serif">7+8=?</text>`
      + `<rect x="30" y="90" width="36" height="36" rx="8" fill="#dfff00"/>`
      + `<rect x="82" y="90" width="36" height="36" rx="8" fill="none" stroke="#ffffff" stroke-width="5"/>`
      + `<rect x="134" y="90" width="36" height="36" rx="8" fill="none" stroke="#ffffff" stroke-width="5"/>`
      + close;
  }
  if (id === 'versus-star') {
    // 별 3개: 별잡기 대전
    return open
      + `<path d="M70 30 l9 19 21 3 -15 15 4 21 -19 -10 -19 10 4 -21 -15 -15 21 -3 z" fill="#dfff00" stroke="#22303c" stroke-width="4" stroke-linejoin="round"/>`
      + `<path d="M140 70 l7 14 16 2 -11 11 3 16 -15 -8 -15 8 3 -16 -11 -11 16 -2 z" fill="#ffffff" stroke="#22303c" stroke-width="4" stroke-linejoin="round"/>`
      + `<circle cx="60" cy="120" r="5" fill="#ffffff"/>`
      + `<circle cx="150" cy="120" r="5" fill="#ffffff"/>`
      + close;
  }
  if (id === 'versus-simon') {
    // 확성기: 사이먼 대전
    return open
      + `<rect x="60" y="45" width="50" height="70" rx="10" fill="#ff71ce" stroke="#22303c" stroke-width="6"/>`
      + `<path d="M110 60 L150 40 L150 110 L110 95 z" fill="#ffffff" stroke="#22303c" stroke-width="6" stroke-linejoin="round"/>`
      + `<circle cx="72" cy="65" r="5" fill="#22303c"/>`
      + `<circle cx="90" cy="65" r="5" fill="#22303c"/>`
      + `<path d="M72 90 Q81 98 90 90" fill="none" stroke="#22303c" stroke-width="5" stroke-linecap="round"/>`
      + close;
  }
  // 별자리 대전: 이어진 별 3개 + 점선
  if (id === 'versus-duo') {
    return open
      + `<path d="M30 120 L90 50 L160 95" fill="none" stroke="#ffffff" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round"/>`
      + `<circle cx="30" cy="120" r="12" fill="#dfff00" stroke="#22303c" stroke-width="4"/>`
      + `<circle cx="90" cy="50" r="12" fill="#dfff00" stroke="#22303c" stroke-width="4"/>`
      + `<circle cx="160" cy="95" r="12" fill="#ffffff" stroke="#22303c" stroke-width="4"/>`
      + close;
  }
  if (id === 'versus-abc') {
    // ABC 대전: 큰 글자 A
    return open
      + `<text x="100" y="120" text-anchor="middle" font-size="96" font-weight="800" fill="#ffffff" font-family="sans-serif">A</text>`
      + close;
  }
  if (id === 'versus-dance') {
    // 댄스 대전: 춤추는 막대인간
    return open
      + `<circle cx="100" cy="35" r="14" fill="#ffffff" stroke="#22303c" stroke-width="5"/>`
      + `<line x1="100" y1="50" x2="100" y2="95" stroke="#00ffff" stroke-width="7" stroke-linecap="round"/>`
      + `<line x1="100" y1="60" x2="60" y2="35" stroke="#00ffff" stroke-width="7" stroke-linecap="round"/>`
      + `<line x1="100" y1="60" x2="140" y2="35" stroke="#00ffff" stroke-width="7" stroke-linecap="round"/>`
      + `<line x1="100" y1="95" x2="75" y2="135" stroke="#00ffff" stroke-width="7" stroke-linecap="round"/>`
      + `<line x1="100" y1="95" x2="125" y2="135" stroke="#00ffff" stroke-width="7" stroke-linecap="round"/>`
      + `<circle cx="60" cy="35" r="7" fill="#dfff00"/>`
      + `<circle cx="140" cy="35" r="7" fill="#dfff00"/>`
      + close;
  }
  // 풍선 대전: 풍선 + 줄
  return open
    + `<line x1="100" y1="105" x2="100" y2="140" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>`
    + `<ellipse cx="100" cy="70" rx="34" ry="40" fill="#ff71ce" stroke="#22303c" stroke-width="6"/>`
    + close;
}

function card(game: LandingGame): string {
  return `<li>`
    + `<a class="game-card" style="--i: ${game.no - 1}" href="#/${game.id}">`
    + `<div class="art-frame">${artFor(game.id)}</div>`
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
    + `<button type="button" id="updatelog" class="btn-small">업데이트 내역</button></p>`
    + `<p class="landing__readiness" id="readiness">인식 모델 확인 중…</p></footer>`
    + `</div></div>`;
  wireUpdateLog();
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
