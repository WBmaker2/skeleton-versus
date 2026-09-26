// src/versus-games/fruit-duel/fruit-duel.ts
// 과일 베기 대전: 좌우 각자 과일을 벤다. 3콤보마다 상대에게 썩은 과일 1개.
// 폭탄 -15점, 썩은 과일 -5점. 60초 합산 점수 승부.
import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';

export type DuelFruitKind = 'fruit' | 'bomb' | 'rotten';
export interface DuelFruit {
  x: number; y: number; vx: number; vy: number;
  kind: DuelFruitKind; alive: boolean;
}
export type DuelSide = 'p1' | 'p2';

export class FruitDuelSide {
  board = new ScoreBoard();
  fruits: DuelFruit[] = [];
  slices = 0;
  radiusScale = 1;
  private running = false;
  private spawnMs = 0;
  private spawnCount = 0;

  constructor(
    public side: DuelSide,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.fruits = [];
    this.spawnMs = 0;
    this.slices = 0;
    this.spawnCount = 0;
  }
  stop(): void {
    this.running = false;
  }

  // 내 반쪽에만 스폰. P1: 6~44%, P2: 56~94%
  spawn(width = 640): void {
    const kind: DuelFruitKind = Math.random() < 0.2 ? 'bomb' : 'fruit';
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    const x = lo + Math.random() * (hi - lo);
    this.fruits.push({ x, y: -20, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 140, kind, alive: true });
    this.spawnCount += 1;
  }

  spawnRotten(width = 640): void {
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    const x = lo + Math.random() * (hi - lo);
    this.fruits.push({ x, y: -20, vx: (Math.random() - 0.5) * 100, vy: 140 + Math.random() * 120, kind: 'rotten', alive: true });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fruits) {
      if (!f.alive) continue;
      ctx.save();
      if (f.kind === 'fruit') {
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath(); ctx.arc(f.x, f.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3d9e57';
        ctx.beginPath(); ctx.ellipse(f.x + 10, f.y - 20, 11, 6, 0.6, 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'bomb') {
        ctx.fillStyle = '#22303c';
        ctx.beginPath(); ctx.arc(f.x, f.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dfff00';
        ctx.beginPath(); ctx.arc(f.x + 8, f.y - 10, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        // 썩은 과일: 회색 + X 표시
        ctx.fillStyle = '#8a8f98';
        ctx.beginPath(); ctx.arc(f.x, f.y, 22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3c2f2f';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(f.x - 10, f.y - 10); ctx.lineTo(f.x + 10, f.y + 10);
        ctx.moveTo(f.x + 10, f.y - 10); ctx.lineTo(f.x - 10, f.y + 10);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 상대가 보낸 썩은 과일을 내 화면에 추가
    const incoming = this.attacks.takeRotten(this.side);
    for (let i = 0; i < incoming; i++) this.spawnRotten(frame.width);
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 450) {
      this.spawnMs = 0;
      this.spawn(frame.width);
    }
    for (const f of this.fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 700 * dt;
    }
    const palms = [palmOf(frame, 'left'), palmOf(frame, 'right')].filter(
      (w): w is { x: number; y: number } => w !== null
    );
    const events: GameEvent[] = [];
    for (const f of this.fruits) {
      if (!f.alive) continue;
      const hit = palms.some((w) => Math.hypot(w.x - f.x, w.y - f.y) < 48 * this.radiusScale);
      if (!hit) continue;
      f.alive = false;
      if (f.kind === 'fruit') {
        this.board.comboHit();
        this.board.add(10);
        this.slices += 1;
        events.push({ type: 'slice', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 과일!` });
        // 3콤보마다 상대에게 썩은 과일 1개 (쿨타임은 AttackBus가 관리)
        if (this.board.combo % 3 === 0) {
          if (this.attacks.send('rotten', this.side)) {
            events.push({ type: 'attack', points: 0, label: '방해! 썩은 과일 전송!' });
          }
        }
      } else if (f.kind === 'bomb') {
        this.board.comboMiss();
        this.board.add(-15);
        events.push({ type: 'bomb', points: -15, label: '폭탄! 피하세요' });
      } else {
        this.board.comboMiss();
        this.board.add(-5);
        events.push({ type: 'bomb', points: -5, label: '썩은 과일! -5점' });
      }
    }
    const floorY = frame.height + 40;
    this.fruits = this.fruits.filter(
      (f) => f.alive && f.y < floorY && f.x > -40 && f.x < frame.width + 40
    );
    return events;
  }
}
