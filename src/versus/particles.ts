// src/versus/particles.ts
// 대전용 경량 파티클. 성공 축하·감점 표시를 캔버스 맨 위에 그린다.
// 1인 루프의 파티클과 같은 맛이지만 versus 전용 최소 구현이다.

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; r: number;
}

export const CHEER_COLORS = ['#dfff00', '#ffffff', '#00ffff'];
export const OUCH_COLORS = ['#ff3b30', '#8a8f98'];

export function reducedMotion(): boolean {
  try {
    return typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function spawnBurst(
  ps: Particle[], x: number, y: number, n: number, colors: string[] = CHEER_COLORS
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 220;
    const life = 500 + Math.random() * 500;
    ps.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      life, maxLife: life,
      color: colors[i % colors.length],
      r: 3 + Math.random() * 4
    });
  }
}

export function tickParticles(ps: Particle[], dtMs: number): Particle[] {
  const dt = dtMs / 1000;
  return ps
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 600 * dt,
      life: p.life - dtMs
    }))
    .filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]): void {
  ctx.save();
  for (const p of ps) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
