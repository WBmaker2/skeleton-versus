// src/versus-games/run-duel/run-duel.ts
// 제자리 달리기 GP: 무릎을 좌우 교대로 들어 올려 달린다.
// 2스텝 = 1m 환산, 1m당 +5점. 막판 10초는 스프린트 ×2 보너스.
// 공격 없음, 순수 거리 레이스. 무릎이 잘 안 보이면 어깨上下 진동으로 보조한다.
import type { PoseFrame } from '../../pose/types';
import { getByName, shoulderWidth } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import type { AttackBus } from '../../versus/attack';
import { drawVersusLabel } from '../../versus/draw';

export type RunSide = 'p1' | 'p2';

export const RUN_STEP_PEAK = 0.2; // 무릎 들어올림 인정 임계 (어깨너비 배율)
export const RUN_SPRINT_SEC = 10; // 막판 스프린트 구간

export class RunDuelSide {
  board = new ScoreBoard();
  steps = 0;
  meters = 0;
  elapsedMs = 0;
  private running = false;
  // 좌우 무릎 높이 추적 (피크 검출용).
  private upL = false;
  private upR = false;
  private lastStep: 'left' | 'right' | null = null;
  private hasPrev = false;
  private sprintAnnounced = false;

  constructor(
    public side: RunSide,
    private attacks: AttackBus
  ) {
    void attacks;
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.steps = 0;
    this.meters = 0;
    this.elapsedMs = 0;
    this.upL = false;
    this.upR = false;
    this.lastStep = null;
    this.hasPrev = false;
    this.sprintAnnounced = false;
  }
  stop(): void {
    this.running = false;
  }

  get sprint(): boolean {
    return this.elapsedMs >= (60 - RUN_SPRINT_SEC) * 1000;
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.elapsedMs += dtMs;
    const events: GameEvent[] = [];
    if (!this.sprintAnnounced && this.sprint) {
      this.sprintAnnounced = true;
      events.push({ type: 'sprint', points: 0, label: '막판 스프린트! 점수 2배' });
    }
    const lk = getByName(frame, 'left_knee');
    const rk = getByName(frame, 'right_knee');
    const ls = getByName(frame, 'left_shoulder');
    const rs = getByName(frame, 'right_shoulder');
    if (!lk || !rk || !ls || !rs) return events;
    if ((lk.score ?? 0) < 0.3 || (rk.score ?? 0) < 0.3) return events;
    const sw = Math.max(1, shoulderWidth(frame));
    // 무릎이 어깨너비 0.2배 이상 올라오면 '듦' 상태.
    // 기준선은 양쪽 무릎 중 낮은 쪽 (서 있는 쪽 발).
    const base = Math.max(lk.y, rk.y);
    const upNowL = base - lk.y > RUN_STEP_PEAK * sw;
    const upNowR = base - rk.y > RUN_STEP_PEAK * sw;
    if (!this.hasPrev) {
      this.upL = upNowL;
      this.upR = upNowR;
      this.hasPrev = true;
      return events;
    }
    // 위로 올라가는 상승 엣지에서 좌우 교대로 스텝 인정.
    const stepped = (upNow: boolean, wasUp: boolean, side: 'left' | 'right'): boolean => {
      if (upNow && !wasUp && this.lastStep !== side) {
        this.lastStep = side;
        return true;
      }
      return false;
    };
    const sL = stepped(upNowL, this.upL, 'left');
    const sR = stepped(upNowR, this.upR, 'right');
    this.upL = upNowL;
    this.upR = upNowR;
    if (!sL && !sR) return events;
    this.steps += 1;
    if (this.steps % 2 === 0) {
      this.meters += 1;
      const pts = this.sprint ? 10 : 5;
      this.board.comboHit();
      this.board.add(pts);
      events.push({
        type: this.sprint ? 'sprint' : 'step', points: pts,
        label: `${this.side === 'p1' ? 'P1' : 'P2'} ${this.meters}m!`
      });
    }
    return events;
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const cx = lo + width / 4;
    drawVersusLabel(ctx, `${this.meters}m`, cx, 60, 44);
    drawVersusLabel(
      ctx, this.sprint ? '스프린트 ×2!' : `${this.steps}스텝`,
      cx, 100, 22, this.sprint ? '#ff71ce' : 'rgba(255,255,255,0.85)'
    );
    void height;
  }
}
