// src/versus-games/zombie-duel/zombie-horde.ts
// 좀비 대전 공유 떼: 양쪽이 같은 순서로 같은 줄에 좀비를 받고,
// 줄은 가운데선을 기준으로 좌우 대칭(미러)으로 나온다 (0<->2, 1은 가운데).

export type HordeZone = 0 | 1 | 2;

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SharedZombieHorde {
  private rng: () => number;
  // 진행 중인 라운드 스펙. 양쪽이 한 번씩 가져가면 다음 라운드로 넘어간다.
  private pending: { zone: HordeZone; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  nextFor(side: 'p1' | 'p2'): HordeZone {
    if (!this.pending || this.pending.eatenBy.has(side)) {
      this.pending = {
        zone: Math.floor(this.rng() * 3) as HordeZone,
        eatenBy: new Set()
      };
    }
    this.pending.eatenBy.add(side);
    const z = this.pending.zone;
    // 미러: P2는 좌우를 뒤집는다.
    return side === 'p1' ? z : ((2 - z) as HordeZone);
  }
}
