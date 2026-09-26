// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { VersusLoop, type VersusSideGame } from './versus-loop';
import { AttackBus } from './attack';
import { ScoreBoard } from '../game/engine';
import type { GameEvent } from '../game/types';
import type { PoseFrame } from '../pose/types';
import type { MediaPipeDualAdapter } from '../pose/mediapipe-dual';

afterEach(() => {
  vi.unstubAllGlobals();
});

function dualFrames(): PoseFrame[] {
  const kp = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  const one = (cx: number): PoseFrame => ({
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      kp('nose', cx, 100),
      kp('left_shoulder', cx - 20, 200), kp('right_shoulder', cx + 20, 200),
      kp('left_wrist', cx - 30, 250), kp('right_wrist', cx + 30, 250)
    ]
  });
  return [one(160), one(480)];
}

function fakeSide(events: GameEvent[][]): VersusSideGame & { calls: number } {
  const side = {
    board: new ScoreBoard(),
    calls: 0,
    tick: (): GameEvent[] => {
      const out = events[side.calls] ?? [];
      side.calls += 1;
      return out;
    }
  };
  return side;
}

describe('VersusLoop celebrate', () => {
  it('slice 이벤트에 파티클이 생긴다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const engine = { estimateDual: async () => dualFrames() } as unknown as MediaPipeDualAdapter;
    const left = fakeSide([[{ type: 'slice', points: 10, label: 'P1 과일!' } as GameEvent]]);
    const right = fakeSide([]);
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 480;
    const loop = new VersusLoop({
      video: document.createElement('video'),
      canvas,
      engine,
      left,
      right,
      attacks: new AttackBus(),
      timeLimitSec: 60
    });
    loop.start();
    // 2프레임 구동 (두 번째에 dt가 생김)
    for (let i = 0; i < 2; i++) {
      const cb = frames[frames.length - 1];
      cb(1000 + i * 16);
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(left.calls).toBeGreaterThan(0);
    expect(loop.particleCount).toBeGreaterThan(0);
    loop.stop();
  });

  it('reduced-motion이면 파티클이 생기지 않는다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const engine = { estimateDual: async () => dualFrames() } as unknown as MediaPipeDualAdapter;
    const left = fakeSide([[{ type: 'slice', points: 10, label: 'P1 과일!' } as GameEvent]]);
    const right = fakeSide([]);
    const canvas = document.createElement('canvas');
    const loop = new VersusLoop({
      video: document.createElement('video'),
      canvas,
      engine,
      left,
      right,
      attacks: new AttackBus(),
      timeLimitSec: 60
    });
    loop.start();
    for (let i = 0; i < 2; i++) {
      const cb = frames[frames.length - 1];
      cb(2000 + i * 16);
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(left.calls).toBeGreaterThan(0);
    expect(loop.particleCount).toBe(0);
    loop.stop();
  });

  it('저fps가 이어지면 절전 모드로 전환·회복된다', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const engine = { estimateDual: async () => dualFrames() } as unknown as MediaPipeDualAdapter;
    const left = fakeSide([]);
    const right = fakeSide([]);
    const canvas = document.createElement('canvas');
    const loop = new VersusLoop({
      video: document.createElement('video'),
      canvas,
      engine,
      left,
      right,
      attacks: new AttackBus(),
      timeLimitSec: 3600
    });
    const flush = () => new Promise((r) => setTimeout(r, 0));
    loop.start();
    // 100ms 간격 40프레임 → fps 약 10 → 3초 저fps → 절전
    for (let i = 0; i < 40; i++) {
      frames[frames.length - 1](30000 + i * 100);
      await flush();
    }
    expect(loop.fps).toBeGreaterThan(0);
    expect(loop.fps).toBeLessThan(25);
    expect(loop.degraded).toBe(true);
    expect(loop.particleScale).toBe(0.5);
    // 16ms 간격 70프레임 → fps 회복 → 절전 해제
    for (let i = 0; i < 70; i++) {
      frames[frames.length - 1](40000 + i * 16);
      await flush();
    }
    expect(loop.fps).toBeGreaterThan(30);
    expect(loop.degraded).toBe(false);
    expect(loop.particleScale).toBe(1);
    loop.stop();
  });
});
