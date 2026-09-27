// src/versus-games/dance-duel/shared-beat.ts
// 댄스 대전 공유 박자: 양쪽이 같은 동작을 따라하고 먼저 적중하면 +15,
// 뒤따라 적중하면 +10. 박자를 놓치면 다음 동작으로 넘어간다.
// 새 동작은 적중한 쪽(또는 놓친 쪽)의 다음 tick에 넘어간다.

import { DANCE_MOVES, type DanceGuideMove } from '../../versus/dance-guide';

function pick(exclude?: DanceGuideMove): DanceGuideMove {
  const pool = DANCE_MOVES.filter((m) => m !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export class SharedDanceBeat {
  move: DanceGuideMove = 'left';
  claimed = false;
  solvedBy: 'p1' | 'p2' | null = null;
  // 박자를 놓쳐서 넘어갈 때 true (선착순과 무관하게 양쪽이 함께 넘어간다).
  skipped = false;
  gen = 0;

  get pendingNext(): boolean {
    return this.solvedBy !== null || this.skipped;
  }

  claim(by: 'p1' | 'p2'): boolean {
    const first = !this.claimed;
    this.claimed = true;
    if (first) this.solvedBy = by;
    return first;
  }

  skip(): void {
    this.skipped = true;
  }

  next(): void {
    this.move = pick(this.move);
    this.claimed = false;
    this.solvedBy = null;
    this.skipped = false;
    this.gen += 1;
  }
}
