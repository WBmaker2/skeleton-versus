import type { Keypoint, PoseFrame } from '../../pose/types';
import { getByName, shoulderWidth } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawDanceGuide, drawLabel } from '../../ui/renderer';

export type DanceMove =
  | 'left' | 'right' | 'both' | 'down'
  | 't' | 'y' | 'circle' | 'clap' | 'hips' | 'head';

export const MOVE_KR: Record<DanceMove, string> = {
  left: '왼손',
  right: '오른손',
  both: '양손',
  down: '내리기',
  t: 'T자세',
  y: 'Y자세',
  circle: '동그라미',
  clap: '박수',
  hips: '허리손',
  head: '머리손'
};

function present(k: Keypoint | undefined): k is Keypoint {
  return !!k && (k.score ?? 0) > 0.3;
}

// 손목 높이 패턴 + 동작 6종: 리듬 댄스 카피 10종 분류. 사이먼 게임과 공유한다.
// 어깨너비(sw) 기준 상대 좌표라 카메라 거리·해상도에 영향받지 않는다.
// 겹칠 수 있는 자세는 위에서부터 판정한다: 동그라미→Y→T→박수→허리손→머리손→양손→왼손→오른손→내리기(기본).
export function wristPattern(frame: PoseFrame): DanceMove {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  const lh = getByName(frame, 'left_hip');
  const rh = getByName(frame, 'right_hip');
  const nose = getByName(frame, 'nose');
  const sw = shoulderWidth(frame);
  const up = (w: typeof lw, s: typeof ls): boolean =>
    present(w) && present(s) && w.y < s.y - 20;

  if (present(lw) && present(rw) && present(ls) && present(rs)) {
    const midY = (ls.y + rs.y) / 2;
    // 1) 동그라미: 양손 위 + 서로 가까이 + 머리 위
    const togetherHigh =
      Math.abs(lw.x - rw.x) < 0.7 * sw &&
      lw.y < midY - 0.5 * sw && rw.y < midY - 0.5 * sw;
    if (up(lw, ls) && up(rw, rs) && togetherHigh) return 'circle';
    // 2) Y자세: 양손 위 + 좌우로 활짝
    if (up(lw, ls) && up(rw, rs) && Math.abs(lw.x - rw.x) > 1.6 * sw) return 'y';
    // 3) T자세: 양손 어깨 높이 + 좌우로 쭉
    const levelL = Math.abs(lw.y - ls.y) < 0.4 * sw && Math.abs(lw.x - ls.x) > 0.6 * sw;
    const levelR = Math.abs(rw.y - rs.y) < 0.4 * sw && Math.abs(rw.x - rs.x) > 0.6 * sw;
    if (levelL && levelR) return 't';
  }
  if (present(lw) && present(rw) && present(ls) && present(rs) && present(lh) && present(rh)) {
    // 4) 박수: 양손이 가슴 높이에서 모임
    const chestTop = (ls.y + rs.y) / 2;
    const chestBot = (lh.y + rh.y) / 2;
    const atChest = (w: Keypoint): boolean => w.y > chestTop && w.y < chestBot;
    if (Math.abs(lw.x - rw.x) < 0.5 * sw && atChest(lw) && atChest(rw)) return 'clap';
    // 5) 허리손: 양손이 엉덩이 높이 옆에 (모으지 않고 벌림)
    const atHip = (w: Keypoint, h: Keypoint): boolean => Math.abs(w.y - h.y) < 0.4 * sw;
    if (atHip(lw, lh) && atHip(rw, rh) && Math.abs(lw.x - rw.x) > 0.8 * sw) return 'hips';
  }
  // 6) 머리손: 한 손이 머리 근처 (좌우 어느 손이든, 손을 번쩍 든 것과 구별되게 머리 높이 범위로 한정)
  if (present(nose)) {
    const nearHead = (w: typeof lw): boolean =>
      present(w) &&
      Math.abs(w.x - nose.x) < 0.45 * sw &&
      Math.abs(w.y - nose.y) < 0.45 * sw;
    if (nearHead(lw) || nearHead(rw)) return 'head';
  }
  const l = up(lw, ls);
  const r = up(rw, rs);
  if (l && r) return 'both';
  if (l) return 'left';
  if (r) return 'right';
  return 'down';
}

// 리듬 댄스 카피: 박자에 맞춰 포즈 따라하기. 4박자 순환.
export class RhythmDance implements Game {
  id = 'dance';
  // 상단에 목표 포즈(글자+스켈레톤 가이드)가 나오므로 얼굴 마스크를 그리지 않는다 (시인성).
  hideFace = true;
  moves: DanceMove[] = [
    'left', 'right', 'both', 'down',
    't', 'y', 'circle', 'clap', 'hips', 'head'
  ];
  move: DanceMove = 'left';
  board = new ScoreBoard();
  beats = 0;
  private running = false;
  private waitMs = 0;

  get beatFrac(): number {
    return Math.min(1, this.waitMs / 1800);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.beats = 0;
    this.waitMs = 0;
    this.move = this.moves[0];
  }
  stop(): void {
    this.running = false;
  }
  draw(ctx: CanvasRenderingContext2D, width: number): void {
    drawLabel(ctx, MOVE_KR[this.move], width / 2, 78, 52);
    drawBar(ctx, width / 2 - 130, 122, 260, 14, 1 - this.beatFrac, '#00ffff');
    // 따라할 동작 스켈레톤 예시: 오른쪽 위 패널에 막대인간 가이드를 함께 보여준다.
    // 글자만으로는 팔 모양을 알기 어려우니, 코드로 그리는 벡터 가이드로 보완한다.
    const gw = 140;
    const gh = 180;
    const gx = Math.max(8, width - gw - 16);
    drawDanceGuide(ctx, this.move, gx, 16, gw, gh, MOVE_KR[this.move]);
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    if (wristPattern(frame) === this.move) {
      this.beats += 1;
      this.board.comboHit();
      this.board.add(10);
      this.advance();
      return [{ type: 'beat', points: 10, label: '리듬 적중!' }];
    }
    this.waitMs += dtMs;
    if (this.waitMs <= 1800) return [];
    this.waitMs = 0;
    this.board.comboMiss();
    this.advance();
    return [{ type: 'miss', points: 0, label: '박자를 놓쳤어요' }];
  }
  private advance(): void {
    this.waitMs = 0;
    this.move = this.pickRandomMove(this.move);
  }

  // 랜덤 출제: 고정 순서(left→right→both→down) 대신 매번 무작위로 고른다.
  // 바로 직전 동작과 겹치지 않게 후보에서 제외한다 (몸으로 ABC 연속 중복 방지와 동일).
  private pickRandomMove(exclude?: DanceMove): DanceMove {
    const pool = this.moves.filter((m) => m !== exclude);
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
