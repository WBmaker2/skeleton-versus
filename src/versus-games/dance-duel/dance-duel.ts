// src/versus-games/dance-duel/dance-duel.ts
// 댄스 대전: 박자에 맞춰 같은 동작을 따라한다.
// 먼저 적중하면 +15, 뒤따라 적중하면 +10, 박자를 놓치면 다음 동작으로.
// 3연속 적중이면 상대 박자 단축 (1.8초→1.2초, 5초).
import type { PoseFrame } from '../../pose/types';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { MOVE_KR, wristPattern } from '../../versus/pose-moves';
import { drawDanceGuide } from '../../versus/dance-guide';
import { drawVersusLabel } from '../../versus/draw';
import { SharedDanceBeat } from './shared-beat';
import type { AttackBus } from '../../versus/attack';

export type DanceSide = 'p1' | 'p2';

export const DANCE_BEAT_MS = 1800;
export const DANCE_BEAT_FAST_MS = 1200;

export class DanceDuelSide {
  board = new ScoreBoard();
  beats = 0;
  waitMs = 0;
  private running = false;
  private lastGen = 0;

  constructor(
    public side: DanceSide,
    private attacks: AttackBus,
    public beat: SharedDanceBeat
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.beats = 0;
    this.waitMs = 0;
    this.beat.move = 'left';
    this.beat.claimed = false;
    this.beat.solvedBy = null;
    this.beat.skipped = false;
    this.lastGen = this.beat.gen;
  }
  stop(): void {
    this.running = false;
  }

  // 상대의 박자 단축 공격을 받고 있으면 true.
  get rushed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'offbeat';
  }

  get beatLimitMs(): number {
    return this.rushed ? DANCE_BEAT_FAST_MS : DANCE_BEAT_MS;
  }

  get beatFrac(): number {
    return Math.min(1, this.waitMs / this.beatLimitMs);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 적중·시간초과한 쪽의 다음 tick에 함께 다음 동작으로.
    if (this.beat.pendingNext && (this.beat.solvedBy === this.side || this.beat.skipped)) {
      this.beat.next();
      this.lastGen = this.beat.gen;
      this.waitMs = 0;
    } else if (this.beat.gen !== this.lastGen) {
      this.lastGen = this.beat.gen;
      this.waitMs = 0;
    }
    if (wristPattern(frame) === this.beat.move) {
      const first = this.beat.claim(this.side);
      const pts = first ? 15 : 10;
      this.beats += 1;
      this.board.comboHit();
      this.board.add(pts);
      this.waitMs = 0;
      const ev: GameEvent[] = [
        { type: 'beat', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} 리듬 적중! +${pts}` }
      ];
      // 3연속 적중이면 상대 박자 단축 5초 (쿨타임은 AttackBus가 관리).
      if (this.board.combo % 3 === 0) {
        if (this.attacks.send('offbeat', this.side)) {
          ev.push({ type: 'attack', points: 0, label: '방해! 상대 박자 빨라짐 5초' });
        }
      }
      return ev;
    }
    this.waitMs += dtMs;
    if (this.waitMs <= this.beatLimitMs) return [];
    this.waitMs = 0;
    this.board.comboMiss();
    if (!this.beat.pendingNext) this.beat.skip();
    return [{ type: 'miss', points: 0, label: '박자를 놓쳤어요' }];
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    drawVersusLabel(ctx, MOVE_KR[this.beat.move], cx, 66, 44);
    // 남은 박자 바
    const barW = Math.min(width * 0.3, 200);
    const frac = 1 - this.beatFrac;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - barW / 2, 96, barW, 12);
    ctx.fillStyle = this.rushed ? '#ff71ce' : '#00ffff';
    ctx.fillRect(cx - barW / 2, 96, barW * frac, 12);
    ctx.restore();
    // 따라할 동작 스켈레톤 예시 (반쪽 안쪽 위).
    drawDanceGuide(ctx, this.beat.move, lo + 10, 120, 110, 140);
    void height;
  }
}
