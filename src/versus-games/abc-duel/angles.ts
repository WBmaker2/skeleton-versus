// src/versus-games/abc-duel/angles.ts
// 몸으로 글자 판정. 반쪽 화면에서는 X·A(다리 벌림)가 짤리므로 6종만 출제한다.
// 팔 각도(연속값) + 손 벌림(어깨너비 배수)으로 판정한다.

import type { Keypoint, PoseFrame } from '../../pose/types';

export type AbcTarget = 'T' | 'Y' | 'O' | 'L' | 'I' | 'K';

export const ABC_TARGETS: AbcTarget[] = ['T', 'Y', 'O', 'L', 'I', 'K'];

export interface Angles {
  leftArm: number;
  rightArm: number;
  // 어깨너비 배수로 정규화한 거리. 미측정(가림·화면 밖)이면 없음.
  handSpread?: number;
  // 손이 자기 어깨 반대편(몸 반대쪽)에 있으면 true. K의 가로지른 팔 판정용.
  leftHandCrossed?: boolean;
  rightHandCrossed?: boolean;
}

// 목표 팔 각도 (연속값, 단위: °).
// 0 = 팔을 몸통 옆에 내림, 90 = 수평으로 벌림, 180 = 머리 위로 쭉 뻗음.
export const TEMPLATES: Record<AbcTarget, { leftArm: number; rightArm: number }> = {
  T: { leftArm: 90, rightArm: 90 },
  Y: { leftArm: 135, rightArm: 135 },
  O: { leftArm: 160, rightArm: 160 },
  L: { leftArm: 90, rightArm: 0 },
  I: { leftArm: 0, rightArm: 0 },
  // K: 한 팔은 대각선 위(150), 다른 팔은 몸 앞을 가로질러 반대쪽 아래(40).
  K: { leftArm: 150, rightArm: 40 }
};

// K 반대 버전: 오른팔을 위로, 왼팔을 가로질러 아래로.
const K_UP_RIGHT = { leftArm: 40, rightArm: 150 };

// 성공 판정 임계값: 양팔 평균 유사도 0.6 (양팔 합쳐 ±36°까지 허용).
export const ABC_SIM_THRESHOLD = 0.6;

// 손 벌림 경계 (어깨너비 배수). 이상이면 '벌림', 미만이면 '모음'.
export const SPREAD_SPLIT = 1.3;

type SpreadNeed = 'together' | 'apart';

// Y·O는 손 벌림으로 나눈다 (Y 넓은 V / O 동그라미).
const POSE_NEEDS: Partial<Record<AbcTarget, { hand?: SpreadNeed }>> = {
  Y: { hand: 'apart' },
  O: { hand: 'together' }
};

function spreadMatches(value: number | undefined, need: SpreadNeed | undefined): boolean {
  if (need === undefined || value === undefined) return true;
  return need === 'apart' ? value >= SPREAD_SPLIT : value < SPREAD_SPLIT;
}

export function poseSimilarity(
  current: Angles,
  target: { leftArm: number; rightArm: number }
): number {
  const sims = [current.leftArm, current.rightArm].map((v, i) => {
    const t = i === 0 ? target.leftArm : target.rightArm;
    return Math.max(0, 1 - Math.abs(v - t) / 90);
  });
  return (sims[0] + sims[1]) / 2;
}

function armValue(sx: number, sy: number, wx: number, wy: number): number {
  // 어깨→손목 벡터의 수평 대비 올림각에 90을 더해 템플릿 스케일에 맞춘다.
  const deg = (Math.atan2(sy - wy, Math.abs(wx - sx)) * 180) / Math.PI;
  return Math.min(180, Math.max(0, 90 + deg));
}

const SPREAD_MIN_SCORE = 0.3;

export function anglesFromFrame(frame: PoseFrame): Angles {
  const by = new Map(frame.keypoints.map((k) => [k.name, k]));
  const arm = (side: 'left' | 'right'): number => {
    const s = by.get(`${side}_shoulder`);
    const w = by.get(`${side}_wrist`);
    if (!s || !w) return 0;
    return armValue(s.x, s.y, w.x, w.y);
  };
  const angles: Angles = { leftArm: arm('left'), rightArm: arm('right') };
  const ls = by.get('left_shoulder');
  const rs = by.get('right_shoulder');
  const sw = ls && rs ? Math.hypot(ls.x - rs.x, ls.y - rs.y) : 0;
  const spread = (a?: Keypoint, b?: Keypoint): number | undefined => {
    if (!a || !b || sw < 1) return undefined;
    if ((a.score ?? 0) < SPREAD_MIN_SCORE || (b.score ?? 0) < SPREAD_MIN_SCORE) return undefined;
    return Math.hypot(a.x - b.x, a.y - b.y) / sw;
  };
  const hand = spread(by.get('left_wrist'), by.get('right_wrist'));
  if (hand !== undefined) angles.handSpread = hand;
  const mid = ls && rs ? (ls.x + rs.x) / 2 : undefined;
  const crossed = (s?: Keypoint, w?: Keypoint): boolean | undefined => {
    if (!s || !w || mid === undefined) return undefined;
    if ((s.score ?? 0) < SPREAD_MIN_SCORE || (w.score ?? 0) < SPREAD_MIN_SCORE) return undefined;
    return (w.x - mid) * (s.x - mid) < 0;
  };
  const leftCrossed = crossed(by.get('left_shoulder'), by.get('left_wrist'));
  const rightCrossed = crossed(by.get('right_shoulder'), by.get('right_wrist'));
  if (leftCrossed !== undefined) angles.leftHandCrossed = leftCrossed;
  if (rightCrossed !== undefined) angles.rightHandCrossed = rightCrossed;
  return angles;
}

export function matchesTarget(current: Angles, target: AbcTarget): boolean {
  // K: 위로 든 팔 + 반대쪽으로 가로질러 내린 팔이 함께 있어야 실제 K 모양.
  if (target === 'K') {
    const upLeft =
      poseSimilarity(current, TEMPLATES.K) >= ABC_SIM_THRESHOLD &&
      current.rightHandCrossed === true;
    const upRight =
      poseSimilarity(current, K_UP_RIGHT) >= ABC_SIM_THRESHOLD &&
      current.leftHandCrossed === true;
    return upLeft || upRight;
  }
  if (poseSimilarity(current, TEMPLATES[target]) < ABC_SIM_THRESHOLD) return false;
  const need = POSE_NEEDS[target];
  if (!need) return true;
  return spreadMatches(current.handSpread, need.hand);
}

export function pickTarget(exclude?: AbcTarget): AbcTarget {
  const pool = ABC_TARGETS.filter((t) => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
