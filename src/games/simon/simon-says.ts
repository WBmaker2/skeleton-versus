import type { PoseFrame } from '../../pose/types';
import { getByName } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { wristPattern, MOVE_KR, type DanceMove } from '../dance';
import { drawBar, drawLabel } from '../../ui/renderer';

export type SimonCmd = DanceMove;

// 양손 완화 판정 (사이먼 전용): 사이먼은 4종 지시(왼손·오른손·양손·내리기)만 쓴다.
// 댄스 10종 분류의 간격 조건(동그라미·Y자세)과 무관하게,
// 양쪽 손목이 각자 어깨보다 10px 이상 위에 있으면 양손 성공으로 인정한다.
// 공유 판정(wristPattern)·댄스 게임 동작은 그대로 둔다.

function bothUp(frame: PoseFrame): boolean {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const raised = (w: typeof lw, s: typeof ls): boolean =>
    !!w && !!s && (w.score ?? 0) > 0.3 && (s.score ?? 0) > 0.3 && w.y < s.y - 10;
  return raised(lw, ls) && raised(rw, rs);
}

// 사이먼 AI 선생님: 지시를 듣고 포즈로 답하기. 듣기·반응.
export class SimonSays implements Game {
  id = 'simon';
  // 상단에 지시 텍스트가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  commands: SimonCmd[] = ['left', 'right', 'both', 'down'];
  command: SimonCmd = 'left';
  board = new ScoreBoard();
  solved = 0;
  private running = false;
  private waitMs = 0;

  get timeFrac(): number {
    return Math.min(1, this.waitMs / 2500);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.solved = 0;
    this.command = this.commands[0];
    this.waitMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, `${MOVE_KR[this.command]}!`, width / 2, 78, 52);
    drawBar(ctx, width / 2 - 130, 122, 260, 14, 1 - this.timeFrac, '#ff71ce');
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const pattern = wristPattern(frame);
    if (pattern === this.command || (this.command === 'both' && bothUp(frame))) {
      this.solved += 1;
      this.board.comboHit();
      this.board.add(15);
      const done = this.command;
      this.next();
      return [{ type: 'correct', points: 15, label: `"${done}" 성공!` }];
    }
    this.waitMs += dtMs;
    if (this.waitMs <= 2500) return [];
    this.board.comboMiss();
    this.next();
    return [{ type: 'timeout', points: 0, label: '시간 초과! 다음 지시' }];
  }
  private next(): void {
    this.waitMs = 0;
    this.command = this.pickRandomCommand(this.command);
  }

  // 랜덤 출제: 고정 순서(left→right→both→down) 대신 매번 무작위로 고른다.
  // 바로 직전 지시와 겹치지 않게 후보에서 제외한다 (리듬 댄스·몸으로 ABC와 동일).
  private pickRandomCommand(exclude?: SimonCmd): SimonCmd {
    const pool = this.commands.filter((c) => c !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
