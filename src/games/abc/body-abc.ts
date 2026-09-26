// src/games/abc/body-abc.ts
import type { Keypoint, PoseFrame, PoseMode } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawLabel, drawPoseGuide } from '../../ui/renderer';

export type AbcTarget = 'T' | 'Y' | 'O' | 'L' | 'I' | 'K' | 'X' | 'A';

export interface Angles {
  leftArm: number;
  rightArm: number;
  torso: number;
  // 어깨너비 배수로 정규화한 거리. 미측정(가림·화면 밖)이면 없음.
  handSpread?: number;
  legSpread?: number;
  // 손이 자기 어깨 반대편(몸 반대쪽)에 있으면 true. K의 가로지른 팔 판정용.
  leftHandCrossed?: boolean;
  rightHandCrossed?: boolean;
}

// 목표 팔 각도 (연속값, 단위: °).
// 0 = 팔을 몸통 옆에 내림, 90 = 수평으로 벌림, 180 = 머리 위로 쭉 뻗음.
// T·Y는 45° 차이로 벌려 두어 구별된다 (예전 170/140은 3단계 양자화에 묻혀
// 수평 팔이 Y를 통과시키는 원인이었다).
export const TEMPLATES: Record<AbcTarget, Angles> = {
  T: { leftArm: 90, rightArm: 90, torso: 90 },
  Y: { leftArm: 135, rightArm: 135, torso: 90 },
  O: { leftArm: 160, rightArm: 160, torso: 90 },
  L: { leftArm: 90, rightArm: 0, torso: 90 },
  I: { leftArm: 0, rightArm: 0, torso: 90 },
  // K: 한 팔은 대각선 위(150), 다른 팔은 몸 앞을 가로질러 반대쪽 아래(40).
  // 두 대각선이 같은 쪽으로 모여야 실제 K처럼 보이므로, 내린 팔의 손이
  // 몸 반대편까지 가로질러야 인정한다 (아래 K 판정 참고).
  K: { leftArm: 150, rightArm: 40, torso: 90 },
  // X·A는 양팔 대각선 위라 팔 각도만으로는 Y·O와 겹친다. 손·다리 벌림으로 나눈다.
  X: { leftArm: 150, rightArm: 150, torso: 90 },
  A: { leftArm: 160, rightArm: 160, torso: 90 }
};

// K 반대 버전: 오른팔을 위로, 왼팔을 가로질러 아래로.
const K_UP_RIGHT: Angles = { leftArm: 40, rightArm: 150, torso: 90 };

// 성공 판정 임계값: 양팔 평균 유사도 0.6 (양팔 합쳐 ±36°까지 허용, 예전 0.8보다 완화).
// T·Y 교차 유사도는 0.5라서 구별은 유지된다.
export const ABC_SIM_THRESHOLD = 0.6;

// 손·다리 벌림 경계 (어깨너비 배수). 이 값 이상이면 '벌림', 미만이면 '모음'.
// 서 있는 자연스러운 자세(발 어깨너비 정도)는 '모음'으로 넉넉하게 본다.
export const SPREAD_SPLIT = 1.3;

type SpreadNeed = 'together' | 'apart';

// 팔 각도만으로 구별되지 않는 짝을 손·다리 벌림으로 나눈다.
//  - 손 모음: O(동그라미)·A(머리 위 맞대기) / 손 벌림: Y(넓은 V)·X(점핑잭)
//  - 다리 모음: Y·O / 다리 벌림: X·A
const POSE_NEEDS: Partial<Record<AbcTarget, { hand?: SpreadNeed; legs?: SpreadNeed }>> = {
  Y: { hand: 'apart', legs: 'together' },
  O: { hand: 'together', legs: 'together' },
  X: { hand: 'apart', legs: 'apart' },
  A: { hand: 'together', legs: 'apart' }
};

