// src/versus/pose-moves.ts
// 손목 높이 패턴 분류 (사이먼·댄스 대전 공용). 어깨너비 기준 상대 좌표라
// 카메라 거리·해상도에 영향받지 않는다.
// 겹칠 수 있는 자세는 위에서부터 판정한다:
// 동그라미→Y→T→박수→허리손→머리손→양손→왼손→오른손→내리기(기본).

import type { Keypoint, PoseFrame } from '../pose/types';
import { getByName, shoulderWidth } from '../pose/geometry';

export type PoseMove =
  | 'left' | 'right' | 'both' | 'down'
  | 't' | 'y' | 'circle' | 'clap' | 'hips' | 'head';

export const MOVE_KR: Record<PoseMove, string> = {
  left: '왼손',
  right: '오른손',
  both: '양손',
  down: '내리기',
  t: 'T자세',
  y: 'Y자세',
  circle: '동그라미',
  clap: '박수',
  hips: '허리손',
  head: '머리손'
};

function present(k: Keypoint | undefined): k is Keypoint {
  return !!k && (k.score ?? 0) > 0.3;
}

export function wristPattern(frame: PoseFrame): PoseMove {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const lh = getByName(frame, 'left_hip');
  const rh = getByName(frame, 'right_hip');
  const nose = getByName(frame, 'nose');
  const sw = shoulderWidth(frame);
  const up = (w: typeof lw, s: typeof ls): boolean =>
    present(w) && present(s) && w.y < s.y - 20;

  if (present(lw) && present(rw) && present(ls) && present(rs)) {
    const midY = (ls.y + rs.y) / 2;
    const togetherHigh =
      Math.abs(lw.x - rw.x) < 0.7 * sw &&
      lw.y < midY - 0.5 * sw && rw.y < midY - 0.5 * sw;
    if (up(lw, ls) && up(rw, rs) && togetherHigh) return 'circle';
    if (up(lw, ls) && up(rw, rs) && Math.abs(lw.x - rw.x) > 1.6 * sw) return 'y';
    const levelL = Math.abs(lw.y - ls.y) < 0.4 * sw && Math.abs(lw.x - ls.x) > 0.6 * sw;
    const levelR = Math.abs(rw.y - rs.y) < 0.4 * sw && Math.abs(rw.x - rs.x) > 0.6 * sw;
    if (levelL && levelR) return 't';
  }
  if (present(lw) && present(rw) && present(ls) && present(rs) && present(lh) && present(rh)) {
    const chestTop = (ls.y + rs.y) / 2;
    const chestBot = (lh.y + rh.y) / 2;
    const atChest = (w: Keypoint): boolean => w.y > chestTop && w.y < chestBot;
    if (Math.abs(lw.x - rw.x) < 0.5 * sw && atChest(lw) && atChest(rw)) return 'clap';
    const atHip = (w: Keypoint, h: Keypoint): boolean => Math.abs(w.y - h.y) < 0.4 * sw;
    if (atHip(lw, lh) && atHip(rw, rh) && Math.abs(lw.x - rw.x) > 0.8 * sw) return 'hips';
  }
  if (present(nose)) {
    const nearHead = (w: typeof lw): boolean =>
      present(w) &&
      Math.abs(w.x - nose.x) < 0.45 * sw &&
      Math.abs(w.y - nose.y) < 0.45 * sw;
    if (nearHead(lw) || nearHead(rw)) return 'head';
  }
  const l = up(lw, ls);
  const r = up(rw, rs);
  if (l && r) return 'both';
  if (l) return 'left';
  if (r) return 'right';
  return 'down';
}

// 양손 완화 판정 (사이먼 전용): 양쪽 손목이 각자 어깨보다 10px 이상 위면
// 모으거나 벌려도 양손으로 인정한다.
export function bothUp(frame: PoseFrame): boolean {  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const raised = (w: typeof lw, s: typeof ls): boolean =>
    !!w && !!s && (w.score ?? 0) > 0.3 && (s.score ?? 0) > 0.3 && w.y < s.y - 10;
  return raised(lw, ls) && raised(rw, rs);
}

export interface TrackedPoint {
  x: number;
  y: number;
}

// 화면상 이동 속도 (어깨너비/s). 카메라 거리가 달라도 공정하게 비교된다.
// 펀치·발차기 같은 타격 판정용.
export function pointSpeed(
  prev: TrackedPoint | null,
  cur: TrackedPoint | null,
  dtMs: number,
  shoulderWidth: number
): number {
  if (!prev || !cur || dtMs <= 0 || shoulderWidth < 1) return 0;
  return Math.hypot(cur.x - prev.x, cur.y - prev.y) / shoulderWidth / (dtMs / 1000);
}

// 타격 판정용 최근 궤적 (500ms 창). 손을 가만히 둔 떨림(수 px)은 거리로
// 걸러내고, 휘두른 경우만 인정한다.
export interface TimedTrailPoint extends TrackedPoint {
  ageMs: number;
}

export const SWIPE_TRAIL_MS = 500;

export function pushTimedTrail(
  trail: TimedTrailPoint[],
  x: number,
  y: number,
  dtMs: number,
  windowMs: number = SWIPE_TRAIL_MS
): void {
  for (const p of trail) p.ageMs += dtMs;
  trail.push({ x, y, ageMs: 0 });
  while (trail.length > 0 && trail[0].ageMs > windowMs) trail.shift();
  if (trail.length > 30) trail.splice(0, trail.length - 30);
}

export function recentTravelRatio(
  trail: readonly TimedTrailPoint[],
  cur: TrackedPoint | null,
  sw: number
): number {
  if (!cur || sw < 1 || trail.length === 0) return 0;
  let max = 0;
  for (const p of trail) {
    const d = Math.hypot(cur.x - p.x, cur.y - p.y);
    if (d > max) max = d;
  }
  return max / sw;
}
