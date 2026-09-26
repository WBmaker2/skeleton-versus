import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel, drawStar } from '../../ui/renderer';

export interface DuoStar { x: number; y: number }

// 2인 별자리: 랜덤 자리 3~5개 별을 1번부터 순서대로 이어 별자리를 완성.
// 60초 안에 많이 완성할수록 고득점. 협동 (혼자서도, 친구와 함께도 가능).
// 설계 기록: docs/duo-constellation.md
export class DuoStars implements Game {
  id = 'duo';
  // 상단 별·점선 시인성을 위해 얼굴 마스크를 그리지 않는다 (별잡기·요가와 동일).
  hideFace = true;
  // 별 하나를 인정하는 유지 시간 (별잡기 스트레칭과 같은 0.3초).
  static readonly HOLD_MS = 300;
  stars: DuoStar[] = [];
  // 다음에 터치해야 할 별의 번호 (0부터).
  index = 0;
  board = new ScoreBoard();
  pairs = 0;
  private running = false;
  private holdMs = 0;
  private seed = 1;

  start(): void {
    this.running = true;
    this.board.reset();
    this.pairs = 0;
    this.seed = 1;
    this.newRound(640, 480);
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, _width: number, _height: number): void {
    if (this.stars.length === 0) return;
    // 이어질 전체 모양은 점선으로 미리 보여준다.
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    this.stars.forEach((s, i) => {
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    // 완성한 구간은 실선으로 덧그린다.
    if (this.index > 0) {
      ctx.strokeStyle = '#dfff00';
      ctx.setLineDash([]);
      ctx.beginPath();
      this.stars.slice(0, this.index + 1).forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
    }
    ctx.restore();
    this.stars.forEach((s, i) => {
      const done = i < this.index;
      const current = i === this.index;
      const r = current ? 38 : 30;
      drawStar(ctx, s.x, s.y, r, done ? '#dfff00' : current ? '#ffffff' : 'rgba(223, 255, 0, 0.45)');
      if (current) {
        // 지금 대야 할 별: 흰 링 + 0.3초 진행 링.
        ctx.save();
        ctx.strokeStyle = '#dfff00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
        const frac = Math.min(1, this.holdMs / DuoStars.HOLD_MS);
        if (frac > 0) {
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r + 16, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      // 번호는 별과 함께 미러되도록 canvasWidth 없이 그려 정렬을 유지한다.
      drawLabel(ctx, String(i + 1), s.x, s.y, 24);
    });
  }
  // 새 별자리 출제: 3~5개, 손이 닿는 범위 안에서 서로 간격을 띄워 배치.
  newRound(width = 640, height = 480): void {
    const count = 3 + Math.floor(this.rnd() * 3);
    const minGap = Math.max(100, width * 0.15);
    const pts: DuoStar[] = [];
    for (let i = 0; i < count; i++) {
      let p: DuoStar = { x: 0, y: 0 };
      for (let t = 0; t < 50; t++) {
        p = {
          x: width * 0.12 + this.rnd() * width * 0.76,
          y: height * 0.15 + this.rnd() * height * 0.45
        };
        if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minGap)) break;
      }
      pts.push(p);
    }
    this.stars = pts;
    this.index = 0;
    this.holdMs = 0;
  }
  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || this.stars.length === 0) return [];
    const target = this.stars[this.index];
    if (!target) return [];
    const palms = [palmOf(frame, 'left'), palmOf(frame, 'right')].filter(
      (w): w is { x: number; y: number } => w !== null
    );
    // 판정 반경: 화면 너비의 10% (640px 기준 64px, 1280px 기준 128px).
    // 어느 손이든 현재 번호 별에 닿으면 인정 (셀카 미러 좌우 혼동 방지).
    const radius = frame.width * 0.1;
    const near = palms.some((w) => Math.hypot(w.x - target.x, w.y - target.y) < radius);
    if (!near) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= DuoStars.HOLD_MS) return [];
    this.holdMs = 0;
    this.index += 1;
    const n = this.index;
    if (n < this.stars.length) {
      return [{ type: 'star', points: 0, label: `${n + 1}번 별로 이동!` }];
    }
    // 별자리 완성: 별 개수 × 10점.
    const points = this.stars.length * 10;
    this.pairs += 1;
    this.board.comboHit();
    this.board.add(points);
    const done = this.pairs;
    this.newRound(frame.width, frame.height);
    return [{ type: 'pair', points, label: `별자리 ${done}개 완성! +${points}점` }];
  }
}