function spreadMatches(value: number | undefined, need: SpreadNeed | undefined): boolean {
  // 조건이 없거나 측정이 안 됐으면 통과시킨다 (앉음 모드·부분 가림 배려).
  if (need === undefined || value === undefined) return true;
  return need === 'apart' ? value >= SPREAD_SPLIT : value < SPREAD_SPLIT;
}

const ARM_KEYS = ['leftArm', 'rightArm'] as const;

export function poseSimilarity(current: Angles, target: Angles): number {
  // 팔만 비교한다. torso는 추정기가 항상 90을 반환하는 상수라
  // 평균에 넣으면 팔 차이가 희석되어 T·Y가 헷갈린다.
  const sims = ARM_KEYS.map((k) => {
    const diff = Math.abs((current[k] ?? 0) - target[k]);
    return Math.max(0, 1 - diff / 90);
  });
  return sims.reduce((a, b) => a + b, 0) / sims.length;
}

function armValue(sx: number, sy: number, wx: number, wy: number): number {
  // 어깨→손목 벡터의 수평 대비 올림각(-90=내림 ~ +90=올림)에 90을 더해
  // 템플릿 스케일(0=내림, 90=수평, 180=올림)에 맞춘다.
  const deg = (Math.atan2(sy - wy, Math.abs(wx - sx)) * 180) / Math.PI;
  return Math.min(180, Math.max(0, 90 + deg));
}

// 손·다리 벌림을 재는 최소 신뢰도. 발목은 가림이 잦아 낮은 값만 걸러낸다.
const SPREAD_MIN_SCORE = 0.3;

export function anglesFromFrame(frame: PoseFrame): Angles {
  // 연속 각도 추정: 카메라 거리·해상도에 영향받는 px 임계값 대신 각도를 쓴다.
  // 진짜 T(수평)는 90 근처, 진짜 Y(대각선 위)는 135 근처로 나와 서로 구별된다.
  const by = new Map(frame.keypoints.map((k) => [k.name, k]));
  const arm = (side: 'left' | 'right'): number => {
    const s = by.get(`${side}_shoulder`);
    const w = by.get(`${side}_wrist`);
    // 한쪽이 안 보이면 팔 내림(0)으로 보고 보수적으로 실패시킨다.
    // (예전 기본값 90은 관절이 없어도 T를 통과시키는 구멍이었다)
    if (!s || !w) return 0;
    return armValue(s.x, s.y, w.x, w.y);
  };
  const angles: Angles = { leftArm: arm('left'), rightArm: arm('right'), torso: 90 };
  const ls = by.get('left_shoulder');
  const rs = by.get('right_shoulder');
  const shoulderWidth = ls && rs ? Math.hypot(ls.x - rs.x, ls.y - rs.y) : 0;
  const spread = (a?: Keypoint, b?: Keypoint): number | undefined => {
    if (!a || !b || shoulderWidth < 1) return undefined;
    if (a.score < SPREAD_MIN_SCORE || b.score < SPREAD_MIN_SCORE) return undefined;
    return Math.hypot(a.x - b.x, a.y - b.y) / shoulderWidth;
  };
  const hand = spread(by.get('left_wrist'), by.get('right_wrist'));
  const leg = spread(by.get('left_ankle'), by.get('right_ankle'));
  if (hand !== undefined) angles.handSpread = hand;
  if (leg !== undefined) angles.legSpread = leg;
  // 가로지른 손: 손목이 자기 어깨와 몸 중심선 반대편에 있으면 true.
  // 좌우 기준을 하드코딩하지 않고 어깨 위치에서 상대적으로 구해
  // 카메라 방향(원본/미러)에 상관없이 동작한다.
  const mid = ls && rs ? (ls.x + rs.x) / 2 : undefined;
  const crossed = (s?: Keypoint, w?: Keypoint): boolean | undefined => {
    if (!s || !w || mid === undefined) return undefined;
    if (s.score < SPREAD_MIN_SCORE || w.score < SPREAD_MIN_SCORE) return undefined;
    return (w.x - mid) * (s.x - mid) < 0;
  };
  const leftCrossed = crossed(by.get('left_shoulder'), by.get('left_wrist'));
  const rightCrossed = crossed(by.get('right_shoulder'), by.get('right_wrist'));
  if (leftCrossed !== undefined) angles.leftHandCrossed = leftCrossed;
  if (rightCrossed !== undefined) angles.rightHandCrossed = rightCrossed;
  return angles;
}

