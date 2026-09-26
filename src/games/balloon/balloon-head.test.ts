import { describe, expect, it } from 'vitest';
import { BalloonHead } from './balloon-head';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

function torso(x: number): Keypoint[] {
  return [
    kp('left_shoulder', x - 50, 100),
    kp('right_shoulder', x + 50, 100),
    kp('left_hip', x - 40, 200),
    kp('right_hip', x + 40, 200)
  ];
}

function oneBalloon(x: number, y: number) {
  return [{ x, y, vy: 60, alive: true, cool: 0, touched: false }];
}

describe('BalloonHead', () => {
  it('bumps balloon with head', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = oneBalloon(320, 100);
    const events = g.tick(frame([kp('nose', 320, 100), ...torso(320)]), 16);
    expect(events.some((e) => e.type === 'bump')).toBe(true);
    expect(g.hits).toBe(1);
  });
  it('bumps with the top of the head, not the face center', () => {
    const g = new BalloonHead();
    g.start();
    // 코(320, 200)·어깨너비 100 → 마스크 상단(이마)은 y=165.
    // 풍선 중심이 y=120이면 얼굴 중심과는 80px 떨어져 있지만
    // 풍선 아랫부분(165)이 이마에 닿아 헤딩으로 인정된다.
    g.balloons = oneBalloon(320, 120);
    const events = g.tick(frame([kp('nose', 320, 200), ...torso(320)]), 16);
    expect(events.some((e) => e.type === 'bump')).toBe(true);
    expect(g.hits).toBe(1);
  });
  it('does not double-count a single heading across frames', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = oneBalloon(320, 100);
    const head = frame([kp('nose', 320, 100), ...torso(320)]);
    g.tick(head, 16);
    // 머리를 풍선에 붙인 채로 여러 프레임이 지나도 1번으로 유지된다.
    // 풍선을 머리에 고정시켜 접촉 상태를 인위적으로 유지한다.
    for (let i = 0; i < 10; i++) {
      g.balloons[0].x = 320;
      g.balloons[0].y = 100;
      g.balloons[0].vy = 0;
      g.balloons[0].cool = 500;
      g.balloons[0].touched = true;
      g.tick(head, 16);
    }
    expect(g.hits).toBe(1);
  });
  it('re-arms after leaving the contact zone', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = oneBalloon(320, 100);
    const head = frame([kp('nose', 320, 100), ...torso(320)]);
    const away = frame([kp('nose', 320, 400), ...torso(320)]);
    g.tick(head, 16);
    expect(g.hits).toBe(1);
    // 멀어졌다가 쿨다운 이후 다시 대면 2번째로 인정된다.
    // 풍선은 위쪽에 두고 머리만 아래에 둬서 접촉권을 벗어난다.
    g.balloons[0].x = 320;
    g.balloons[0].y = 100;
    g.tick(away, 600);
    g.balloons[0].x = 320;
    g.balloons[0].y = 400;
    g.balloons[0].vy = 0;
    const events = g.tick(away, 16);
    expect(events.some((e) => e.type === 'bump')).toBe(true);
    expect(g.hits).toBe(2);
  });
  it('heads two balloons at once', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = [
      { x: 320, y: 100, vy: 60, alive: true, cool: 0, touched: false },
      { x: 330, y: 110, vy: 60, alive: true, cool: 0, touched: false }
    ];
    const events = g.tick(frame([kp('nose', 325, 105), ...torso(325)]), 16);
    expect(events.filter((e) => e.type === 'bump')).toHaveLength(2);
    expect(g.hits).toBe(2);
  });
  it('removes only the dropped balloon and keeps playing', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = [
      { x: 320, y: 600, vy: 60, alive: true, cool: 0, touched: false },
      { x: 200, y: 100, vy: 60, alive: true, cool: 0, touched: false }
    ];
    const events = g.tick(frame(torso(320)), 16);
    expect(events.some((e) => e.type === 'drop')).toBe(true);
    // 떨어진 풍선만 제거되고 남은 풍선으로 계속 플레이한다.
    expect(g.balloons).toHaveLength(1);
    expect(g.balloons[0].x).toBe(200);
  });
  it('adds a new balloon after the spawn interval while others remain', () => {
    const g = new BalloonHead();
    g.start();
    g.balloons = oneBalloon(100, -40);
    g.tick(frame(torso(320)), 1600);
    expect(g.balloons.length).toBe(2);
    const added = g.balloons[1];
    expect(added.x).toBeGreaterThanOrEqual(640 * 0.12);
    expect(added.x).toBeLessThanOrEqual(640 * 0.88);
    expect(added.y).toBeLessThanOrEqual(0);
    // 새 풍선은 기존 풍선과 일정 거리를 둔다.
    const dist = Math.hypot(g.balloons[0].x - added.x, g.balloons[0].y - added.y);
    expect(dist).toBeGreaterThanOrEqual(150);
  });
  it('caps simultaneous balloons at 3', () => {
    const g = new BalloonHead();
    g.start();
    // 낙하 제거를 막기 위해 매 주기마다 풍선을 위로 되돌린다.
    for (let i = 0; i < 5; i++) {
      for (const b of g.balloons) {
        b.y = -50;
        b.vy = 0;
      }
      g.tick(frame(torso(320)), 1500);
    }
    expect(g.balloons.length).toBeLessThanOrEqual(3);
    expect(g.balloons.length).toBe(3);
  });
});
