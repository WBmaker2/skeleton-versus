// src/versus-games/math-dash/math-dash.ts
// 수학 달리기 대전: 각자 자기 반쪽의 3구역(왼/가운데/오른)으로 이동 + 손들기.
// 먼저 맞추면 +20 + 상대에게 안개 3초, 나중이면 +10, 틀리면 -5.
import type { PoseFrame } from '../../pose/types';
import { bodyCenterX, getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { makeQuiz, type Quiz } from '../../games/math/math-jump';
import type { AttackBus } from '../../versus/attack';

export type DashSide = 'p1' | 'p2';

function zoneOf(x: number, side: DashSide, width: number): 0 | 1 | 2 {
  const lo = side === 'p1' ? 0 : width / 2;
  const rel = Math.max(0, Math.min(width / 2 - 1, x - lo)) / (width / 2);
  if (rel < 1 / 3) return 0;
  if (rel < 2 / 3) return 1;
  return 2;
}

function handsUp(frame: PoseFrame): boolean {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  if (!lw || !rw || !ls || !rs) return false;
  return lw.y < ls.y - 10 && rw.y < rs.y - 10;
}

export class MathDashSide {
  board = new ScoreBoard();
  quiz: Quiz = makeQuiz();
  solved = 0;
  thinkMs = 0;
  dwellMs = 0;
  lastZone: 0 | 1 | 2 = 0;
  private running = false;
  // 먼저 푼 사람이 있으면 true (상대 보너스 감소용, 매니저가 설정)
  roundClaimed = false;

  constructor(
    public side: DashSide,
    private attacks: AttackBus
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.quiz = makeQuiz();
    this.solved = 0;
    this.thinkMs = 3500;
    this.dwellMs = 0;
    this.roundClaimed = false;
  }
  stop(): void {
    this.running = false;
  }

  get fogged(): boolean {
    const atk = this.side === 'p1' ? this.attacks.onP1 : this.attacks.onP2;
    return atk?.kind === 'fog';
  }

  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    this.thinkMs = Math.max(0, this.thinkMs - dtMs);
    const cx = bodyCenterX(frame);
    const zone = zoneOf(cx, this.side, frame.width);
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      this.dwellMs = 0;
    } else {
      this.dwellMs += dtMs;
    }
    const up = handsUp(frame);
    // 생각 시간 이후 + 같은 구역 0.6초 + 손들기, 또는 손들고 0.3초 유지 즉시 확정
    const ready = this.thinkMs <= 0 && ((this.dwellMs >= 600 && up) || (up && this.dwellMs >= 300));
    if (!ready) return [];
    const correct = zone === this.quiz.answerIndex;
    if (correct) {
      const first = !this.roundClaimed;
      this.roundClaimed = true;
      const pts = first ? 20 : 10;
      this.board.comboHit();
      this.board.add(pts);
      this.solved += 1;
      const ev: GameEvent[] = [{ type: 'correct', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} 정답! +${pts}` }];
      if (first && this.attacks.send('fog', this.side)) {
        ev.push({ type: 'attack', points: 0, label: '안개! 상대 숫자 흐림 3초' });
      }
      this.quiz = makeQuiz(this.quiz.q);
      this.thinkMs = 3500;
      this.dwellMs = 0;
      // 다음 라운드 선착순 리셋은 매니저(versus-main)에서 양쪽 roundClaimed=false로
      return ev;
    }
    this.board.comboMiss();
    this.board.add(-5);
    this.dwellMs = 0;
    return [{ type: 'wrong', points: -5, label: '땡! -5점' }];
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const lo = this.side === 'p1' ? 0 : width / 2;
    const hw = width / 2;
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '700 30px sans-serif';
    ctx.textAlign = 'center';
    // 안개 중이면 문제를 흐릿하게
    ctx.globalAlpha = this.fogged ? 0.35 : 1;
    ctx.fillText(this.quiz.q, lo + hw / 2, 70);
    ctx.globalAlpha = 1;
    ctx.font = '700 22px sans-serif';
    this.quiz.choices.forEach((c, i) => {
      const cx = lo + hw * ((i * 2 + 1) / 6);
      const active = i === this.lastZone;
      ctx.fillStyle = active ? '#dfff00' : 'rgba(255,255,255,0.85)';
      ctx.fillText(String(c), cx, 110);
    });
    if (this.thinkMs > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '400 16px sans-serif';
      ctx.fillText(`생각 중 ${(this.thinkMs / 1000).toFixed(1)}초`, lo + hw / 2, height - 60);
    }
    ctx.restore();
  }
}
