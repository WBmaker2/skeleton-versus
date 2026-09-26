// src/versus/versus-main.ts
// 2인 대전 화면 실행. 카메라 1대 -> 듀얼 엔진 -> VersusLoop 60초.
import { AttackBus } from './attack';
import { VersusLoop } from './versus-loop';
import { loadDualEngine } from '../pose/mediapipe-dual';
import { FruitDuelSide } from '../versus-games/fruit-duel';
import { SquatTugSide, TugRope } from '../versus-games/squat-tug';
import { MathDashSide } from '../versus-games/math-dash';
import { VERSUS_METAS, type VersusId } from './metas';
import { getPreferredCamera, listCameras, setPreferredCamera } from '../ui/camera';
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

  const video = await openCameraVersus(getPreferredCamera() ?? undefined);
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
  // 5초 대기 (스킵 가능)
  const waitMs = 5000;
  const t0 = Date.now();
  while (Date.now() - t0 < waitMs && !skipped) {
    await new Promise((r) => setTimeout(r, 200));
    try { await engine.estimateDual(video); } catch { break; }
  }
  overlay?.remove();

  const attacks = new AttackBus();
  attacks.reset();

  // 게임별 좌우 인스턴스
  let left: { board: { score: number }; tick(a: never, b: number): never[]; draw?: (c: CanvasRenderingContext2D, w: number, h: number) => void; start(): void; stop(): void };
  let right: typeof left;
  let rope: TugRope | null = null;
  // math 선착순 공유용
  let mathL: MathDashSide | null = null;
  let mathR: MathDashSide | null = null;
  if (id === 'versus-fruit') {
    const l = new FruitDuelSide('p1', attacks);
    const r = new FruitDuelSide('p2', attacks);
    l.start(); r.start();
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
  } else if (id === 'versus-tug') {
    rope = new TugRope();
    const l = new SquatTugSide('p1', rope, attacks);
    const r = new SquatTugSide('p2', rope, attacks);
    l.start(); r.start();
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
  } else {
    const l = new MathDashSide('p1', attacks);
    const r = new MathDashSide('p2', attacks);
    l.start(); r.start();
    mathL = l; mathR = r;
    left = l as unknown as typeof left;
    right = r as unknown as typeof left;
  }

  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  if (!canvas) return;
  fitStageToVideo(canvas, video.videoWidth || 960, video.videoHeight || 480);

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
    onEvent: (side, events) => {
      for (const e of events) {
        beep(e.type === 'bomb' || e.type === 'wrong' ? 'miss' : e.type === 'attack' ? 'win' : 'hit');
        if (e.type === 'attack' && attackEl) {
          attackEl.textContent = side === 'p1' ? 'P1의 방해!' : 'P2의 방해!';
          setTimeout(() => { if (attackEl) attackEl.textContent = ''; }, 1500);
        }
        if (hud && e.type !== 'attack') hud.textContent = `${e.label}`;
      }
      // 수학 선착순: 한쪽이 맞추면 다른 쪽도 claimed 처리 (같은 라운드 공유)
      if (id === 'versus-math' && mathL && mathR) {
        if (events.some((e) => e.type === 'correct')) {
          mathL.roundClaimed = true;
          mathR.roundClaimed = true;
          // 새로 낸 쪽만 false로 되돌리면 안 되므로, 다음 tick에서 각자 새 문제 후 리셋:
          // 새 문제를 낸 쪽은 start가 아니므로 수동으로 상대방도 유지.
          // 실제로는 각자 다른 문제를 풀어 선착순이 문제별이 아니라 시간별이 된다.
          // v1에서는 먼저 푼 쪽이 +20, 3초 안에 푼 쪽도 +20 대신 +10이 되게 완화:
          setTimeout(() => {
            if (mathL) mathL.roundClaimed = false;
            if (mathR) mathR.roundClaimed = false;
          }, 3000);
        }
      }
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
      let title: string;
      if (id === 'versus-tug' && rope) {
        const w = rope.winner();
        title = w === 'p1' ? 'P1 승리!' : w === 'p2' ? 'P2 승리!' : '무승부!';
      } else {
        const lScore = (left as unknown as { board: { score: number } }).board.score;
        const rScore = (right as unknown as { board: { score: number } }).board.score;
        title = lScore > rScore ? 'P1 승리!' : rScore > lScore ? 'P2 승리!' : '무승부!';
      }
      const lScore = (left as unknown as { board: { score: number } }).board.score;
      const rScore = (right as unknown as { board: { score: number } }).board.score;
      result.innerHTML =
        `<p><strong>${title}</strong></p>` +
        `<p>P1 ${lScore} : ${rScore} P2</p>` +
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

async function openCameraVersus(deviceId?: string): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
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
