// src/pose/movenet-adapter.ts
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

const NAMES = ['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'] as const;

// Self-hosted model (public/models/movenet/). Relative path so it works
// under any base (localhost, gh-pages project path). Served + precached
// with the app, so TFHub outages or school firewalls can't break loading.
export const MOVENET_LOCAL_URL = 'models/movenet/model.json';

export class MoveNetAdapter implements PoseEngine {
  name = 'movenet-lightning';
  private detector: poseDetection.PoseDetector | null = null;

  async load(): Promise<void> {
    // 시도 순서: (현재 백엔드, 로컬) → (현재 백엔드, CDN) → (CPU, 로컬) → (CPU, CDN).
    // WebGL 초기화 실패 기기에서도 CPU로 반드시 로드되게 한다.
    const errors: unknown[] = [];
    for (const backend of [tf.getBackend(), 'cpu']) {
      try {
        if (tf.getBackend() !== backend) {
          await tf.setBackend(backend);
          await tf.ready();
        }
        try {
          this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            modelUrl: MOVENET_LOCAL_URL
          });
          return;
        } catch (err) {
          console.warn(`[pose] MoveNet local failed on ${backend}, trying CDN`, err);
          errors.push(err);
        }
        this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
        return;
      } catch (err) {
        console.warn(`[pose] MoveNet failed on ${backend}`, err);
        errors.push(err);
      }
    }
    throw errors[errors.length - 1] ?? new Error('MoveNet load failed');
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.detector) throw new Error('MoveNet not loaded. Call load() first.');
    // flipHorizontal: false — CSS가 비디오·캔버스를 이미 거울 반전시키므로,
    // 모델 좌표까지 뒤집으면 이중 반전이 되어 몸과 반대로 움직인다.
    const poses = await this.detector.estimatePoses(video, { flipHorizontal: false });
    const kp = poses[0]?.keypoints ?? [];
    return {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      timestamp: performance.now(),
      keypoints: kp.map((k, i) => ({
        name: k.name ?? NAMES[i] ?? `p${i}`,
        x: k.x,
        y: k.y,
        score: k.score ?? 0
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.detector?.dispose();
    this.detector = null;
  }
}
