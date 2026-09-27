// src/versus-games/abc-duel/abc-duel.ts
// ABC 대전: 같은 글자를 몸으로 만들고 1초 버티면 완성.
// 먼저 완성하면 +20 + 상대에게 안개 3초, 뒤따라 완성하면 +10.
// 반쪽 화면에서는 X·A(다리 벌림)가 짤리므로 T·Y·O·L·I·K 6종만 출제.
import type { PoseFrame } from '../../pose/types';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { anglesFromFrame, matchesTarget } from './angles';
import { SharedAbcRound } from './shared-letter';
import { drawVersusLabel } from '../../versus/draw';
import type { AttackBus } from '../../versus/attack';

export type AbcSide = 'p1' | 'p2';

export const ABC_HOLD_MS = 1000;

export class AbcDuelSide {
  board = new ScoreBoard();
  solved = 0;
  holdMs = 0;
  private running = false;
  private lastGen = 0;

  constructor(
    public side: AbcSide,
    private attacks: AttackBus,
    public round: SharedAbcRound
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.solved = 0;
    this.holdMs = 0;
    this.round.target = 'T';
    this.round.claimed = false;
    this.round.solvedBy = null;
    this.lastGen = this.round.gen;
  }
  stop(): void {
    this.running = false;
  }

  get fogged(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'fog';
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 완성한 쪽의 다음 tick에 함께 다음 글자로.
    if (this.round.pendingNext && this.round.solvedBy === this.side) {
      this.round.next();
      this.lastGen = this.round.gen;
      this.holdMs = 0;
    } else if (this.round.gen !== this.lastGen) {
      this.lastGen = this.round.gen;
      this.holdMs = 0;
    }
    if (!matchesTarget(anglesFromFrame(frame), this.round.target)) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= ABC_HOLD_MS) return [];
    this.holdMs = 0;
    const done = this.round.target;
    const first = this.round.claim(this.side);
    const pts = first ? 20 : 10;
    this.solved += 1;
    this.board.comboHit();
    this.board.add(pts);
    const ev: GameEvent[] = [
      { type: 'pose-ok', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} ${done} 완성! +${pts}` }
    ];
    if (first && this.attacks.send('fog', this.side)) {
      ev.push({ type: 'attack', points: 0, label: '안개! 상대 글자 흐림 3초' });
    }
    return ev;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    const color = this.fogged ? 'rgba(255,255,255,0.35)' : '#fff';
    drawVersusLabel(ctx, this.round.target, cx, 82, 88, color);
    // 유지 진행 바
    const barW = Math.min(width * 0.3, 220);
    const frac = Math.min(1, this.holdMs / ABC_HOLD_MS);
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - barW / 2, 128, barW, 14);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(cx - barW / 2, 128, barW * frac, 14);
    ctx.restore();
    void height;
  }
}
