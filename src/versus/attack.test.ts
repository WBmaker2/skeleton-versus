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
  it('먹별은 큐에 쌓인다', () => {
    const bus = new AttackBus();
    bus.send('dark', 'p2');
    expect(bus.takeDark('p1')).toBe(1);
    expect(bus.takeDark('p1')).toBe(0);
  });
  it('풍선 선물은 큐에 쌓인다', () => {
    const bus = new AttackBus();
    bus.send('gift', 'p1');
    expect(bus.takeGift('p2')).toBe(1);
    expect(bus.takeGift('p2')).toBe(0);
  });
  it('지속형 방해 시간을 지킨다 (rush 5초·offbeat 5초)', () => {
    const bus2 = new AttackBus();
    bus2.send('rush', 'p1');
    bus2.tick(4900);
    expect(bus2.onP2?.kind).toBe('rush');
    bus2.tick(200);
    expect(bus2.onP2).toBeNull();
    const bus3 = new AttackBus();
    bus3.send('offbeat', 'p2');
    bus3.tick(4900);
    expect(bus3.onP1?.kind).toBe('offbeat');
    bus3.tick(200);
    expect(bus3.onP1).toBeNull();
  });
});
