// src/versus-games/mole-duel/mole-ring.ts
// 두더지 대전 공유 구멍 순서: 양쪽이 같은 순서로 같은 구멍을 받고,
// 위치는 가운데선을 기준으로 좌우 대칭(미러)으로 나온다.
// 같은 자리가 연속으로 나오지 않는다 (직전 슬롯 제외).

export type MoleSlot = 0 | 1 | 2 | 3 | 4 | 5;
// 0~2 바닥 왼쪽→오른쪽 · 3~5 측면 위→아래.

export function isFloorSlot(slot: MoleSlot): boolean {
  return slot <= 2;
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SharedMoleRing {
  private rng: () => number;
  private last: MoleSlot | null = null;
  private pending: { slot: MoleSlot; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  private draw(): MoleSlot {
    let slot = Math.floor(this.rng() * 6) as MoleSlot;
    for (let i = 0; i < 10 && slot === this.last; i++) {
      slot = Math.floor(this.rng() * 6) as MoleSlot;
    }
    this.last = slot;
    return slot;
  }

  nextFor(side: 'p1' | 'p2'): MoleSlot {
    if (!this.pending || this.pending.eatenBy.has(side)) {
      this.pending = { slot: this.draw(), eatenBy: new Set() };
    }
    this.pending.eatenBy.add(side);
    return this.pending.slot;
  }
}
