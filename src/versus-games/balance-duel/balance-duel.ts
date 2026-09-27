// src/versus-games/balance-duel/balance-duel.ts
// 한발 균형 대전: 한쪽 발목을 반대 무릎 위로 들고 버틴다.
// 1초당 +2점 합산. 발이 내려오면 이번 버티기는 리셋 (누적 점수는 유지).
// 먼저 누적 20초에 도달하면 상대 화면 흔들림 3초.
import type { PoseFrame } from '../../pose/types';
import { getByName, shoulderWidth } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';

export type BalanceSide = 'p1' | 'p2';

export const BALANCE_GOAL_MS = 20000;
const MISSING_GRACE_MS = 500;
const LIFT_MARGIN = 0.15; // 어깨너비 배율 히스테리시스

function visible(frame: PoseFrame, name: string): boolean {
  const k = getByName(frame, name);
  return !!k && (k.score ?? 0) > 0.3;
}

export class BalanceDuelSide {
  board = new ScoreBoard();
  totalMs = 0;
  holdMs = 0;
  gated = true;
  private running = false;
  private missingMs = 0;
  private shook = false;

  constructor(
    public side: BalanceSide,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.totalMs = 0;
    this.holdMs = 0;
    this.gated = true;
    this.missingMs = 0;
    this.shook = false;
  }
  stop(): void {
    this.running = false;
  }

  get totalSec(): number {
    return Math.floor(this.totalMs / 1000);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 시작 게이트: 양쪽 발목이 보여야 측정한다.
    if (!visible(frame, 'left_ankle') || !visible(frame, 'right_ankle')) {
      this.missingMs += dtMs;
      if (this.missingMs > MISSING_GRACE_MS) this.holdMs = 0;
      this.gated = true;
      return [];
    }
    this.missingMs = 0;
    this.gated = false;
    const sw = shoulderWidth(frame);
    const lAnkle = getByName(frame, 'left_ankle');
    const rAnkle = getByName(frame, 'right_ankle');
    const lKnee = getByName(frame, 'left_knee');
    const rKnee = getByName(frame, 'right_knee');
    if (!lAnkle || !rAnkle || !lKnee || !rKnee) return [];
    const margin = LIFT_MARGIN * Math.max(1, sw);
    const lifted =
      lAnkle.y < rKnee.y - margin || rAnkle.y < lKnee.y - margin;
    if (!lifted) {
      if (this.holdMs > 0) this.board.comboMiss();
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    const events: GameEvent[] = [];
    while (this.holdMs >= 1000) {
      this.holdMs -= 1000;
      this.totalMs += 1000;
      this.board.comboHit();
      this.board.add(2);
      events.push({
        type: 'balance-tick', points: 2,
        label: `${this.side === 'p1' ? 'P1' : 'P2'} ${this.totalSec}초 버팀!`
      });
    }
    // 먼저 누적 20초에 도달하면 상대 화면 흔들림 3초 (1회).
    if (!this.shook && this.totalMs >= BALANCE_GOAL_MS) {
      this.shook = true;
      if (this.attacks.send('shake', this.side)) {
        events.push({ type: 'attack', points: 0, label: '방해! 상대 화면 흔들림 3초' });
      }
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    if (this.gated) {
      drawVersusLabel(ctx, '발목이 보이게 서세요', cx, 60, 22, 'rgba(255,255,255,0.85)');
      return;
    }
    drawVersusLabel(ctx, `${this.totalSec}초`, cx, 60, 44);
    // 이번 버티기 진행 바
    const barW = Math.min(width * 0.3, 200);
    const frac = Math.min(1, this.holdMs / 1000);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - barW / 2, 96, barW, 12);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(cx - barW / 2, 96, barW * frac, 12);
    ctx.restore();
    void height;
  }
}
