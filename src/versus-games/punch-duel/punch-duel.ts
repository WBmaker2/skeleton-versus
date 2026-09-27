// src/versus-games/punch-duel/punch-duel.ts
// 펀치 대전: 자기 반쪽 타겟에 주먹을 뻗어 친다.
// 손바닥이 타겟 안에 닿는 순간 속도가 4어깨너비/s 이상이면 펀치 인정 (+2).
// 느리게 대면 무효. 10연속 펀치마다 상대 타겟 축소 0.7배 5초.
import type { PoseFrame } from '../../pose/types';
import { palmOf, shoulderWidth } from '../../pose/geometry';
import { pointSpeed, type TrackedPoint } from '../../versus/pose-moves';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';
import { SharedPunchRing } from './punch-ring';

export type PunchSide = 'p1' | 'p2';

export interface PunchTarget {
  x: number; y: number; alive: boolean;
}

export const PUNCH_SPEED = 4; // 어깨너비/s
export const PUNCH_R = 48;
export const PUNCH_COOL_MS = 300;

export class PunchDuelSide {
  board = new ScoreBoard();
  target: PunchTarget = { x: 0, y: 0, alive: true };
  punches = 0;
  radiusScale = 1;
  private running = false;
  private coolMs = 0;
  private prev: { left: TrackedPoint | null; right: TrackedPoint | null } = { left: null, right: null };

  constructor(
    public side: PunchSide,
    private attacks: AttackBus,
    private ring: SharedPunchRing
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.punches = 0;
    this.coolMs = 0;
    this.prev = { left: null, right: null };
    this.respawn(640, 480);
  }
  stop(): void {
    this.running = false;
  }

  get tinied(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'tiny';
  }

  // 내 반쪽 안쪽 60% 구역에만 스폰 (가로 20~80% 지점, 세로 20~60%).
  respawn(width = 640, height = 480): void {
    const spec = this.ring.nextFor(this.side);
    const rel = this.side === 'p1' ? spec.relX : 1 - spec.relX;
    const lo = this.side === 'p1' ? 0 : width / 2;
    const hw = width / 2;
    this.target = {
      x: lo + hw * (0.2 + rel * 0.6),
      y: height * (0.2 + spec.relY * 0.4),
      alive: true
    };
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.target.alive) return;
    const lo = this.side === 'p1' ? 0 : width / 2;
    const r = PUNCH_R * this.radiusScale * (this.tinied ? 0.7 : 1);
    ctx.save();
    ctx.strokeStyle = '#ff71ce';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff71ce';
    ctx.beginPath();
    ctx.arc(this.target.x, this.target.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void height;
    drawVersusLabel(ctx, `${this.punches}펀치`, lo + width / 4, 50, 30);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || !this.target.alive) return [];
    if (this.coolMs > 0) this.coolMs -= dtMs;
    const sw = shoulderWidth(frame);
    const palms = {
      left: palmOf(frame, 'left'),
      right: palmOf(frame, 'right')
    };
    const r = PUNCH_R * this.radiusScale * (this.tinied ? 0.7 : 1);
    const events: GameEvent[] = [];
    (['left', 'right'] as const).forEach((hand) => {
      const cur = palms[hand];
      const speed = pointSpeed(this.prev[hand], cur, dtMs, sw);
      this.prev[hand] = cur ? { x: cur.x, y: cur.y } : null;
      if (this.coolMs > 0 || !cur || !this.target.alive) return;
      const dist = Math.hypot(cur.x - this.target.x, cur.y - this.target.y);
      if (dist >= r || speed < PUNCH_SPEED) return;
      // 펀치 적중!
      this.target.alive = false;
      this.punches += 1;
      this.coolMs = PUNCH_COOL_MS;
      this.board.comboHit();
      this.board.add(2);
      this.respawn(frame.width, frame.height);
      events.push({ type: 'punch', points: 2, label: `${this.side === 'p1' ? 'P1' : 'P2'} 펀치!` });
      // 10연속 펀치마다 상대 타겟 축소 5초 (쿨타임은 AttackBus가 관리).
      if (this.board.combo % 10 === 0) {
        if (this.attacks.send('tiny', this.side)) {
          events.push({ type: 'attack', points: 0, label: '방해! 상대 타겟 축소 5초' });
        }
      }
    });
    return events;
  }
}
