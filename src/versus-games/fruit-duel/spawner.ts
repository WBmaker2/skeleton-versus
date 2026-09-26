// src/versus-games/fruit-duel/spawner.ts
// 과일 베기 대전 공유 스폰 패턴: 양쪽이 같은 순서로 같은 종류를 받고,
// 위치는 가운데선을 기준으로 좌우 대칭(미러)으로 나온다. 잘하는 쪽이
// 유리한 패턴을 독식하지 않게 공정성을 맞춘다.

export type SpawnKind = 'fruit' | 'bomb';

export interface SpawnSpec {
  kind: SpawnKind;
  // 내 반쪽 안에서의 상대 위치 0~1. P2는 1-rel로 뒤집어 미러가 된다.
  relX: number;
}

// 결정적 난수 (mulberry32). 같은 시드면 같은 순서가 나온다.
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FRUIT_BOMB_RATE = 0.2;

export class SharedFruitPattern {
  private rng: () => number;
  // 진행 중인 라운드 스펙. 양쪽이 한 번씩 가져가면 다음 라운드로 넘어간다.
  // 한 명이 화면에 없을 때는 같은 쪽이 연속으로 요청하므로 라운드를 버리고 새로 뽑는다.
  private pending: { spec: SpawnSpec; eatenBy: Set<'p1' | 'p2'> } | null = null;

  constructor(seed: number = (Math.random() * 2 ** 31) | 0) {
    this.rng = mulberry32(seed);
  }

  private draw(): SpawnSpec {
    return {
      kind: this.rng() < FRUIT_BOMB_RATE ? 'bomb' : 'fruit',
      relX: this.rng()
    };
  }

  nextFor(side: 'p1' | 'p2'): SpawnSpec {
    if (!this.pending || this.pending.eatenBy.has(side)) {
      this.pending = { spec: this.draw(), eatenBy: new Set() };
    }
    this.pending.eatenBy.add(side);
    return this.pending.spec;
  }
}
