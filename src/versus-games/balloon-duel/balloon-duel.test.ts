import { describe, it, expect } from 'vitest';
import { BalloonDuelSide } from './balloon-duel';
import { SharedBalloonSky } from './balloon-sky';
import { AttackBus } from '../../versus/attack';
import type { PoseFrame } from '../../pose/types';

function headFrame(cx: number): PoseFrame {
  const k = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      k('nose', cx, 100),
      k('left_shoulder', cx - 20, 200), k('right_shoulder', cx + 20, 200)
    ]
  };
}

describe('BalloonDuelSide', () => {
  it('이마로 받으면 +5점', () => {
    const side = new BalloonDuelSide('p1', new AttackBus(), new SharedBalloonSky(3));
    side.start();
    // 머리 판정점(320, 65)에 풍선을 둔다
    side.balloons = [{ x: 320, y: 65, vy: 0, alive: true, cool: 0, touched: false }];
    const ev = side.tick(headFrame(320), 16);
    expect(ev.some((e) => e.type === 'bump')).toBe(true);
    expect(side.board.score).toBeGreaterThan(0);
  });
  it('떨어지면 자기 콤보만 끊긴다', () => {
    const bus = new AttackBus();
    const p1 = new BalloonDuelSide('p1', bus, new SharedBalloonSky(3));
    const p2 = new BalloonDuelSide('p2', bus, new SharedBalloonSky(3));
    p1.start(); p2.start();
    p1.balloons = [{ x: 100, y: 600, vy: 100, alive: true, cool: 0, touched: false }];
    const ev = p1.tick(headFrame(160), 16);
    expect(ev.some((e) => e.type === 'drop')).toBe(true);
    expect(p2.board.combo).toBe(0);
  });
  it('3콤보마다 풍선 선물이 상대에게 간다', () => {
    const bus = new AttackBus();
    const sky = new SharedBalloonSky(11);
    const p1 = new BalloonDuelSide('p1', bus, sky);
    p1.start();
    for (let i = 0; i < 3; i++) {
      p1.balloons = [{ x: 160, y: 65, vy: 0, alive: true, cool: 0, touched: false }];
      p1.tick(headFrame(160), 16);
    }
    expect(bus.pendingGiftP2).toBe(1);
  });
  it('선물을 받으면 내 화면에 풍선이 는다', () => {
    const bus = new AttackBus();
    const p2 = new BalloonDuelSide('p2', bus, new SharedBalloonSky(11));
    p2.start();
    bus.send('gift', 'p1');
    const before = p2.balloons.length;
    p2.tick(headFrame(480), 1500);
    expect(p2.balloons.length).toBeGreaterThan(before);
  });
  it('양쪽 스폰 위치가 가운데선 대칭이다', () => {
    const bus = new AttackBus();
    const sky = new SharedBalloonSky(5);
    const p1 = new BalloonDuelSide('p1', bus, sky);
    const p2 = new BalloonDuelSide('p2', bus, sky);
    p1.start(); p2.start();
    for (let i = 0; i < 10; i++) {
      p1.balloons = [];
      p2.balloons = [];
      p1.spawn(640);
      p2.spawn(640);
      const b1 = p1.balloons[p1.balloons.length - 1];
      const b2 = p2.balloons[p2.balloons.length - 1];
      if (!b1 || !b2) continue; // 거리 충돌로 건너뛴 라운드
      expect(b1.x + b2.x).toBeCloseTo(640, 6);
    }
  });
});
