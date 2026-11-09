// src/versus/versus-main.ts
// 2인 대전 화면 실행. 카메라 1대 -> 듀얼 엔진 -> VersusLoop 60초 (연습은 15초).
import { AttackBus } from './attack';
import { VersusLoop, BOTH_VISIBLE_HINT } from './versus-loop';
import { splitPoses } from './split';
import { calibrateDual } from './dual-calibration';
import { loadRecord, saveResult, recordLabel, type Winner } from './record';
import type { PoseFrame } from '../pose/types';
import { loadDualEngine } from '../pose/mediapipe-dual';
import { VERSUS_REGISTRY } from './registry';
import { VERSUS_METAS, type VersusId } from './metas';
import { getPreferredCamera, listCameras, openVersusCamera, setPreferredCamera } from '../ui/camera';
import { fitStageToVideo } from '../ui/stage';
import { beep, isSoundOn, setSoundOn } from '../ui/feedback';
import { calibrate, isTPose } from '../calibration/calibrator';
import { reducedMotion, setReducedMotion } from './particles';

const NAMES: Record<VersusId, string> = Object.fromEntries(
  VERSUS_METAS.map((m) => [m.id, m.name])
) as Record<VersusId, string>;

const HELP: Record<VersusId, string[]> = Object.fromEntries(
  VERSUS_METAS.map((m) => [m.id, m.help])
) as Record<VersusId, string[]>;

export type VersusMode = 'duel' | 'practice';

export const DUEL_LIMIT_SEC = 60;
export const PRACTICE_LIMIT_SEC = 15;

let activeCleanup: (() => void) | null = null;
export function stopActiveVersus(): void {
  activeCleanup?.();
  activeCleanup = null;
}

const KIND_LABEL: Record<string, string> = {
  rotten: '썩은 과일', 'power-pull': '파워 당기기', fog: '안개', dark: '먹별',
  gift: '풍선 선물', rush: '가속', offbeat: '박자 단축', tiny: '타겟 축소',
  strict: '박수 강화', shake: '화면 흔들림'
};

