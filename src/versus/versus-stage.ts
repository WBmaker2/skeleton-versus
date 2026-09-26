// src/versus/versus-stage.ts
// 세로 2분할 그리기: 가운데 선 + P1/P2 라벨.

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
  // 위쪽 영역 라벨
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#00ffff';
  ctx.fillText('P1', 14, 32);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23d';
  ctx.fillText('P2', width - 14, 32);
  ctx.restore();
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
