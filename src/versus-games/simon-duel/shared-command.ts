// src/versus-games/simon-duel/shared-command.ts
// 사이먼 대전 공유 지시: 양쪽이 같은 지시를 듣고 먼저 맞춘 쪽이 이긴다.
// 먼저 맞추면 +20, 같은 지시에 뒤따라 맞추면 +10.
// 새 지시는 지시를 푼 쪽(solvedBy)의 다음 tick에 넘어간다.

import type { PoseMove } from '../../versus/pose-moves';

export type SimonCmd = 'left' | 'right' | 'both' | 'down';

const COMMANDS: SimonCmd[] = ['left', 'right', 'both', 'down'];

function pick(exclude?: SimonCmd): SimonCmd {
  const pool = COMMANDS.filter((c) => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function toMove(cmd: SimonCmd): PoseMove {
  return cmd;
}

export class SharedSimonRound {
  command: SimonCmd = 'left';
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
    this.command = pick(this.command);
    this.claimed = false;
    this.solvedBy = null;
    this.gen += 1;
  }
}
