// src/versus-games/star-duel/star-field.ts
// 별잡기 대전 공유 별밭: 양쪽이 같은 순서로 별을 받고,
// 위치는 가운데선을 기준으로 좌우 대칭(미러)으로 나온다.

export interface StarSpec {
  // 내 반쪽 안에서의 상대 위치 0~1. P2는 1-relX로 뒤집어 미러가 된다.
  relX: number;
  // 세로 상대 위치 0~1 (위에서 15%~60% 구간으로 매핑, 양쪽 동일).
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

export class SharedStarField {
  private rng: () => number;
  // 진행 중인 라운드 스펙. 양쪽이 한 번씩 가져가면 다음 라운드로 넘어간다.
  private pending: { spec: StarSpec; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  nextFor(side: 'p1' | 'p2'): StarSpec {
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
