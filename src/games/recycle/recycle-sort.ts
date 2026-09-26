import type { PoseFrame } from '../../pose/types';
import { bodyCenterX, palmOf } from '../../pose/geometry';
import type { Game, GameEvent } from '../../game/types';
import { ScoreBoard } from '../../game/engine';
import { drawBar, drawLabel } from '../../ui/renderer';

export type RecycleKind = 'plastic' | 'can';

export interface RecycleItem {
  kind: RecycleKind;
  x: number;
  y: number;
  alive: boolean;
}

// 손이 쓰레기에 닿았다고 인정하는 반경(px). 별잡기 스트레칭과 같은 기준.
export const RECYCLE_GRAB_R = 56;
// 들고 통 자리에서 버티면 성공으로 인정하는 시간(ms). 화면 안내·진행바와 같은 값.
export const RECYCLE_BIN_HOLD_MS = 500;
// 결과 문구를 화면에 남기는 시간(ms).
export const RECYCLE_RESULT_MS = 1200;
// 손에 들고 다니는 물건 한 변(px). 멀리서도 잘 보이게 크게 그린다.
export const RECYCLE_ITEM_SIZE = 92;

// 분리수거 스트레칭: 가운데 바닥 쓰레기를 손으로 주워 올바른 통으로 옮기기. 환경교육.
// 왼손·오른손 어느 쪽으로 가져가도 손에 붙어서 따라다닌다.
export class RecycleSort implements Game {
  id = 'recycle';
  // 상단 안내 글자·쓰레기 시인성을 위해 얼굴 마스크를 그리지 않는다 (수학·ABC와 동일).
  hideFace = true;
  item: RecycleItem = { kind: 'plastic', x: 320, y: 300, alive: true };
  // 쓰레기를 들고 있는 손. null이면 바닥에 놓인 상태.
  carriedBy: 'left' | 'right' | null = null;
  board = new ScoreBoard();
  sorted = 0;
  failed = 0;
  // 화면 그리기용 실시간 상태: 손(또는 몸)이 있는 구역·성공까지 진행률·마지막 결과.
  playerZone: 0 | 1 | 2 = 1;
  binHoldMs = 0;
  lastResult: 'sorted' | 'mixed' | null = null;
  lastLabel = '';
  private lastAgeMs = 0;
  private running = false;
  private seed = 1;
  private dimW = 640;
  private dimH = 480;

  // 목표 통 구역: 플라스틱은 왼쪽(0), 캔은 오른쪽(2).
  get targetZone(): 0 | 2 {
    return this.item.kind === 'plastic' ? 0 : 2;
  }

  get targetColor(): string {
    return this.item.kind === 'plastic' ? '#3d9e57' : '#3b82c4';
  }

  get holdProgress(): number {
    return Math.min(1, this.binHoldMs / RECYCLE_BIN_HOLD_MS);
  }

  start(): void {
    this.running = true;
    this.board.reset();
    this.sorted = 0;
    this.failed = 0;
    this.seed = 1;
    this.dimW = 640;
    this.dimH = 480;
    this.spawn();
    this.playerZone = 1;
    this.lastResult = null;
    this.lastLabel = '';
    this.lastAgeMs = 0;
  }
  stop(): void {
    this.running = false;
  }

