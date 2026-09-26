import { parseHash } from './ui/router';
import type { GameId } from './ui/router';
import { createGame, defaultCalibration, loadEngine } from './ui/app';
import type { PlayableId } from './ui/app';
import { FruitNinja } from './games/fruit';
import { BodyABC } from './games/abc';
import type { PoseEngine } from './pose/pose-engine';
import { calibrate } from './calibration/calibrator';
import type { Calibration, PoseFrame } from './pose/types';
import { GameLoop } from './game/loop';
import { beep } from './ui/feedback';
import { saveScore, shareLink } from './game/storage';
import { boardHTML, refreshBoard, resultDoneHTML, resultFormHTML } from './ui/leaderboard';
import type { ScoreBoard } from './game/engine';
import { renderLanding } from './landing/landing';
import { openModal } from './ui/modal';
import { RULES } from './ui/help';
import { getPreferredCamera, listCameras, setPreferredCamera } from './ui/camera';
import { fitStageToVideo } from './ui/stage';
import './ui/game.css';

import { GAMEMETAS } from './games';

// 게임 화면 제목은 각 게임 폴더의 meta에서 가져온다.
const GAME_NAMES: Record<PlayableId, string> = Object.fromEntries(
  GAMEMETAS.map((m) => [m.id, m.name])
) as Record<PlayableId, string>;

function gameIdOr(id: GameId): PlayableId {
  return id === 'home' ? 'fruit' : id;
}

export interface CountdownOpts {
  beats?: number[];
  stepMs?: number;
  goMs?: number;
  frameMs?: number;
}

// 카운트다운 + 백그라운드 보정: 5→1 표시 동안 프레임을 모아 보정한다.
// 스킵하면 즉시 게임으로. 게임 시작을 블로킹하지 않는 고정 시간 흐름.
export async function countdownCalibration(
  engine: PoseEngine,
  video: HTMLVideoElement | null,
  overlay: HTMLElement,
  opts: CountdownOpts = {}
): Promise<Calibration> {
  const beats = opts.beats ?? [5, 4, 3, 2, 1];
  const stepMs = opts.stepMs ?? 1000;
  const goMs = opts.goMs ?? 600;
  const frameMs = opts.frameMs ?? 80;
  const msg = overlay.querySelector('#calibmsg') ?? overlay;
  const skipped = (): boolean =>
    (overlay as HTMLElement & { skipped?: boolean }).skipped === true;
  const frames: PoseFrame[] = [];
  const dummy = video ?? document.createElement('video');
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  const endAt = Date.now() + beats.length * stepMs + goMs;
  let beat = 0;
  msg.innerHTML = '';
  const num = document.createElement('div');
  num.className = 'count-num';
  const sub = document.createElement('p');
  sub.textContent = 'T자세로 서서 준비하세요';
  msg.append(num, sub);
  while (Date.now() < endAt && !skipped()) {
    const remain = endAt - Date.now();
    const label = remain <= goMs ? '시작!' : String(beats[Math.min(beat, beats.length - 1)]);
    if (num.textContent !== label) {
      num.textContent = label;
      beat += 1;
    }
    try {
      frames.push(await engine.estimate(dummy));
    } catch {
      break;
    }
    await sleep(frameMs);
  }
  if (frames.length < 4) return defaultCalibration();
  return calibrate(frames);
}

