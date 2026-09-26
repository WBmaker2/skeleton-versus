// src/versus/versus-main.ts
// 2인 대전 화면 실행. 카메라 1대 -> 듀얼 엔진 -> VersusLoop 60초.
import { AttackBus } from './attack';
import { VersusLoop } from './versus-loop';
import { splitPoses } from './split';
import { calibrateDual } from './dual-calibration';
import { recordLabel, saveResult, type Winner } from './record';
import type { PoseFrame } from '../pose/types';
import { loadDualEngine } from '../pose/mediapipe-dual';
import { FruitDuelSide, SharedFruitPattern } from '../versus-games/fruit-duel';
import { SquatTugSide, TugRope, drawTugOverlay } from '../versus-games/squat-tug';
import { MathDashSide, SharedMathRound } from '../versus-games/math-dash';
import { VERSUS_METAS, type VersusId } from './metas';
import { getPreferredCamera, listCameras, openVersusCamera, setPreferredCamera } from '../ui/camera';
import { fitStageToVideo } from '../ui/stage';
import { beep } from '../ui/feedback';

const NAMES: Record<VersusId, string> = Object.fromEntries(
  VERSUS_METAS.map((m) => [m.id, m.name])
) as Record<VersusId, string>;

const HELP: Record<VersusId, string[]> = Object.fromEntries(
  VERSUS_METAS.map((m) => [m.id, m.help])
) as Record<VersusId, string[]>;

