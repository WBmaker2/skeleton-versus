// src/games/squat/squat-runner.ts
import type { PoseFrame } from '../../pose/types';
import { angleDeg, getByName } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel } from '../../ui/renderer';

export function kneeAngle(frame: PoseFrame, side: 'left' | 'right' = 'left'): number {
  const hip = getByName(frame, `${side}_hip`);
  const knee = getByName(frame, `${side}_knee`);
  const ankle = getByName(frame, `${side}_ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleDeg(hip, knee, ankle);
}

export interface RunnerObstacle { x: number; alive: boolean }
export interface RunnerCoin { x: number; lane: 'high' | 'low'; alive: boolean }

export class SquatRunner implements Game {
  id = 'squat';
  board = new ScoreBoard();
  isDown = false;
  reps = 0;
  obstacles: RunnerObstacle[] = [];
  coins: RunnerCoin[] = [];
  distanceM = 0;
  beatCount = 0;
  // 스쿼트 깊이 0(서있음)~1(완전 앉음): 매 프레임 즉시 갱신 (시각·판정용).
  // 횟수 인정(isDown)은 기존 300ms 홀드 유지.
  squatDepth = 0;
  // 앉은 상태 히스테리시스: 0.6에서 진입, 0.35에서 해제 (경계 떨림 방지).
  ducking = false;
  private running = false;
  private holdMs = 0;
  private elapsedMs = 0;
  private distancePx = 0;
  private scrollX = 0;
  private beatClock = 0;
  private beatAgeMs = 0;
  private pendingHighMs: number[] = [];

  get speedPxPerSec(): number {
    return Math.min(700, 320 + (this.elapsedMs / 1000) * 4 + this.board.combo * 8);
  }

  // 박자 간격: 2.0초 시작 → 60초에 1.4초까지 가속.
  get beatIntervalMs(): number {
    return Math.max(1400, 2000 - (this.elapsedMs / 1000) * 10);
  }

  get beatClockMs(): number {
    return this.beatClock;
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.isDown = false;
    this.reps = 0;
    this.holdMs = 0;
    this.obstacles = [];
    this.coins = [];
    this.distanceM = 0;
    this.distancePx = 0;
    this.elapsedMs = 0;
    this.scrollX = 0;
    this.beatCount = 0;
    this.beatClock = 0;
    this.beatAgeMs = 0;
    this.pendingHighMs = [];
    this.squatDepth = 0;
    this.ducking = false;
  }
  stop(): void {
    this.running = false;
  }
  spawnObstacle(x = 680): void {
    this.obstacles.push({ x, alive: true });
  }
  spawnCoin(lane: 'high' | 'low' = Math.random() < 0.5 ? 'high' : 'low', x = 680): void {
    this.coins.push({ x, lane, alive: true });
  }
  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const groundY = height - 60;
    const playerX = width * 0.22;
    // 트랙: 바닥 라인 + 스크롤 대시로 속도감.
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, groundY, width, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const gap = 80;
    const off = -(this.scrollX % gap);
    for (let x = off; x < width; x += gap) {
      ctx.fillRect(x, groundY + 16, 44, 6);
    }
    // 속도선: 콤보가 붙으면 3줄 스피드 라인.
    if (this.board.combo >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i++) {
        const y = groundY - 140 - i * 26;
        ctx.fillRect(0, y, width * 0.3, 3);
      }
    }
    // 플레이어: 깊이에 따라 즉시 찌그러짐 (홀드 대기 없음).
    const d = this.squatDepth;
    const pw = 44 + 12 * d;
    const ph = 90 - 40 * d;
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(playerX - pw / 2, groundY - ph, pw, ph);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(playerX, groundY - ph - 14, 13, 0, Math.PI * 2);
    ctx.fill();
    // 장애물: 머리 높이 오버헤드 바 (앉아야 통과: 주황+↓).
    for (const ob of this.obstacles) {
      if (!ob.alive) continue;
      const barY = groundY - 118;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(ob.x - 27, barY, 54, 30);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(ob.x - 27, barY, 54, 5);
      ctx.fillRect(ob.x - 27, barY + 25, 54, 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↓', ob.x, barY + 15);
    }
    // 코인: low=앉아서(주황↓), high=서서(하늘↑).
    for (const c of this.coins) {
      if (!c.alive) continue;
      const low = c.lane === 'low';
      const cy = low ? groundY - 26 : groundY - 128;
      ctx.fillStyle = low ? '#f59e0b' : '#22d3ee';
      ctx.beginPath();
      ctx.arc(c.x, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = low ? '#7c2d12' : '#0e7490';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(low ? '↓' : '↑', c.x, cy + 1);
    }
    ctx.restore();
    // 박자 바: 일어나는 시간(노랑) + 앉을 타이밍 윈도우(주황) + 펄스.
    const interval = this.beatIntervalMs;
    const frac = Math.min(1, this.beatClock / interval);
    const bx = width * 0.25;
    const bw = width * 0.5;
    const winW = bw * Math.min(1, 350 / interval);
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 22, 0.6)';
    ctx.fillRect(bx, 152, bw, 10);
    ctx.fillStyle = '#dfff00';
    ctx.fillRect(bx, 152, bw * frac, 10);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
    ctx.fillRect(bx + bw - winW, 152, winW, 10);
    const pulse = Math.max(0, 1 - this.beatAgeMs / 400);
    ctx.fillStyle = `rgba(223, 255, 0, ${0.5 + pulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(bx + bw + 18, 157, 8 + pulse * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('일어나', bx, 166);
    ctx.textAlign = 'right';
    ctx.fillText('앉아!', bx + bw, 166);
    ctx.restore();
    const bpm = Math.round(60000 / interval);
    const cue = this.cueText();
    drawLabel(ctx, cue, width / 2, 78, cue === '지금 앉아!' ? 48 : 40);
    drawLabel(ctx, `${this.reps}회 · ${this.distanceM.toFixed(0)}m · ${bpm}BPM`, width / 2, 128, 28);
  }
  // 다음 동작 예고: 박자 순간=앉기, 박자 사이=일어나기.
  // 안내·판정이 같은 히스테리시스 상태를 봐서 서로 어긋나지 않는다.
  cueText(): string {
    if (this.ducking) return '일어서세요!';
    const toBeat = this.beatIntervalMs - this.beatClock;
    if (toBeat <= 350) return '지금 앉아!';
    return `앉기까지 ${Math.ceil(toBeat / 1000)}초`;
  }
  // 깊이 추정: 발목이 안 보여도 허벅지 기울기로 추정하고,
  // 쓸 키포인트가 하나도 없으면 null (이전 깊이 유지 → 깜빡임 방지).
  private depthOf(frame: PoseFrame): number | null {
    let best: number | null = null;
    for (const side of ['left', 'right'] as const) {
      const hip = getByName(frame, `${side}_hip`);
      const knee = getByName(frame, `${side}_knee`);
      if (!hip || !knee) continue;
      const ankle = getByName(frame, `${side}_ankle`);
      let d: number;
      if (ankle) {
        d = (150 - angleDeg(hip, knee, ankle)) / 55;
      } else {
        // 허벅지와 연직선 사이 기울기: 서있음 0° → 앉음 70°.
        const tx = knee.x - hip.x;
        const ty = knee.y - hip.y;
        const len = Math.hypot(tx, ty) || 1e-6;
        const cos = Math.min(1, Math.max(-1, ty / len));
        d = (Math.acos(cos) * 180) / Math.PI / 70;
      }
      const cd = Math.min(1, Math.max(0, d));
      best = best === null ? cd : Math.max(best, cd);
    }
    return best;
  }
  private onBeat(width: number, interval: number): void {
    this.beatCount += 1;
    this.beatAgeMs = 0;
    const edge = width + 40;
    if (this.beatCount % 2 === 1) {
      this.spawnObstacle(edge);
    } else {
      this.spawnCoin('low', edge);
    }
    // 박자 사이 높은 코인: 서있는 구간에 도착하도록 절반 박자 뒤 스폰.
    this.pendingHighMs.push(interval / 2);
  }
  tick(frame: PoseFrame, _dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = _dtMs / 1000;
    this.elapsedMs += _dtMs;
    const speed = this.speedPxPerSec;
    this.distancePx += speed * dt;
    this.distanceM = this.distancePx / 100;
    this.scrollX += speed * dt;
    this.beatAgeMs += _dtMs;
    // 박자 시계: 간격마다 onBeat 1회 (이동시간 ≈ 1박자라 스폰이 다음 박자에 도착).
    const interval = this.beatIntervalMs;
    this.beatClock += _dtMs;
    while (this.beatClock >= interval) {
      this.beatClock -= interval;
      this.onBeat(frame.width, interval);
    }
    const events: GameEvent[] = [];
    // 깊이는 홀드 없이 즉시 반영. 키포인트가 비면 이전 값 유지.
    const target = this.depthOf(frame);
    if (target !== null) this.squatDepth = target;
    if (this.squatDepth >= 0.6) this.ducking = true;
    else if (this.squatDepth <= 0.35) this.ducking = false;
    const ducking = this.ducking;
    if (ducking) {
      this.holdMs += _dtMs;
      if (!this.isDown && this.holdMs > 300) {
        this.isDown = true;
        this.reps += 1;
        this.board.comboHit();
        // 박자 판정: 최근 박자와 어긋남으로 Perfect/Good/어긋남.
        const off = Math.min(this.beatClock, interval - this.beatClock);
        if (this.reps % 10 === 0) {
          events.push({ type: 'rest', points: 0, label: '10회! 잠시 쉬세요' });
        } else if (off <= 150) {
          this.board.add(15);
          events.push({ type: 'duck', points: 15, label: `완벽한 박자! ${this.reps}회!` });
        } else if (off <= 350) {
          this.board.add(10);
          events.push({ type: 'duck', points: 10, label: `좋은 박자! ${this.reps}회!` });
        } else {
          this.board.add(5);
          events.push({ type: 'duck', points: 5, label: `${this.reps}회! (박자를 맞춰보세요)` });
        }
      }
    } else {
      this.holdMs = 0;
      this.isDown = false;
    }
    // 박자 사이 높은 코인 스폰.
    const playerX = frame.width * 0.22;
    this.pendingHighMs = this.pendingHighMs
      .map((ms) => ms - _dtMs)
      .filter((ms) => {
        if (ms <= 0) {
          this.spawnCoin('high', frame.width + 40);
          return false;
        }
        return true;
      });
    for (const ob of this.obstacles) {
      if (!ob.alive) continue;
      ob.x -= speed * dt;
      if (ob.x <= playerX) {
        ob.alive = false;
        if (ducking) {
          this.board.comboHit();
          this.board.add(10);
          events.push({ type: 'dodge', points: 10, label: '장애물 통과!' });
        } else {
          this.board.comboMiss();
          events.push({ type: 'caught', points: 0, label: '부딪혔어요! 앉으세요!' });
        }
      }
    }
    for (const c of this.coins) {
      if (!c.alive) continue;
      c.x -= speed * dt;
      const wantsDown = c.lane === 'low';
      if (Math.abs(c.x - playerX) < 34) {
        if (ducking === wantsDown) {
          c.alive = false;
          this.board.comboHit();
          this.board.add(5);
          events.push({ type: 'catch', points: 5, label: '코인!' });
        }
      } else if (c.x < playerX - 34) {
        c.alive = false;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.alive && o.x > -60);
    this.coins = this.coins.filter((c) => c.alive && c.x > -60);
    return events;
  }
}
