// src/ui/renderer.ts
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

export function drawZones(canvas: HTMLCanvasElement, width: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  for (const fx of [1 / 3, 2 / 3]) {
    ctx.beginPath();
    ctx.moveTo(width * fx, 0);
    ctx.lineTo(width * fx, canvas.height);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color = '#22d3ee'
): void {
  const f = Math.min(1, Math.max(0, frac));
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 22, 0.6)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * f, h);
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 28,
  canvasWidth?: number
): void {
  ctx.save();
  // 스테이지 캔버스는 셀카 미러(CSS scaleX(-1))로 표시되므로,
  // 글자를 미리 좌우반전해 그려야 사용자에게 정상으로 보인다.
  // 중앙(x=W/2)은 글자 중심 기준 반전만으로 위치가 유지되지만,
  // 오른쪽 끝(x=W-70) 같은 고정 UI는 CSS 미러에 의해 화면 반대편으로
  // 옮겨 보이므로, canvasWidth를 넘기면 비트맵에는 W-x에 그려
  // 화면 표시 위치를 x에 고정한다 (글자 모양은 이중 반전으로 정상).
  // canvasWidth가 없으면 기존처럼 비트맵 x에 그려 게임 오브젝트
  // (수학 선택지 박스 등)와 함께 미러되어 정렬을 유지한다.
  const bx = canvasWidth != null ? canvasWidth - x : x;
  ctx.translate(bx, y);
  ctx.scale(-1, 1);
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(10, 16, 22, 0.85)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export type PoseGuideTarget = 'T' | 'Y' | 'O' | 'L' | 'I' | 'K' | 'X' | 'A';

interface Joint { x: number; y: number }

interface GuideLayout {
  elbowL: Joint;
  handL: Joint;
  elbowR: Joint;
  handR: Joint;
  kneeL: Joint;
  kneeR: Joint;
  footL: Joint;
  footR: Joint;
}

// 다리 모양: 글자 모양에 맞춰 모은 다리(기둥)와 벌린 다리(X·A)를 쓴다.
const LEGS_TOGETHER = {
  kneeL: { x: 0.46, y: 0.79 },
  kneeR: { x: 0.54, y: 0.79 },
  footL: { x: 0.455, y: 0.96 },
  footR: { x: 0.545, y: 0.96 }
};
const LEGS_OPEN = {
  kneeL: { x: 0.28, y: 0.78 },
  kneeR: { x: 0.72, y: 0.78 },
  footL: { x: 0.16, y: 0.95 },
  footR: { x: 0.84, y: 0.95 }
};
// 팔 내림(I): 몸통 옆으로 자연스럽게.
const ARMS_DOWN = {
  elbowL: { x: 0.41, y: 0.46 },
  handL: { x: 0.39, y: 0.58 },
  elbowR: { x: 0.59, y: 0.46 },
  handR: { x: 0.61, y: 0.58 }
};

// 글자별 팔다리 배치. 손(맞대기/벌리기)과 다리(모음/벌림)가 판정 조건과 일치한다.
const GUIDE_LAYOUTS: Record<PoseGuideTarget, GuideLayout> = {
  // T: 양팔 수평으로 쭉 뻗기
  T: {
    elbowL: { x: 0.24, y: 0.33 },
    handL: { x: 0.06, y: 0.33 },
    elbowR: { x: 0.76, y: 0.33 },
    handR: { x: 0.94, y: 0.33 },
    ...LEGS_TOGETHER
  },
  // Y: 양팔 대각선 위로 넓게, 다리 모음
  Y: {
    elbowL: { x: 0.32, y: 0.18 },
    handL: { x: 0.18, y: 0.02 },
    elbowR: { x: 0.68, y: 0.18 },
    handR: { x: 0.82, y: 0.02 },
    ...LEGS_TOGETHER
  },
  // O: 양손을 머리 위에서 모아 동그라미, 다리 모음
  O: {
    elbowL: { x: 0.26, y: 0.16 },
    handL: { x: 0.5, y: 0.0 },
    elbowR: { x: 0.74, y: 0.16 },
    handR: { x: 0.5, y: 0.0 },
    ...LEGS_TOGETHER
  },
  // L: 왼팔은 수평, 오른팔은 몸통 옆으로 내리기
  L: {
    elbowL: { x: 0.24, y: 0.33 },
    handL: { x: 0.06, y: 0.33 },
    elbowR: { x: 0.6, y: 0.46 },
    handR: { x: 0.62, y: 0.6 },
    ...LEGS_TOGETHER
  },
  // I: 팔 내리고 차렷
  I: { ...ARMS_DOWN, ...LEGS_TOGETHER },
  // K: 한 팔은 위로, 다른 팔은 몸 앞을 가로질러 반대쪽 아래로 (실제 K 실루엣)
  K: {
    elbowL: { x: 0.28, y: 0.18 },
    handL: { x: 0.12, y: 0.03 },
    elbowR: { x: 0.46, y: 0.5 },
    handR: { x: 0.3, y: 0.68 },
    ...LEGS_TOGETHER
  },
  // X: 양팔 대각선 위로 크게, 다리 벌려 점핑잭
  X: {
    elbowL: { x: 0.28, y: 0.22 },
    handL: { x: 0.1, y: 0.06 },
    elbowR: { x: 0.72, y: 0.22 },
    handR: { x: 0.9, y: 0.06 },
    ...LEGS_OPEN
  },
  // A: 양손을 머리 위에서 맞대 꼭짓점, 다리 벌려 삼각형
  A: {
    elbowL: { x: 0.36, y: 0.2 },
    handL: { x: 0.5, y: 0.0 },
    elbowR: { x: 0.64, y: 0.2 },
    handR: { x: 0.5, y: 0.0 },
    ...LEGS_OPEN
  }
};

// 목표 알파벳 스켈레톤 가이드: 오른쪽 위 패널에 막대인간 예시를 그린다.
// 외부 이미지 없이 코드로 그려지므로 에셋이 없어도 항상 보인다.
// 스테이지는 셀카 미러(CSS scaleX(-1))이므로, 막대인간 좌우가 뒤집혀
// 보이지 않도록 패널 중심 기준으로 한 번 더 뒤집어 그린다 (L·K 같은 비대칭 대비).
// drawLabel은 자체적으로 뒤집기를 하므로 패널 안 글자는 그대로 호출한다.
export function drawPoseGuide(
  ctx: CanvasRenderingContext2D,
  target: PoseGuideTarget,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 22, 0.72)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const rr = (ctx as unknown as { roundRect?: (...a: number[]) => void }).roundRect;
  if (typeof rr === 'function') rr.call(ctx, x, y, w, h, 14);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 막대인간 영역: 위쪽 설명 여백·아래쪽 글자 여백을 제외한 안쪽 박스.
  const padX = 12;
  const top = y + 12;
  const bottom = y + h - 40;
  const px = (fx: number): number => x + padX + fx * (w - padX * 2);
  const py = (fy: number): number => top + fy * Math.max(1, bottom - top);

  const head = { x: 0.5, y: 0.1 };
  const neck = { x: 0.5, y: 0.28 };
  const hip = { x: 0.5, y: 0.6 };
  const shoulderL = { x: 0.42, y: 0.33 };
  const shoulderR = { x: 0.58, y: 0.33 };
  const layout = GUIDE_LAYOUTS[target];

  ctx.save();
  // 셀카 미러 상쇄: 패널 중심 기준 좌우반전.
  const cx = x + w / 2;
  ctx.translate(cx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-cx, 0);
  ctx.strokeStyle = '#dfff00';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seg = (ax: number, ay: number, bx: number, by: number): void => {
    ctx.beginPath();
    ctx.moveTo(px(ax), py(ay));
    ctx.lineTo(px(bx), py(by));
    ctx.stroke();
  };
  // 몸통·다리
  seg(neck.x, neck.y, hip.x, hip.y);
  seg(hip.x, hip.y, layout.kneeL.x, layout.kneeL.y);
  seg(layout.kneeL.x, layout.kneeL.y, layout.footL.x, layout.footL.y);
  seg(hip.x, hip.y, layout.kneeR.x, layout.kneeR.y);
  seg(layout.kneeR.x, layout.kneeR.y, layout.footR.x, layout.footR.y);
  // 팔 (글자별)
  seg(shoulderL.x, shoulderL.y, layout.elbowL.x, layout.elbowL.y);
  seg(layout.elbowL.x, layout.elbowL.y, layout.handL.x, layout.handL.y);
  seg(shoulderR.x, shoulderR.y, layout.elbowR.x, layout.elbowR.y);
  seg(layout.elbowR.x, layout.elbowR.y, layout.handR.x, layout.handR.y);
  // 머리
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px(head.x), py(head.y), Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 패널 하단 목표 글자 (drawLabel이 미러를 자체 보정).
  drawLabel(ctx, target, x + w / 2, y + h - 20, 26);
}

