// @vitest-environment happy-dom
// tests/pose-engine.test.ts
import { describe, expect, it } from 'vitest';
import { FakeEngine } from '../src/pose/fake-engine';
import type { PoseFrame } from '../src/pose/types';

describe('FakeEngine', () => {
  it('returns pushed frame from estimate', async () => {
    const eng = new FakeEngine();
    await eng.load();
    const frame: PoseFrame = { width: 640, height: 480, timestamp: 1, keypoints: [{ name: 'nose', x: 320, y: 240, score: 1 }] };
    eng.push(frame);
    const video = document.createElement('video');
    const out = await eng.estimate(video);
    expect(out.timestamp).toBe(1);
    expect(out.keypoints[0]?.name).toBe('nose');
  });
});
