// src/versus-games/memory-duel/shared-deck.ts
// 기억 릴레이 공유 문제: 양쪽이 같은 3개 포즈 순서를 외워 순서대로 재현한다.
// 먼저 완성하면 +30 + 안개 3초, 뒤따라 완성하면 +15.
// 새 문제는 완성한 쪽의 다음 tick에 넘어간다.

import { DANCE_MOVES, type DanceGuideMove } from '../../versus/dance-guide';

export type MemoryMove = DanceGuideMove;

function deal(exclude?: MemoryMove[]): MemoryMove[] {
  let seq: MemoryMove[] = [];
  for (let attempt = 0; attempt < 20; attempt++) {
    seq = [0, 1, 2].map(() => DANCE_MOVES[Math.floor(Math.random() * DANCE_MOVES.length)]);
    const key = seq.join(',');
    if (!exclude || key !== exclude.join(',')) return seq;
  }
  return seq;
}

export class SharedMemoryDeck {
  sequence: MemoryMove[] = deal();
  claimed = false;
  solvedBy: 'p1' | 'p2' | null = null;
  gen = 0;

  get pendingNext(): boolean {
    return this.solvedBy !== null;
  }

  claim(by: 'p1' | 'p2'): boolean {
    const first = !this.claimed;
    this.claimed = true;
    if (first) this.solvedBy = by;
    return first;
  }

  next(): void {
    this.sequence = deal(this.sequence);
    this.claimed = false;
    this.solvedBy = null;
    this.gen += 1;
  }
}
