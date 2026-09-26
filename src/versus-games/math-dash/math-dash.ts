// src/versus-games/math-dash/math-dash.ts
// 수학 달리기 대전: 각자 자기 반쪽의 3구역(왼/가운데/오른)으로 이동 + 손들기.
// 양쪽이 같은 문제(SharedMathRound)를 풀고 선착순으로 나눈다.
// 먼저 맞추면 +20 + 상대에게 안개 3초, 같은 문제에 뒤따라 맞추면 +10, 틀리면 -5.
import type { PoseFrame } from '../../pose/types';
import { bodyCenterX, getByName } from '../../pose/geometry';
import type { GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { makeQuiz } from './quiz';
import { SharedMathRound } from './shared-round';
import { drawVersusLabel } from '../../versus/draw';
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
  solved = 0;
  thinkMs = 0;
  dwellMs = 0;
  lastZone: 0 | 1 | 2 = 0;
  private running = false;
  private lastGen = 0;

  constructor(
    public side: DashSide,
    private attacks: AttackBus,
    public round: SharedMathRound
  ) {}

  start(): void {
    this.running = true;
    this.board.reset();
    this.round.quiz = makeQuiz();
    this.round.claimed = false;
    this.round.solvedBy = null;
    this.solved = 0;
    this.thinkMs = 3500;
    this.dwellMs = 0;
    this.lastGen = this.round.gen;
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
    // 문제를 푼 쪽의 다음 tick에 함께 다음 문제로 (같은 프레임 선착순 보장).
    // 상대는 그 전까지 옛 문제로 +10을 노릴 수 있다.
    if (this.round.pendingNext && this.round.solvedBy === this.side) {
      this.round.next();
      this.lastGen = this.round.gen;
      this.thinkMs = 3500;
      this.dwellMs = 0;
    } else if (this.round.gen !== this.lastGen) {
      // 상대가 먼저 넘긴 새 문제 따라가기.
      this.lastGen = this.round.gen;
      this.thinkMs = 3500;
      this.dwellMs = 0;
    }
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
    const correct = zone === this.round.quiz.answerIndex;
    if (correct) {
      const first = this.round.claim(this.side);
      const pts = first ? 20 : 10;
      this.board.comboHit();
      this.board.add(pts);
      this.solved += 1;
      const ev: GameEvent[] = [{ type: 'correct', points: pts, label: `${this.side === 'p1' ? 'P1' : 'P2'} 정답! +${pts}` }];
      if (first && this.attacks.send('fog', this.side)) {
        ev.push({ type: 'attack', points: 0, label: '안개! 상대 숫자 흐림 3초' });
      }
      // 다음 문제는 문제를 푼 쪽의 다음 tick에 양쪽이 함께 받는다.
      // 뒤따라 푼 쪽은 표시를 건드리지 않는다 (같은 문제 중복 득점 방지).
      this.thinkMs = 3500;
      this.dwellMs = 0;
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
    const quiz = this.round.quiz;
    const cx = lo + hw / 2;
    // 안개 중이면 문제를 흐릿하게 (drawVersusLabel은 색상만 받으므로 알파는 생략).
    // 흐림 대신 물음표 개수를 줄여서 표현하지 않고, 색을 흐리게 칠한다.
    drawVersusLabel(ctx, quiz.q, cx, 70, 30, this.fogged ? 'rgba(255,255,255,0.35)' : '#fff');
    quiz.choices.forEach((c, i) => {
      const x = lo + hw * ((i * 2 + 1) / 6);
      const active = i === this.lastZone;
      drawVersusLabel(ctx, String(c), x, 110, 22, active ? '#dfff00' : 'rgba(255,255,255,0.85)');
    });
    if (this.thinkMs > 0) {
      drawVersusLabel(
        ctx, `생각 중 ${(this.thinkMs / 1000).toFixed(1)}초`, cx, height - 60, 16,
        'rgba(255,255,255,0.8)'
      );
    }
  }
}
