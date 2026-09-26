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
export function bothUp(frame: PoseFrame): boolean {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const raised = (w: typeof lw, s: typeof ls): boolean =>
    !!w && !!s && (w.score ?? 0) > 0.3 && (s.score ?? 0) > 0.3 && w.y < s.y - 10;
  return raised(lw, ls) && raised(rw, rs);
}
