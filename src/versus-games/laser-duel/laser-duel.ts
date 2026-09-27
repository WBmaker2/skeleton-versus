// src/versus-games/laser-duel/laser-duel.ts
// 레이저 터널: 내려오는 가로 레이저를 몸으로 피한다.
// 라운드마다 레이저 높이(위·가운데·아래)가 정해지고, 2초 안에 머리를
// 다른 높이에 두면 통과 (+10). 레이저에 닿으면 -5점·콤보 리셋.
// 5연속 통과마다 상대 레이저가 5초 동안 빨라진다 (판정 시간 2초→1.3초).
import type { PoseFrame } from '../../pose/types';
import { getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';
import { SharedLaserWall, type LaserSlot } from './laser-wall';

export type LaserSide = 'p1' | 'p2';

export const LASER_ROUND_MS = 2000;
export const LASER_ROUND_FAST_MS = 1300;

// 머리 높이 슬롯: 위 (y < 0.35h) · 가운데 (0.35~0.6h) · 아래 (0.6h~).
export function headSlot(headY: number, height: number): LaserSlot {
  const rel = headY / Math.max(1, height);
  if (rel < 0.35) return 0;
  if (rel < 0.6) return 1;
  return 2;
}

export const LASER_SLOT_LABEL: Record<LaserSlot, string> = {
  0: '위',
  1: '가운데',
  2: '아래'
};

export const LASER_SLOT_Y: Record<LaserSlot, number> = {
  0: 0.22,
  1: 0.47,
  2: 0.72
};

export class LaserDuelSide {
  board = new ScoreBoard();
  dodged = 0;
  slot: LaserSlot = 0;
  waitMs = 0;
  headY: number | null = null;
  private running = false;

  constructor(
    public side: LaserSide,
    private attacks: AttackBus,
    private wall: SharedLaserWall
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.dodged = 0;
    this.waitMs = 0;
    this.headY = null;
    this.slot = this.wall.nextFor(this.side);
  }
  stop(): void {
    this.running = false;
  }

  // 상대의 레이저 가속 공격을 받고 있으면 true.
  get rushed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'rush';
  }

  get roundLimitMs(): number {
    return this.rushed ? LASER_ROUND_FAST_MS : LASER_ROUND_MS;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const nose = getByName(frame, 'nose');
    if (nose && (nose.score ?? 0) > 0.3) this.headY = nose.y;
    this.waitMs += dtMs;
    if (this.waitMs <= this.roundLimitMs) return [];
    this.waitMs = 0;
    const head = this.headY ?? frame.height * 0.2;
    const events: GameEvent[] = [];
    if (headSlot(head, frame.height) !== this.slot) {
      this.dodged += 1;
      this.board.comboHit();
      this.board.add(10);
      events.push({ type: 'dodge', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 레이저 통과!` });
      // 5연속 통과마다 상대 레이저 가속 5초 (쿨타임은 AttackBus가 관리).
      if (this.board.combo % 5 === 0) {
        if (this.attacks.send('rush', this.side)) {
          events.push({ type: 'attack', points: 0, label: '방해! 상대 레이저 가속 5초' });
        }
      }
    } else {
      this.board.comboMiss();
      this.board.add(-5);
      events.push({ type: 'laser-hit', points: -5, label: '레이저에 닿았어요 -5점' });
    }
    this.slot = this.wall.nextFor(this.side);
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const hw = width / 2;
    const ly = height * LASER_SLOT_Y[this.slot];
    // 레이저 선 (반쪽 전역).
    ctx.save();
    ctx.strokeStyle = this.rushed ? '#ff71ce' : '#ff3b30';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(lo + 8, ly);
    ctx.lineTo(lo + hw - 8, ly);
    ctx.stroke();
    ctx.restore();
    // 남은 시간 바.
    const barW = Math.min(hw * 0.7, 200);
    const frac = 1 - Math.min(1, this.waitMs / this.roundLimitMs);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(lo + (hw - barW) / 2, height - 60, barW, 12);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(lo + (hw - barW) / 2, height - 60, barW * frac, 12);
    ctx.restore();
    drawVersusLabel(
      ctx, `${LASER_SLOT_LABEL[this.slot]} 레이저! 여기를 비우세요`,
      lo + hw / 2, 50, 22
    );
    drawVersusLabel(ctx, `${this.dodged}회 통과`, lo + hw / 2, 84, 26);
  }
}
