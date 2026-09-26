import type { PoseFrame } from '../../pose/types';
import { bodyCenterX } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel } from '../../ui/renderer';

export interface Ghoul {
  zone: 0 | 1 | 2;
  y: number;
  alive: boolean;
}

// 좀비 스텝: 좌우 스텝으로 좀비 피하기. 유산소·민첩성.
export class ZombieSteps implements Game {
  id = 'zombie';
  // 얼굴 마스크를 가린다: 하단 캐릭터·구분선 시인성 확보 (별잡기·수학과 동일).
  hideFace = true;
  ghouls: Ghoul[] = [];
  board = new ScoreBoard();
  dodged = 0;
  // 실시간 화면 하단 캐릭터용: 마지막으로 본 몸 중심 X와 그때 프레임 너비.
  // 비율(playerX / frameWidth)로 보관해 해상도가 바뀌어도 같은 위치에 그린다.
  playerX: number | null = null;
  playerFrameWidth = 640;
  playerZone: 0 | 1 | 2 = 1;
  private running = false;
  private spawnMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.ghouls = [];
    this.dodged = 0;
    this.spawnMs = 0;
    this.playerX = null;
    this.playerFrameWidth = 640;
    this.playerZone = 1;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height?: number): void {
    const h = height ?? ctx.canvas?.height ?? 480;
    const judgeY = h - 20;
    const lineX1 = width / 3;
    const lineX2 = (width * 2) / 3;

    // 1) 내가 서 있는 구역 은은하게 밝히기 (어느 줄에 있는지 실시간으로 인식).
    ctx.save();
    ctx.fillStyle = 'rgba(223, 255, 0, 0.10)';
    ctx.fillRect(this.playerZone * (width / 3), 0, width / 3, judgeY);
    ctx.restore();

    // 2) 3등분 세로 구분선: 어두운 밑선 + 흰 점선으로 영상 위에서도 잘 보이게.
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10, 16, 22, 0.55)';
    for (const lx of [lineX1, lineX2]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, judgeY);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.setLineDash([12, 10]);
    for (const lx of [lineX1, lineX2]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, judgeY);
      ctx.stroke();
    }
    ctx.restore();

    // 3) 캐릭터가 달리는 땅: 판정선(judgeY)과 같은 높이의 가로선.
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 22, 0.55)';
    ctx.fillRect(0, judgeY - 2, width, 11);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(0, judgeY, width, 6);
    ctx.restore();

    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      const cx = (width * (gh.zone * 2 + 1)) / 6;
      ctx.save();
      ctx.fillStyle = '#3d9e57';
      ctx.beginPath();
      ctx.roundRect(cx - 36, gh.y - 26, 72, 80, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 15, gh.y + 2, 8, 0, Math.PI * 2);
      ctx.arc(cx + 15, gh.y + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22303c';
      ctx.beginPath();
      ctx.arc(cx - 15, gh.y + 3, 3, 0, Math.PI * 2);
      ctx.arc(cx + 15, gh.y + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 4) 하단 러너 캐릭터: 사용자 몸 중심을 따라 좌우로 함께 이동.
    // 좀비를 피하는 주체가 캐릭터라는 것을 직관적으로 보여준다.
    const ratio = this.playerX == null ? 0.5 : this.playerX / Math.max(1, this.playerFrameWidth);
    const heroX = Math.min(width - 34, Math.max(34, ratio * width));
    const heroSize = Math.min(46, Math.max(30, width / 18));
    drawHero(ctx, heroX, judgeY, heroSize);

    drawLabel(ctx, `${this.dodged}회 회피`, width / 2, 44, 26);
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  spawn(zone?: 0 | 1 | 2): void {
    const z = zone ?? (Math.floor(Math.random() * 3) as 0 | 1 | 2);
    this.ghouls.push({ zone: z, y: -20, alive: true });
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 1200) {
      this.spawnMs = 0;
      this.spawn();
    }
    const cx = bodyCenterX(frame);
    const player = this.zoneOf(cx, frame.width);
    // 하단 캐릭터가 따라다닐 수 있게 매 틱 위치를 기억한다.
    this.playerX = cx;
    this.playerFrameWidth = frame.width;
    this.playerZone = player;
    const events: GameEvent[] = [];
    // 판정선도 스테이지 바닥 기준 (해상도 독립).
    const judgeY = frame.height - 20;
    for (const gh of this.ghouls) {
      if (!gh.alive) continue;
      gh.y += 220 * dt;
      if (gh.y < judgeY) continue;
      gh.alive = false;
      if (player !== gh.zone) {
        this.dodged += 1;
        this.board.comboHit();
        this.board.add(10);
        events.push({ type: 'dodge', points: 10, label: '좀비를 피했어요!' });
      } else {
        this.board.comboMiss();
        events.push({ type: 'caught', points: 0, label: '좀비에게 잡혔어요' });
      }
    }
    this.ghouls = this.ghouls.filter((g) => g.alive);
    return events;
  }
}

