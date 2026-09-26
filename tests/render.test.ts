// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { drawSkeleton } from '../src/ui/renderer';
import type { PoseFrame } from '../src/pose/types';

function frame(): PoseFrame {
  const kp = (name: string, x: number, y: number) => ({ name, x, y, score: 1 });
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      kp('nose', 320, 100),
      kp('left_shoulder', 280, 200), kp('right_shoulder', 360, 200),
      kp('left_elbow', 260, 260), kp('right_elbow', 380, 260),
      kp('left_wrist', 250, 320), kp('right_wrist', 390, 320),
      kp('left_hip', 290, 340), kp('right_hip', 350, 340),
      kp('left_knee', 290, 420), kp('right_knee', 350, 420),
      kp('left_ankle', 290, 470), kp('right_ankle', 350, 470)
    ]
  };
}

function stubCanvas(): { canvas: HTMLCanvasElement; calls: string[] } {
  const calls: string[] = [];
  const fn = (name: string) => (..._args: unknown[]): undefined => {
    calls.push(name);
    return undefined;
  };
  const ctx = new Proxy({}, {
    get: (_t, p) => fn(String(p)),
    set: () => true
  }) as unknown as CanvasRenderingContext2D;
  const canvas = {
    getContext: () => ctx,
    width: 640,
    height: 480
  } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

describe('drawSkeleton', () => {
  it('draws links and both palm markers without throwing', () => {
    const { canvas, calls } = stubCanvas();
    expect(() => drawSkeleton(canvas, frame())).not.toThrow();
    expect(calls).toContain('moveTo');
    expect(calls).toContain('lineTo');
    expect(calls).toContain('arc');
  });
  it('skips low-score keypoints', () => {
    const f = frame();
    f.keypoints.forEach((k) => { k.score = 0; });
    const { canvas, calls } = stubCanvas();
    expect(() => drawSkeleton(canvas, f)).not.toThrow();
    expect(calls).not.toContain('lineTo');
  });
});