export function boot(): void {
  if ((window as unknown as { __skelplay_booted?: boolean }).__skelplay_booted) return;
  (window as unknown as { __skelplay_booted?: boolean }).__skelplay_booted = true;
  const app = document.getElementById('app');
  if (!app) return;
  let loop: GameLoop | null = null;
  let engine: PoseEngine | null = null;
  let fpsTimer = 0;
  let current: { id: PlayableId; board: ScoreBoard } | null = null;
  let lastCombo = 0;
  const render = () => {
    // 라우트 이동 시 자동 저장하지 않는다: 이름 등록 폼에서 명시적으로 저장한다.
    current = null;
    lastCombo = 0;
    const oldVideo = document.getElementById('cam') as HTMLVideoElement | null;
    const oldStream = oldVideo?.srcObject as MediaStream | null;
    if (oldStream && typeof oldStream.getTracks === 'function') oldStream.getTracks().forEach((t) => t.stop());
    if (engine && 'detach' in engine && typeof (engine as { detach?: unknown }).detach === 'function') {
      (engine as { detach: () => void }).detach();
    }
    engine = null;
    loop?.stop();
    loop = null;
    clearInterval(fpsTimer);
    // Landing: game picker. Game behavior below is untouched.
    const hash = parseHash(window.location.hash);
    if (hash === 'home') {
      document.title = '대전 고르기 | Skeleton Versus';
      renderLanding(app);
      return;
    }
    // 2인 대전은 별도 루프로 실행 (순환 import 방지용 동적 import).
    if (hash === 'versus-fruit' || hash === 'versus-tug' || hash === 'versus-math') {
      void import('./versus/versus-main').then((m) =>
        m.startVersus(app, hash as 'versus-fruit' | 'versus-tug' | 'versus-math')
      );
      return;
    }
    const id = gameIdOr(hash);
    // WCAG 2.4.2: page title matches the current route.
    document.title = `${GAME_NAMES[id]} | Skeleton Play`;
    // WCAG: game screen landmarks + heading order (h1 game name).
    app.innerHTML =
      `<div class="game-screen"><div class="game-inner">` +
      `<header class="game-top"><p class="game-kicker">Skeleton Play · 60초 챌린지</p>` +
      `<h1 class="game-title">${GAME_NAMES[id]}</h1>` +
      `<nav class="game-nav" aria-label="게임 이동"><a href="#/">← 모든 게임</a><button type="button" id="howto" class="btn-small">게임 방법</button></nav></header>` +
      `<main aria-label="게임 화면">` +
      `<p data-testid="route" hidden>${id}</p>` +
      `<div class="stage-wrap"><div class="stage-frame"><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas></div>` +
      `<div id="calib" class="overlay overlay-float"><p id="calibmsg"></p><button id="skip" class="btn">스킵하고 시작</button></div>` +
      `<div id="result" class="overlay overlay-float" hidden></div></div>` +
      `<section class="hud" aria-label="점수판">` +
      `<div class="hud-chip"><span>점수</span><strong id="score">0</strong></div>` +
      `<div class="hud-chip"><span>콤보</span><strong id="combo">0</strong></div>` +
      `<div class="hud-chip"><span>남은 시간</span><strong id="time">1:00</strong></div>` +
      `<div class="hud-chip"><span>상태</span><strong id="fps">준비 중</strong></div></section>` +
      `<p id="hud" class="hud-msg">준비 중…</p>` +
      `<div class="camrow"><label for="camsel">카메라</label><select id="camsel"></select>` +
      `<button id="retry" class="btn btn-accent" hidden>카메라 다시 찾기</button></div>` +
      `<p class="shareline">공유: <span id="share"></span></p><div id="ranks">${''}</div>` +
      `</main></div></div>`;
    wireHowTo(app, id);
    refreshBoard(app, id);
    void start(id);
  };
  // Device labels need HTML-escaping (browser-provided strings).
  const esc = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 카메라 선택 드롭다운을 채우고, 변경 시 저장 후 같은 게임을 다시 시작한다.
  const wireCameraSelect = async (id: PlayableId): Promise<void> => {
    const sel = document.getElementById('camsel') as HTMLSelectElement | null;
    if (!sel) return;
    const cams = await listCameras();
    sel.innerHTML =
      cams.length > 0
        ? cams.map((c) => `<option value="${c.deviceId}">${esc(c.label)}</option>`).join('')
        : `<option value="">카메라 없음</option>`;
    const preferred = getPreferredCamera();
    if (preferred && cams.some((c) => c.deviceId === preferred)) sel.value = preferred;
    sel.onchange = () => {
      setPreferredCamera(sel.value);
      void start(id);
    };
  };
  // 게임 방법 버튼 → 해당 게임의 플레이 방법 모달.
  const wireHowTo = (root: ParentNode, id: PlayableId): void => {
    root.querySelector('#howto')?.addEventListener('click', () => {
      const help = RULES[id];
      openModal({
        title: `${help.name} 게임 방법`,
        bodyHTML:
          `<ol>` + help.steps.map((s) => `<li>${s}</li>`).join('') + `</ol>`
      });
    });
  };
  // 게임 캐릭터 마스크를 미리 로드한다. 파일이 없어도 에러가 나지 않으며,
  // drawFaceMask가 로드 완료된 이미지만 그린다.
  const loadFaceMask = (id: PlayableId): HTMLImageElement => {
    const img = new Image();
    img.src = `art/mask-${id}.png`;
    return img;
  };
  const start = async (id: PlayableId) => {
    const hud = document.getElementById('hud');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const fpsEl = document.getElementById('fps');
    const overlay = document.getElementById('calib');
    const skip = document.getElementById('skip');
    const retry = document.getElementById('retry');
    skip?.addEventListener('click', () => {
      if (overlay) (overlay as HTMLElement & { skipped?: boolean }).skipped = true;
    });
    // 재인식 버튼: 같은 게임을 처음부터 다시 시도한다.
    retry?.addEventListener('click', () => {
      void start(id);
    });
    const game = createGame(id);
    wireCameraSelect(id);
    // 카메라 전용: 키보드·포인터 폴백 없음. 실패하면 재인식 UI를 보여준다.
    const showCamError = (msg: string): void => {
      const overlay = document.getElementById('calib');
      const msgEl = document.getElementById('calibmsg');
      const retry = document.getElementById('retry');
      const skipBtn = document.getElementById('skip');
      if (msgEl) msgEl.textContent = msg;
      if (overlay) overlay.classList.add('overlay-error');
      if (skipBtn) skipBtn.hidden = true;
      if (retry) {
        retry.hidden = false;
        retry.focus();
      }
      const hud = document.getElementById('hud');
      if (hud) hud.textContent = msg;
    };
    const video = await openCamera(getPreferredCamera() ?? undefined);
    if (!video) {
      showCamError('카메라를 찾지 못했어요. 카메라를 연결하고 아래 버튼을 눌러주세요.');
      return;
    }
    const loaded = await loadEngine(id);
    if (!loaded) {
      showCamError('인식 모델을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
      return;
    }
    engine = loaded;
    const cal = overlay ? await countdownCalibration(engine, video, overlay) : defaultCalibration();
    overlay?.remove();
    if (game instanceof FruitNinja) game.radiusScale = cal.scale;
    if (game instanceof BodyABC) game.mode = cal.mode;
    game.start();
    current = { id, board: game.board };
    const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
    if (!canvas) return;
    // 캔버스 좌표계를 영상 해상도에 맞춰 스켈레톤 어긋남을 제거한다.
    fitStageToVideo(canvas, video.videoWidth, video.videoHeight);
    const share = document.getElementById('share');
    if (share) share.textContent = shareLink(id);
    const showRanks = () => {
      refreshBoard(app, id);
    };
    showRanks();
    loop = new GameLoop({
      video,
      canvas,
      engine,
      game,
      calibration: cal,
      showSkeleton: true,
      // 게임 캐릭터 마스크 (파일이 없거나 hideFace 게임이면 스킵).
      // MathJump·BodyABC처럼 상단 텍스트가 있는 게임은 마스크를 로드하지 않는다.
      face: (game as { hideFace?: boolean }).hideFace ? null : loadFaceMask(id),
      timeLimitSec: 60,
      onTimeUp: (board) => {
        showRanks();
        const result = document.getElementById('result');
        if (!result) return;
        if (board.score <= 0) {
          result.innerHTML =
            `<p>60초 챌린지 종료! 점수를 얻지 못했어요.</p>` +
            `<button type="button" id="again" class="btn">다시 도전</button>`;
        } else {
          // 이름 등록 폼: 빈 이름은 등록 불가 (색이 아닌 문구로 안내, WCAG 3.3.1).
          result.innerHTML = resultFormHTML(board.score);
          result.querySelector('#regform')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = result.querySelector('#regname') as HTMLInputElement | null;
            const err = result.querySelector('#reg-err');
            const name = (input?.value ?? '').trim();
            if (name.length === 0) {
              if (err) err.textContent = '이름을 한 글자 이상 입력하세요.';
              input?.focus();
              return;
            }
            const saved = saveScore(id, { name: name.slice(0, 12), score: board.score });
            showRanks();
            // 등록 직후 리더보드 모달로 본인 이름·점수·랭킹을 바로 확인.
            openModal({
              title: `${RULES[id].name} 리더보드`,
              bodyHTML: boardHTML(id, { name: saved.name, score: saved.score })
            });
            // 등록 완료 후에는 폼을 치우고 다시 도전만 남긴다.
            result.innerHTML = resultDoneHTML(board.score);
            wireAgain();
          });
        }
        const wireAgain = () => {
          result.querySelector('#again')?.addEventListener('click', () => {
            result.hidden = true;
            void start(id);
          });
          (result.querySelector('#again') as HTMLElement | null)?.focus?.();
        };
        wireAgain();
        result.hidden = false;
        if (hud) hud.textContent = `60초 챌린지 종료! ${board.score}점`;
        beep('win');
      },
      onEvent: (events, board) => {
        for (const e of events) {
          beep(
            e.type === 'wrong' || e.type === 'bomb' || e.type === 'miss' ||
              e.type === 'timeout' || e.type === 'caught' || e.type === 'drop' || e.type === 'mixed'
              ? 'miss'
              : e.type.startsWith('pose') || e.type === 'correct' || e.type === 'pair' || e.type === 'sorted'
                ? 'win'
                : 'hit'
          );
          if (hud) hud.textContent = `${e.label} — ${board.score}점 (콤보 ${board.combo})`;
          if (scoreEl) scoreEl.textContent = String(board.score);
          if (comboEl) comboEl.textContent = String(board.combo);
        }
        // 콤보 5 단위 마일스톤 축하 (같은 콤보 중복 방지).
        if (board.combo >= 5 && board.combo % 5 === 0 && board.combo !== lastCombo) {
          lastCombo = board.combo;
          loop?.celebrate();
          if (hud) hud.textContent = `콤보 ${board.combo}연속! 대단해요!`;
        }
      }
    });
    loop.start();
    fpsTimer = Number(setInterval(() => {
      if (!loop) {
        clearInterval(fpsTimer);
        return;
      }
      const remain = Math.max(0, 60 - Math.floor(loop.elapsedSec));
      const timeEl = document.getElementById('time');
      if (timeEl) timeEl.textContent = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')}`;
      if (fpsEl) fpsEl.textContent = `${loop.fps.toFixed(0)}fps · ${cal.mode === 'seated' ? '앉음' : '선'} 모드`;
    }, 500));
  };
  window.addEventListener('hashchange', render);
  render();
}

export async function openCamera(deviceId?: string): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
  // 저장된 카메라가 있으면 먼저 정확히 지정해서 시도한다.
  // 저사양 지원 중단: 720p 우선으로 영상 품질을 확보한다.
  const attempts: MediaTrackConstraints[] = deviceId
    ? [{ deviceId: { exact: deviceId }, width: 1280, height: 720 }]
    : [];
  attempts.push(
    { width: 1280, height: 720, facingMode: 'user' },
    { width: 640, height: 480 }
  );
  for (const vc of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: vc, audio: false });
      video.srcObject = stream;
      await video.play();
      return video;
    } catch {
      // 다음 해상도로 폴백
    }
  }
  return null;
}

boot();
