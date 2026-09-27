// src/versus-games/memory-duel/memory-duel.ts
// 기억 포즈 릴레이: 보여준 3개 포즈 순서를 외워 순서대로 재현한다.
// 같은 판정이 2회 연속 나와야 1칸 전진 (분류 경계 흔들림 방지).
// 순서가 틀리면 이번 라운드 처음부터. 완성하면 +30 (뒤따르면 +15).
// 먼저 완성하면 상대에게 안개 3초.
import type { PoseFrame } from '../../pose/types';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { MOVE_KR, wristPattern, type PoseMove } from '../../versus/pose-moves';
import { drawVersusLabel } from '../../versus/draw';
import { SharedMemoryDeck } from './shared-deck';
import type { AttackBus } from '../../versus/attack';

export type MemorySide = 'p1' | 'p2';

export class MemoryDuelSide {
  board = new ScoreBoard();
  solved = 0;
  index = 0;
  private running = false;
  private lastGen = 0;
  private lastPattern: PoseMove | null = null;
  private confirm = 0;

  constructor(
    public side: MemorySide,
    private attacks: AttackBus,
    public deck: SharedMemoryDeck
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.solved = 0;
    this.index = 0;
    this.lastPattern = null;
    this.confirm = 0;
    this.lastGen = this.deck.gen;
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
    void dtMs;
    // 완성한 쪽의 다음 tick에 함께 다음 문제로.
    if (this.deck.pendingNext && this.deck.solvedBy === this.side) {
      this.deck.next();
      this.lastGen = this.deck.gen;
      this.index = 0;
      this.lastPattern = null;
      this.confirm = 0;
    } else if (this.deck.gen !== this.lastGen) {
      this.lastGen = this.deck.gen;
      this.index = 0;
      this.lastPattern = null;
      this.confirm = 0;
    }
    const pattern = wristPattern(frame);
    if (pattern === this.lastPattern) this.confirm += 1;
    else {
      this.lastPattern = pattern;
      this.confirm = 1;
    }
    // 같은 판정이 2회 연속 나와야 인정.
    if (this.confirm < 2) return [];
    const expected = this.deck.sequence[this.index];
    if (pattern !== expected) {
      // 순서가 틀리면 이번 라운드 처음부터 (감점 없음).
      if (this.index > 0) {
        this.index = 0;
        this.lastPattern = null;
        this.confirm = 0;
        return [{ type: 'retry', points: 0, label: '순서가 틀렸어요! 처음부터' }];
      }
      return [];
    }
    this.index += 1;
    this.lastPattern = null;
    this.confirm = 0;
    if (this.index < this.deck.sequence.length) {
      return [{ type: 'step', points: 0, label: `${this.index + 1}번째 포즈!` }];
    }
    // 릴레이 완성.
    const first = this.deck.claim(this.side);
    const pts = first ? 30 : 15;
    this.solved += 1;
    this.board.comboHit();
    this.board.add(pts);
    const ev: GameEvent[] = [
      { type: 'memory', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} 릴레이 완성! +${pts}` }
    ];
    if (first && this.attacks.send('fog', this.side)) {
      ev.push({ type: 'attack', points: 0, label: '안개! 상대 순서 흐림 3초' });
    }
    return ev;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    const color = this.fogged ? 'rgba(255,255,255,0.35)' : '#fff';
    this.deck.sequence.forEach((m, i) => {
      const done = i < this.index;
      const current = i === this.index;
      const x = cx + (i - 1) * 90;
      const label = `${i + 1}. ${MOVE_KR[m]}`;
      drawVersusLabel(ctx, label, x, 70, current ? 26 : 20, done ? '#dfff00' : color);
    });
    void height;
  }
}
