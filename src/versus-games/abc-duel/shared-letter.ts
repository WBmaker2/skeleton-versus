// src/versus-games/abc-duel/shared-letter.ts
// ABC 대전 공유 글자: 양쪽이 같은 글자를 만들고 먼저 1초 버틴 쪽이 이긴다.
// 먼저 완성하면 +20 + 안개 3초, 뒤따라 완성하면 +10.
// 새 글자는 완성한 쪽의 다음 tick에 넘어간다.

import { pickTarget, type AbcTarget } from './angles';

export class SharedAbcRound {
  target: AbcTarget = 'T';
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
    this.target = pickTarget(this.target);
    this.claimed = false;
    this.solvedBy = null;
    this.gen += 1;
  }
}
