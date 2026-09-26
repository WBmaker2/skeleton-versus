// src/versus/dance-guide.ts
// 댄스 대전 목표 동작 스켈레톤 가이드. 1P 리듬 댄스의 10종 막대인간을
// 대전용으로 가져오되, 패널·미러 상쇄·하단 글자만 남기고 다듬었다.
// (마스크·파티클·drawLabel 의존 없음. 글자는 직접 뒤집어 그린다.)

export type DanceGuideMove =
  | 'left' | 'right' | 'both' | 'down'
  | 't' | 'y' | 'circle' | 'clap' | 'hips' | 'head';

export const DANCE_MOVES: DanceGuideMove[] = [
  'left', 'right', 'both', 'down', 't', 'y', 'circle', 'clap', 'hips', 'head'
];

export const DANCE_MOVE_LABEL: Record<DanceGuideMove, string> = {
  left: '왼손', right: '오른손', both: '양손', down: '내리기',
  t: 'T자세', y: 'Y자세', circle: '동그라미', clap: '박수',
  hips: '허리손', head: '머리손'
};

interface DanceArms {
  elbowL: { x: number; y: number };
  handL: { x: number; y: number };
  elbowR: { x: number; y: number };
  handR: { x: number; y: number };
  hot: ('L' | 'R')[];
}

export function drawDanceGuide(
  ctx: CanvasRenderingContext2D,
  move: DanceGuideMove,
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
  ctx.rect(x, y, w, h);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const padX = 12;
  const top = y + 12;
  const bottom = y + h - 40;
  const px = (fx: number): number => x + padX + fx * (w - padX * 2);
  const py = (fy: number): number => top + fy * Math.max(1, bottom - top);

  const neck = { x: 0.5, y: 0.28 };
  const hip = { x: 0.5, y: 0.6 };
  const kneeL = { x: 0.42, y: 0.79 };
  const kneeR = { x: 0.58, y: 0.79 };
  const footL = { x: 0.36, y: 0.96 };
  const footR = { x: 0.64, y: 0.96 };
  const shoulderL = { x: 0.42, y: 0.33 };
  const shoulderR = { x: 0.58, y: 0.33 };
  const head = { x: 0.5, y: 0.1 };
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
  seg(neck.x, neck.y, hip.x, hip.y);
  seg(hip.x, hip.y, kneeL.x, kneeL.y);
  seg(kneeL.x, kneeL.y, footL.x, footL.y);
  seg(hip.x, hip.y, kneeR.x, kneeR.y);
  seg(kneeR.x, kneeR.y, footR.x, footR.y);
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
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px(head.x), py(head.y), Math.min(w, h) * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 패널 하단 동작 글자. 스테이지 전체 미러를 상쇄하려고 미리 뒤집어 그린다.
  const label = DANCE_MOVE_LABEL[move];
  const lx = x + w / 2;
  const ly = y + h - 20;
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = '700 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.translate(lx, ly);
  ctx.scale(-1, 1);
  ctx.fillText(label, 0, 0);
  ctx.restore();
}
