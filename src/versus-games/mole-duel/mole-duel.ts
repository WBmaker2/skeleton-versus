// src/versus-games/mole-duel/mole-duel.ts
// 두더지 잡기 대전: 자기 반쪽 6개 구멍(바닥 3 + 측면 3)에서 한 마리씩 올라온다.
// 바닥 두더지는 손을 위로 들었다가 내려찍어야, 측면 두더지는 반대쪽으로
// 갔다가 휘둘러야 때린 것으로 인정 (+10). 가만히 대거나 한 방향으로만
// 비비면 무효. 5연속이면 상대 두더지 가속 1.5배 5초 (rush 재사용).
// 시간이 지날수록 유지시간·간격이 짧아져 어려워진다.
import type { PoseFrame } from '../../pose/types';
import { palmOf, shoulderWidth } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';
import { SharedMoleRing, isFloorSlot, type MoleSlot } from './mole-ring';

export type MoleSide = 'p1' | 'p2';
export type MolePhase = 'rising' | 'staying' | 'falling' | 'cooldown';
export type MoleFace = 'idle' | 'hit' | 'miss';

export const MOLE_R = 48;
export const MOLE_RISE_MS = 250;
export const MOLE_FALL_MS = 250;
export const MOLE_HIT_FALL_MS = 200;
export const MOLE_COOL_MS = 300;
const WINDUP_MS = 500;
const WINDUP_RATIO = 0.4;
const RETURN_RATIO = 0.15;
const RUSH_MULT = 1.5;

// 나와있는 시간: 0~20초 1.5초 → 55초~ 0.7초.
export function stayMsFor(elapsedSec: number, rushed: boolean): number {
  let base: number;
  if (elapsedSec < 20) base = 1500;
  else if (elapsedSec < 40) base = 1100;
  else if (elapsedSec < 55) base = 850;
  else base = 700;
  return rushed ? base / RUSH_MULT : base;
}

// 다음 마리까지 쉼: 0~20초 0.6초 → 55초~ 0.15초.
export function gapMsFor(elapsedSec: number, rushed: boolean): number {
  let base: number;
  if (elapsedSec < 20) base = 600;
  else if (elapsedSec < 40) base = 400;
  else if (elapsedSec < 55) base = 250;
  else base = 150;
  return rushed ? base / RUSH_MULT : base;
}

// 구멍 자리. 바닥 3곳(y 0.82) + 바깥쪽 벽 3곳(P1 왼쪽벽·P2 오른쪽벽).
export function slotToPos(
  side: MoleSide, slot: MoleSlot, width: number, height: number
): { x: number; y: number } {
  const lo = side === 'p1' ? 0 : width / 2;
  const hw = width / 2;
  if (slot <= 2) {
    const xs = [0.2, 0.5, 0.8];
    // P2는 좌우 뒤집기 (바닥 왼쪽↔오른쪽 미러).
    const xi = side === 'p1' ? xs[slot] : xs[2 - slot];
    return { x: lo + hw * xi, y: height * 0.82 };
  }
  const ys = [0.3, 0.5, 0.7];
  const x = side === 'p1' ? lo + hw * 0.12 : lo + hw * 0.88;
  return { x, y: height * ys[slot - 3] };
}

interface TrailPt {
  x: number;
  y: number;
  ageMs: number;
}

export class MoleDuelSide {
  board = new ScoreBoard();
  catches = 0;
  slot: MoleSlot = 0;
  phase: MolePhase = 'rising';
  phaseMs = 0;
  face: MoleFace = 'idle';
  hint: string | null = null;
  moleX = 0;
  moleY = 0;
  elapsedSec = 0;
  radiusScale = 1;
  private running = false;
  private coolMs = 0;
  private trails: { left: TrailPt[]; right: TrailPt[] } = { left: [], right: [] };

