// src/versus/versus-stage.ts
// 세로 2분할 그리기: 가운데 선 + P1/P2 라벨.
import { drawVersusLabel } from './draw';

export function drawVersusChrome(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  // 가운데 선
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  // 위쪽 영역 라벨 (CSS 셀카 미러 상쇄).
  drawVersusLabel(ctx, 'P1', 30, 32, 22, '#00ffff');
  drawVersusLabel(ctx, 'P2', width - 30, 32, 22, '#ffd23d');
}

// 각 플레이어 영역으로 클리핑해서 게임을 그린다.
export function withSideClip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  side: 'p1' | 'p2',
  fn: () => void
): void {
  ctx.save();
  ctx.beginPath();
  if (side === 'p1') ctx.rect(0, 0, width / 2, height);
  else ctx.rect(width / 2, 0, width / 2, height);
  ctx.clip();
  fn();
  ctx.restore();
}