export async function startVersus(app: HTMLElement, id: VersusId): Promise<void> {
  document.title = `${NAMES[id]} | Skeleton Versus`;
  app.innerHTML =
    `<div class="game-screen"><div class="game-inner versus-wrap">` +
    `<header class="game-top"><p class="game-kicker">Skeleton Versus · 2인 대전 · 60초</p>` +
    `<h1 class="game-title">${NAMES[id]}</h1>` +
    `<nav class="game-nav" aria-label="게임 이동"><a href="#/">← 대전 고르기</a><button type="button" id="howto" class="btn-small">게임 방법</button></nav></header>` +
    `<main aria-label="대전 화면">` +
    `<div class="versus-score"><div class="side p1">P1 <strong id="score1">0</strong></div>` +
    `<div class="mid"><span id="time">1:00</span></div>` +
    `<div class="side p2">P2 <strong id="score2">0</strong></div></div>` +
    `<p id="attack" class="versus-attack" aria-live="polite"></p>` +
    `<div class="stage-wrap"><div class="stage-frame"><video id="cam" playsinline muted></video><canvas id="stage" width="960" height="480"></canvas></div>` +
    `<div id="calib" class="overlay overlay-float"><p id="calibmsg">둘이 함께 T자세로 서주세요 (5초)</p><button id="skip" class="btn btn-pulse">바로 대전 시작</button></div>` +
    `<div id="result" class="overlay overlay-float" hidden></div></div>` +
    `<p id="hud" class="versus-hint">준비 중… 카메라 앞에 둘이 나란히 서세요 (2.5~3.5m).</p>` +
    `<div class="camrow"><label for="camsel">카메라</label><select id="camsel"></select>` +
    `<button id="retry" class="btn btn-accent" hidden>카메라 다시 찾기</button></div>` +
    `</main></div></div>`;

  // 게임 방법은 간단 모달로
  app.querySelector('#howto')?.addEventListener('click', async () => {
    const { openModal } = await import('../ui/modal');
    openModal({
      title: `${NAMES[id]} 게임 방법`,
      bodyHTML: `<ol>` + (HELP[id] ?? []).map((s) => `<li>${s}</li>`).join('') + `</ol>`
    });
  });

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
      void startVersus(app, id);
    };
  }

  const video = await openVersusCamera(getPreferredCamera() ?? undefined);
  const hud = document.getElementById('hud');
  if (!video) {
    if (hud) hud.textContent = '카메라를 찾지 못했어요. 카메라를 연결하고 다시 시도해주세요.';
    return;
  }
  const engine = await loadDualEngine();
  if (!engine) {
    if (hud) hud.textContent = '인식 모델을 불러오지 못했어요. 인터넷 연결을 확인해주세요.';
    return;
  }
  const overlay = document.getElementById('calib');
  const skip = document.getElementById('skip') as HTMLButtonElement | null;
  let skipped = false;
  skip?.addEventListener('click', () => { skipped = true; });
  // 5초 대기 (스킵 가능). 그동안 좌/우 프레임을 모아 각자 보정한다.
  const waitMs = 5000;
  const t0 = Date.now();
  const leftFrames: PoseFrame[] = [];
  const rightFrames: PoseFrame[] = [];
  const vw = video.videoWidth || 640;
  while (Date.now() - t0 < waitMs && !skipped) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const frames = await engine.estimateDual(video);
      const split = splitPoses(frames, vw);
      if (split.left) leftFrames.push(split.left);
      if (split.right) rightFrames.push(split.right);
    } catch { break; }
  }
  overlay?.remove();
  // 각자 키·거리에 맞춘 손 크기 보정 (과일 베기 판정 반경용).
  const dualCal = calibrateDual(leftFrames, rightFrames);

  const attacks = new AttackBus();
  attacks.reset();

  // 게임별 좌우 인스턴스
  let left: { board: { score: number }; tick(a: never, b: number): never[]; draw?: (c: CanvasRenderingContext2D, w: number, h: number) => void; start(): void; stop(): void };
  let right: typeof left;
  let rope: TugRope | null = null;
  let tugOverlay: ((ctx: CanvasRenderingContext2D, w: number, h: number) => void) | undefined;
  if (id === 'versus-fruit') {
    // 양쪽이 같은 순서·같은 종류, 위치는 좌우 대칭으로 나온다.
    const pattern = new SharedFruitPattern();
    const l = new FruitDuelSide('p1', attacks, pattern);
    const r = new FruitDuelSide('p2', attacks, pattern);
    l.radiusScale = dualCal.p1.scale;
    r.radiusScale = dualCal.p2.scale;
    l.start(); r.start();
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
  } else if (id === 'versus-tug') {
    rope = new TugRope();
    const l = new SquatTugSide('p1', rope, attacks);
    const r = new SquatTugSide('p2', rope, attacks);
    const tugL = l;
    const tugR = r;
    l.start(); r.start();
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
    tugOverlay = (ctx, w, h) => {
      // 양쪽 박자 시계는 같은 dt로 돌아가므로 왼쪽 기준으로 그린다.
      drawTugOverlay(ctx, w, h, rope as TugRope, tugL.beatPhaseMs);
      void tugR;
    };
  } else {
    // 양쪽이 같은 문제를 푸는 공유 라운드 (선착순 +20/+10은 라운드가 판정).
    const round = new SharedMathRound();
    const l = new MathDashSide('p1', attacks, round);
    const r = new MathDashSide('p2', attacks, round);
    l.start(); r.start();
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
  }

  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!canvas) return;
  fitStageToVideo(canvas, video.videoWidth || 960, video.videoHeight || 480);
  if (hud) {
    hud.textContent =
      `보정 완료! P1 ×${dualCal.p1.scale.toFixed(1)} · P2 ×${dualCal.p2.scale.toFixed(1)} — 60초 대전 시작!`;
  }

  const score1 = document.getElementById('score1');
  const score2 = document.getElementById('score2');
  const timeEl = document.getElementById('time');
  const attackEl = document.getElementById('attack');
  const refresh = () => {
    const lBoard = (left as unknown as { board: { score: number } }).board;
    const rBoard = (right as unknown as { board: { score: number } }).board;
    if (score1) score1.textContent = String(lBoard.score);
    if (score2) score2.textContent = String(rBoard.score);
  };
  // versus-loop의 onEvent는 VersusSideGame 시그니처와 맞춤 (GameEvent[]만 사용)
  const loop = new VersusLoop({
    video,
    canvas,
    engine,
    left: left as never,
    right: right as never,
    attacks,
    timeLimitSec: 60,
    overlay: tugOverlay,
    onEvent: (side, events) => {
      for (const e of events) {
        beep(e.type === 'bomb' || e.type === 'wrong' ? 'miss' : e.type === 'attack' ? 'win' : 'hit');
        if (e.type === 'attack' && attackEl) {
          attackEl.textContent = side === 'p1' ? 'P1의 방해!' : 'P2의 방해!';
          setTimeout(() => { if (attackEl) attackEl.textContent = ''; }, 1500);
          // 파워 당기기는 상대 화면을 흔든다 (game.css .shake, reduced-motion은 CSS가 끔).
          if (e.label.includes('파워') && canvas) {
            canvas.classList.remove('shake');
            void canvas.offsetWidth;
            canvas.classList.add('shake');
            setTimeout(() => canvas.classList.remove('shake'), 350);
          }
        }
        if (hud && e.type !== 'attack') hud.textContent = `${e.label}`;
      }
      // 수학 공유 라운드는 MathDashSide.tick 안에서 선착순을 처리하므로
      // 매니저가 따로 claim을 만지지 않는다.
      // 줄다리기 점수는 줄 위치로도 표시
      if (id === 'versus-tug' && rope && hud) {
        const w = rope.winner();
        hud.textContent = w === 'draw' ? '줄을 당겨라!' : w === 'p1' ? 'P1이 앞서고 있어요!' : 'P2가 앞서고 있어요!';
      }
      refresh();
    },
    onHint: (msg) => {
      if (msg && hud) hud.textContent = msg;
    },
    onTimeUp: () => {
      const result = document.getElementById('result');
      if (!result) return;
      let winner: Winner;
      if (id === 'versus-tug' && rope) {
        winner = rope.winner();
      } else {
        const lScore = (left as unknown as { board: { score: number } }).board.score;
        const rScore = (right as unknown as { board: { score: number } }).board.score;
        winner = lScore > rScore ? 'p1' : rScore > lScore ? 'p2' : 'draw';
      }
      const title = winner === 'p1' ? 'P1 승리!' : winner === 'p2' ? 'P2 승리!' : '무승부!';
      const rec = saveResult(id, winner);
      const lScore = (left as unknown as { board: { score: number } }).board.score;
      const rScore = (right as unknown as { board: { score: number } }).board.score;
      result.innerHTML =
        `<p><strong>${title}</strong></p>` +
        `<p>P1 ${lScore} : ${rScore} P2</p>` +
        `<p>${recordLabel(rec)}</p>` +
        `<button type="button" id="again" class="btn btn-pulse">다시 대전</button>`;
      result.hidden = false;
      result.querySelector('#again')?.addEventListener('click', () => {
        result.hidden = true;
        void startVersus(app, id);
      });
      (result.querySelector('#again') as HTMLElement | null)?.focus?.();
      if (hud) hud.textContent = `60초 대전 종료! ${title}`;
      beep('win');
    }
  });
  loop.start();
  const timer = setInterval(() => {
    const remain = Math.max(0, 60 - Math.floor(loop.elapsedSec));
    if (timeEl) timeEl.textContent = `0:${String(remain).padStart(2, '0')}`;
    if (remain <= 0) clearInterval(timer);
  }, 500);
}
