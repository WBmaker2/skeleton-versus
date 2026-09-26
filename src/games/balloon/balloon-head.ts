import type { PoseFrame } from '../../pose/types';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawLabel } from '../../ui/renderer';

export interface Balloon {
  x: number;
  y: number;
  vy: number;
  alive: boolean;
  /** 타격 직후 중복 카운트 방지 쿨다운 (ms). */
  cool: number;
  /** 접촉 중이면 true: 접촉권을 벗어나야 다음 타격이 인정된다. */
  touched: boolean;
}

// 풍선 헤딩: 머리로 풍선을 떨어뜨리지 않기. 목·코어.
// 풍선은 주기적으로 추가되어 최대 3개까지 동시에 뜬다.
export class BalloonHead implements Game {
  id = 'balloon';
  // 풍선 컴포넌트가 잘 보이도록 얼굴 마스크를 절반 크기로 축소.
  faceScale = 0.5;
  balloons: Balloon[] = [{ x: 320, y: 80, vy: 60, alive: true, cool: 0, touched: false }];
  board = new ScoreBoard();
  hits = 0;
  private running = false;
  // 기존 풍선이 있어도 일정 간격으로 새 풍선을 추가한다.
  private spawnMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.hits = 0;
    this.balloons = [{ x: 320, y: 80, vy: 60, alive: true, cool: 0, touched: false }];
    this.spawnMs = BalloonHead.SPAWN_INTERVAL_MS;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    for (const b of this.balloons) {
      if (!b.alive) continue;
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + 42);
      ctx.lineTo(b.x, b.y + 88);
      ctx.stroke();
      ctx.fillStyle = '#ff71ce';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 38, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawLabel(ctx, `${this.hits}번`, width - 70, 50, 30);
  }
  private headOf(frame: PoseFrame): { x: number; y: number } | null {
    // 헤딩 판정점: 얼굴 중심(코)이 아니라 마스크 상단(이마·머리 경계선).
    // 화면에 그려지는 마스크와 같은 기준으로 상단점을 구한다:
    // 마스크 한 변 = 어깨너비 × 1.4 × faceScale, 중심은 코 위치.
    const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
    const nose = byName.get('nose');
    const ls = byName.get('left_shoulder');
    const rs = byName.get('right_shoulder');
    const sw =
      ls && rs ? Math.max(40, Math.hypot(ls.x - rs.x, ls.y - rs.y)) : 100;
    const half = (sw * 1.4 * this.faceScale) / 2;
    if (nose && (nose.score ?? 0) > 0.3) return { x: nose.x, y: nose.y - half };
    if (ls && rs) return { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 - 40 - half };
    return null;
  }
  private static readonly MAX_BALLOONS = 3;
  private static readonly SPAWN_INTERVAL_MS = 1500;
  private static readonly MIN_SPAWN_DIST = 150;
  private static readonly CONTACT_R = 54;
  private static readonly SEPARATE_R = 72;
  private static readonly BUMP_COOLDOWN_MS = 500;

  private spawnRandom(frame: PoseFrame): void {
    for (let i = 0; i < 12; i++) {
      const x = frame.width * 0.12 + Math.random() * frame.width * 0.76;
      const y = -20 - Math.random() * 80;
      const ok = this.balloons.every(
        (b) => !b.alive || Math.hypot(b.x - x, b.y - y) >= BalloonHead.MIN_SPAWN_DIST
      );
      if (!ok) continue;
      this.balloons.push({ x, y, vy: 60, alive: true, cool: 0, touched: false });
      return;
    }
    // 12번 시도해도 기존 풍선과 거리가 확보되지 않으면 이번 차례는 건너뛴다.
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const events: GameEvent[] = [];
    const dt = dtMs / 1000;
    const head = this.headOf(frame);
    for (const b of this.balloons) {
      if (!b.alive) continue;
      if (b.cool > 0) b.cool -= dtMs;
      b.vy += 140 * dt;
      b.y += b.vy * dt;
      if (head) {
        const dist = Math.hypot(head.x - b.x, head.y - b.y);
        // 접촉권을 완전히 벗어나야 다음 타격이 인정된다.
        // 머리를 풍선에 붙인 채로 있으면 같은 헤딩으로 중복 카운트하지 않는다.
        // 풍선별 상태라 2개를 동시에 받는 것은 각각 인정된다.
        if (dist > BalloonHead.SEPARATE_R) b.touched = false;
        if (!b.touched && b.cool <= 0 && dist < BalloonHead.CONTACT_R) {
          b.vy = -330;
          b.cool = BalloonHead.BUMP_COOLDOWN_MS;
          b.touched = true;
          this.hits += 1;
          this.board.comboHit();
          this.board.add(5);
          events.push({ type: 'bump', points: 5, label: `${this.hits}번 받았어요!` });
          continue;
        }
      }
      if (b.y > frame.height + 40) {
        b.alive = false;
        this.board.comboMiss();
        events.push({ type: 'drop', points: 0, label: '풍선이 떨어졌어요' });
      }
    }
    // 떨어진 풍선은 목록에서 제거한다 (화면에 남은 풍선으로 계속 플레이).
    this.balloons = this.balloons.filter((b) => b.alive);
    // 기존 풍선이 남아 있어도 주기적으로 새 풍선을 추가한다 (최대 3개).
    // 물리 적용 뒤에 스폰해야 newborn이 같은 틱에 낙하하지 않는다.
    this.spawnMs -= dtMs;
    if (this.spawnMs <= 0) {
      if (this.balloons.length < BalloonHead.MAX_BALLOONS) {
        this.spawnRandom(frame);
      }
      this.spawnMs = BalloonHead.SPAWN_INTERVAL_MS;
    }
    return events;
  }
}
