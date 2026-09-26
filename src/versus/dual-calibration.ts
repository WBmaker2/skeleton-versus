// src/versus/dual-calibration.ts
// 2인 개별 보정: 카운트다운 동안 모은 좌/우 프레임을 각자 보정한다.
// 키·거리 차이로 손바닥 판정 반경이 달라지지 않게 과일 베기에 scale을 넘긴다.
// (스쿼트는 무릎 각도, 수학은 구역이라 scale이 필요 없다.)

import { calibrate } from '../calibration/calibrator';
import type { Calibration, PoseFrame } from '../pose/types';

export interface DualCalibration {
  p1: Calibration;
  p2: Calibration;
}

// 손 크기 보정 배율. 너무 작거나 크면 0.5~2로 묶는다.
export function clampScale(s: number): number {
  if (!Number.isFinite(s)) return 1;
  return Math.min(2, Math.max(0.5, s));
}

export function calibrateDual(leftFrames: PoseFrame[], rightFrames: PoseFrame[]): DualCalibration {
  // 프레임이 모자라면 calibrate([])가 기본값(scale 1)을 돌려준다.
  const p1 = calibrate(leftFrames);
  const p2 = calibrate(rightFrames);
  p1.scale = clampScale(p1.scale);
  p2.scale = clampScale(p2.scale);
  return { p1, p2 };
}
