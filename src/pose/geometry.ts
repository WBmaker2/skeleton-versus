// src/pose/geometry.ts
import type { Point, PoseFrame, Keypoint } from './types';

export function getByName(frame: PoseFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find((k) => k.name === name);
}

export function angleDeg(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const n1 = Math.hypot(v1x, v1y) || 1e-6;
  const n2 = Math.hypot(v2x, v2y) || 1e-6;
  const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function shoulderWidth(frame: PoseFrame): number {
  const l = getByName(frame, 'left_shoulder');
  const r = getByName(frame, 'right_shoulder');
  if (!l || !r) return 100;
  return Math.max(20, Math.hypot(l.x - r.x, l.y - r.y));
}

export function bodyCenterX(frame: PoseFrame): number {
  const names = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
  const xs = names
    .map((n) => getByName(frame, n)?.x)
    .filter((v): v is number => typeof v === 'number');
  if (xs.length === 0) return frame.width / 2;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// 손바닥 중심 추정: 팔꿈치→손목 방향으로 전완 길이의 35% 연장.
// 팔꿈치가 없으면 손목 위치 그대로 (기존 테스트·동작 호환).
export function palmOf(frame: PoseFrame, side: 'left' | 'right'): Point | null {
  const wrist = getByName(frame, `${side}_wrist`);
  if (!wrist || (wrist.score ?? 0) < 0.3) return null;
  const elbow = getByName(frame, `${side}_elbow`);
  if (!elbow || (elbow.score ?? 0) < 0.3) return { x: wrist.x, y: wrist.y };
  const dx = wrist.x - elbow.x;
  const dy = wrist.y - elbow.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const k = (0.35 * len) / len;
  return { x: wrist.x + dx * k, y: wrist.y + dy * k };
}
