// src/versus-games/punch-duel/punch-ring.ts
// 펀치 대전 공유 타겟 순서: 양쪽이 같은 순서로 타겟을 받고,
// 위치는 가운데선을 기준으로 좌우 대칭(미러)으로 나온다.
// 타겟은 반쪽 안쪽 60% 구역에만 나와 중앙선 침범을 유도하지 않는다.

export interface PunchSpec {
  // 0~1 (반쪽 안쪽 60% 구간으로 매핑, P2는 뒤집어 미러).
  relX: number;
  // 0~1 (세로 20~60% 구간으로 매핑, 양쪽 동일).
  relY: number;
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

export class SharedPunchRing {
  private rng: () => number;
  private pending: { spec: PunchSpec; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  nextFor(side: 'p1' | 'p2'): PunchSpec {
    if (!this.pending || this.pending.eatenBy.has(side)) {
      this.pending = {
        spec: { relX: this.rng(), relY: this.rng() },
        eatenBy: new Set()
      };
    }
    this.pending.eatenBy.add(side);
    return this.pending.spec;
  }
}
