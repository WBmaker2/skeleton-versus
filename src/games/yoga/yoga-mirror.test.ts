import { describe, expect, it } from 'vitest';
import { YogaMirror, YOGA_POSES } from './yoga-mirror';
import type { Keypoint, PoseFrame } from '../../pose/types';
import type { YogaGuidePose } from '../../ui/renderer';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[]): PoseFrame {
  return { width: 640, height: 480, timestamp: 0, keypoints: kps };
}

// 어깨 (270,120)·(370,120), 어깨너비 100 기준.
function shoulders(): Keypoint[] {
  return [kp('left_shoulder', 270, 120), kp('right_shoulder', 370, 120)];
}

function anklesTogether(): Keypoint[] {
  return [kp('left_ankle', 300, 300), kp('right_ankle', 340, 300)];
}

function anklesApart(): Keypoint[] {
  return [kp('left_ankle', 200, 300), kp('right_ankle', 440, 300)];
}

// 자세별 통과 프레임 (팔 각도+손·다리 벌림이 템플릿과 일치).
const FRAMES: Record<YogaGuidePose, PoseFrame> = {
  // 팔 ~14° + 손 벌림(1.4) + 다리 모음(0.4)
  산: frame([...shoulders(), kp('left_wrist', 250, 200), kp('right_wrist', 390, 200), ...anklesTogether()]),
  // 팔 90° + 다리 벌림(2.4)
  전사: frame([...shoulders(), kp('left_wrist', 60, 120), kp('right_wrist', 580, 120), ...anklesApart()]),
  // 팔 ~138° + 손 벌림(2.8) + 다리 모음
  만세: frame([...shoulders(), kp('left_wrist', 180, 20), kp('right_wrist', 460, 20), ...anklesTogether()]),
  // 팔 ~39° + 손 모음(0.2) + 다리 모음
  합장: frame([...shoulders(), kp('left_wrist', 310, 170), kp('right_wrist', 330, 170), ...anklesTogether()]),
  // 왼팔 ~148° + 오른팔 ~4° + 다리 벌림
  삼각: frame([...shoulders(), kp('left_wrist', 200, 10), kp('right_wrist', 375, 200), ...anklesApart()]),
  // 팔 ~158° + 손 모음(0.1) + 다리 모음
  나무: frame([...shoulders(), kp('left_wrist', 315, 10), kp('right_wrist', 325, 10), ...anklesTogether()])
};

// 삼각 거울 버전: 오른팔을 올리고 왼팔을 내려도 인정.
const triangleMirror = frame([
  ...shoulders(), kp('left_wrist', 265, 200), kp('right_wrist', 440, 10), ...anklesApart()
]);

const ORDER: YogaGuidePose[] = ['산', '전사', '만세', '합장', '삼각', '나무'];

function completePose(g: YogaMirror, pose: YogaGuidePose): string[] {
  g.pose = YOGA_POSES.find((p) => p.name === pose)!;
  const seen: string[] = [];
  for (let i = 0; i < 200; i++) seen.push(...g.tick(FRAMES[pose], 16).map((e) => e.type));
  return seen;
}

