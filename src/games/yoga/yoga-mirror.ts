import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { anglesFromFrame, poseSimilarity, SPREAD_SPLIT, type Angles } from '../abc';
import { drawBar, drawLabel, drawYogaGuide, type YogaGuidePose } from '../../ui/renderer';

export type SpreadNeed = 'together' | 'apart';

export interface YogaPose {
  name: YogaGuidePose;
  angles: Angles;
  // 손 모음(합장·나무)·손 벌림(산·만세), 다리 모음·벌림(전사·삼각) 조건.
  // 조건이 없거나 측정이 안 됐으면(앉음·부분 가림) 통과시킨다.
  hand?: SpreadNeed;
  // 손 벌림 판정 기준(어깨너비 배수). 없으면 SPREAD_SPLIT(1.3).
  handSplit?: number;
  legs?: SpreadNeed;
  // 좌우 뒤집힌 자세도 인정할 때 (삼각: 어느 쪽 팔을 올려도 됨).
  mirrorAngles?: Angles;
}

// 성공 판정 임계값: 양팔 평균 유사도 0.6 (양팔 합쳐 ±36°까지 허용, 몸으로 ABC와 동일).
// 삐뚤빼뚤해도 통과하도록 예전 0.7보다 완화. 가까울 수 있는 짝(만세/나무·산/합장)은
// 손 모음·벌림 조건으로 구별되므로 판정이 헷갈리지 않는다.
export const YOGA_SIM_THRESHOLD = 0.6;

// 쉬운 순서대로: 산→전사→만세→합장→삼각→나무. 3초씩 버티면 다음으로 넘어간다.
//  - 산: 차렷 (팔 내림+다리 모음)
//  - 전사: 실제 전사2번 (양팔 수평 T자+다리 벌림)
//  - 만세: 양팔 대각선 위+손 벌림+다리 모음 (우르드바 하스타사나)
//  - 합장: 가슴 앞 손 모음+다리 모음 (안잘리 무드라)
//  - 삼각: 한 팔 위+한 팔 아래+다리 벌림 (좌우 어느 쪽이든 인정)
//  - 나무: 양손 머리 위 모음+다리 모음 (브륵사사나 팔 모양)
export const YOGA_POSES: YogaPose[] = [
  // 산은 다리를 보지 않는다 (차렷이면 되며, 전사·삼각 뒤에 발을 벌린 채로 있어도 통과).
  // 손은 몸통에 붙여 내려도 통과되게 벌림 기준을 0.8배로 완화 (합장 0.2~0.5와는 구별됨).
  { name: '산', angles: { leftArm: 15, rightArm: 15, torso: 90 }, hand: 'apart', handSplit: 0.8 },
  { name: '전사', angles: { leftArm: 90, rightArm: 90, torso: 90 }, legs: 'apart' },
  { name: '만세', angles: { leftArm: 135, rightArm: 135, torso: 90 }, hand: 'apart', legs: 'together' },
  { name: '합장', angles: { leftArm: 50, rightArm: 50, torso: 90 }, hand: 'together', legs: 'together' },
  {
    name: '삼각',
    angles: { leftArm: 150, rightArm: 10, torso: 90 },
    mirrorAngles: { leftArm: 10, rightArm: 150, torso: 90 },
    legs: 'apart'
  },
  { name: '나무', angles: { leftArm: 160, rightArm: 160, torso: 90 }, hand: 'together', legs: 'together' }
];

function spreadMatches(value: number | undefined, need: SpreadNeed | undefined, split = SPREAD_SPLIT): boolean {
  // 조건이 없거나 측정이 안 됐으면 통과시킨다 (앉음 모드·부분 가림 배려).
  if (need === undefined || value === undefined) return true;
  return need === 'apart' ? value >= split : value < split;
}

// 요가 거울: 자세를 3초 버티기. 균형·자세교정.
export class YogaMirror implements Game {
  id = 'yoga';
  // 상단에 목표 자세(글자+스켈레톤 가이드)가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  pose: YogaPose = YOGA_POSES[0];
  board = new ScoreBoard();
  completed = 0;
  holdMs = 0;
  private running = false;
  private oi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.completed = 0;
    this.oi = 0;
    this.pose = YOGA_POSES[0];
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, `${this.pose.name} 자세`, width / 2, 66, 44);
    drawBar(ctx, width / 2 - 130, 110, 260, 14, this.progress, '#3d9e57');
    // 따라할 자세 스켈레톤 예시: 오른쪽 위 패널에 막대인간 가이드를 함께 보여준다.
    // 글자만으로는 팔 모양을 알기 어려우니, 코드로 그리는 벡터 가이드로 보완한다.
    // 패널 아래에는 다리 조건(모음/벌림)도 함께 표시한다.
    const gw = 140;
    const gh = 200;
    const gx = Math.max(8, width - gw - 16);
    drawYogaGuide(ctx, this.pose.name, gx, 16, gw, gh, `${this.pose.name} 자세`);
  }
  get progress(): number {
    return Math.min(1, this.holdMs / 3000);
  }
  // 팔 유사도와 손·다리 벌림 조건을 모두 통과해야 그 자세로 인정한다.
  matches(current: Angles, pose: YogaPose): boolean {
    const armsOk = pose.mirrorAngles
      ? poseSimilarity(current, pose.angles) >= YOGA_SIM_THRESHOLD ||
        poseSimilarity(current, pose.mirrorAngles) >= YOGA_SIM_THRESHOLD
      : poseSimilarity(current, pose.angles) >= YOGA_SIM_THRESHOLD;
    if (!armsOk) return false;
    if (!spreadMatches(current.handSpread, pose.hand, pose.handSplit)) return false;
    if (!spreadMatches(current.legSpread, pose.legs)) return false;
    return true;
  }
  tickAngles(current: Angles, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    if (!this.matches(current, this.pose)) {
      this.holdMs = 0;
      return [];
    }
    this.holdMs += dtMs;
    if (this.holdMs <= 3000) return [];
    const done = this.pose.name;
    this.holdMs = 0;
    this.oi = (this.oi + 1) % YOGA_POSES.length;
    this.pose = YOGA_POSES[this.oi];
    this.completed += 1;
    this.board.comboHit();
    this.board.add(25);
    return [{ type: 'pose-done', points: 25, label: `${done}자세 완성!` }];
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    return this.tickAngles(anglesFromFrame(frame), dtMs);
  }
}
