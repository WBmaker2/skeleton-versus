// src/ui/renderer.ts
// 대전용 스켈레톤 그리기. 카메라 영상 위에 뼈대+손 마커를 겹친다.
import type { PoseFrame } from '../pose/types';
import { palmOf } from '../pose/geometry';

const LINKS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#22d3ee';
  for (const [a, b] of LINKS) {
    const p = byName.get(a);
    const q = byName.get(b);
    if (!p || !q || (p.score ?? 0) < 0.3 || (q.score ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  // 손 마커: 베기 판정점(손바닥 중심)을 동그라미로 표시.
  // 양손 동일: 과일 베기 등 양손을 동등하게 쓰는 게임에서
  // 한쪽만 강조하면 다른 쪽 손이 안 보이는 착시가 생긴다.
  // 노랑 이중 링으로 멀리서도 식별 (WCAG 1.4.1: 모양 단서).
  for (const side of ['left', 'right'] as const) {
    const w = palmOf(frame, side);
    if (!w) continue;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#22303c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#dfff00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
