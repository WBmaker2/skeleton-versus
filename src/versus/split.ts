// src/versus/split.ts
// 카메라 1대로 들어온 2명 포즈를 왼쪽(P1)/오른쪽(P2)으로 나눈다.
// 코(nose) x좌표 기준. 한 명만 보이면 그쪽만 Some, 다른 쪽은 null.
import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';

export interface SplitPoses {
  left: PoseFrame | null;
  right: PoseFrame | null;
  // 둘 다 보이는지 (false면 "둘 다 보이게" 안내 표시)
  bothVisible: boolean;
}

// 단일 포즈 엔진을 쓰던 기존 코드와 호환되게,
// 듀얼 배열(최대 2개)을 받아 좌우로 나눈다.
export function splitPoses(frames: PoseFrame[], width: number): SplitPoses {
  const valid = frames.filter((f) => f.keypoints.length >= 4).slice(0, 2);
  if (valid.length === 0) return { left: null, right: null, bothVisible: false };
  if (valid.length === 1) {
    const nose = getByName(valid[0], 'nose');
    const cx = nose?.x ?? width / 2;
    // 한 명이면 서 있는 쪽에 배치한다.
    if (cx < width / 2) return { left: valid[0], right: null, bothVisible: false };
    return { left: null, right: valid[0], bothVisible: false };
  }
  const ax = getByName(valid[0], 'nose')?.x ?? width / 2;
  const bx = getByName(valid[1], 'nose')?.x ?? width / 2;
  if (ax <= bx) return { left: valid[0], right: valid[1], bothVisible: true };
  return { left: valid[1], right: valid[0], bothVisible: true };
}

// 좌우 ID 튐 방지: 0.5초 스무딩용 간단 홀드.
// 직전 결과가 있으면 코가 중앙선을 살짝만 넘어선 경우 뒤집지 않는다.
export function splitStable(
  frames: PoseFrame[],
  width: number,
  prev: SplitPoses | null,
  marginPx = 40
): SplitPoses {
  const cur = splitPoses(frames, width);
  if (!prev || !cur.bothVisible || !prev.bothVisible) return cur;
  const prevGap = centerGap(prev, width);
  const curGap = centerGap(cur, width);
  // 중앙선 근처에서 왔다갔다하면 이전 유지.
  if (Math.abs(curGap) < marginPx && Math.abs(prevGap) >= Math.abs(curGap)) return prev;
  return cur;
}

function centerGap(s: SplitPoses, width: number): number {
  const mid = width / 2;
  const lx = s.left ? (getByName(s.left, 'nose')?.x ?? mid - 100) : mid - 100;
  const rx = s.right ? (getByName(s.right, 'nose')?.x ?? mid + 100) : mid + 100;
  return Math.min(Math.abs(lx - mid), Math.abs(rx - mid)) * (lx < mid && rx >= mid ? 1 : -1);
}
