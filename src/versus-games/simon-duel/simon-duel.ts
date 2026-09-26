// src/versus-games/simon-duel/simon-duel.ts
// 사이먼 대전: 선생님의 같은 지시를 듣고 몸으로 재빨리 답한다.
// 먼저 맞추면 +20 + 상대에게 안개 3초, 같은 지시에 뒤따라 맞추면 +10.
// 2.5초 안에 못 맞추면 다음 지시로 넘어간다 (콤보 리셋).
import type { PoseFrame } from '../../pose/types';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { MOVE_KR, bothUp, wristPattern } from '../../versus/pose-moves';
import { drawVersusLabel } from '../../versus/draw';
import { SharedSimonRound } from './shared-command';
import type { AttackBus } from '../../versus/attack';

export type SimonSide = 'p1' | 'p2';

export const SIMON_TIMEOUT_MS = 2500;

export class SimonDuelSide {
  board = new ScoreBoard();
  solved = 0;
  waitMs = 0;
  private running = false;
  private lastGen = 0;

  constructor(
    public side: SimonSide,
    private attacks: AttackBus,
    public round: SharedSimonRound
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.solved = 0;
    this.waitMs = 0;
    this.round.command = 'left';
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

  get timeFrac(): number {
    return Math.min(1, this.waitMs / SIMON_TIMEOUT_MS);
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    // 지시를 푼 쪽의 다음 tick에 함께 다음 지시로.
    if (this.round.pendingNext && this.round.solvedBy === this.side) {
      this.round.next();
      this.lastGen = this.round.gen;
      this.waitMs = 0;
    } else if (this.round.gen !== this.lastGen) {
      this.lastGen = this.round.gen;
      this.waitMs = 0;
    }
    const pattern = wristPattern(frame);
    const cmd = this.round.command;
    if (pattern === cmd || (cmd === 'both' && bothUp(frame))) {
      const first = this.round.claim(this.side);
      const pts = first ? 20 : 10;
      this.solved += 1;
      this.board.comboHit();
      this.board.add(pts);
      const ev: GameEvent[] = [
        { type: 'correct', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} "${MOVE_KR[cmd]}" 성공! +${pts}` }
      ];
      if (first && this.attacks.send('fog', this.side)) {
        ev.push({ type: 'attack', points: 0, label: '안개! 상대 지시 흐림 3초' });
      }
      this.waitMs = 0;
      return ev;
    }
    this.waitMs += dtMs;
    if (this.waitMs <= SIMON_TIMEOUT_MS) return [];
    this.board.comboMiss();
    // 시간 초과는 푼 쪽 없이 다음 지시로 (양쪽이 함께 넘어간다).
    if (!this.round.pendingNext) {
      this.round.solvedBy = this.side;
    }
    this.waitMs = 0;
    return [{ type: 'timeout', points: 0, label: '시간 초과! 다음 지시' }];
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    const color = this.fogged ? 'rgba(255,255,255,0.35)' : '#fff';
    drawVersusLabel(ctx, `${MOVE_KR[this.round.command]}!`, cx, 78, 52, color);
    // 남은 시간 바
    const barW = Math.min(width * 0.3, 220);
    const frac = 1 - this.timeFrac;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - barW / 2, 110, barW, 12);
    ctx.fillStyle = '#ff71ce';
    ctx.fillRect(cx - barW / 2, 110, barW * frac, 12);
    ctx.restore();
    void height;
  }
}
