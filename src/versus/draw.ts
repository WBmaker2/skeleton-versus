// src/versus/draw.ts
// 대전 공용 그리기: 라벨 + 별 모양.
// 캔버스는 화면 좌표계(포즈를 화면 기준으로 미러)라 별도 뒤집기 없이 그린다.

export function drawVersusLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  sizePx: number,
  color = '#fff'
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `700 ${sizePx}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.translate(x, y);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string
): void {
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
