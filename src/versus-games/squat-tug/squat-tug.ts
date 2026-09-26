// src/versus-games/squat-tug/squat-tug.ts
// 스쿼트 줄다리기: 앉았다 일어서면 줄을 당긴다.
// 박자(2초)에 맞추면 Perfect 2칸, 아니면 1칸.
// 5연속 Perfect면 3초 파워 당기기 (상대 화면 흔들림 + 상대 당김 절반).
import type { PoseFrame } from '../../pose/types';
import { angleDeg, getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';

export type TugSide = 'p1' | 'p2';

// 무릎 각도 (엉덩이-무릎-발목). 180이면 일직선(서있음), 90이면 직각(앉음).
export function kneeAngle(frame: PoseFrame, side: 'left' | 'right' = 'left'): number {
  const hip = getByName(frame, `${side}_hip`);
  const knee = getByName(frame, `${side}_knee`);
  const ankle = getByName(frame, `${side}_ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleDeg(hip, knee, ankle);
}

// 박자: 2초 주기, 일어서는 순간이 박자에 ±0.3초 안이면 Perfect 2칸.
export const TUG_BEAT_MS = 2000;
export const TUG_PERFECT_MS = 300;
// 줄 승리선: |pos| 30 이상으로 넘어가면 승리.
export const TUG_WIN_POS = 30;

// 줄 위치: -100(P1 승리) ~ +100(P2 승리). 0에서 시작.
export class TugRope {
  pos = 0;
  pull(side: TugSide, amount: number, slowed: boolean): void {
    const eff = slowed ? amount * 0.5 : amount;
    this.pos += side === 'p1' ? -eff : eff;
    this.pos = Math.max(-100, Math.min(100, this.pos));
  }
  winner(): 'p1' | 'p2' | 'draw' {
    if (this.pos <= -TUG_WIN_POS) return 'p1';
    if (this.pos >= TUG_WIN_POS) return 'p2';
    return 'draw';
  }
}

// 박자 오차 0~1 (0=정박). 일어서는 순간 beatMs가 0 근처면 Perfect.
export function beatError(beatMs: number): number {
  return Math.min(beatMs, TUG_BEAT_MS - beatMs);
}

// 줄 + 박자바 오버레이. 전체 너비에 그린다 (좌우 클립 밖에서 호출).
export function drawTugOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rope: TugRope,
  beatMs: number
): void {
  ctx.save();
  const midY = height * 0.42;
  // 줄: 왼쪽 끝(P1) ~ 오른쪽 끝(P2), 가운데가 중립
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(20, midY);
  ctx.lineTo(width - 20, midY);
  ctx.stroke();
  // 승리선 표시 (|30 위치)
  const winL = width / 2 - (TUG_WIN_POS / 100) * (width / 2 - 40);
  const winR = width / 2 + (TUG_WIN_POS / 100) * (width / 2 - 40);
  ctx.restore();
  drawVersusLabel(ctx, 'P1 승리선', winL, midY - 14, 14, 'rgba(255,255,255,0.85)');
  drawVersusLabel(ctx, 'P2 승리선', winR, midY - 14, 14, 'rgba(255,255,255,0.85)');
  ctx.save();
  // 줄 매듭: 현재 위치
  const knotX = width / 2 + (rope.pos / 100) * (width / 2 - 40);
  ctx.fillStyle = '#dfff00';
  ctx.beginPath();
  ctx.arc(knotX, midY, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22303c';
  ctx.beginPath();
  ctx.arc(knotX, midY, 6, 0, Math.PI * 2);
  ctx.fill();
  // 박자바: 아래쪽에 2초 주기 진행 + Perfect 구간(양끝) 표시
  const barW = Math.min(width * 0.7, 560);
  const barX = (width - barW) / 2;
  const barY = height - 64;
  const phase = beatMs / TUG_BEAT_MS;
  const perfectW = (TUG_PERFECT_MS / TUG_BEAT_MS) * barW;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(barX, barY, barW, 12);
  ctx.fillStyle = 'rgba(223,255,0,0.55)';
  ctx.fillRect(barX, barY, perfectW, 12);
  ctx.fillRect(barX + barW - perfectW, barY, perfectW, 12);
  ctx.fillStyle = '#fff';
  const dotX = barX + phase * barW;
  ctx.beginPath();
  ctx.arc(dotX, barY + 6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawVersusLabel(ctx, '박자에 맞춰 일어나면 2칸!', width / 2, barY - 8, 14, 'rgba(255,255,255,0.85)');
}

export class SquatTugSide {
  board = new ScoreBoard();
  reps = 0;
  perfectStreak = 0;
  depth = 0;
  private running = false;
  private isDown = false;
  private holdMs = 0;
  private beatMsValue = 0;

  constructor(
    public side: TugSide,
    private rope: TugRope,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.reps = 0;
    this.perfectStreak = 0;
    this.depth = 0;
    this.isDown = false;
    this.holdMs = 0;
    this.beatMsValue = 0;
  }
  stop(): void {
    this.running = false;
  }

  get slowed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'power-pull';
  }

  // 박자 진행 0~2000ms. 오버레이 박자바와 같은 시계를 쓴다.
  get beatPhaseMs(): number {
    return this.beatMsValue;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.beatMsValue += dtMs;
    if (this.beatMsValue >= TUG_BEAT_MS) this.beatMsValue -= TUG_BEAT_MS;
    // 무릎 각도 -> 깊이 0~1 (140도 이상 서있음, 100도 이하 앉음)
    const ang = Math.min(kneeAngle(frame, 'left'), kneeAngle(frame, 'right'));
    this.depth = Math.max(0, Math.min(1, (140 - ang) / 40));
    const down = this.depth > 0.6;
    const events: GameEvent[] = [];
    if (down && !this.isDown) {
      this.isDown = true;
      this.holdMs = 0;
    } else if (down && this.isDown) {
      this.holdMs += dtMs;
    } else if (!down && this.isDown && this.depth < 0.35) {
      // 일어섬 = 1회 완성 (300ms 이상 앉았을 때만)
      if (this.holdMs >= 200) {
        this.reps += 1;
        const perfect = beatError(this.beatMsValue) < TUG_PERFECT_MS;
        const pull = perfect ? 6 : 3;
        this.rope.pull(this.side, pull, this.slowed);
        this.board.comboHit();
        this.board.add(perfect ? 15 : 10);
        if (perfect) {
          this.perfectStreak += 1;
          events.push({ type: 'beat', points: 15, label: `${label(this.side)} Perfect! 줄 +2` });
          if (this.perfectStreak % 5 === 0) {
            if (this.attacks.send('power-pull', this.side)) {
              events.push({ type: 'attack', points: 0, label: '파워 당기기! 상대 둔화 3초' });
            }
          }
        } else {
          this.perfectStreak = 0;
          events.push({ type: 'beat', points: 10, label: `${label(this.side)} 당김!` });
        }
      } else {
        this.isDown = false;
      }
      this.isDown = false;
      this.holdMs = 0;
    }
    void getByName;
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 내 깊이 게이지 (각자 영역 아래)
    const x = this.side === 'p1' ? width * 0.05 : width * 0.55;
    const w = width * 0.4;
    const y = height - 40;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x, y, w, 12);
    ctx.fillStyle = this.depth > 0.6 ? '#dfff00' : '#00ffff';
    ctx.fillRect(x, y, w * this.depth, 12);
    ctx.restore();
    drawVersusLabel(ctx, `${this.side === 'p1' ? 'P1' : 'P2'} ${this.reps}회`, x + w / 2, y - 8, 18);
  }
}

function label(s: TugSide): string {
  return s === 'p1' ? 'P1' : 'P2';
}
