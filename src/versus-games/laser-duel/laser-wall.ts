// src/versus-games/laser-duel/laser-wall.ts
// 레이저 대전 공유 벽: 양쪽이 같은 순서로 같은 높이 슬롯에 레이저를 받는다.
// 세로 방향이라 미러가 필요 없고 순서만 공유한다.

export type LaserSlot = 0 | 1 | 2; // 0 위 · 1 가운데 · 2 아래

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SharedLaserWall {
  private rng: () => number;
  private pending: { slot: LaserSlot; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  nextFor(side: 'p1' | 'p2'): LaserSlot {
    if (!this.pending || this.pending.eatenBy.has(side)) {
      this.pending = {
        slot: Math.floor(this.rng() * 3) as LaserSlot,
        eatenBy: new Set()
      };
    }
    this.pending.eatenBy.add(side);
    return this.pending.slot;
  }
}
