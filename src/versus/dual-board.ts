// src/versus/dual-board.ts
// P1/P2 점수판 + 승자 판정. 기존 ScoreBoard 2개를 감싼다.
import { ScoreBoard } from '../game/engine';

export type Winner = 'p1' | 'p2' | 'draw';

export class DualBoard {
  p1 = new ScoreBoard();
  p2 = new ScoreBoard();

  reset(): void {
    this.p1.reset();
    this.p2.reset();
  }

  get winner(): Winner {
    if (this.p1.score > this.p2.score) return 'p1';
    if (this.p2.score > this.p1.score) return 'p2';
    return 'draw';
  }

  winnerLabel(): string {
    if (this.p1.score > this.p2.score) return 'P1 승리!';
    if (this.p2.score > this.p1.score) return 'P2 승리!';
    return '무승부!';
  }

  scoreText(): string {
    return `P1 ${this.p1.score} : ${this.p2.score} P2`;
  }
}
