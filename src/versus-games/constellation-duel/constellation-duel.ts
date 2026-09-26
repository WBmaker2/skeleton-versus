// src/versus-games/constellation-duel/constellation-duel.ts
// 별자리 대전: 자기 반쪽의 별 3~5개를 1번부터 순서대로 이어 완성한다.
// 먼저 완성하면 별 개수 × 10점 + 안개 3초, 뒤따라 완성하면 × 5점.
// 별 배치는 공유 하늘에서 같은 순서로 받고 좌우 대칭으로 나온다.
import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawStar, drawVersusLabel } from '../../versus/draw';
import { SharedConstellation } from './shared-sky';

export type ConstellSide = 'p1' | 'p2';

export const CONSTELL_HOLD_MS = 300;

export class ConstellDuelSide {
  board = new ScoreBoard();
  pairs = 0;
  index = 0;
  holdMs = 0;
  radiusScale = 1;
  private running = false;
  private lastGen = 0;

  constructor(
    public side: ConstellSide,
    private attacks: AttackBus,
    public sky: SharedConstellation
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.pairs = 0;
    this.index = 0;
    this.holdMs = 0;
    this.sky.deal();
    this.lastGen = this.sky.gen;
  }
  stop(): void {
    this.running = false;
  }

  // 내 반쪽 좌표로 변환 (P2는 x 미러).
  point(i: number, width: number, height: number): { x: number; y: number } {
    const p = this.sky.points[i];
    const rx = this.side === 'p1' ? p.rx : 1 - p.rx;
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    return { x: lo + rx * (hi - lo), y: height * 0.1 + p.ry * height * 0.55 };
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || this.sky.points.length === 0) return [];
    // 상대가 완성했으면 함께 다음 별자리로.
    if (this.sky.pendingNext && this.sky.solvedBy === this.side) {
      this.sky.deal();
      this.lastGen = this.sky.gen;
      this.index = 0;
      this.holdMs = 0;
    } else if (this.sky.gen !== this.lastGen) {
      this.lastGen = this.sky.gen;
      this.index = 0;
      this.holdMs = 0;
    }
    const target = this.point(this.index, frame.width, frame.height);
    const palms = [palmOf(frame, 'left'), palmOf(frame, 'right')].filter(
      (w): w is { x: number; y: number } => w !== null
    );
    // 판정 반경: 반쪽 너비의 15% (640px 기준 48px).
    const radius = ((frame.width / 2) * 0.15) * this.radiusScale;
    const near = palms.some((w) => Math.hypot(w.x - target.x, w.y - target.y) < radius);
    if (!near) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= CONSTELL_HOLD_MS) return [];
    this.holdMs = 0;
    this.index += 1;
    if (this.index < this.sky.points.length) {
      return [{ type: 'star', points: 0, label: `${this.index + 1}번 별로 이동!` }];
    }
    // 별자리 완성.
    const count = this.sky.points.length;
    const first = this.sky.claim(this.side);
    const points = first ? count * 10 : count * 5;
    this.pairs += 1;
    this.board.comboHit();
    this.board.add(points);
    const ev: GameEvent[] = [
      {
        type: 'pair', points,
        label: `${this.side === 'p1' ? 'P1' : 'P2'} 별자리 완성! +${points}점`
      }
    ];
    if (first && this.attacks.send('fog', this.side)) {
      ev.push({ type: 'attack', points: 0, label: '안개! 상대 별자리 흐림 3초' });
    }
    return ev;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const n = this.sky.points.length;
    if (n === 0) return;
    const pts = this.sky.points.map((_, i) => this.point(i, width, height));
    const fogged = this.side === 'p1' ? this.attacks.onP1?.kind === 'fog' : this.attacks.onP2?.kind === 'fog';
    ctx.save();
    ctx.globalAlpha = fogged ? 0.4 : 1;
    // 이어질 전체 모양은 점선으로 미리 보여준다.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    pts.forEach((s, i) => {
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    // 완성한 구간은 실선으로 덧그린다.
    if (this.index > 0) {
      ctx.strokeStyle = '#dfff00';
      ctx.setLineDash([]);
      ctx.beginPath();
      pts.slice(0, this.index + 1).forEach((s, i) => {
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
    }
    ctx.restore();
    pts.forEach((s, i) => {
      const done = i < this.index;
      const current = i === this.index;
      const r = current ? 34 : 27;
      drawStar(ctx, s.x, s.y, r, done ? '#dfff00' : current ? '#ffffff' : 'rgba(223, 255, 0, 0.45)');
      if (current) {
        ctx.save();
        ctx.strokeStyle = '#dfff00';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
        const frac = Math.min(1, this.holdMs / CONSTELL_HOLD_MS);
        if (frac > 0) {
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r + 16, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      drawVersusLabel(ctx, String(i + 1), s.x, s.y, 22);
    });
  }
}