  constructor(
    public side: MoleSide,
    private attacks: AttackBus,
    private ring: SharedMoleRing
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.catches = 0;
    this.elapsedSec = 0;
    this.phaseMs = 0;
    this.coolMs = 0;
    this.face = 'idle';
    this.hint = null;
    this.trails = { left: [], right: [] };
    this.slot = this.ring.nextFor(this.side);
    const p = slotToPos(this.side, this.slot, 640, 480);
    this.moleX = p.x;
    this.moleY = p.y;
    this.phase = 'rising';
  }
  stop(): void {
    this.running = false;
  }

  get rushed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'rush';
  }

  get stayMs(): number {
    return stayMsFor(this.elapsedSec, this.rushed);
  }

  get gapMs(): number {
    return gapMsFor(this.elapsedSec, this.rushed);
  }

  private pushTrail(hand: 'left' | 'right', x: number, y: number, dtMs: number): void {
    const t = this.trails[hand];
    for (const p of t) p.ageMs += dtMs;
    t.push({ x, y, ageMs: 0 });
    while (t.length > 0 && t[0].ageMs > WINDUP_MS) t.shift();
    if (t.length > 12) t.splice(0, t.length - 12);
  }

  // 예비동작 확인. 바닥: 위로 들었다가 내려오기. 측면: 반대쪽으로 갔다가 휘두르기.
  private hasWindup(hand: 'left' | 'right', sw: number, cur: { x: number; y: number }): boolean {
    const t = this.trails[hand];
    if (t.length < 2) return false;
    if (isFloorSlot(this.slot)) {
      let minY = Infinity;
      let maxY = -Infinity;
      for (const p of t) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      return maxY - minY >= WINDUP_RATIO * sw && cur.y - minY >= RETURN_RATIO * sw;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of t) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
    if (maxX - minX < WINDUP_RATIO * sw) return false;
    // P1 왼쪽벽: 오른쪽으로 갔다가 왼쪽으로. P2 오른쪽벽: 반대.
    if (this.side === 'p1') return maxX - cur.x >= RETURN_RATIO * sw;
    return cur.x - minX >= RETURN_RATIO * sw;
  }

  private spawn(width: number, height: number): void {
    this.slot = this.ring.nextFor(this.side);
    const p = slotToPos(this.side, this.slot, width, height);
    this.moleX = p.x;
    this.moleY = p.y;
    this.phase = 'rising';
    this.phaseMs = 0;
    this.face = 'idle';
    this.hint = null;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.elapsedSec += dtMs / 1000;
    if (this.coolMs > 0) this.coolMs -= dtMs;
    const sw = shoulderWidth(frame);
    const palms = {
      left: palmOf(frame, 'left'),
      right: palmOf(frame, 'right')
    };
    (['left', 'right'] as const).forEach((hand) => {
      const cur = palms[hand];
      if (cur) this.pushTrail(hand, cur.x, cur.y, dtMs);
    });

    const events: GameEvent[] = [];
    const r = MOLE_R * this.radiusScale;
    const hittable = this.phase === 'rising' || this.phase === 'staying';

    if (hittable && this.coolMs <= 0) {
      let touched = false;
      let wound = false;
      (['left', 'right'] as const).forEach((hand) => {
        const cur = palms[hand];
        if (!cur || wound) return;
        if (Math.hypot(cur.x - this.moleX, cur.y - this.moleY) >= r) return;
        touched = true;
        if (this.hasWindup(hand, sw, cur)) wound = true;
      });
      if (wound) {
        this.catches += 1;
        this.board.comboHit();
        this.board.add(10);
        this.face = 'hit';
        this.phase = 'falling';
        this.phaseMs = 0;
        this.coolMs = MOLE_COOL_MS;
        this.hint = null;
        events.push({ type: 'mole', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 두더지 잡았다!` });
        if (this.board.combo % 5 === 0) {
          if (this.attacks.send('rush', this.side)) {
            events.push({ type: 'attack', points: 0, label: '방해! 상대 두더지 가속 5초' });
          }
        }
        return events;
      }
      if (touched) {
        this.hint = isFloorSlot(this.slot)
          ? '위에서 내려찍어 잡아!'
          : '반대쪽으로 갔다가 쳐!';
      }
    }

    // 가속 중에는 시간이 1.5배 빨리 간다.
    const effDt = this.rushed ? dtMs * RUSH_MULT : dtMs;
    this.phaseMs += effDt;
    if (this.phase === 'rising' && this.phaseMs >= MOLE_RISE_MS) {
      this.phase = 'staying';
      this.phaseMs = 0;
    } else if (this.phase === 'staying' && this.phaseMs >= this.stayMs) {
      this.phase = 'falling';
      this.phaseMs = 0;
      this.face = 'miss';
      this.board.comboMiss();
    } else if (this.phase === 'falling') {
      const need = this.face === 'hit' ? MOLE_HIT_FALL_MS : MOLE_FALL_MS;
      if (this.phaseMs >= need) {
        this.phase = 'cooldown';
        this.phaseMs = 0;
      }
    } else if (this.phase === 'cooldown' && this.phaseMs >= this.gapMs) {
      this.spawn(frame.width, frame.height);
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const hw = width / 2;
    // 빈 구멍 6개.
    ctx.save();
    for (let s = 0 as number; s < 6; s++) {
      const p = slotToPos(this.side, s as MoleSlot, width, height);
      ctx.fillStyle = 'rgba(90,60,30,0.9)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 26, 34 * this.radiusScale, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
    if (this.phase === 'cooldown') {
      drawVersusLabel(ctx, `${this.catches}마리`, lo + hw / 2, 50, 30);
      if (this.hint) drawVersusLabel(ctx, this.hint, lo + hw / 2, 84, 20, '#dfff00');
      return;
    }
    // 올라온 비율 (rising 0→1, staying 1, falling 1→0).
    let ratio = 1;
    if (this.phase === 'rising') ratio = Math.min(1, this.phaseMs / MOLE_RISE_MS);
    if (this.phase === 'falling') {
      const need = this.face === 'hit' ? MOLE_HIT_FALL_MS : MOLE_FALL_MS;
      ratio = Math.max(0, 1 - this.phaseMs / need);
    }
    const r = MOLE_R * this.radiusScale;
    const x = this.moleX;
    const y = this.moleY + (1 - ratio) * 40;
    const rushed = this.rushed;
    // 몸통.
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * ratio;
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    // 볼터치.
    ctx.fillStyle = 'rgba(255,150,170,0.9)';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y + r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y + r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 표정: 기본 미소 · 맞음 >_< · 놓침 -_-.
    ctx.strokeStyle = '#2b1a08';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (this.face === 'hit') {
      // 윙크 >_<
      ctx.beginPath();
      ctx.moveTo(x - r * 0.32, y - r * 0.12);
      ctx.lineTo(x - r * 0.14, y - r * 0.02);
      ctx.lineTo(x - r * 0.32, y + r * 0.08);
      ctx.moveTo(x + r * 0.32, y - r * 0.12);
      ctx.lineTo(x + r * 0.14, y - r * 0.02);
      ctx.lineTo(x + r * 0.32, y + r * 0.08);
      ctx.stroke();
    } else if (this.face === 'miss') {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.3, y - r * 0.05);
      ctx.lineTo(x - r * 0.12, y - r * 0.05);
      ctx.moveTo(x + r * 0.12, y - r * 0.05);
      ctx.lineTo(x + r * 0.3, y - r * 0.05);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2b1a08';
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.08, r * 0.07, 0, Math.PI * 2);
      ctx.arc(x + r * 0.2, y - r * 0.08, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
    // 입.
    ctx.beginPath();
    if (this.face === 'miss') {
      ctx.moveTo(x - r * 0.12, y + r * 0.28);
      ctx.lineTo(x + r * 0.12, y + r * 0.28);
    } else {
      ctx.arc(x, y + r * 0.14, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx.stroke();
    // 가속 중 분홍 모자.
    if (rushed) {
      ctx.fillStyle = '#ff71ce';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.55, r * 0.22, Math.PI, 0);
      ctx.fill();
    }
    ctx.restore();
    drawVersusLabel(ctx, `${this.catches}마리`, lo + hw / 2, 50, 30);
    if (this.hint) drawVersusLabel(ctx, this.hint, lo + hw / 2, 84, 20, '#dfff00');
    void height;
  }
}