export async function startVersus(
  app: HTMLElement, id: VersusId, mode: VersusMode = 'duel'
): Promise<void> {
  stopActiveVersus();
  const practice = mode === 'practice';
  const limitSec = practice ? PRACTICE_LIMIT_SEC : DUEL_LIMIT_SEC;
  document.title = `${NAMES[id]} | Skeleton Versus`;
  app.innerHTML =
    `<div class="game-screen"><div class="game-inner versus-wrap">` +
    `<header class="game-top"><p class="game-kicker">Skeleton Versus · 2인 대전 · ${limitSec}초${practice ? ' · 연습' : ''}</p>` +
    `<h1 class="game-title">${NAMES[id]}</h1>` +
    `<nav class="game-nav" aria-label="게임 이동"><a href="#/">← 대전 고르기</a>` +
    `<button type="button" id="practice" class="btn-small">${practice ? '대전 시작' : '연습하기'}</button>` +
    `<button type="button" id="howto" class="btn-small">게임 방법</button>` +
    `<button type="button" id="sound" class="btn-small" aria-pressed="${isSoundOn()}">소리 ${isSoundOn() ? '켜기' : '끄기'}</button>` +
    `<button type="button" id="motion" class="btn-small" aria-pressed="${reducedMotion()}">움직임 줄이기</button></nav></header>` +
    (practice ? `<p class="versus-mode">연습 모드 ${PRACTICE_LIMIT_SEC}초 — 점수·전적에 반영되지 않아요. 판정을 익혀요.</p>` : '') +
    `<main aria-label="대전 화면">` +
    `<div class="versus-score" aria-live="off"><div class="side p1" aria-label="P1 점수"><span class="side-icon" aria-hidden="true">●</span> P1 <strong id="score1">0</strong> <span id="combo1" class="combo" aria-hidden="true"></span></div>` +
    `<div class="mid"><span id="time">${limitSec}:00</span></div>` +
    `<div class="side p2" aria-label="P2 점수"><span class="side-icon" aria-hidden="true">▲</span> <strong id="score2">0</strong> P2 <span id="combo2" class="combo" aria-hidden="true"></span></div></div>` +
    `<p id="attack" class="versus-attack" aria-live="polite"></p>` +
    `<div class="stage-wrap"><div class="stage-frame"><video id="cam" playsinline muted></video><canvas id="stage" width="960" height="480"></canvas></div>` +
    `<div id="calib" class="overlay overlay-float"><p id="calibmsg">둘이 함께 T자세로 서주세요 (5초)</p><p id="calibstatus">팔을 넓게 벌리세요 · 서로 1m 이상 띄어 서세요</p><p>서로 1m 이상 띄어 서세요 (중앙선을 넘으면 점수가 멈춰요)</p><button id="skip" class="btn btn-pulse">바로 대전 시작</button></div>` +
    `<div id="result" class="overlay overlay-float" hidden></div></div>` +
    `<p id="hud" class="versus-hint">준비 중… 카메라 앞에 둘이 나란히 서세요 (2.5~3.5m).</p>` +
    `<div class="camrow"><label for="camsel">카메라</label><select id="camsel"></select>` +
    `<button id="retry" class="btn btn-accent" hidden>카메라 다시 찾기</button></div>` +
    `</main></div></div>`;

  app.querySelector('#practice')?.addEventListener('click', () => {
    window.location.hash = `#/${id}${practice ? '' : '?practice=1'}`;
  });

  const soundBtn = app.querySelector('#sound') as HTMLButtonElement | null;
  soundBtn?.addEventListener('click', () => {
    const on = !isSoundOn();
    setSoundOn(on);
    if (soundBtn) {
      soundBtn.textContent = `소리 ${on ? '켜기' : '끄기'}`;
      soundBtn.setAttribute('aria-pressed', String(on));
    }
  });
  const motionBtn = app.querySelector('#motion') as HTMLButtonElement | null;
  motionBtn?.addEventListener('click', () => {
    const on = !reducedMotion();
    setReducedMotion(on);
    if (motionBtn) {
      motionBtn.textContent = on ? '움직임 줄이기 켜짐' : '움직임 줄이기';
      motionBtn.setAttribute('aria-pressed', String(on));
    }
  });

  app.querySelector('#howto')?.addEventListener('click', async () => {
    const { openModal } = await import('../ui/modal');
    openModal({
      title: `${NAMES[id]} 게임 방법`,
      bodyHTML:
        `<ol>` + (HELP[id] ?? []).map((s) => `<li>${s}</li>`).join('') +
        `<li>중앙선을 넘으면 점수가 멈춰요 (서로 1m 이상 띄어 서세요)</li></ol>`
    });
  });

  const retry = document.getElementById('retry') as HTMLButtonElement | null;
  const showRetry = () => { if (retry) retry.hidden = false; };
  retry?.addEventListener('click', () => { void startVersus(app, id, mode); });

  const sel = document.getElementById('camsel') as HTMLSelectElement | null;
  if (sel) {
    const cams = await listCameras();
    sel.innerHTML = cams.length > 0
      ? cams.map((c) => `<option value="${c.deviceId}">${c.label}</option>`).join('')
      : `<option value="">카메라 없음</option>`;
    const preferred = getPreferredCamera();
    if (preferred && cams.some((c) => c.deviceId === preferred)) sel.value = preferred;
    sel.onchange = () => {
      setPreferredCamera(sel.value);
      void startVersus(app, id, mode);
    };
  }

  const video = await openVersusCamera(getPreferredCamera() ?? undefined);
  const hud = document.getElementById('hud');
  if (!video) {
    if (hud) hud.textContent = '카메라를 찾지 못했어요. 카메라를 연결하고 다시 시도해주세요.';
    showRetry();
    return;
  }
  const engine = await loadDualEngine();
  if (!engine) {
    if (hud) hud.textContent = '인식 모델을 불러오지 못했어요. 인터넷 연결을 확인해주세요.';
    showRetry();
    return;
  }
  const overlay = document.getElementById('calib');
  const calibmsg = document.getElementById('calibmsg');
  const calibstatus = document.getElementById('calibstatus');
  const skip = document.getElementById('skip') as HTMLButtonElement | null;
  let skipped = false;
  skip?.addEventListener('click', () => { skipped = true; });
  const waitMs = 5000;
  const t0 = Date.now();
  const leftFrames: PoseFrame[] = [];
  const rightFrames: PoseFrame[] = [];
  let sawTPoseLeft = false;
  let sawTPoseRight = false;
  const vw = video.videoWidth || 640;
  while (Date.now() - t0 < waitMs && !skipped) {
    await new Promise((r) => setTimeout(r, 200));
    if (!document.getElementById('stage')) return;
    const remain = Math.ceil((waitMs - (Date.now() - t0)) / 1000);
    if (calibmsg) calibmsg.textContent = `둘이 함께 T자세로 서주세요 (${Math.max(0, remain)}초)`;
    try {
      const frames = await engine.estimateDual(video);
      const split = splitPoses(frames, vw);
      if (split.left) leftFrames.push(split.left);
      if (split.right) rightFrames.push(split.right);
      if (leftFrames.length > 0) {
        try {
          const cal = calibrate(leftFrames);
          if (!sawTPoseLeft && leftFrames.some((f) => isTPose(f, cal))) sawTPoseLeft = true;
        } catch { /* 보정 실패는 무시 */ }
      }
      if (rightFrames.length > 0) {
        try {
          const cal = calibrate(rightFrames);
          if (!sawTPoseRight && rightFrames.some((f) => isTPose(f, cal))) sawTPoseRight = true;
        } catch { /* 보정 실패는 무시 */ }
      }
      if (calibstatus) {
        const leftMark = sawTPoseLeft ? '○' : '△';
        const rightMark = sawTPoseRight ? '○' : '△';
        const visibleMark = split.bothVisible ? '둘 다 보임 ○' : '둘 다 보이게 비켜주세요';
        calibstatus.textContent = `P1 T자세 ${leftMark} · P2 T자세 ${rightMark} · ${visibleMark}`;
      }
    } catch { break; }
  }
  overlay?.remove();
  const dualCal = calibrateDual(leftFrames, rightFrames);

  const attacks = new AttackBus();
  attacks.reset();
  if (practice) {
    attacks.send = () => false;
  }

  type SideHandle = {
    board: { score: number; combo: number };
    tick(a: never, b: number): never[];
    draw?: (c: CanvasRenderingContext2D, w: number, h: number) => void;
    start(): void;
    stop(): void;
  };
  const setup = VERSUS_REGISTRY[id](attacks, dualCal);
  const left = setup.left as unknown as SideHandle;
  const right = setup.right as unknown as SideHandle;

  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!canvas) return;
  fitStageToVideo(canvas, video.videoWidth || 960, video.videoHeight || 480);
  if (hud) {
    const poseNote = !sawTPoseLeft || !sawTPoseRight
      ? ' T자세 확인이 안 돼 판정이 부정확할 수 있어요.'
      : '';
    const skipNote = skipped ? ' 보정을 생략했어요.' : '';
    hud.textContent =
      `보정 완료! P1 ×${dualCal.p1.scale.toFixed(1)} · P2 ×${dualCal.p2.scale.toFixed(1)} — ${limitSec}초 ${practice ? '연습' : '대전'} 시작!${poseNote}${skipNote}`;
  }

  const score1 = document.getElementById('score1');
  const score2 = document.getElementById('score2');
  const combo1 = document.getElementById('combo1');
  const combo2 = document.getElementById('combo2');
  const timeEl = document.getElementById('time');
  const attackEl = document.getElementById('attack');
  const refresh = () => {
    const lBoard = (left as unknown as { board: { score: number; combo: number } }).board;
    const rBoard = (right as unknown as { board: { score: number; combo: number } }).board;
    if (score1) score1.textContent = String(lBoard.score);
    if (score2) score2.textContent = String(rBoard.score);
    if (combo1) combo1.textContent = lBoard.combo > 0 ? `${lBoard.combo}콤보 · 다음 +${lBoard.combo * 5}` : '';
    if (combo2) combo2.textContent = rBoard.combo > 0 ? `${rBoard.combo}콤보 · 다음 +${rBoard.combo * 5}` : '';
  };
  const refreshAttack = () => {
    if (!attackEl) return;
    const onP1 = attacks.onP1;
    const atk = onP1 ?? attacks.onP2;
    if (atk && atk.msLeft > 0) {
      const target = onP1 ? 'P1' : 'P2';
      const sec = Math.ceil(atk.msLeft / 1000);
      attackEl.textContent = `${target} 방해 중: ${KIND_LABEL[atk.kind] ?? atk.kind} ${sec}초`;
      (attackEl as HTMLElement).dataset.kind = atk.kind;
    } else if (attackEl.textContent) {
      attackEl.textContent = '';
    }
  };
  const loop = new VersusLoop({
    video,
    canvas,
    engine,
    left: left as never,
    right: right as never,
    attacks,
    timeLimitSec: limitSec,
    overlay: setup.overlay,
    onEvent: (side, events) => {
      for (const e of events) {
        if (e.type === 'feedback') {
          if (hud) hud.textContent = `${side === 'p1' ? 'P1' : 'P2'} ${e.label}`;
          continue;
        }
        const delta = e.points ? ` (+${e.points})` : '';
        beep(e.type === 'bomb' || e.type === 'wrong' ? 'miss' : e.type === 'attack' ? 'win' : 'hit');
        if (e.type === 'attack' && attackEl) {
          refreshAttack();
          if (!reducedMotion() && (e.label.includes('파워') || e.label.includes('흔들')) && canvas) {
            canvas.classList.remove('shake');
            void canvas.offsetWidth;
            canvas.classList.add('shake');
            setTimeout(() => canvas.classList.remove('shake'), 350);
          }
        } else if (hud) {
          const who = e.label.startsWith('P1') || e.label.startsWith('P2') ? '' : `${side === 'p1' ? 'P1 ' : 'P2 '}`;
          hud.textContent = `${who}${e.label}${delta}`;
        }
      }
      const hint = setup.statusHint?.();
      if (hint && hud) hud.textContent = hint;
      refresh();
      refreshAttack();
    },
    onHint: (msg) => {
      if (!hud) return;
      if (msg === BOTH_VISIBLE_HINT) {
        hud.textContent = `${msg} 혼자 연습 중이면 내 점수만 올라가요!`;
      } else if (msg) {
        hud.textContent = msg;
      }
    },
    onTimeUp: () => {
      const result = document.getElementById('result');
      if (!result) return;
      let winner: Winner;
      const setupWinner = setup.winner?.();
      if (setupWinner) {
        winner = setupWinner;
      } else {
        const lScore = (left as unknown as { board: { score: number } }).board.score;
        const rScore = (right as unknown as { board: { score: number } }).board.score;
        winner = lScore > rScore ? 'p1' : rScore > lScore ? 'p2' : 'draw';
      }
      const lScore = (left as unknown as { board: { score: number } }).board.score;
      const rScore = (right as unknown as { board: { score: number } }).board.score;
      const rec = practice ? loadRecord(id) : saveResult(id, winner);
      const recText = recordLabel(rec);
      const title = practice
        ? '연습 완료!'
        : winner === 'p1' ? '🏆 P1 승리!' : winner === 'p2' ? 'P2 승리! 🏆' : '무승부!';
      const p1Win = winner === 'p1';
      const p2Win = winner === 'p2';
      result.classList.remove('versus-result--p1', 'versus-result--p2', 'versus-result--draw');
      result.classList.add('versus-result', `versus-result--${winner}`);
      const tugNote = setup.winner ? `<p class="result-note">줄이 ${winner === 'p1' ? 'P1' : winner === 'p2' ? 'P2' : '가운데'} 쪽으로 기울었어요</p>` : '';
      result.innerHTML =
        `<p class="result-title" aria-live="assertive"><strong>${title}</strong></p>` +
        `<p class="result-score" aria-label="최종 점수 P1 ${lScore} 대 P2 ${rScore}">` +
        `<span class="result-side result-p1${p1Win ? ' is-winner' : ''}${!p1Win && !p2Win ? '' : p2Win ? ' is-loser' : ''}"><span class="side-icon" aria-hidden="true">●</span> P1 <strong>${lScore}</strong></span>` +
        `<span class="result-colon" aria-hidden="true">:</span>` +
        `<span class="result-side result-p2${p2Win ? ' is-winner' : ''}${!p1Win && !p2Win ? '' : p1Win ? ' is-loser' : ''}"><span class="side-icon" aria-hidden="true">▲</span> <strong>${rScore}</strong> P2</span></p>` +
        `<p class="result-note" aria-live="polite">${recText}</p>` +
        tugNote +
        `<p class="result-fps">최저 ${loop.minFps > 0 ? loop.minFps.toFixed(0) : '-'}fps</p>` +
        `<div class="result-actions"><button type="button" id="again" class="btn btn-pulse">다시 ${practice ? '연습' : '대전'}</button>` +
        (practice
          ? `<button type="button" id="duel" class="btn btn-accent">대전 시작</button>`
          : `<button type="button" id="practice2" class="btn btn-accent">연습하기</button>` +
            `<a class="btn btn-accent result-link" href="#/">대전 고르기</a>`) +
        `</div>`;
      result.hidden = false;
      if (winner !== 'draw' && !practice) {
        try {
          if (!reducedMotion()) {
            const party = document.createElement('div');
            party.className = `result-party result-party--${winner}`;
            party.setAttribute('aria-hidden', 'true');
            const colors = winner === 'p1'
              ? ['#00ffff', '#ffffff', '#dfff00', '#7CFC00']
              : ['#ffd23d', '#ffffff', '#ff8c00', '#dfff00'];
            const pieces = 70;
            for (let i = 0; i < pieces; i++) {
              const s = document.createElement('span');
              s.className = 'result-confetti';
              const leftPct = winner === 'p1'
                ? (2 + Math.random() * 46).toFixed(1)
                : (52 + Math.random() * 46).toFixed(1);
              s.style.left = `${leftPct}%`;
              s.style.top = `${(-5 - Math.random() * 20).toFixed(1)}%`;
              s.style.background = colors[i % colors.length];
              s.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
              s.style.animationDuration = `${(1.8 + Math.random() * 1.2).toFixed(2)}s`;
              s.style.transform = `rotate(${(Math.random() * 360).toFixed(0)}deg)`;
              party.appendChild(s);
            }
            result.appendChild(party);
            setTimeout(() => party.remove(), 3000);
          }
        } catch { /* 파티클 실패는 결과 표시 유지 */ }
      }
      result.querySelector('#again')?.addEventListener('click', () => {
        result.hidden = true;
        void startVersus(app, id, mode);
      });
      result.querySelector('#practice2')?.addEventListener('click', () => {
        window.location.hash = `#/${id}?practice=1`;
      });
      result.querySelector('#duel')?.addEventListener('click', () => {
        window.location.hash = `#/${id}`;
      });
      (result.querySelector('#again') as HTMLElement | null)?.focus?.();
      if (hud) hud.textContent = `${limitSec}초 ${practice ? '연습' : '대전'} 종료! ${title}`;
      beep('win');
    }
  });
  loop.start();
  const deadline = Date.now() + limitSec * 1000;
  const timer = setInterval(() => {
    if (!document.getElementById('stage')) { clearInterval(timer); return; }
    const remain = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (timeEl) timeEl.textContent = `0:${String(remain).padStart(2, '0')}`;
    refresh();
    refreshAttack();
    if (remain <= 0) clearInterval(timer);
  }, 500);
  activeCleanup = () => {
    clearInterval(timer);
    try { left.stop(); } catch { /* 무시 */ }
    try { right.stop(); } catch { /* 무시 */ }
    loop.stop();
  };
}