export class BodyABC implements Game {
  id = 'abc';
  board = new ScoreBoard();
  mode: PoseMode = 'standing';
  // 상단에 문제 텍스트(목표 글자+가이드)가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  target: AbcTarget = 'T';
  holdMs = 0;
  private running = false;
  private readonly allTargets: AbcTarget[] = ['T', 'Y', 'O', 'L', 'I', 'K', 'X', 'A'];

  // 서서 할 때만 다리 벌림(X·A)이 의미가 있어 앉음 모드에서는 X·A를 출제하지 않는다.
  get availableTargets(): AbcTarget[] {
    return this.mode === 'seated'
      ? this.allTargets.filter((t) => t !== 'X' && t !== 'A')
      : this.allTargets;
  }

  // 랜덤 출제: 매번 무작위로 고르고, 바로 직전 문제와 겹치지 않게 후보에서 제외한다.
  private pickRandomTarget(exclude?: AbcTarget): AbcTarget {
    const pool = this.availableTargets.filter((l) => l !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.target = this.pickRandomTarget();
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, _height: number): void {
    drawLabel(ctx, this.target, width / 2, 78, 88);
    drawBar(ctx, width / 2 - 130, 136, 260, 14, this.holdMs / 1000, '#dfff00');
    // 목표 스켈레톤 예시: 오른쪽 위 패널에 막대인간 가이드를 함께 보여준다.
    // 글자만으로는 모양을 알기 어려우니, 코드로 그리는 벡터 가이드로 보완한다.
    const gw = 140;
    const gh = 180;
    const gx = Math.max(8, width - gw - 16);
    drawPoseGuide(ctx, this.target, gx, 16, gw, gh);
  }
  // 팔 유사도와 손·다리 벌림 조건을 모두 통과해야 그 글자로 인정한다.
  matches(current: Angles, target: AbcTarget): boolean {
    // K: 위로 든 팔 + 반대쪽으로 가로질러 내린 팔이 함께 있어야 실제 K 모양.
    // 한 손만 올리고 다른 손을 그냥 내린 자세는 K로 인정하지 않는다.
    if (target === 'K') {
      const upLeft =
        poseSimilarity(current, TEMPLATES.K) >= ABC_SIM_THRESHOLD &&
        current.rightHandCrossed === true;
      const upRight =
        poseSimilarity(current, K_UP_RIGHT) >= ABC_SIM_THRESHOLD &&
        current.leftHandCrossed === true;
      return upLeft || upRight;
    }
    const sim = poseSimilarity(current, TEMPLATES[target]);
    if (sim < ABC_SIM_THRESHOLD) return false;
    const need = POSE_NEEDS[target];
    if (!need) return true;
    if (!spreadMatches(current.handSpread, need.hand)) return false;
    // 앉음 모드에서는 다리를 보지 않는다 (도움말: 앉아서 할 때는 상체 모양만 봐요).
    if (this.mode === 'standing' && !spreadMatches(current.legSpread, need.legs)) return false;
    return true;
  }
  tickAngles(current: Angles, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    if (this.matches(current, this.target)) {
      this.holdMs += dtMs;
      if (this.holdMs > 1000) {
        const done = this.target;
        this.holdMs = 0;
        this.target = this.pickRandomTarget(done);
        this.board.comboHit();
        this.board.add(20);
        return [{ type: 'pose-ok', points: 20, label: `${done} 완성!` }];
      }
      return [];
    }
    this.holdMs = 0;
    return [];
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    return this.tickAngles(anglesFromFrame(frame), dtMs);
  }
}