// 하단 러너 캐릭터 (코드 직접 드로잉, 정면 symmetric — 셀카 미러에서도 방향 혼동 없음).
// 발바닥이 groundY에 닿도록 그린다. s = 기준 크기(px).
export function drawHero(ctx: CanvasRenderingContext2D, x: number, groundY: number, s = 36): void {
  const k = s / 36;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 그림자
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x, groundY + 10 * k, 22 * k, 6 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // 다리 (달리는 포즈)
  ctx.strokeStyle = '#22303c';
  ctx.lineWidth = 9 * k;
  ctx.beginPath();
  ctx.moveTo(x - 3 * k, groundY - 28 * k);
  ctx.lineTo(x - 10 * k, groundY + 2 * k);
  ctx.moveTo(x + 3 * k, groundY - 28 * k);
  ctx.lineTo(x + 10 * k, groundY + 2 * k);
  ctx.stroke();
  // 신발
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 11 * k, groundY + 2 * k, 5.5 * k, 0, Math.PI * 2);
  ctx.arc(x + 11 * k, groundY + 2 * k, 5.5 * k, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 (초록 후드티)
  ctx.fillStyle = '#22c55e';
  ctx.strokeStyle = '#0b3b22';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  const bw = 15 * k;
  const bt = groundY - 60 * k;
  const bh = 34 * k;
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x - bw, bt, bw * 2, bh, 10 * k);
  } else {
    ctx.rect(x - bw, bt, bw * 2, bh);
  }
  ctx.fill();
  ctx.stroke();
  // 주머니
  ctx.fillStyle = '#bbf7d0';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x - 8 * k, groundY - 36 * k, 16 * k, 9 * k, 4 * k);
  } else {
    ctx.rect(x - 8 * k, groundY - 36 * k, 16 * k, 9 * k);
  }
  ctx.fill();

  // 팔
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 8 * k;
  ctx.beginPath();
  ctx.moveTo(x - 13 * k, groundY - 54 * k);
  ctx.lineTo(x - 20 * k, groundY - 40 * k);
  ctx.moveTo(x + 13 * k, groundY - 54 * k);
  ctx.lineTo(x + 20 * k, groundY - 40 * k);
  ctx.stroke();
  // 손
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath();
  ctx.arc(x - 20 * k, groundY - 38 * k, 4.5 * k, 0, Math.PI * 2);
  ctx.arc(x + 20 * k, groundY - 38 * k, 4.5 * k, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  const hy = groundY - 74 * k;
  ctx.fillStyle = '#ffd9b3';
  ctx.strokeStyle = '#22303c';
  ctx.lineWidth = 2.5 * k;
  ctx.beginPath();
  ctx.arc(x, hy, 15 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 모자 (초록 돔 + 노랑 챙)
  ctx.fillStyle = '#16a34a';
  ctx.beginPath();
  ctx.arc(x, hy - 3 * k, 15 * k, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#dfff00';
  ctx.strokeStyle = '#22303c';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x - 18 * k, hy - 6 * k, 36 * k, 6 * k, 3 * k);
  } else {
    ctx.rect(x - 18 * k, hy - 6 * k, 36 * k, 6 * k);
  }
  ctx.fill();
  ctx.stroke();

  // 눈·볼·웃음
  ctx.fillStyle = '#22303c';
  ctx.beginPath();
  ctx.arc(x - 5.5 * k, hy + 1 * k, 2.2 * k, 0, Math.PI * 2);
  ctx.arc(x + 5.5 * k, hy + 1 * k, 2.2 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 154, 162, 0.85)';
  ctx.beginPath();
  ctx.arc(x - 9.5 * k, hy + 5 * k, 3 * k, 0, Math.PI * 2);
  ctx.arc(x + 9.5 * k, hy + 5 * k, 3 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#22303c';
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(x, hy + 3 * k, 6 * k, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  ctx.restore();
}
