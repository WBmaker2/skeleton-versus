// src/pose/mediapipe-adapter.ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

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

// Self-hosted task bundle (public/models/). Falls back to the Google CDN
// when the local copy is missing, so ABC keeps working either way.
export const POSE_TASK_LOCAL_URL = 'models/pose_landmarker_lite.task';
const POSE_TASK_CDN_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

async function createLandmarker(
  vision: unknown,
  modelAssetPath: string,
  delegate: 'GPU' | 'CPU' = 'GPU'
): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(vision as Parameters<typeof PoseLandmarker.createFromOptions>[0], {
    baseOptions: { modelAssetPath, delegate },
    runningMode: 'VIDEO',
    numPoses: 1
  });
}

export class MediaPipeAdapter implements PoseEngine {
  name = 'mediapipe-pose';
  private landmarker: PoseLandmarker | null = null;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    // 시도 순서: (GPU, 로컬) → (GPU, CDN) → (CPU, 로컬) → (CPU, CDN).
    // GPU 델리게이트 실패 기기에서도 CPU로 반드시 로드되게 한다.
    const errors: unknown[] = [];
    for (const delegate of ['GPU', 'CPU'] as const) {
      for (const modelAssetPath of [POSE_TASK_LOCAL_URL, POSE_TASK_CDN_URL]) {
        try {
          this.landmarker = await createLandmarker(vision, modelAssetPath, delegate);
          return;
        } catch (err) {
          console.warn(`[pose] MediaPipe ${delegate} ${modelAssetPath} failed`, err);
          errors.push(err);
        }
      }
    }
    throw errors[errors.length - 1] ?? new Error('MediaPipe load failed');
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.landmarker) throw new Error('MediaPipe not loaded. Call load() first.');
    const res = this.landmarker.detectForVideo(video, performance.now());
    const pts = res.landmarks[0] ?? [];
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    return {
      width: w,
      height: h,
      timestamp: performance.now(),
      keypoints: pts.map((p, i) => ({
        name: landmarkName(i),
        // 원본 좌표 그대로 (CSS 쌍반전이 셀카 미러 담당, MoveNet과 동일).
        x: p.x * w,
        y: p.y * h,
        score: 1
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.landmarker?.close();
    this.landmarker = null;
  }
}
