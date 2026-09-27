// src/versus-games/zombie-duel/zombie-duel.ts
// 좀비 대전: 각자 자기 반쪽의 3레인에서 다가오는 좀비를 피한다.
// 판정선에 닿을 때 좀비와 다른 레인에 있으면 회피 (+10).
// 5연속 회피면 상대 좀비 가속 (1.5배, 5초).
// 좀비 줄은 공유 떼에서 같은 순서로 받고 좌우 대칭으로 나온다.
import type { PoseFrame } from '../../pose/types';
import { bodyCenterX } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';
import { SharedZombieHorde, type HordeZone } from './zombie-horde';

export type ZombieSide = 'p1' | 'p2';

export interface DuelGhoul {
  zone: HordeZone;
  y: number;
  alive: boolean;
}

const SPAWN_INTERVAL_MS = 1200;
const FALL_PX_PER_SEC = 220;
const RUSH_MULT = 1.5;

function zoneOf(x: number, side: ZombieSide, width: number): HordeZone {
  const lo = side === 'p1' ? 0 : width / 2;
  const rel = Math.max(0, Math.min(width / 2 - 1, x - lo)) / (width / 2);
  if (rel < 1 / 3) return 0;
  if (rel < 2 / 3) return 1;
  return 2;
}

export class ZombieDuelSide {
  board = new ScoreBoard();
  ghouls: DuelGhoul[] = [];
  dodged = 0;
  playerX: number | null = null;
  playerZone: HordeZone = 1;
  private running = false;
  private spawnMs = 0;

  constructor(
    public side: ZombieSide,
    private attacks: AttackBus,
    private horde: SharedZombieHorde
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.ghouls = [];
    this.dodged = 0;
    this.spawnMs = 0;
    this.playerX = null;
    this.playerZone = 1;
  }
  stop(): void {
    this.running = false;
  }

  // 상대의 좀비 가속 공격을 받고 있으면 true.
  get rushed(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'rush';
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > SPAWN_INTERVAL_MS) {
      this.spawnMs = 0;
      this.ghouls.push({ zone: this.horde.nextFor(this.side), y: -20, alive: true });
    }
    const cx = bodyCenterX(frame);
    const player = zoneOf(cx, this.side, frame.width);
    this.playerX = cx;
    this.playerZone = player;
    const events: GameEvent[] = [];
    const judgeY = frame.height - 20;
    const speed = FALL_PX_PER_SEC * (this.rushed ? RUSH_MULT : 1);
    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      gh.y += speed * dt;
      if (gh.y < judgeY) continue;
      gh.alive = false;
      if (player !== gh.zone) {
        this.dodged += 1;
        this.board.comboHit();
        this.board.add(10);
        events.push({ type: 'dodge', points: 10, label: `${this.side === 'p1' ? 'P1' : 'P2'} 좀비를 피했어요!` });
        // 5연속 회피면 상대 좀비 가속 5초 (쿨타임은 AttackBus가 관리).
        if (this.board.combo % 5 === 0) {
          if (this.attacks.send('rush', this.side)) {
            events.push({ type: 'attack', points: 0, label: '방해! 상대 좀비 가속 5초' });
          }
        }
      } else {
        this.board.comboMiss();
        events.push({ type: 'caught', points: 0, label: '좀비에게 잡혔어요' });
      }
    }
    this.ghouls = this.ghouls.filter((g) => g.alive);
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const hw = width / 2;
    const judgeY = height - 20;
    // 내가 서 있는 레인 은은하게 밝히기.
    ctx.save();
    ctx.fillStyle = 'rgba(223, 255, 0, 0.10)';
    ctx.fillRect(lo + this.playerZone * (hw / 3), 0, hw / 3, judgeY);
    ctx.restore();
    // 레인 구분선 2개.
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.setLineDash([10, 8]);
    for (const fx of [1 / 3, 2 / 3]) {
      const lx = lo + hw * fx;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, judgeY);
      ctx.stroke();
    }
    ctx.restore();
    // 땅 가로선.
    ctx.save();
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(lo, judgeY, hw, 6);
    ctx.restore();
    // 좀비.
    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      const cx = lo + (hw * (gh.zone * 2 + 1)) / 6;
      ctx.save();
      ctx.fillStyle = this.rushed ? '#ff71ce' : '#3d9e57';
      ctx.beginPath();
      ctx.arc(cx, gh.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 10, gh.y, 7, 0, Math.PI * 2);
      ctx.arc(cx + 10, gh.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22303c';
      ctx.beginPath();
      ctx.arc(cx - 10, gh.y + 1, 3, 0, Math.PI * 2);
      ctx.arc(cx + 10, gh.y + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 하단 러너: 몸 중심을 따라다닌다.
    if (this.playerX !== null) {
      const heroX = Math.min(lo + hw - 20, Math.max(lo + 20, this.playerX));
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(heroX, judgeY - 14, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dfff00';
      ctx.fillRect(heroX - 14, judgeY - 34, 28, 6);
      ctx.restore();
    }
    drawVersusLabel(ctx, `${this.dodged}회 회피`, lo + hw / 2, 44, 26);
  }
}