// 리듬 댄스 카피의 동작 집합과 공유한다 (DanceMove와 같은 10종).
export type DanceGuideMove =
  | 'left' | 'right' | 'both' | 'down'
  | 't' | 'y' | 'circle' | 'clap' | 'hips' | 'head';

interface DanceArms {
  elbowL: { x: number; y: number };
  handL: { x: number; y: number };
  elbowR: { x: number; y: number };
  handR: { x: number; y: number };
  // 노랑 하이라이트를 찍을 손 ('L'·'R', 내리기는 빈 배열)
  hot: ('L' | 'R')[];
}

// 목표 댄스 동작 스켈레톤 가이드: 오른쪽 위 패널에 막대인간 예시를 그린다.
// 리듬 댄스 카피의 10가지 동작을 스켈레톤 모양으로 보여준다.
// drawPoseGuide와 같은 렌더 규칙(패널 배경 + 셀카 미러 상쇄 + 하단 글자)을 따른다.
export function drawDanceGuide(
  ctx: CanvasRenderingContext2D,
  move: DanceGuideMove,
  x: number,
  y: number,
  w: number,
  h: number,
  label?: string
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 22, 0.72)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const rr = (ctx as unknown as { roundRect?: (...a: number[]) => void }).roundRect;
  if (typeof rr === 'function') rr.call(ctx, x, y, w, h, 14);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const padX = 12;
  const top = y + 12;
  const bottom = y + h - 40;
  const px = (fx: number): number => x + padX + fx * (w - padX * 2);
  const py = (fy: number): number => top + fy * Math.max(1, bottom - top);

  const head = { x: 0.5, y: 0.1 };
  const neck = { x: 0.5, y: 0.28 };
  const hip = { x: 0.5, y: 0.6 };
  const kneeL = { x: 0.42, y: 0.79 };
  const kneeR = { x: 0.58, y: 0.79 };
  const footL = { x: 0.36, y: 0.96 };
  const footR = { x: 0.64, y: 0.96 };
  const shoulderL = { x: 0.42, y: 0.33 };
  const shoulderR = { x: 0.58, y: 0.33 };
  // 올림: 대각선 위, 내림: 몸통 옆, T: 수평, O: 머리 위 맞대기,
  // 박수: 가슴 앞 모임, 허리손: 엉덩이 옆, 머리손: 왼손을 머리 옆에
  const upL = { elbow: { x: 0.32, y: 0.18 }, hand: { x: 0.18, y: 0.02 } };
  const downL = { elbow: { x: 0.4, y: 0.46 }, hand: { x: 0.38, y: 0.6 } };
  const upR = { elbow: { x: 0.68, y: 0.18 }, hand: { x: 0.82, y: 0.02 } };
  const downR = { elbow: { x: 0.6, y: 0.46 }, hand: { x: 0.62, y: 0.6 } };
  const tL = { elbow: { x: 0.24, y: 0.33 }, hand: { x: 0.06, y: 0.33 } };
  const tR = { elbow: { x: 0.76, y: 0.33 }, hand: { x: 0.94, y: 0.33 } };
  const oL = { elbow: { x: 0.26, y: 0.16 }, hand: { x: 0.5, y: 0.0 } };
  const oR = { elbow: { x: 0.74, y: 0.16 }, hand: { x: 0.5, y: 0.0 } };
  const clapL = { elbow: { x: 0.34, y: 0.48 }, hand: { x: 0.47, y: 0.44 } };
  const clapR = { elbow: { x: 0.66, y: 0.48 }, hand: { x: 0.53, y: 0.44 } };
  const hipL = { elbow: { x: 0.38, y: 0.46 }, hand: { x: 0.36, y: 0.6 } };
  const hipR = { elbow: { x: 0.62, y: 0.46 }, hand: { x: 0.64, y: 0.6 } };
  const headL = { elbow: { x: 0.3, y: 0.24 }, hand: { x: 0.44, y: 0.12 } };
  const POSES: Record<DanceGuideMove, DanceArms> = {
    left: { elbowL: upL.elbow, handL: upL.hand, elbowR: downR.elbow, handR: downR.hand, hot: ['L'] },
    right: { elbowL: downL.elbow, handL: downL.hand, elbowR: upR.elbow, handR: upR.hand, hot: ['R'] },
    both: { elbowL: upL.elbow, handL: upL.hand, elbowR: upR.elbow, handR: upR.hand, hot: ['L', 'R'] },
    down: { elbowL: downL.elbow, handL: downL.hand, elbowR: downR.elbow, handR: downR.hand, hot: [] },
    t: { elbowL: tL.elbow, handL: tL.hand, elbowR: tR.elbow, handR: tR.hand, hot: ['L', 'R'] },
    y: { elbowL: upL.elbow, handL: upL.hand, elbowR: upR.elbow, handR: upR.hand, hot: ['L', 'R'] },
    circle: { elbowL: oL.elbow, handL: oL.hand, elbowR: oR.elbow, handR: oR.hand, hot: ['L', 'R'] },
    clap: { elbowL: clapL.elbow, handL: clapL.hand, elbowR: clapR.elbow, handR: clapR.hand, hot: ['L', 'R'] },
    hips: { elbowL: hipL.elbow, handL: hipL.hand, elbowR: hipR.elbow, handR: hipR.hand, hot: ['L', 'R'] },
    head: { elbowL: headL.elbow, handL: headL.hand, elbowR: downR.elbow, handR: downR.hand, hot: ['L'] }
  };
  const arms = POSES[move];

  ctx.save();
  // 셀카 미러 상쇄: 패널 중심 기준 좌우반전.
  const cx = x + w / 2;
  ctx.translate(cx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-cx, 0);
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seg = (ax: number, ay: number, bx: number, by: number): void => {
    ctx.beginPath();
    ctx.moveTo(px(ax), py(ay));
    ctx.lineTo(px(bx), py(by));
    ctx.stroke();
  };
  // 몸통·다리 (전 동작 공통)
  seg(neck.x, neck.y, hip.x, hip.y);
  seg(hip.x, hip.y, kneeL.x, kneeL.y);
  seg(kneeL.x, kneeL.y, footL.x, footL.y);
  seg(hip.x, hip.y, kneeR.x, kneeR.y);
  seg(kneeR.x, kneeR.y, footR.x, footR.y);
  // 팔 (동작별: 따라할 손은 노랑 하이라이트)
  seg(shoulderL.x, shoulderL.y, arms.elbowL.x, arms.elbowL.y);
  seg(arms.elbowL.x, arms.elbowL.y, arms.handL.x, arms.handL.y);
  seg(shoulderR.x, shoulderR.y, arms.elbowR.x, arms.elbowR.y);
  seg(arms.elbowR.x, arms.elbowR.y, arms.handR.x, arms.handR.y);
  const highlight = (hand: { x: number; y: number }): void => {
    ctx.save();
    ctx.fillStyle = '#dfff00';
    ctx.beginPath();
    ctx.arc(px(hand.x), py(hand.y), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  if (arms.hot.includes('L')) highlight(arms.handL);
  if (arms.hot.includes('R')) highlight(arms.handR);
  // 머리
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px(head.x), py(head.y), Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 패널 하단 동작 글자 (drawLabel이 미러를 자체 보정).
  drawLabel(ctx, label ?? move, x + w / 2, y + h - 20, 26);
}

// 요가 거울의 자세 집합 (YOGA_POSES 이름과 같은 6종).
export type YogaGuidePose = '산' | '전사' | '만세' | '합장' | '삼각' | '나무';

// 목표 요가 자세 스켈레톤 가이드: 오른쪽 위 패널에 막대인간 예시를 그린다.
// 산(차렷)·전사(T자+다리벌림)·만세(V자)·합장(가슴모음)·삼각(한팔위+다리벌림)·나무(머리위모음) 모양을 바로 확인할 수 있다.
// drawPoseGuide·drawDanceGuide와 같은 렌더 규칙(패널 배경 + 셀카 미러 상쇄 + 하단 글자)을 따른다.
export function drawYogaGuide(
  ctx: CanvasRenderingContext2D,
  pose: YogaGuidePose,
  x: number,
  y: number,
  w: number,
  h: number,
  label?: string
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 16, 22, 0.72)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const rr = (ctx as unknown as { roundRect?: (...a: number[]) => void }).roundRect;
  if (typeof rr === 'function') rr.call(ctx, x, y, w, h, 14);
  else ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const padX = 12;
  const top = y + 12;
  const bottom = y + h - 60;
  const px = (fx: number): number => x + padX + fx * (w - padX * 2);
  const py = (fy: number): number => top + fy * Math.max(1, bottom - top);

  const head = { x: 0.5, y: 0.1 };
  const neck = { x: 0.5, y: 0.28 };
  const hip = { x: 0.5, y: 0.6 };
  const shoulderL = { x: 0.42, y: 0.33 };
  const shoulderR = { x: 0.58, y: 0.33 };
  // 다리 모양: 판정 기준(모음=발 모음, 벌림=어깨너비 1.3배 이상)과 일치하게 과장한다.
  // 모음은 발을 거의 붙이고, 벌림은 패널 끝까지 벌려서 한눈에 구별되게 한다.
  const legsTogether = {
    kneeL: { x: 0.46, y: 0.79 },
    kneeR: { x: 0.54, y: 0.79 },
    footL: { x: 0.465, y: 0.96 },
    footR: { x: 0.535, y: 0.96 }
  };
  const legsOpen = {
    kneeL: { x: 0.24, y: 0.78 },
    kneeR: { x: 0.76, y: 0.78 },
    footL: { x: 0.1, y: 0.95 },
    footR: { x: 0.9, y: 0.95 }
  };
  // 다리 자유(산): 판정을 보지 않으므로 자연스러운 어깨너비로 선다.
  const legsFree = {
    kneeL: { x: 0.44, y: 0.79 },
    kneeR: { x: 0.56, y: 0.79 },
    footL: { x: 0.4, y: 0.96 },
    footR: { x: 0.6, y: 0.96 }
  };
  // YOGA_POSES 템플릿과 일치: 산=내림, 전사=T자, 만세=V자, 합장=가슴모음, 삼각=한팔위, 나무=머리위모음.
  const downL = { elbow: { x: 0.4, y: 0.46 }, hand: { x: 0.38, y: 0.6 } };
  const downR = { elbow: { x: 0.6, y: 0.46 }, hand: { x: 0.62, y: 0.6 } };
  const upL = { elbow: { x: 0.32, y: 0.18 }, hand: { x: 0.18, y: 0.02 } };
  const upR = { elbow: { x: 0.68, y: 0.18 }, hand: { x: 0.82, y: 0.02 } };
  const tL = { elbow: { x: 0.24, y: 0.33 }, hand: { x: 0.06, y: 0.33 } };
  const tR = { elbow: { x: 0.76, y: 0.33 }, hand: { x: 0.94, y: 0.33 } };
  const clapL = { elbow: { x: 0.34, y: 0.48 }, hand: { x: 0.47, y: 0.44 } };
  const clapR = { elbow: { x: 0.66, y: 0.48 }, hand: { x: 0.53, y: 0.44 } };
  const overL = { elbow: { x: 0.36, y: 0.2 }, hand: { x: 0.5, y: 0.0 } };
  const overR = { elbow: { x: 0.64, y: 0.2 }, hand: { x: 0.5, y: 0.0 } };
  const POSES: Record<YogaGuidePose, {
    elbowL: { x: number; y: number }; handL: { x: number; y: number };
    elbowR: { x: number; y: number }; handR: { x: number; y: number };
    legs: typeof legsTogether; hot: ('L' | 'R')[];
    legsLabel: '다리 모음' | '다리 벌림' | '다리 자유';
  }> = {
    산: { elbowL: downL.elbow, handL: downL.hand, elbowR: downR.elbow, handR: downR.hand, legs: legsFree, hot: [], legsLabel: '다리 자유' },
    전사: { elbowL: tL.elbow, handL: tL.hand, elbowR: tR.elbow, handR: tR.hand, legs: legsOpen, hot: ['L', 'R'], legsLabel: '다리 벌림' },
    만세: { elbowL: upL.elbow, handL: upL.hand, elbowR: upR.elbow, handR: upR.hand, legs: legsTogether, hot: ['L', 'R'], legsLabel: '다리 모음' },
    합장: { elbowL: clapL.elbow, handL: clapL.hand, elbowR: clapR.elbow, handR: clapR.hand, legs: legsTogether, hot: ['L', 'R'], legsLabel: '다리 모음' },
    삼각: { elbowL: upL.elbow, handL: upL.hand, elbowR: downR.elbow, handR: downR.hand, legs: legsOpen, hot: ['L'], legsLabel: '다리 벌림' },
    나무: { elbowL: overL.elbow, handL: overL.hand, elbowR: overR.elbow, handR: overR.hand, legs: legsTogether, hot: ['L', 'R'], legsLabel: '다리 모음' }
  };
  const arms = POSES[pose];
  const { kneeL, kneeR, footL, footR } = arms.legs;

  ctx.save();
  // 셀카 미러 상쇄: 패널 중심 기준 좌우반전.
  const cx = x + w / 2;
  ctx.translate(cx, 0);
  ctx.scale(-1, 1);
  ctx.translate(-cx, 0);
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const seg = (ax: number, ay: number, bx: number, by: number): void => {
    ctx.beginPath();
    ctx.moveTo(px(ax), py(ay));
    ctx.lineTo(px(bx), py(by));
    ctx.stroke();
  };
  // 몸통·다리 (자세별: 전사·삼각은 다리 벌림)
  seg(neck.x, neck.y, hip.x, hip.y);
  seg(hip.x, hip.y, kneeL.x, kneeL.y);
  seg(kneeL.x, kneeL.y, footL.x, footL.y);
  seg(hip.x, hip.y, kneeR.x, kneeR.y);
  seg(kneeR.x, kneeR.y, footR.x, footR.y);
  // 바닥선: 발이 닿는 기준선으로 다리 벌림 폭을 읽기 쉽게 한다.
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px(0.06), py(0.985));
  ctx.lineTo(px(0.94), py(0.985));
  ctx.stroke();
  ctx.restore();
  // 팔 (자세별: 따라할 손은 노랑 하이라이트)
  seg(shoulderL.x, shoulderL.y, arms.elbowL.x, arms.elbowL.y);
  seg(arms.elbowL.x, arms.elbowL.y, arms.handL.x, arms.handL.y);
  seg(shoulderR.x, shoulderR.y, arms.elbowR.x, arms.elbowR.y);
  seg(arms.elbowR.x, arms.elbowR.y, arms.handR.x, arms.handR.y);
  const highlight = (hand: { x: number; y: number }): void => {
    ctx.save();
    ctx.fillStyle = '#dfff00';
    ctx.beginPath();
    ctx.arc(px(hand.x), py(hand.y), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  if (arms.hot.includes('L')) highlight(arms.handL);
  if (arms.hot.includes('R')) highlight(arms.handR);
  // 머리
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px(head.x), py(head.y), Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 패널 하단 글자 (drawLabel이 미러를 자체 보정).
  // 자세 이름 아래에 다리 조건을 작게 함께 적어 모음/벌림을 글로도 알려준다.
  drawLabel(ctx, label ?? pose, x + w / 2, y + h - 36, 24);
  drawLabel(ctx, arms.legsLabel, x + w / 2, y + h - 13, 18);
}

// 얼굴 마스크 오버레이: 코 앵커, 어깨너비 × 1.4 × scale 크기.
// 이미지가 없거나 아직 로드 전이면 조용히 건너뛴다.
export function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  frame: PoseFrame,
  img: HTMLImageElement | null | undefined,
  scale = 1
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
  const nose = byName.get('nose');
  const ls = byName.get('left_shoulder');
  const rs = byName.get('right_shoulder');
  let cx = 0;
  let cy = 0;
  if (nose && (nose.score ?? 0) > 0.3) {
    cx = nose.x;
    cy = nose.y;
  } else if (ls && rs) {
    cx = (ls.x + rs.x) / 2;
    cy = (ls.y + rs.y) / 2 - 40;
  } else {
    return;
  }
  const sw =
    ls && rs ? Math.max(40, Math.hypot(ls.x - rs.x, ls.y - rs.y)) : 100;
  const size = sw * 1.4 * scale;
  // 소스가 정사각이 아니어도 중앙 정사각 크롭으로 왜곡 없이 그린다.
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.save();
  ctx.drawImage(img, sx, sy, side, side, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

export function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void {
  // 화면 지우기는 GameLoop가 담당 (게임 요소 → 스켈레톤 순서로 겹쳐 그리기).
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
  // 손 마커: 베기·잡기의 판정점(손바닥 중심)을 동그라미로 표시.
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

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const BURST_COLORS = ['#dfff00', '#ff71ce', '#ffffff', '#00ffff'];
export const PENALTY_COLORS = ['#ff3b30', '#8a8f98', '#22303c'];

// 미션 성공 축하 파티클: 호출자가 배열을 보관하고 매 틱 tick/draw한다.
// colors를 넘기면 감점 등 다른 톤의 이펙트에도 쓴다.
export function spawnBurst(
  out: Particle[],
  x: number,
  y: number,
  n = 14,
  colors: string[] = BURST_COLORS
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 220;
    const life = 450 + Math.random() * 350;
    out.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      life,
      maxLife: life,
      color: colors[i % colors.length],
      size: 3 + Math.random() * 4
    });
  }
}

export function tickParticles(ps: Particle[], dtMs: number): Particle[] {
  const dt = dtMs / 1000;
  for (const p of ps) {
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dtMs;
  }
  return ps.filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  ctx.save();
  for (const p of ps) {
    ctx.globalAlpha = Math.min(1, Math.max(0, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
