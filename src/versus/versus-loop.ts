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
}

export class VersusLoop {
  private raf = 0;
  private running = false;
  private lastMs = 0;
  private startedAt = 0;
  private timeUpFired = false;
  private prevSplit: SplitPoses | null = null;

  constructor(private opts: VersusLoopOpts) {}

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
      const video = this.opts.video ?? document.createElement('video');
      let frames: PoseFrame[] = [];
      try {
        frames = await this.opts.engine.estimateDual(video);
      } catch {
        return;
      }
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
      }
      if (split.right) {
        const ev = this.opts.right.tick(split.right, dt);
        if (ev.length) this.opts.onEvent?.('p2', ev);
      }
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
        } catch { /* 그리기 실패는 루프 유지 */ }
        try {
          if (split.left) drawSkeleton(canvas, split.left);
          if (split.right) drawSkeleton(canvas, split.right);
        } catch { /* 스켈레톤 실패 무시 */ }
        drawVersusChrome(ctx, canvas.width, canvas.height);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
