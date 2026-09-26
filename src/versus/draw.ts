// src/versus/draw.ts
// 대전 공용 그리기: 미러 보정 라벨 + 별 모양.
// 스테이지는 CSS 셀카 미러(scaleX(-1))라서 글자를 그대로 그리면 거울문자가 된다.
// 글자 중심 기준 미리 뒤집어 그려 상쇄한다 (1P drawLabel과 같은 규칙).

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
  ctx.scale(-1, 1);
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
