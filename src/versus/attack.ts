// src/versus/attack.ts
// 방해 보내기 버스. 쿨타임 + 지속시간만 관리한다.
// 점수를 직접 깎지 않고, 화면 효과(썩은과일/흔들림/안개)로만 방해한다.

export type AttackKind =
  | 'rotten'      // 썩은 과일 1개 (즉시 스폰)
  | 'power-pull'  // 파워 당기기 3초 (줄다리기)
  | 'fog'         // 안개 3초 (수학·사이먼·ABC·별자리)
  | 'dark'        // 먹별 1개 (즉시 스폰, 별잡기)
  | 'gift'        // 풍선 선물 1개 (즉시 스폰, 풍선)
  | 'rush'        // 좀비·레이저 가속 5초 (상대 속도 1.5배)
  | 'offbeat'     // 박자 단축 5초 (댄스 박자 1.8초→1.2초)
  | 'tiny'        // 타겟 축소 5초 (펀치, 상대 타겟 0.7배)
  | 'strict'      // 박수 판정 강화 5초 (박수, 합침 기준 0.3→0.2배율)
  | 'shake';      // 화면 흔들림 3초 (균형·파워, 집중 방해)

export interface Attack {
  kind: AttackKind;
  from: 'p1' | 'p2';
  msLeft: number;
}

const DUR: Record<AttackKind, number> = {
  rotten: 0, // 즉시 1개 스폰이라 지속 없음
  'power-pull': 3000,
  fog: 3000,
  dark: 0, // 즉시 1개 스폰이라 지속 없음
  gift: 0, // 즉시 1개 스폰이라 지속 없음
  rush: 5000,
  offbeat: 5000,
  tiny: 5000,
  strict: 5000,
  shake: 3000
};

export const ATTACK_COOL_MS = 5000;

export class AttackBus {
  // 상대에게 걸린 지속 효과
  onP1: Attack | null = null;
  onP2: Attack | null = null;
  private coolP1 = 0;
  private coolP2 = 0;
  // 즉시 스폰용 큐 (과일 듀얼 썩은과일 · 별잡기 먹별 · 풍선 선물)
  pendingRottenP1 = 0;
  pendingRottenP2 = 0;
  pendingDarkP1 = 0;
  pendingDarkP2 = 0;
  pendingGiftP1 = 0;
  pendingGiftP2 = 0;

  reset(): void {
    this.onP1 = null;
    this.onP2 = null;
    this.coolP1 = 0;
    this.coolP2 = 0;
    this.pendingRottenP1 = 0;
    this.pendingRottenP2 = 0;
    this.pendingDarkP1 = 0;
    this.pendingDarkP2 = 0;
    this.pendingGiftP1 = 0;
    this.pendingGiftP2 = 0;
  }

  canAttack(side: 'p1' | 'p2'): boolean {
    return side === 'p1' ? this.coolP1 <= 0 : this.coolP2 <= 0;
  }

  // from이 상대를 공격한다. 쿨타임 중이면 무시(false).
  send(kind: AttackKind, from: 'p1' | 'p2'): boolean {
    if (!this.canAttack(from)) return false;
    if (from === 'p1') this.coolP1 = ATTACK_COOL_MS;
    else this.coolP2 = ATTACK_COOL_MS;
    const target = from === 'p1' ? 'p2' : 'p1';
    if (kind === 'rotten') {
      if (target === 'p1') this.pendingRottenP1 += 1;
      else this.pendingRottenP2 += 1;
      return true;
    }
    if (kind === 'dark') {
      if (target === 'p1') this.pendingDarkP1 += 1;
      else this.pendingDarkP2 += 1;
      return true;
    }
    if (kind === 'gift') {
      if (target === 'p1') this.pendingGiftP1 += 1;
      else this.pendingGiftP2 += 1;
      return true;
    }
    const atk: Attack = { kind, from, msLeft: DUR[kind] };
    if (target === 'p1') this.onP1 = atk;
    else this.onP2 = atk;
    return true;
  }

  tick(dtMs: number): void {
    this.coolP1 = Math.max(0, this.coolP1 - dtMs);
    this.coolP2 = Math.max(0, this.coolP2 - dtMs);
    if (this.onP1) {
      this.onP1.msLeft -= dtMs;
      if (this.onP1.msLeft <= 0) this.onP1 = null;
    }
    if (this.onP2) {
      this.onP2.msLeft -= dtMs;
      if (this.onP2.msLeft <= 0) this.onP2 = null;
    }
  }

  takeRotten(side: 'p1' | 'p2'): number {
    if (side === 'p1') {
      const n = this.pendingRottenP1;
      this.pendingRottenP1 = 0;
      return n;
    }
    const n = this.pendingRottenP2;
    this.pendingRottenP2 = 0;
    return n;
  }

  takeDark(side: 'p1' | 'p2'): number {
    if (side === 'p1') {
      const n = this.pendingDarkP1;
      this.pendingDarkP1 = 0;
      return n;
    }
    const n = this.pendingDarkP2;
    this.pendingDarkP2 = 0;
    return n;
  }

  takeGift(side: 'p1' | 'p2'): number {
    if (side === 'p1') {
      const n = this.pendingGiftP1;
      this.pendingGiftP1 = 0;
      return n;
    }
    const n = this.pendingGiftP2;
    this.pendingGiftP2 = 0;
    return n;
  }
}
