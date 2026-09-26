// src/pose/mediapipe-dual.ts
// 2인 대전용 MediaPipe 어댑터. numPoses:2로 최대 2명을 돌려준다.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';

const LANDMARK_NAMES: Record<number, string> = {
  0: 'nose',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle'
};

export function landmarkName(i: number): string {
  return LANDMARK_NAMES[i] ?? `lm${i}`;
}

const POSE_TASK_LOCAL_URL = 'models/pose_landmarker_lite.task';
const POSE_TASK_CDN_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export class MediaPipeDualAdapter {
  name = 'mediapipe-dual';
  private landmarker: PoseLandmarker | null = null;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    const errors: unknown[] = [];
    for (const delegate of ['GPU', 'CPU'] as const) {
      for (const modelAssetPath of [POSE_TASK_LOCAL_URL, POSE_TASK_CDN_URL]) {
        try {
          this.landmarker = await PoseLandmarker.createFromOptions(
            vision as Parameters<typeof PoseLandmarker.createFromOptions>[0],
            { baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO', numPoses: 2 }
          );
          return;
        } catch (err) {
          console.warn(`[pose-dual] ${delegate} ${modelAssetPath} failed`, err);
          errors.push(err);
        }
      }
    }
    throw errors[errors.length - 1] ?? new Error('MediaPipe dual load failed');
  }

  async estimateDual(video: HTMLVideoElement): Promise<PoseFrame[]> {
    if (!this.landmarker) throw new Error('MediaPipe dual not loaded.');
    const res = this.landmarker.detectForVideo(video, performance.now());
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    return (res.landmarks ?? []).slice(0, 2).map((pts) => ({
      width: w,
      height: h,
      timestamp: performance.now(),
      keypoints: pts.map((p, i) => ({
        name: landmarkName(i),
        x: p.x * w,
        y: p.y * h,
        score: 1
      }))
    }));
  }

  async dispose(): Promise<void> {
    await this.landmarker?.close();
    this.landmarker = null;
  }
}

export async function loadDualEngine(): Promise<MediaPipeDualAdapter | null> {
  try {
    const dual = new MediaPipeDualAdapter();
    await dual.load();
    return dual;
  } catch (err) {
    console.warn('[pose-dual] load failed', err);
    return null;
  }
}
