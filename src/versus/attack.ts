// src/versus/attack.ts
// 방해 보내기 버스. 쿨타임 + 지속시간만 관리한다.
// 점수를 직접 깎지 않고, 화면 효과(썩은과일/흔들림/안개)로만 방해한다.

export type AttackKind = 'rotten' | 'power-pull' | 'fog';

export interface Attack {
  kind: AttackKind;
  from: 'p1' | 'p2';
  msLeft: number;
}

const DUR: Record<AttackKind, number> = {
  rotten: 0, // 즉시 1개 스폰이라 지속 없음
  'power-pull': 3000,
  fog: 3000
};

export const ATTACK_COOL_MS = 5000;

export class AttackBus {
  // 상대에게 걸린 지속 효과
  onP1: Attack | null = null;
  onP2: Attack | null = null;
  private coolP1 = 0;
  private coolP2 = 0;
  // 즉시 스폰용 큐 (과일 듀얼 썩은과일)
  pendingRottenP1 = 0;
  pendingRottenP2 = 0;

  reset(): void {
    this.onP1 = null;
    this.onP2 = null;
    this.coolP1 = 0;
    this.coolP2 = 0;
    this.pendingRottenP1 = 0;
    this.pendingRottenP2 = 0;
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
}
