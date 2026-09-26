// src/versus-games/constellation-duel/shared-sky.ts
// 별자리 대전 공유 하늘: 양쪽이 같은 별자리(미러 배치)를 각자 완성하는 경주.
// 먼저 완성하면 별 개수 × 10점 + 안개 3초, 뒤따라 완성하면 × 5점.
// 새 별자리는 완성한 쪽의 다음 tick에 넘어간다.

export interface SkyPoint {
  // 내 반쪽 안에서의 상대 좌표 0~1. P2는 x를 뒤집어 미러가 된다.
  rx: number;
  ry: number;
}

export class SharedConstellation {
  points: SkyPoint[] = [];
  claimed = false;
  solvedBy: 'p1' | 'p2' | null = null;
  gen = 0;

  constructor() {
    this.deal();
  }

  get pendingNext(): boolean {
    return this.solvedBy !== null;
  }

  claim(by: 'p1' | 'p2'): boolean {
    const first = !this.claimed;
    this.claimed = true;
    if (first) this.solvedBy = by;
    return first;
  }

  // 새 별자리 출제: 3~5개, 서로 간격을 띄워 배치.
  deal(): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const minGap = 0.22;
    const pts: SkyPoint[] = [];
    for (let i = 0; i < count; i++) {
      let p: SkyPoint = { rx: 0.5, ry: 0.3 };
      for (let t = 0; t < 50; t++) {
        p = { rx: 0.08 + Math.random() * 0.84, ry: 0.08 + Math.random() * 0.5 };
        if (pts.every((q) => Math.hypot(q.rx - p.rx, q.ry - p.ry) >= minGap)) break;
      }
      pts.push(p);
    }
    this.points = pts;
    this.claimed = false;
    this.solvedBy = null;
    this.gen += 1;
  }
}
