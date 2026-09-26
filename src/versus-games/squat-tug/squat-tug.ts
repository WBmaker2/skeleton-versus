// src/versus-games/squat-tug/squat-tug.ts
// 스쿼트 줄다리기: 앉았다 일어서면 줄을 당긴다.
// 박자(2초)에 맞추면 Perfect 2칸, 아니면 1칸.
// 5연속 Perfect면 3초 파워 당기기 (상대 화면 흔들림 + 상대 당김 절반).
import type { PoseFrame } from '../../pose/types';
import { kneeAngle } from '../../games/squat/squat-runner';
import { getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';

export type TugSide = 'p1' | 'p2';

// 줄 위치: -100(P1 승리) ~ +100(P2 승리). 0에서 시작.
export class TugRope {
  pos = 0;
  pull(side: TugSide, amount: number, slowed: boolean): void {
    const eff = slowed ? amount * 0.5 : amount;
    this.pos += side === 'p1' ? -eff : eff;
    this.pos = Math.max(-100, Math.min(100, this.pos));
  }
  winner(): 'p1' | 'p2' | 'draw' {
    if (this.pos <= -30) return 'p1';
    if (this.pos >= 30) return 'p2';
    return 'draw';
  }
}

export class SquatTugSide {
  board = new ScoreBoard();
  reps = 0;
  perfectStreak = 0;
  depth = 0;
  private running = false;
  private isDown = false;
  private holdMs = 0;
  private beatMs = 0;

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
    this.beatMs = 0;
  }
  stop(): void {
    this.running = false;
  }

  get slowed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'power-pull';
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.beatMs += dtMs;
    if (this.beatMs >= 2000) this.beatMs -= 2000;
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
        const beatErr = Math.min(this.beatMs, 2000 - this.beatMs);
        const perfect = beatErr < 300;
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
    ctx.fillStyle = '#fff';
    ctx.font = '700 18px sans-serif';
    ctx.fillText(`${this.side === 'p1' ? 'P1' : 'P2'} ${this.reps}회`, x, y - 8);
    ctx.restore();
  }
}

function label(s: TugSide): string {
  return s === 'p1' ? 'P1' : 'P2';
}
