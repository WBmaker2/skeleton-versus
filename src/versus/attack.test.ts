import { describe, it, expect } from 'vitest';
import { AttackBus } from './attack';

describe('AttackBus', () => {
  it('쿨타임 동안 중복 공격 불가', () => {
    const bus = new AttackBus();
    expect(bus.send('rotten', 'p1')).toBe(true);
    expect(bus.send('rotten', 'p1')).toBe(false);
  });
  it('썩은 과일은 큐에 쌓인다', () => {
    const bus = new AttackBus();
    bus.send('rotten', 'p1');
    expect(bus.takeRotten('p2')).toBe(1);
    expect(bus.takeRotten('p2')).toBe(0);
  });
  it('안개는 3초 뒤 사라진다', () => {
    const bus = new AttackBus();
    bus.send('fog', 'p1');
    expect(bus.onP2?.kind).toBe('fog');
    bus.tick(3100);
    expect(bus.onP2).toBeNull();
  });
});
