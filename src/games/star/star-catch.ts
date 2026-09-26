import type { PoseFrame } from '../../pose/types';
import { palmOf } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel, drawStar } from '../../ui/renderer';

export interface Star {
  x: number;
  y: number;
  alive: boolean;
}

// 별잡기 스트레칭: 손을 별에 0.3초 대면 잡힌다. 좌우·위아래 유연성.
export class StarCatch implements Game {
  id = 'star';
  // 상단 카운트 시인성을 위해 얼굴 마스크를 그리지 않는다 (수학·ABC와 동일).
  hideFace = true;
  star: Star = { x: 320, y: 120, alive: true };
  board = new ScoreBoard();
  caught = 0;
  private running = false;
  private holdMs = 0;
  private seed = 1;

  start(): void {
    this.running = true;
    this.board.reset();
    this.caught = 0;
    this.respawn();
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    if (this.star.alive) drawStar(ctx, this.star.x, this.star.y, 34, '#dfff00');
    // 고정 UI 카운트는 화면 오른쪽 위에 그대로 보이도록 canvasWidth를 넘겨
    // 표시 위치를 고정한다 (CSS 셀카 미러로 반대편·거울문자로 보이는 문제 수정).
    drawLabel(ctx, `${this.caught}개`, width - 70, 50, 30, width);
  }
  respawn(width = 640, height = 480): void {
    this.star = {
      x: width * 0.12 + this.rnd() * width * 0.76,
      y: height * 0.15 + this.rnd() * height * 0.45,
      alive: true
    };
    this.holdMs = 0;
  }
  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running || !this.star.alive) return [];
    const palms = [palmOf(frame, 'left'), palmOf(frame, 'right')].filter(
      (w): w is { x: number; y: number } => w !== null
    );
    const near = palms.some((w) => Math.hypot(w.x - this.star.x, w.y - this.star.y) < 56);
    if (!near) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 300) return [];
    this.star.alive = false;
    this.caught += 1;
    this.board.comboHit();
    this.board.add(10);
    const n = this.caught;
    this.respawn(frame.width, frame.height);
    return [{ type: 'catch', points: 10, label: `별 ${n}개!` }];
  }
}
