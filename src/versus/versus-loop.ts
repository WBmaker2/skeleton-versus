// src/versus/versus-loop.ts
// 2인용 게임 루프. 카메라 1대 -> 듀얼 포즈 -> 좌우 분리 -> 각자 tick.
// 60초 동기 타이머. 렌더는 좌우 클립 + 가운데선.
import type { PoseFrame } from '../pose/types';
import type { GameEvent } from '../game/types';
import type { ScoreBoard } from '../game/engine';
import type { MediaPipeDualAdapter } from '../pose/mediapipe-dual';
import { splitStable, type SplitPoses } from './split';
import type { AttackBus } from './attack';
import { drawVersusChrome, withSideClip } from './versus-stage';
import { drawSkeleton } from '../ui/renderer';
import {
  drawParticles, reducedMotion, spawnBurst, tickParticles,
  CHEER_COLORS, OUCH_COLORS, type Particle
} from './particles';

export interface VersusSideGame {
  board: ScoreBoard;
  tick(frame: PoseFrame, dtMs: number): GameEvent[];
  draw?(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

export interface VersusLoopOpts {
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement;
  engine: MediaPipeDualAdapter;
  left: VersusSideGame;
  right: VersusSideGame;
  attacks: AttackBus;
  timeLimitSec?: number;
  // 양쪽 합쳐서 UI 갱신용
  onEvent?: (side: 'p1' | 'p2', events: GameEvent[]) => void;
  onTimeUp?: () => void;
  onHint?: (msg: string) => void;
  // 전체 너비 오버레이 (줄다리기 줄+박자바 등, 좌우 클립 밖에서 1회 그리기).
  overlay?: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

export class VersusLoop {
  private raf = 0;
  private running = false;
  private lastMs = 0;
  private startedAt = 0;
  private timeUpFired = false;
  private prevSplit: SplitPoses | null = null;
  private particles: Particle[] = [];
  private lastCombo: { p1: number; p2: number } = { p1: 0, p2: 0 };
  // 저사양 모드에서 0.5로 낮춘다 (D).
  particleScale = 1;
  // fps 측정용 타임스탬프 (최근 60프레임).
  private frameStamps: number[] = [];
  // 저사양 절전 상태: 추론을 한 프레임 걸러 뛰고 파티클을 절반으로.
  private lowMs = 0;
  private skippedInference = false;
  private lastFrames: PoseFrame[] = [];

  constructor(private opts: VersusLoopOpts) {}

  get particleCount(): number {
    return this.particles.length;
  }

  // 최근 60프레임 이동평균 fps. 표본이 모자라면 0.
  get fps(): number {
    const ts = this.frameStamps;
    if (ts.length < 5) return 0;
    const span = ts[ts.length - 1] - ts[0];
    if (span <= 0) return 0;
    return ((ts.length - 1) * 1000) / span;
  }

  get degraded(): boolean {
    return this.lowMs >= VersusLoop.LOW_MS;
  }

  private static readonly LOW_FPS = 25;
  private static readonly RECOVER_FPS = 30;
  private static readonly LOW_MS = 3000;

  get elapsedSec(): number {
    if (!this.running || this.startedAt === 0) return 0;
    return Math.max(0, (performance.now() - this.startedAt) / 1000);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastMs = 0;
    this.startedAt = performance.now();
    this.timeUpFired = false;
    const tick = async (nowMs: number): Promise<void> => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      const limitMs = (this.opts.timeLimitSec ?? 60) * 1000;
      if (!this.timeUpFired && nowMs - this.startedAt >= limitMs) {
        this.timeUpFired = true;
        this.stop();
        this.opts.onTimeUp?.();
        return;
      }
      if (this.lastMs === 0) this.lastMs = nowMs;
      const dt = Math.min(100, Math.max(0, nowMs - this.lastMs));
      this.lastMs = nowMs;
      this.sampleFps(nowMs);
      // 저사양 절전: 25fps 미만 3초 지속 → 추론 반으로·파티클 절반.
      // 30fps 이상 회복 시 원복 (히스테리시스로 떨림 방지).
      const fps = this.fps;
      if (fps >= 5 && fps < VersusLoop.LOW_FPS) {
        this.lowMs += dt;
      } else if (fps >= VersusLoop.RECOVER_FPS) {
        this.lowMs = 0;
      }
      this.particleScale = this.degraded ? 0.5 : 1;
      const video = this.opts.video ?? document.createElement('video');
      let frames: PoseFrame[] = [];
      // 절전 중에는 한 프레임 걸러 추론하고 이전 결과를 재사용한다.
      // (캔버스 좌표계를 건드리지 않아 그리기 어긋남이 없다.)
      if (this.degraded && this.skippedInference) {
        frames = this.lastFrames;
      } else {
        try {
          frames = await this.opts.engine.estimateDual(video);
        } catch {
          return;
        }
        this.lastFrames = frames;
      }
      this.skippedInference = !this.skippedInference;
      const w = frames[0]?.width ?? video.videoWidth ?? 640;
      const split = splitStable(frames, w, this.prevSplit);
      this.prevSplit = split;
      this.opts.attacks.tick(dt);
      if (!split.bothVisible) {
        this.opts.onHint?.('둘이 다 보이게 옆으로 비켜주세요!');
      } else {
        this.opts.onHint?.('');
      }
      if (split.left) {
        const ev = this.opts.left.tick(split.left, dt);
        if (ev.length) this.opts.onEvent?.('p1', ev);
        this.celebrate('p1', ev);
      }
      if (split.right) {
        const ev = this.opts.right.tick(split.right, dt);
        if (ev.length) this.opts.onEvent?.('p2', ev);
        this.celebrate('p2', ev);
      }
      this.particles = tickParticles(this.particles, dt);
      const canvas = this.opts.canvas;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        try {
          withSideClip(ctx, canvas.width, canvas.height, 'p1', () => {
            this.opts.left.draw?.(ctx, canvas.width, canvas.height);
          });
          withSideClip(ctx, canvas.width, canvas.height, 'p2', () => {
            this.opts.right.draw?.(ctx, canvas.width, canvas.height);
          });
          try {
            this.opts.overlay?.(ctx, canvas.width, canvas.height);
          } catch { /* 오버레이 실패는 루프 유지 */ }
        } catch { /* 그리기 실패는 루프 유지 */ }
        try {
          if (split.left) drawSkeleton(canvas, split.left);
          if (split.right) drawSkeleton(canvas, split.right);
        } catch { /* 스켈레톤 실패 무시 */ }
        drawVersusChrome(ctx, canvas.width, canvas.height);
        try {
          drawParticles(ctx, this.particles);
        } catch { /* 파티클 실패 무시 */ }
        try {
          this.drawFps(ctx, canvas.width, canvas.height);
        } catch { /* fps 표시 실패 무시 */ }
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  // 성공 축하·감점 표시. 득점한 쪽 반쪽에 터뜨린다.
  private celebrate(side: 'p1' | 'p2', events: GameEvent[]): void {
    const board = side === 'p1' ? this.opts.left.board : this.opts.right.board;
    if (reducedMotion()) {
      this.lastCombo[side] = board.combo;
      return;
    }
    const w = this.opts.canvas.width || 640;
    const h = this.opts.canvas.height || 480;
    const cx = side === 'p1' ? w * 0.25 : w * 0.75;
    const cy = h * 0.3;
    const n = (k: number): number => Math.max(1, Math.round(k * this.particleScale));
    for (const e of events) {
      if (e.type === 'slice' || e.type === 'correct' || e.type === 'beat' || e.type === 'attack') {
        spawnBurst(this.particles, cx, cy, n(18), CHEER_COLORS);
      } else if (e.type === 'bomb' || e.type === 'wrong') {
        spawnBurst(this.particles, cx, cy, n(10), OUCH_COLORS);
        if (e.type === 'bomb') this.shake();
      }
    }
    // 콤보 5 단위 마일스톤 축하 (같은 콤보 중복 방지).
    const last = this.lastCombo[side];
    if (board.combo >= 5 && board.combo % 5 === 0 && board.combo !== last) {
      spawnBurst(this.particles, cx, cy, n(40), CHEER_COLORS);
    }
    this.lastCombo[side] = board.combo;
  }

  private sampleFps(nowMs: number): void {
    this.frameStamps.push(nowMs);
    if (this.frameStamps.length > 61) this.frameStamps.shift();
  }

  // 우하단 fps 표시 (DOM 변경 없이 캔버스에 작게).
  private drawFps(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const fps = this.fps;
    if (fps <= 0) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '400 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(this.degraded ? `${fps.toFixed(0)}fps · 절전` : `${fps.toFixed(0)}fps`, width - 10, height - 10);
    ctx.restore();
  }

  // 폭탄 충격: 스테이지 흔들림 (game.css .shake, 350ms 후 자동 해제).
  private shake(): void {    try {
      const canvas = this.opts.canvas;
      canvas.classList.remove('shake');
      void canvas.offsetWidth;
      canvas.classList.add('shake');
      setTimeout(() => canvas.classList.remove('shake'), 350);
    } catch {
      // DOM 없으면 무시
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
