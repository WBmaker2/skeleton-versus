// src/versus-games/star-duel/star-duel.ts
// 별잡기 대전: 각자 자기 반쪽의 별에 손을 대고 0.3초 기다리면 포획 (+10).
// 3콤보마다 상대에게 먹별(검은 별, 잡으면 -5점) 1개를 보낸다.
// 별 위치는 공유 별밭에서 같은 순서로 받고 좌우 대칭으로 나온다.
import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawStar, drawVersusLabel } from '../../versus/draw';
import { SharedStarField } from './star-field';

export type StarSide = 'p1' | 'p2';
export type DuelStarKind = 'star' | 'dark';

export interface DuelStar {
  x: number; y: number;
  kind: DuelStarKind; alive: boolean;
}

export const STAR_HOLD_MS = 300;
export const STAR_CATCH_R = 56;

export class StarDuelSide {
  board = new ScoreBoard();
  star: DuelStar = { x: 0, y: 0, kind: 'star', alive: true };
  caught = 0;
  radiusScale = 1;
  private running = false;
  private holdMs = 0;

  constructor(
    public side: StarSide,
    private attacks: AttackBus,
    private field: SharedStarField
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.caught = 0;
    this.holdMs = 0;
    this.respawn(640, 480);
  }
  stop(): void {
    this.running = false;
  }

  // 내 반쪽에만 리스폰. P1: 가로 6~44%·세로 15~60%, P2는 가로 대칭.
  respawn(width = 640, height = 480): void {
    const spec = this.field.nextFor(this.side);
    const relX = this.side === 'p1' ? spec.relX : 1 - spec.relX;
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    this.star = {
      x: lo + relX * (hi - lo),
      y: height * 0.15 + spec.relY * height * 0.45,
      kind: 'star',
      alive: true
    };
    this.holdMs = 0;
  }

  spawnDark(width = 640, height = 480): void {
    const spec = this.field.nextFor(this.side);
    const relX = this.side === 'p1' ? spec.relX : 1 - spec.relX;
    const lo = this.side === 'p1' ? width * 0.06 : width * 0.56;
    const hi = this.side === 'p1' ? width * 0.44 : width * 0.94;
    this.star = {
      x: lo + relX * (hi - lo),
      y: height * 0.15 + spec.relY * height * 0.45,
      kind: 'dark',
      alive: true
    };
    this.holdMs = 0;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.star.alive) return;
    const lo = this.side === 'p1' ? 0 : width / 2;
    if (this.star.kind === 'star') {
      drawStar(ctx, this.star.x, this.star.y, 34, '#dfff00');
    } else {
      drawStar(ctx, this.star.x, this.star.y, 34, '#4a4a4a');
      drawVersusLabel(ctx, '×', this.star.x, this.star.y + 10, 30, '#ff3b30');
    }
    void height;
    drawVersusLabel(ctx, `${this.caught}개`, lo + width / 4, 50, 30);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || !this.star.alive) return [];
    // 상대가 보낸 먹별을 내 화면에 추가
    const incoming = this.attacks.takeDark(this.side);
    for (let i = 0; i < incoming; i++) this.spawnDark(frame.width, frame.height);
    const palms = [palmOf(frame, 'left'), palmOf(frame, 'right')].filter(
      (w): w is { x: number; y: number } => w !== null
    );
    const near = palms.some(
      (w) => Math.hypot(w.x - this.star.x, w.y - this.star.y) < STAR_CATCH_R * this.radiusScale
    );
    if (!near) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= STAR_HOLD_MS) return [];
    this.star.alive = false;
    if (this.star.kind === 'star') {
      this.caught += 1;
      this.board.comboHit();
      this.board.add(10);
      const n = this.caught;
      this.respawn(frame.width, frame.height);
      const events: GameEvent[] = [
        { type: 'catch', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 별 ${n}개!` }
      ];
      // 3콤보마다 상대에게 먹별 1개 (쿨타임은 AttackBus가 관리)
      if (this.board.combo % 3 === 0) {
        if (this.attacks.send('dark', this.side)) {
          events.push({ type: 'attack', points: 0, label: '방해! 먹별 전송!' });
        }
      }
      return events;
    }
    this.board.comboMiss();
    this.board.add(-5);
    this.respawn(frame.width, frame.height);
    return [{ type: 'bomb', points: -5, label: '먹별! -5점' }];
  }
}
