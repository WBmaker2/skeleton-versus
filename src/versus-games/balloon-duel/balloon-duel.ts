// src/versus-games/balloon-duel/balloon-duel.ts
// 풍선 대전: 각자 자기 반쪽의 풍선을 이마로 받아 띄운다 (+5).
// 풍선이 바닥에 떨어지면 자기 콤보만 끊긴다 (상대와 무관).
// 3콤보마다 상대에게 풍선 선물 1개 (기회이자 혼란).
// 풍선 위치는 공유 하늘에서 같은 순서로 받고 좌우 대칭으로 나온다.
import type { PoseFrame } from '../../pose/types';
import { getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';
import { SharedBalloonSky } from './balloon-sky';

export type BalloonSide = 'p1' | 'p2';

export interface DuelBalloon {
  x: number; y: number; vy: number;
  alive: boolean;
  cool: number;
  touched: boolean;
}

const MAX_BALLOONS = 3;
const SPAWN_INTERVAL_MS = 1500;
const MIN_SPAWN_DIST = 120;
const CONTACT_R = 54;
const SEPARATE_R = 72;
const BUMP_COOLDOWN_MS = 500;

export class BalloonDuelSide {
  board = new ScoreBoard();
  balloons: DuelBalloon[] = [];
  hits = 0;
  private running = false;
  private spawnMs = 0;

  constructor(
    public side: BalloonSide,
    private attacks: AttackBus,
    private sky: SharedBalloonSky
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.hits = 0;
    this.balloons = [];
    this.spawnMs = 0;
  }
  stop(): void {
    this.running = false;
  }

  // 내 반쪽에만 스폰. P1: 6~44%, P2: 56~94% (대칭).
  spawn(width = 640): void {
    const spec = this.sky.nextFor(this.side);
    const rel = this.side === 'p1' ? spec.relX : 1 - spec.relX;
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    const x = lo + rel * (hi - lo);
    const ok = this.balloons.every((b) => !b.alive || Math.abs(b.x - x) >= MIN_SPAWN_DIST);
    if (!ok) return;
    this.balloons.push({ x, y: -20, vy: 60, alive: true, cool: 0, touched: false });
  }

  // 헤딩 판정점: 코 위치에서 마스크 절반 크기만큼 위 (이마·머리 경계선).
  headOf(frame: PoseFrame): { x: number; y: number } | null {
    const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
    const nose = byName.get('nose');
    const ls = getByName(frame, 'left_shoulder');
    const rs = getByName(frame, 'right_shoulder');
    const sw = ls && rs ? Math.max(40, Math.hypot(ls.x - rs.x, ls.y - rs.y)) : 100;
    const half = ((sw * 1.4) / 2) * 0.5;
    if (nose && (nose.score ?? 0) > 0.3) return { x: nose.x, y: nose.y - half };
    if (ls && rs) return { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 - 40 - half };
    return null;
  }

  draw(ctx: CanvasRenderingContext2D, width: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    for (const b of this.balloons) {
      if (!b.alive) continue;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 42);
      ctx.lineTo(b.x, b.y + 88);
      ctx.stroke();
      ctx.fillStyle = '#ff71ce';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 38, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawVersusLabel(ctx, `${this.hits}번`, lo + width / 4, 50, 30);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const events: GameEvent[] = [];
    // 상대가 보낸 풍선 선물을 내 화면에 추가
    const incoming = this.attacks.takeGift(this.side);
    for (let i = 0; i < incoming; i++) this.spawn(frame.width);
    const dt = dtMs / 1000;
    const head = this.headOf(frame);
    for (const b of this.balloons) {
      if (!b.alive) continue;
      if (b.cool > 0) b.cool -= dtMs;
      b.vy += 140 * dt;
      b.y += b.vy * dt;
      if (head) {
        const dist = Math.hypot(head.x - b.x, head.y - b.y);
        if (dist > SEPARATE_R) b.touched = false;
        if (!b.touched && b.cool <= 0 && dist < CONTACT_R) {
          b.vy = -330;
          b.cool = BUMP_COOLDOWN_MS;
          b.touched = true;
          this.hits += 1;
          this.board.comboHit();
          this.board.add(5);
          events.push({ type: 'bump', points: 5, label: `${this.side === 'p1' ? 'P1' : 'P2'} ${this.hits}번 받았어요!` });
          // 3콤보마다 상대에게 풍선 선물 1개 (쿨타임은 AttackBus가 관리).
          if (this.board.combo % 3 === 0) {
            if (this.attacks.send('gift', this.side)) {
              events.push({ type: 'attack', points: 0, label: '방해! 상대에게 풍선 선물!' });
            }
          }
          continue;
        }
      }
      if (b.y > frame.height + 40) {
        b.alive = false;
        this.board.comboMiss();
        events.push({ type: 'drop', points: 0, label: '풍선이 떨어졌어요' });
      }
    }
    this.balloons = this.balloons.filter((b) => b.alive);
    this.spawnMs -= dtMs;
    if (this.spawnMs <= 0) {
      if (this.balloons.length < MAX_BALLOONS) this.spawn(frame.width);
      this.spawnMs = SPAWN_INTERVAL_MS;
    }
    return events;
  }
}
