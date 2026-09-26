// src/pose/pose-engine.ts
import type { PoseFrame } from './types';

export interface PoseEngine {
  name: string;
  load(): Promise<void>;
  estimate(video: HTMLVideoElement): Promise<PoseFrame>;
  dispose(): Promise<void>;
}
