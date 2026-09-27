// src/versus-games/clap-duel/clap-duel.ts
// 박수 대전: 양손을 합쳤다 벌릴 때마다 1회 (+3).
// 붙인 채로는 카운트하지 않는다 (떼었다 합쳐야 인정).
// 20연속마다 상대 박수 판정 강화 5초 (합침 기준 0.3→0.2어깨너비).
import type { PoseFrame } from '../../pose/types';
import { getByName, shoulderWidth } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';

export type ClapSide = 'p1' | 'p2';

export const CLAP_TOGETHER = 0.3; // 어깨너비 배율
export const CLAP_TOGETHER_STRICT = 0.2;

export class ClapDuelSide {
  board = new ScoreBoard();
  claps = 0;
  gapRatio = 1;
  private running = false;
  private wasTogether = false;

  constructor(
    public side: ClapSide,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.claps = 0;
    this.gapRatio = 1;
    this.wasTogether = false;
  }
  stop(): void {
    this.running = false;
  }

  get stricted(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'strict';
  }

  tick(frame: PoseFrame, _dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const lw = getByName(frame, 'left_wrist');
    const rw = getByName(frame, 'right_wrist');
    if (!lw || !rw || (lw.score ?? 0) < 0.3 || (rw.score ?? 0) < 0.3) return [];
    const sw = shoulderWidth(frame);
    const gap = Math.hypot(lw.x - rw.x, lw.y - rw.y) / Math.max(1, sw);
    this.gapRatio = gap;
    const limit = this.stricted ? CLAP_TOGETHER_STRICT : CLAP_TOGETHER;
    const together = gap < limit;
    const events: GameEvent[] = [];
    // 떼었다 합칠 때만 1회 인정 (붙인 채로는 카운트 안 됨).
    if (together && !this.wasTogether) {
      this.claps += 1;
      this.board.comboHit();
      this.board.add(3);
      events.push({ type: 'clap', points: 3, label: `${this.side === 'p1' ? 'P1' : 'P2'} 박수 ${this.claps}회!` });
      // 20연속마다 상대 박수 판정 강화 5초 (쿨타임은 AttackBus가 관리).
      if (this.board.combo % 20 === 0) {
        if (this.attacks.send('strict', this.side)) {
          events.push({ type: 'attack', points: 0, label: '방해! 상대 박수 판정 강화 5초' });
        }
      }
    }
    this.wasTogether = together;
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    drawVersusLabel(ctx, `${this.claps}회`, lo + width / 4, 50, 30);
    // 합침 게이지 (가까울수록 참).
    const barW = Math.min(width * 0.3, 200);
    const frac = Math.max(0, Math.min(1, 1 - this.gapRatio));
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(lo + width / 4 - barW / 2, 80, barW, 12);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(lo + width / 4 - barW / 2, 80, barW * frac, 12);
    ctx.restore();
    void height;
  }
}
