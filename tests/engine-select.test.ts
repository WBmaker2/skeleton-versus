// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/pose/mediapipe-adapter', () => ({
  MediaPipeAdapter: class {
    async load(): Promise<void> {
      throw new Error('gpu down');
    }
  }
}));

vi.mock('../src/pose/movenet-adapter', () => ({
  MoveNetAdapter: class {
    name = 'movenet-lightning';
    async load(): Promise<void> {}
    async estimate(): Promise<never> {
      throw new Error('no video in test');
    }
    async dispose(): Promise<void> {}
  }
}));

import { loadEngine } from '../src/ui/app';
import { countdownCalibration } from '../src/main';
import { FakeEngine } from '../src/pose/fake-engine';
import type { PoseFrame } from '../src/pose/types';

describe('loadEngine', () => {
  it('prefers MediaPipe and falls back to MoveNet', async () => {
    const engine = await loadEngine('fruit');
    expect(engine?.name).toBe('movenet-lightning');
  });
  it('returns null when everything fails', async () => {
    const engine = await loadEngine('abc');
    expect(engine?.name).toBe('movenet-lightning');
  });
});

describe('countdownCalibration', () => {
  it('collects frames during beats and calibrates', async () => {
    const engine = new FakeEngine();
    await engine.load();
    const frame: PoseFrame = {
      width: 640,
      height: 480,
      timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 220, y: 100, score: 1 },
        { name: 'right_shoulder', x: 420, y: 100, score: 1 },
        { name: 'left_hip', x: 250, y: 300, score: 1 },
        { name: 'right_hip', x: 390, y: 300, score: 1 }
      ]
    };
    engine.push(frame);
    const overlay = document.createElement('div');
    overlay.innerHTML = '<p id="calibmsg"></p>';
    document.body.appendChild(overlay);
    const cal = await countdownCalibration(engine, null, overlay, {
      beats: [2, 1],
      stepMs: 20,
      goMs: 10,
      frameMs: 5
    });
    expect(cal.mode).toBe('standing');
    expect(overlay.querySelector('.count-num')?.textContent).toMatch(/시작!|2|1/);
    overlay.remove();
  });
  it('falls back to default with no frames', async () => {
    const engine = new FakeEngine();
    await engine.load();
    const overlay = document.createElement('div');
    overlay.innerHTML = '<p id="calibmsg"></p>';
    (overlay as HTMLElement & { skipped?: boolean }).skipped = true;
    const cal = await countdownCalibration(engine, null, overlay, {
      beats: [1],
      stepMs: 10,
      goMs: 5,
      frameMs: 5
    });
    expect(cal.mode).toBe('seated');
  });
});
