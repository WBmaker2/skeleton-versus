// src/pose/fake-engine.ts
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

export class FakeEngine implements PoseEngine {
  name = 'fake';
  private last: PoseFrame = { width: 640, height: 480, timestamp: 0, keypoints: [] };
  async load(): Promise<void> {}
  push(frame: PoseFrame): void {
    this.last = frame;
  }
  async estimate(_video: HTMLVideoElement): Promise<PoseFrame> {
    return this.last;
  }
  async dispose(): Promise<void> {}
}
