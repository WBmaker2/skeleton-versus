// src/versus-games/power-duel/power-duel.ts
// 줄다리기 파워: 양팔을 번갈아 당기듯 굽혔다 폈다를 반복한다.
// 팔꿈치 90° 이하로 굽혔다가 140° 이상 펴면 당기기 1회, 줄이 2칸 당겨진다.
// 먼저 줄을 ±30 넘기면 승리. 5연속 당기기마다 상대 화면 흔들림 3초.
// 앉아서도 할 수 있다 (팔 운동).
import type { PoseFrame } from '../../pose/types';
import { angleDeg, getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { TugRope, TUG_WIN_POS } from '../squat-tug';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';

export type PowerSide = 'p1' | 'p2';

const PULL_BENT = 100; // 이 각도 이하면 '당김'
const PULL_OPEN = 140; // 이 각도 이상이면 '놓음'
const PULL_AMOUNT = 4; // 1회당 줄 이동 (승리선 ±30 → 약 8회)

// 팔꿈치 각도. 팔꿈치가 안 보이면 어깨·손목 거리로 어림잡는다.
export function elbowAngle(frame: PoseFrame, side: 'left' | 'right'): number {
  const s = getByName(frame, `${side}_shoulder`);
  const e = getByName(frame, `${side}_elbow`);
  const w = getByName(frame, `${side}_wrist`);
  if (s && e && w) return angleDeg(s, e, w);
  // 대체 추정: 손목이 어깨에 가까우면 굽힘, 멀면 폄.
  if (s && w) {
    const ls = getByName(frame, 'left_shoulder');
    const rs = getByName(frame, 'right_shoulder');
    const sw = ls && rs ? Math.hypot(ls.x - rs.x, ls.y - rs.y) : 100;
    const d = Math.hypot(w.x - s.x, w.y - s.y) / Math.max(1, sw);
    if (d < 0.6) return 80;
    if (d > 1.0) return 150;
    return 120;
  }
  return 150;
}

export class PowerDuelSide {
  board = new ScoreBoard();
  pulls = 0;
  private running = false;
  private bent = false;

  constructor(
    public side: PowerSide,
    private rope: TugRope,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.pulls = 0;
    this.bent = false;
  }
  stop(): void {
    this.running = false;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    void dtMs;
    const ang = Math.min(elbowAngle(frame, 'left'), elbowAngle(frame, 'right'));
    const events: GameEvent[] = [];
    if (!this.bent && ang <= PULL_BENT) {
      this.bent = true;
      return events;
    }
    if (this.bent && ang >= PULL_OPEN) {
      this.bent = false;
      this.pulls += 1;
      this.rope.pull(this.side, PULL_AMOUNT, false);
      this.board.comboHit();
      this.board.add(10);
      events.push({ type: 'pull', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 당김!` });
      // 5연속 당기기마다 상대 화면 흔들림 3초 (쿨타임은 AttackBus가 관리).
      if (this.pulls % 5 === 0) {
        if (this.attacks.send('shake', this.side)) {
          events.push({ type: 'attack', points: 0, label: '방해! 상대 화면 흔들림 3초' });
        }
      }
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    drawVersusLabel(ctx, `${this.pulls}회`, lo + width / 4, 50, 30);
    void height;
  }
}

// 줄 오버레이 (박자바 없이 줄+매듭+승리선만).
export function drawPowerOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rope: TugRope
): void {
  ctx.save();
  const midY = height * 0.42;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(20, midY);
  ctx.lineTo(width - 20, midY);
  ctx.stroke();
  ctx.restore();
  const winL = width / 2 - (TUG_WIN_POS / 100) * (width / 2 - 40);
  const winR = width / 2 + (TUG_WIN_POS / 100) * (width / 2 - 40);
  drawVersusLabel(ctx, 'P1 승리선', winL, midY - 14, 14, 'rgba(255,255,255,0.85)');
  drawVersusLabel(ctx, 'P2 승리선', winR, midY - 14, 14, 'rgba(255,255,255,0.85)');
  const knotX = width / 2 + (rope.pos / 100) * (width / 2 - 40);
  ctx.save();
  ctx.fillStyle = '#ff71ce';
  ctx.beginPath();
  ctx.arc(knotX, midY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