  // 게임 내 난수 생성기 (별잡기 스트레칭과 같은 LCG, 테스트 재현 가능).
  private rnd(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // 다음 쓰레기를 가운데 구역 바닥에 랜덤으로 내놓는다.
  // 종류도 번갈아가 아닌 랜덤이라 매번 통을 확인해야 한다.
  private spawn(): void {
    const kind: RecycleKind = this.rnd() < 0.5 ? 'plastic' : 'can';
    const pos = this.randomMiddlePos(this.dimW, this.dimH);
    this.item = { kind, x: pos.x, y: pos.y, alive: true };
    this.carriedBy = null;
    this.binHoldMs = 0;
  }

  // 가운데 칸 안의 랜덤 위치 (가로 중앙 1/3·세로 바닥 위 140~240px).
  private randomMiddlePos(w: number, h: number): { x: number; y: number } {
    const margin = 60;
    const x = w / 3 + margin + this.rnd() * Math.max(1, w / 3 - margin * 2);
    const y = h - 180 - this.rnd() * 60;
    return { x, y };
  }

  // 들고 있지 않은 쓰레기를 가운데 칸 안으로 보정한다.
  // 첫 생성은 640×480 기본값 기준이라 실제 해상도(예: 1280×720)와 다르면
  // 옆 칸에 비쳐 보이므로, 해상도가 바뀐 틱에 비율대로 옮기고 밴드로 고정한다.
  private clampToMiddle(w: number, h: number): void {
    const margin = 60;
    const loX = w / 3 + margin;
    const hiX = (w * 2) / 3 - margin;
    const loY = h - 240;
    const hiY = h - 140;
    if (hiX > loX) this.item.x = Math.min(hiX, Math.max(loX, this.item.x));
    if (hiY > loY) this.item.y = Math.min(hiY, Math.max(loY, this.item.y));
  }

  private next(): void {
    this.spawn();
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const binW = 160;
    const binH = 112;
    const target = this.targetZone;
    const isPlastic = this.item.kind === 'plastic';
    const carried = this.carriedBy !== null;

    // 1) 구역 밑바탕: 목표 통이 있는 쪽을 초록·파랑 빛으로 비춘다.
    ctx.save();
    ctx.fillStyle = isPlastic ? 'rgba(61, 158, 87, 0.20)' : 'rgba(59, 130, 196, 0.20)';
    ctx.fillRect(target === 0 ? 0 : (width * 2) / 3, 0, width / 3, height);
    // 손(또는 몸)이 있는 구역은 노랑(성공이면 초록, 실패면 빨강)으로 덧씌운다.
    const standing =
      this.playerZone === target
        ? 'rgba(61, 158, 87, 0.22)'
        : this.playerZone === 1
          ? 'rgba(223, 255, 0, 0.10)'
          : 'rgba(255, 59, 48, 0.18)';
    ctx.fillStyle = standing;
    ctx.fillRect(this.playerZone * (width / 3), 0, width / 3, height);
    ctx.restore();

    // 2) 3등분 세로 구분선: 영상 위에서도 잘 보이게 어두운 밑선+흰 점선.
    ctx.save();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(10, 16, 22, 0.55)';
    for (const lx of [width / 3, (width * 2) / 3]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.setLineDash([12, 10]);
    for (const lx of [width / 3, (width * 2) / 3]) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.restore();

    // 3) 상단 안내: 결과 개수·다음 행동·성공 기준을 화면에 직접 보여준다.
    drawLabel(ctx, `${this.sorted}개 분류 · 실수 ${this.failed}회`, width / 2, 34, 30);
    if (carried) {
      drawLabel(
        ctx,
        isPlastic ? '플라스틱은 왼쪽 통!' : '캔은 오른쪽 통!',
        width / 2,
        78,
        38
      );
      drawLabel(ctx, '통 자리에서 0.5초 버티면 성공 · 반대쪽은 실패', width / 2, 116, 22);
    } else {
      drawLabel(
        ctx,
        isPlastic ? '플라스틱을 손으로 잡으세요!' : '캔을 손으로 잡으세요!',
        width / 2,
        78,
        38
      );
      drawLabel(ctx, '쓰레기에 손을 가져가면 손에 붙어요 (양손 모두 가능)', width / 2, 116, 22);
    }
    // 성공까지 진행바: 들고 통 자리에 서 있을 때만 차오른다.
    const inSide = carried && this.playerZone !== 1;
    drawBar(
      ctx,
      width / 2 - 110,
      134,
      220,
      12,
      inSide ? this.holdProgress : 0,
      this.playerZone === target ? this.targetColor : '#ff3b30'
    );

    const bins: { x: number; color: string; label: string; zone: 0 | 2 }[] = [
      { x: width / 6 - binW / 2, color: '#3d9e57', label: '플라스틱', zone: 0 },
      { x: (width * 5) / 6 - binW / 2, color: '#3b82c4', label: '캔', zone: 2 }
    ];
    for (const b of bins) {
      const isTarget = b.zone === target;
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.globalAlpha = isTarget ? 1 : 0.55;
      ctx.beginPath();
      ctx.roundRect(b.x, height - binH - 12, binW, binH, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      // 목표 통은 굵은 흰 테두리, 다른 통은 얇은 테두리로 구별한다.
      ctx.strokeStyle = isTarget ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = isTarget ? 5 : 2;
      ctx.beginPath();
      ctx.roundRect(b.x, height - binH - 12, binW, binH, 12);
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, b.label, b.x + binW / 2, height - binH - 44, 28);
      if (isTarget) {
        drawLabel(ctx, '▼ 여기!', b.x + binW / 2, height - binH - 76, 26);
      }
    }
    if (this.item.alive) {
      const half = RECYCLE_ITEM_SIZE / 2;
      // 아직 손에 안 붙었으면 잡는 범위를 점선 동그라미로 보여준다.
      if (!carried) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(this.item.x, this.item.y, RECYCLE_GRAB_R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.fillStyle = this.targetColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = carried ? 6 : 4;
      ctx.beginPath();
      ctx.roundRect(this.item.x - half, this.item.y - half, RECYCLE_ITEM_SIZE, RECYCLE_ITEM_SIZE, 16);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, isPlastic ? '플' : '캔', this.item.x, this.item.y, 42);
    }
    // 4) 마지막 결과 알림: 통 위쪽에 성공(초록)·실패(빨강) 띠로 잠시 남긴다.
    if (this.lastResult && this.lastAgeMs < RECYCLE_RESULT_MS) {
      const ok = this.lastResult === 'sorted';
      const pillW = 300;
      const pillH = 44;
      const px = width / 2 - pillW / 2;
      const py = height - binH - 140;
      ctx.save();
      ctx.fillStyle = ok ? 'rgba(61, 158, 87, 0.92)' : 'rgba(255, 59, 48, 0.92)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, 22);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawLabel(ctx, this.lastLabel, width / 2, py + pillH / 2, 26);
    }
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  private remember(result: 'sorted' | 'mixed', label: string): void {
    this.lastResult = result;
    this.lastLabel = label;
    this.lastAgeMs = 0;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (this.lastResult) {
      this.lastAgeMs += dtMs;
      if (this.lastAgeMs >= RECYCLE_RESULT_MS) {
        this.lastResult = null;
        this.lastLabel = '';
      }
    }
    if (!this.running || !this.item.alive) return [];
    // 해상도가 바뀌면(첫 생성의 기본값 포함) 들고 있지 않은 쓰레기를
    // 비율대로 옮기고 가운데 칸으로 보정한다. 들고 있는 중이면 손이 덮어쓴다.
    if (frame.width !== this.dimW || frame.height !== this.dimH) {
      this.item.x = (this.item.x / Math.max(1, this.dimW)) * frame.width;
      this.item.y = (this.item.y / Math.max(1, this.dimH)) * frame.height;
      this.dimW = frame.width;
      this.dimH = frame.height;
      if (this.carriedBy === null) this.clampToMiddle(frame.width, frame.height);
    }
    const palms: { side: 'left' | 'right'; x: number; y: number }[] = [];
    for (const side of ['left', 'right'] as const) {
      const p = palmOf(frame, side);
      if (p) palms.push({ side, x: p.x, y: p.y });
    }

    // 들고 있는 중: 손을 따라다닌다.
    if (this.carriedBy !== null) {
      const hand = palms.find((p) => p.side === this.carriedBy);
      if (hand) {
        this.item.x = hand.x;
        this.item.y = hand.y;
        const zone = this.zoneOf(hand.x, frame.width);
        this.playerZone = zone;
        if (zone !== 0 && zone !== 2) {
          this.binHoldMs = 0;
          return [];
        }
        this.binHoldMs += dtMs;
        if (this.binHoldMs <= RECYCLE_BIN_HOLD_MS) return [];
        return this.judge(zone);
      }
      // 든 손이 사라지면: 다른 손이 쓰레기 근처에 있으면 이어서 들기.
      const other = palms.find(
        (p) => Math.hypot(p.x - this.item.x, p.y - this.item.y) <= RECYCLE_GRAB_R
      );
      if (other) {
        this.carriedBy = other.side;
        this.binHoldMs = 0;
        return [];
      }
      // 양손 다 없으면 그 자리에 내려놓고 기다린다.
      this.carriedBy = null;
      this.binHoldMs = 0;
      return [];
    }

    // 바닥에 놓인 상태: 손이 닿으면(가까운 손) 손에 붙는다.
    let best: { side: 'left' | 'right' } | null = null;
    let bestDist = RECYCLE_GRAB_R;
    for (const p of palms) {
      const d = Math.hypot(p.x - this.item.x, p.y - this.item.y);
      if (d <= bestDist) {
        bestDist = d;
        best = { side: p.side };
      }
    }
    this.playerZone = this.zoneOf(bodyCenterX(frame), frame.width);
    if (!best) return [];
    this.carriedBy = best.side;
    this.binHoldMs = 0;
    const label = this.item.kind === 'plastic' ? '플라스틱 잡았어요!' : '캔 잡았어요!';
    return [{ type: 'grab', points: 0, label }];
  }

  // 들고 통 자리에 0.5초 머물렀을 때 성공·실패를 가른다.
  private judge(zone: 0 | 2): GameEvent[] {
    const want: 0 | 2 = this.item.kind === 'plastic' ? 0 : 2;
    this.item.alive = false;
    if (zone === want) {
      this.sorted += 1;
      this.board.comboHit();
      this.board.add(10);
      const n = this.sorted;
      const label = `분리수거 ${n}개!`;
      this.remember('sorted', `성공! ${label}`);
      this.next();
      return [{ type: 'sorted', points: 10, label }];
    }
    this.failed += 1;
    this.board.comboMiss();
    this.remember('mixed', '실패! 엉뚱한 통이에요');
    this.next();
    return [{ type: 'mixed', points: 0, label: '엉뚱한 통이에요' }];
  }
}