describe('YogaMirror', () => {
  it('hides face mask for readability of the top text and guide', () => {
    expect(new YogaMirror().hideFace).toBe(true);
  });
  it('has 6 poses in easy order starting with mountain', () => {
    expect(YOGA_POSES.map((p) => p.name)).toEqual(ORDER);
    const g = new YogaMirror();
    g.start();
    expect(g.pose.name).toBe('산');
  });
  it('completes each of the 6 poses on 3s hold', () => {
    const g = new YogaMirror();
    g.start();
    for (const pose of ORDER) {
      expect(completePose(g, pose)).toContain('pose-done');
    }
    expect(g.completed).toBe(6);
    // 6개를 마치면 다시 산으로 돌아온다.
    expect(g.pose.name).toBe('산');
  });
  it('advances in order: mountain then warrior', () => {
    const g = new YogaMirror();
    g.start();
    const seen: string[] = [];
    for (let i = 0; i < 200; i++) seen.push(...g.tick(FRAMES['산'], 16).map((e) => e.type));
    expect(seen).toContain('pose-done');
    expect(g.pose.name).toBe('전사');
  });
  it('accepts triangle with either arm up', () => {
    const g = new YogaMirror();
    g.start();
    g.pose = YOGA_POSES.find((p) => p.name === '삼각')!;
    const seen: string[] = [];
    for (let i = 0; i < 200; i++) seen.push(...g.tick(triangleMirror, 16).map((e) => e.type));
    expect(seen).toContain('pose-done');
  });
  it('accepts a slightly sloppy pose (lenient threshold)', () => {
    const g = new YogaMirror();
    g.start();
    // 팔 ~45°로 삐뚤빼뚤한 산 자세 (템플릿과 30° 차이, 유사도 0.67).
    // 예전 0.7에서는 탈락, 완화된 0.6에서는 인정.
    const sloppy = frame([
      ...shoulders(), kp('left_wrist', 220, 170), kp('right_wrist', 420, 170), ...anklesTogether()
    ]);
    for (let i = 0; i < 50; i++) g.tick(sloppy, 16);
    expect(g.progress).toBeGreaterThan(0);
  });
  it('passes mountain with feet apart (no legs condition)', () => {
    // 전사·삼각 뒤에 발을 벌린 채로 산을 해도 통과해야 함 (두 번째 산 실패 재발 방지).
    const g = new YogaMirror();
    g.start();
    expect(g.pose.name).toBe('산');
    const feetApart = frame([
      ...shoulders(), kp('left_wrist', 250, 200), kp('right_wrist', 390, 200),
      kp('left_ankle', 255, 300), kp('right_ankle', 385, 300)
    ]);
    const seen: string[] = [];
    for (let i = 0; i < 200; i++) seen.push(...g.tick(feetApart, 16).map((e) => e.type));
    expect(seen).toContain('pose-done');
    expect(g.pose.name).toBe('전사');
  });
  it('passes mountain with hands close to the body', () => {
    // 손을 몸통에 붙여 내려 손 간격이 어깨너비 1.1배여도 산으로 인정 (예전 1.3 기준 탈락).
    const g = new YogaMirror();
    g.start();
    expect(g.pose.name).toBe('산');
    const handsClose = frame([
      ...shoulders(), kp('left_wrist', 265, 205), kp('right_wrist', 375, 205),
      kp('left_ankle', 300, 300), kp('right_ankle', 340, 300)
    ]);
    const seen: string[] = [];
    for (let i = 0; i < 200; i++) seen.push(...g.tick(handsClose, 16).map((e) => e.type));
    expect(seen).toContain('pose-done');
    expect(g.pose.name).toBe('전사');
  });
  it('resets hold when pose breaks', () => {
    const g = new YogaMirror();
    g.start();
    for (let i = 0; i < 50; i++) g.tick(FRAMES['산'], 16);
    expect(g.progress).toBeGreaterThan(0);
    g.tick(FRAMES['전사'], 16);
    expect(g.progress).toBe(0);
  });
  it('tells apart hands-together from hands-apart (mountain vs prayer, celebration vs tree)', () => {
    const g = new YogaMirror();
    g.start();
    // 산 목표에 합장 자세(손 모음)는 인정하지 않음.
    g.pose = YOGA_POSES.find((p) => p.name === '산')!;
    for (let i = 0; i < 50; i++) g.tick(FRAMES['합장'], 16);
    expect(g.progress).toBe(0);
    // 만세 목표에 나무 자세(손 모음)는 인정하지 않음.
    g.pose = YOGA_POSES.find((p) => p.name === '만세')!;
    for (let i = 0; i < 50; i++) g.tick(FRAMES['나무'], 16);
    expect(g.progress).toBe(0);
    // 나무 목표에 만세 자세(손 벌림)는 인정하지 않음.
    g.pose = YOGA_POSES.find((p) => p.name === '나무')!;
    for (let i = 0; i < 50; i++) g.tick(FRAMES['만세'], 16);
    expect(g.progress).toBe(0);
  });
  it('draws pose label and skeleton guide without throwing', () => {
    const fn = (..._args: unknown[]): undefined => undefined;
    const texts: unknown[][] = [];
    let arcs = 0;
    const ctx = new Proxy(
      {},
      {
        get: (_t, p) => {
          if (p === 'arc') return (...a: unknown[]): undefined => {
            arcs += 1;
            return undefined;
          };
          if (p === 'fillText') return (...a: unknown[]): undefined => {
            texts.push(a);
            return undefined;
          };
          return fn;
        },
        set: () => true
      }
    ) as unknown as CanvasRenderingContext2D;
    const g = new YogaMirror();
    g.start();
    for (const pose of ORDER) {
      g.pose = YOGA_POSES.find((p) => p.name === pose)!;
      arcs = 0;
      texts.length = 0;
      expect(() => g.draw(ctx, 640)).not.toThrow();
      // 막대인간 머리(arc 1회 이상) + 자세 글자(상단 큰 글자·가이드 하단 글자)가 그려져야 함
      expect(arcs).toBeGreaterThanOrEqual(1);
      expect(texts.some((a) => String(a[0]).includes(pose))).toBe(true);
      // 다리 조건 글자: 전사·삼각은 벌림, 산은 자유, 나머지는 모음 (판정 기준과 일치)
      const legsText = pose === '전사' || pose === '삼각' ? '다리 벌림' : pose === '산' ? '다리 자유' : '다리 모음';
      expect(texts.some((a) => a[0] === legsText)).toBe(true);
    }
  });
});
