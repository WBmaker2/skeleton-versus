// src/versus/registry.ts
// 대전 종목 등록부. 새 종목을 추가할 때는 팩토리 1개 + VERSUS_METAS 1줄이면 된다.
// versus-main의 if/else 분기를 대신한다.

import type { AttackBus } from './attack';
import type { DualCalibration } from './dual-calibration';
import type { VersusSideGame } from './versus-loop';
import type { Winner } from './record';
import type { VersusId } from './metas';
import { FruitDuelSide, SharedFruitPattern } from '../versus-games/fruit-duel';
import { SquatTugSide, TugRope, drawTugOverlay } from '../versus-games/squat-tug';
import { MathDashSide, SharedMathRound } from '../versus-games/math-dash';
import { StarDuelSide, SharedStarField } from '../versus-games/star-duel';
import { SimonDuelSide, SharedSimonRound } from '../versus-games/simon-duel';
import { ConstellDuelSide, SharedConstellation } from '../versus-games/constellation-duel';
import { AbcDuelSide, SharedAbcRound } from '../versus-games/abc-duel';
import { DanceDuelSide, SharedDanceBeat } from '../versus-games/dance-duel';
import { BalloonDuelSide, SharedBalloonSky } from '../versus-games/balloon-duel';
import { ZombieDuelSide, SharedZombieHorde } from '../versus-games/zombie-duel';

export interface VersusSetup {
  left: VersusSideGame;
  right: VersusSideGame;
  // 전체 너비 오버레이 (줄다리기 줄+박자바 등).
  overlay?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  // 승자 판정 (없으면 점수 비교).
  winner?: () => Winner;
  // 진행 중 한 줄 안내 (없으면 이벤트 라벨).
  statusHint?: () => string | null;
}

export type VersusFactory = (attacks: AttackBus, cal: DualCalibration) => VersusSetup;

function fruitFactory(attacks: AttackBus, cal: DualCalibration): VersusSetup {
  // 양쪽이 같은 순서·같은 종류, 위치는 좌우 대칭으로 나온다.
  const pattern = new SharedFruitPattern();
  const l = new FruitDuelSide('p1', attacks, pattern);
  const r = new FruitDuelSide('p2', attacks, pattern);
  l.radiusScale = cal.p1.scale;
  r.radiusScale = cal.p2.scale;
  l.start();
  r.start();
  return { left: l, right: r };
}

function tugFactory(attacks: AttackBus): VersusSetup {
  const rope = new TugRope();
  const l = new SquatTugSide('p1', rope, attacks);
  const r = new SquatTugSide('p2', rope, attacks);
  l.start();
  r.start();
  return {
    left: l,
    right: r,
    overlay: (ctx, w, h) => {
      // 양쪽 박자 시계는 같은 dt로 돌아가므로 왼쪽 기준으로 그린다.
      drawTugOverlay(ctx, w, h, rope, l.beatPhaseMs);
    },
    winner: () => rope.winner(),
    statusHint: () => {
      const win = rope.winner();
      return win === 'draw' ? '줄을 당겨라!' : win === 'p1' ? 'P1이 앞서고 있어요!' : 'P2가 앞서고 있어요!';
    }
  };
}

function mathFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 문제를 푸는 공유 라운드 (선착순 +20/+10은 라운드가 판정).
  const round = new SharedMathRound();
  const l = new MathDashSide('p1', attacks, round);
  const r = new MathDashSide('p2', attacks, round);
  l.start();
  r.start();
  return { left: l, right: r };
}

function starFactory(attacks: AttackBus, cal: DualCalibration): VersusSetup {
  // 양쪽이 같은 순서로 별을 받고 위치는 좌우 대칭으로 나온다.
  const field = new SharedStarField();
  const l = new StarDuelSide('p1', attacks, field);
  const r = new StarDuelSide('p2', attacks, field);
  l.radiusScale = cal.p1.scale;
  r.radiusScale = cal.p2.scale;
  l.start();
  r.start();
  return { left: l, right: r };
}

function simonFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 지시를 듣는 공유 라운드 (선착순 +20/+10은 라운드가 판정).
  const round = new SharedSimonRound();
  const l = new SimonDuelSide('p1', attacks, round);
  const r = new SimonDuelSide('p2', attacks, round);
  l.start();
  r.start();
  return { left: l, right: r };
}

function constellFactory(attacks: AttackBus, cal: DualCalibration): VersusSetup {
  // 양쪽이 같은 별자리(미러 배치)를 각자 완성하는 경주.
  const sky = new SharedConstellation();
  const l = new ConstellDuelSide('p1', attacks, sky);
  const r = new ConstellDuelSide('p2', attacks, sky);
  l.radiusScale = cal.p1.scale;
  r.radiusScale = cal.p2.scale;
  l.start();
  r.start();
  return { left: l, right: r };
}

function abcFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 글자를 만드는 공유 라운드 (선착순 +20/+10은 라운드가 판정).
  const round = new SharedAbcRound();
  const l = new AbcDuelSide('p1', attacks, round);
  const r = new AbcDuelSide('p2', attacks, round);
  l.start();
  r.start();
  return { left: l, right: r };
}

function danceFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 동작을 따라하는 공유 박자 (선착순 +15/+10은 라운드가 판정).
  const beat = new SharedDanceBeat();
  const l = new DanceDuelSide('p1', attacks, beat);
  const r = new DanceDuelSide('p2', attacks, beat);
  l.start();
  r.start();
  return { left: l, right: r };
}

function balloonFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 순서로 풍선을 받고 위치는 좌우 대칭으로 나온다.
  const sky = new SharedBalloonSky();
  const l = new BalloonDuelSide('p1', attacks, sky);
  const r = new BalloonDuelSide('p2', attacks, sky);
  l.start();
  r.start();
  return { left: l, right: r };
}

function zombieFactory(attacks: AttackBus): VersusSetup {
  // 양쪽이 같은 순서로 같은 줄에 좀비를 받고 좌우 대칭으로 나온다.
  const horde = new SharedZombieHorde();
  const l = new ZombieDuelSide('p1', attacks, horde);
  const r = new ZombieDuelSide('p2', attacks, horde);
  l.start();
  r.start();
  return { left: l, right: r };
}

export const VERSUS_REGISTRY: Record<VersusId, VersusFactory> = {
  'versus-fruit': fruitFactory,
  'versus-tug': tugFactory,
  'versus-math': mathFactory,
  'versus-star': starFactory,
  'versus-simon': simonFactory,
  'versus-duo': constellFactory,
  'versus-abc': abcFactory,
  'versus-dance': danceFactory,
  'versus-balloon': balloonFactory,
  'versus-zombie': zombieFactory
};
