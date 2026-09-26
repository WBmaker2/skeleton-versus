import './leaderboard.css';
import { removeScore, topScores, updateScore } from '../game/storage';
import { RULES } from './help';
import { esc, openModal } from './modal';
import { isUnlocked, lock, unlock } from './admin';
import type { PlayableId } from './app';

export const BOARD_IDS: PlayableId[] = [
  'fruit', 'squat', 'math', 'abc', 'star', 'balloon',
  'zombie', 'dance', 'simon', 'yoga', 'duo', 'recycle'
];

function fmtDate(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 리더보드 목록. 메달은 모양(원·사각·외곽선)으로 순위를 구분한다 (WCAG 1.4.1).
// highlight와 이름·점수가 같은 첫 행은 NEW 표시로 강조한다.
export function boardHTML(gameId: PlayableId, highlight?: { name: string; score: number }): string {
  const list = topScores(gameId);
  if (list.length === 0) {
    return `<p class="board-empty">아직 기록이 없어요. 첫 주인공이 되어 보세요.</p>`;
  }
  let marked = false;
  return (
    `<ol class="board">` +
    list
      .map((s, i) => {
        const isNew =
          !marked && highlight !== undefined && s.name === highlight.name && s.score === highlight.score;
        if (isNew) marked = true;
        return (
          `<li class="board-row${isNew ? ' board-new' : ''}"><span class="medal medal-${Math.min(i + 1, 3)}" aria-hidden="true">${i + 1}</span>` +
          `<span class="board-name">${esc(s.name)}${isNew ? ' <span class="board-newtag">NEW</span>' : ''}</span>` +
          `<span class="board-score">${s.score}점</span>` +
          (s.date ? `<span class="board-date">${esc(fmtDate(s.date))}</span>` : '') +
          `</li>`
        );
      })
      .join('') +
    `</ol>`
  );
}

// 60초 종료 오버레이: 등록 전(폼+다시 도전)과 등록 후(다시 도전만).
export function resultFormHTML(score: number): string {
  return (
    `<p>60초 챌린지 종료! ${score}점</p>` +
    `<form id="regform"><p><label for="regname">리더보드에 올릴 이름</label></p>` +
    `<p><input id="regname" name="regname" maxlength="12" autocomplete="off" aria-describedby="reg-err"> ` +
    `<button type="submit" class="btn">등록</button></p>` +
    `<p id="reg-err" class="form-err"></p></form>` +
    `<button type="button" id="again" class="btn">다시 도전</button>`
  );
}

export function resultDoneHTML(score: number): string {
  return (
    `<p>60초 챌린지 종료! ${score}점 — 등록 완료!</p>` +
    `<button type="button" id="again" class="btn">다시 도전</button>`
  );
}

export function refreshBoard(root: ParentNode, gameId: PlayableId): void {
  const ol = root.querySelector('#ranks');
  if (ol) ol.innerHTML = boardHTML(gameId);
}

// 히든 관리자 버튼 (푸터 구석의 작은 점).
export function adminDotHTML(): string {
  return `<button type="button" class="admin-dot" data-admin-dot aria-label="관리자 모드"></button>`;
}

export function wireAdminDot(root: ParentNode, onChanged: () => void): void {
  root.querySelector('[data-admin-dot]')?.addEventListener('click', () => {
    if (isUnlocked()) {
      openAdminPanel(onChanged);
      return;
    }
    openPinModal((closePin) => {
      closePin();
      openAdminPanel(onChanged);
    });
  });
}

function openPinModal(onSuccess: (closePin: () => void) => void): void {
  let closePin = (): void => {};
  const submit = (e: Event): void => {
    e.preventDefault();
    const input = document.querySelector('#pin') as HTMLInputElement | null;
    const err = document.querySelector('#pin-err');
    if (input && unlock(input.value.trim())) {
      onSuccess(closePin);
      return;
    }
    if (err) err.textContent = '핀 번호가 틀렸어요. 다시 입력하세요.';
    input?.focus();
    input?.select();
  };
  closePin = openModal({
    title: '관리자 모드',
    bodyHTML:
      `<form id="pinform"><p><label for="pin">핀 번호 4자리를 입력하세요.</label></p>` +
      `<p><input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="4" aria-describedby="pin-err">` +
      ` <button type="submit" class="btn-small">열기</button></p>` +
      `<p id="pin-err" class="form-err"></p></form>`
  });
  document.querySelector('#pinform')?.addEventListener('submit', submit);
}

function adminPanelHTML(): string {
  return BOARD_IDS.map((id) => {
    const list = topScores(id, 5);
    const rows =
      list.length === 0
        ? `<p class="board-empty">기록 없음</p>`
        : list
            .map(
              (s, i) =>
                `<li class="admin-row" data-game="${id}" data-index="${i}">` +
                `<input value="${esc(s.name)}" maxlength="12" aria-label="${esc(RULES[id].name)} ${i + 1}위 이름">` +
                `<input type="number" value="${s.score}" min="0" max="99999" aria-label="${esc(RULES[id].name)} ${i + 1}위 점수">` +
                `<button type="button" data-save>저장</button>` +
                `<button type="button" data-del>삭제</button></li>`
            )
            .join('');
    return `<section class="admin-game"><h3>${esc(RULES[id].name)}</h3><ol class="admin-list">${rows}</ol></section>`;
  }).join('');
}

function openAdminPanel(onChanged: () => void): void {
  openModal({ title: '기록 관리', bodyHTML: `<div id="adminpanel">${adminPanelHTML()}</div>` });
  const panel = document.querySelector('#adminpanel');
  if (!panel) return;
  panel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;
    const row = btn.closest('.admin-row') as HTMLElement | null;
    if (!row || !row.dataset.game || row.dataset.index === undefined) return;
    const gameId = row.dataset.game as PlayableId;
    const index = Number(row.dataset.index);
    const nameInput = row.querySelector('input:not([type])') as HTMLInputElement | null;
    const scoreInput = row.querySelector('input[type="number"]') as HTMLInputElement | null;
    if (btn.hasAttribute('data-del')) {
      // 파괴적 동작 2단계 확인 (같은 버튼으로 무장·실행).
      if (btn.dataset.armed !== '1') {
        btn.dataset.armed = '1';
        btn.textContent = '정말 삭제';
        return;
      }
      removeScore(gameId, index);
    } else {
      const name = (nameInput?.value ?? '').trim() || '익명';
      const score = Math.max(0, Math.min(99999, Math.floor(Number(scoreInput?.value) || 0)));
      updateScore(gameId, index, { name, score });
    }
    const host = document.querySelector('#adminpanel');
    if (host) host.innerHTML = adminPanelHTML();
    onChanged();
  });
  const head = document.querySelector('#modal-title');
  if (head) {
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'btn-small';
    out.textContent = '잠그기';
    out.addEventListener('click', () => {
      lock();
      (document.querySelector('.modal-close') as HTMLElement | null)?.click();
    });
    head.after(out);
  }
}
