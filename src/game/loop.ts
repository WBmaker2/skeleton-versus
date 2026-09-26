// src/game/loop.ts
import type { PoseEngine } from '../pose/pose-engine';
import type { Calibration, PoseFrame } from '../pose/types';
import type { Game, GameEvent } from './types';
import type { ScoreBoard } from './engine';
import { FpsMonitor } from '../perf/fps-monitor';
import { palmOf } from '../pose/geometry';
import { drawFaceMask, drawParticles, drawSkeleton, drawZones, spawnBurst, tickParticles, PENALTY_COLORS, type Particle } from '../ui/renderer';

export type GameEventHandler = (events: GameEvent[], board: { score: number; combo: number }) => void;

export interface LoopGame extends Game {
  board: ScoreBoard;
  // 게임 요소 그리기 (선택): 배경 지우기 → draw → 스켈레톤 순서로 렌더된다.
  draw?(ctx: CanvasRenderingContext2D, width: number, height: number): void;
}

export interface LoopOpts {
  video: HTMLVideoElement | null;
  canvas: HTMLCanvasElement;
  engine: PoseEngine;
  game: LoopGame;
  /** App owns application: radiusScale/mode 주입은 start 전, loop는 참조 보관용. */
  calibration: Calibration;
  showSkeleton: boolean;
  // 얼굴 마스크 이미지 (없으면 스킵). 게임별 art/mask-<id>.png.
  face?: HTMLImageElement | null;
  onEvent?: GameEventHandler;
  // 제한시간(초). 다 되면 루프를 멈추고 onTimeUp을 1회 호출한다.
  timeLimitSec?: number;
  onTimeUp?: (board: { score: number; combo: number }) => void;
}

// 축하 이펙트를 터뜨리는 성공 이벤트들 (12종 게임 공통).
const CELEBRATE = new Set([
  'slice', 'catch', 'bump', 'dodge', 'duck',
  'beat', 'correct', 'pose-ok', 'pose-done', 'pair', 'sorted',
  // 분리수거 잡기: 손에 붙는 순간 손 위치에 파티클 폭발.
  'grab'
]);

// 감점 이펙트를 터뜨리는 실패 이벤트들. 폭탄은 화면 흔들림도 동반한다.
const PENALTY = new Set([
  'bomb', 'wrong', 'mixed', 'caught', 'timeout', 'drop', 'miss'
]);

function wristOf(frame: PoseFrame): { x: number; y: number } | null {
  // 축하 파티클도 손바닥 중심에 터뜨린다 (마커와 같은 점).
  return palmOf(frame, 'right') ?? palmOf(frame, 'left');
}

export class GameLoop {  private raf = 0;
  private running = false;
  private lastMs = 0;
  private monitor = new FpsMonitor();
  private particles: Particle[] = [];
  private startedAt = 0;
  private timeUpFired = false;
  private dummyVideo: HTMLVideoElement | null = null;
  constructor(private opts: LoopOpts) {}

  get fps(): number {
    return this.monitor.fps;
  }

  get particleCount(): number {
    return this.particles.length;
  }

  get elapsedSec(): number {
    if (!this.running || this.startedAt === 0) return 0;
    return Math.max(0, (performance.now() - this.startedAt) / 1000);
  }

  // 콤보 마일스톤 축하: 화면 중앙에 큰 파티클 폭발.
  celebrate(n = 40): void {
    const w = this.opts.canvas.width;
    const h = this.opts.canvas.height;
    spawnBurst(this.particles, w / 2, h / 3, n);
  }

  // 폭탄 충격: 스테이지 흔들림 (350ms 후 자동 해제).
  private shake(): void {
    const canvas = this.opts.canvas;
    canvas.classList.remove('shake');
    // 리플로우로 애니메이션 재시작 보장.
    void canvas.offsetWidth;
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 350);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.monitor.reset();
    this.lastMs = 0;
    this.startedAt = performance.now();
    this.timeUpFired = false;
    const tick = async (nowMs: number): Promise<void> => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      // 60초 챌린지: 제한시간이 되면 루프를 멈추고 1회만 통지한다.
      const limitMs = (this.opts.timeLimitSec ?? 60) * 1000;
      if (!this.timeUpFired && nowMs - this.startedAt >= limitMs) {
        this.timeUpFired = true;
        this.stop();
        this.opts.onTimeUp?.({
          score: this.opts.game.board.score,
          combo: this.opts.game.board.combo
        });
        return;
      }
      if (this.lastMs === 0) this.lastMs = nowMs;
      const dt = Math.min(100, Math.max(0, nowMs - this.lastMs));
      this.lastMs = nowMs;
      // 저사양 지원 중단: 매 rAF마다 추론을 시도해 즉각 추적한다.
      // 느린 기기에서는 estimate await 자체가 속도를 제한하므로 별도 게이트가 없다.
      this.monitor.sample(nowMs);
      const video = this.opts.video ?? (this.dummyVideo ??= document.createElement('video'));
      let frame: PoseFrame;
      try {
        frame = await this.opts.engine.estimate(video);
      } catch {
        return;
      }
      const events = this.opts.game.tick(frame, dt);
      // 성공/감점 이펙트: 손목 위치에 파티클 폭발. 폭탄은 화면 흔들림 추가.
      for (const e of events) {
        if (!CELEBRATE.has(e.type) && !PENALTY.has(e.type)) continue;
        const at = wristOf(frame) ?? { x: frame.width / 2, y: frame.height / 2 };
        if (PENALTY.has(e.type)) {
          spawnBurst(this.particles, at.x, at.y, e.type === 'bomb' ? 26 : 14, PENALTY_COLORS);
          if (e.type === 'bomb') this.shake();
        } else {
          spawnBurst(this.particles, at.x, at.y);
        }
      }
      this.particles = tickParticles(this.particles, dt);
      // 렌더 순서: 지우기 → 게임 요소 → 스켈레톤+손 → 마스크 → 파티클(맨 위).
      const ctx = this.opts.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, this.opts.canvas.width, this.opts.canvas.height);
        try {
          this.opts.game.draw?.(ctx, this.opts.canvas.width, this.opts.canvas.height);
        } catch {
          // 게임 그리기 실패는 루프를 멈추지 않음
        }
      }
      if (this.opts.showSkeleton) {
        try {
          drawSkeleton(this.opts.canvas, frame);
          if (ctx) {
          // hideFace 게임(예: 수학 퀴즈)은 상단 텍스트 시인성을 위해 마스크 생략.
            // faceScale 게임(예: 풍선 헤딩 0.5)은 게임 요소 시인성을 위해 축소.
            if (!this.opts.game.hideFace) drawFaceMask(ctx, frame, this.opts.face, this.opts.game.faceScale ?? 1);
            drawParticles(ctx, this.particles);
          }
        } catch {
          // 렌더 실패는 루프를 멈추지 않음
        }
      }
      if (this.opts.showSkeleton && this.opts.game.id === 'math') {
        try {
          drawZones(this.opts.canvas, frame.width);
        } catch {}
      }
      if (events.length > 0) {
        this.opts.onEvent?.(events, {
          score: this.opts.game.board.score,
          combo: this.opts.game.board.combo
        });
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}
