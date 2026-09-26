// tests/body-abc.test.ts
import { describe, expect, it } from 'vitest';
import { anglesFromFrame, BodyABC, poseSimilarity, TEMPLATES, type Angles } from './body-abc';
import type { PoseFrame } from '../../pose/types';

const ALL_TARGETS = ['T', 'Y', 'O', 'L', 'I', 'K', 'X', 'A'] as const;

function holdAll(g: BodyABC, angles: Angles, ticks = 80): string[] {
  const all: string[] = [];
  for (let i = 0; i < ticks; i++) all.push(...g.tickAngles(angles, 16).map((e) => e.type));
  return all;
}

function frameOf(
  ls: [number, number],
  rs: [number, number],
  lw: [number, number],
  rw: [number, number]
): PoseFrame {
  return {
    width: 640,
    height: 480,
    timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: ls[0], y: ls[1], score: 1 },
      { name: 'right_shoulder', x: rs[0], y: rs[1], score: 1 },
      { name: 'left_wrist', x: lw[0], y: lw[1], score: 1 },
      { name: 'right_wrist', x: rw[0], y: rw[1], score: 1 }
    ]
  };
}

describe('poseSimilarity', () => {
  it('returns 1 for identical pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.T)).toBeCloseTo(1, 3);
  });
  it('returns low for different pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.O)).toBeLessThan(0.7);
  });
  it('separates T and Y below the accept threshold', () => {
    // T(수평)와 Y(대각선 위)의 교차 유사도는 0.5로, 임계값 0.6에 미달해야 한다.
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.Y)).toBeLessThan(0.6);
    expect(poseSimilarity(TEMPLATES.Y, TEMPLATES.T)).toBeLessThan(0.6);
  });
});

describe('anglesFromFrame', () => {
  it('maps horizontal arms to ~90 (true T)', () => {
    const a = anglesFromFrame(frameOf([270, 120], [370, 120], [170, 120], [470, 120]));
    expect(a.leftArm).toBeCloseTo(90, 0);
    expect(a.rightArm).toBeCloseTo(90, 0);
  });
  it('maps diagonal-up arms to ~135 (true Y)', () => {
    const a = anglesFromFrame(frameOf([270, 120], [370, 120], [200, 50], [440, 50]));
    expect(a.leftArm).toBeCloseTo(135, 0);
    expect(a.rightArm).toBeCloseTo(135, 0);
  });
  it('fails safe (arms down) when keypoints are missing', () => {
    const a = anglesFromFrame({ width: 640, height: 480, timestamp: 0, keypoints: [] });
    expect(a.leftArm).toBe(0);
    expect(a.rightArm).toBe(0);
  });
  it('normalizes hand and ankle distance by shoulder width', () => {
    const f: PoseFrame = {
      width: 640,
      height: 480,
      timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 270, y: 120, score: 1 },
        { name: 'right_shoulder', x: 370, y: 120, score: 1 },
        { name: 'left_wrist', x: 220, y: 120, score: 1 },
        { name: 'right_wrist', x: 420, y: 120, score: 1 },
        { name: 'left_ankle', x: 300, y: 400, score: 1 },
        { name: 'right_ankle', x: 340, y: 400, score: 1 }
      ]
    };
    const a = anglesFromFrame(f);
    expect(a.handSpread).toBeCloseTo(2, 2);
    expect(a.legSpread).toBeCloseTo(0.4, 2);
  });
  it('leaves legSpread undefined when ankles are not visible', () => {
    expect(anglesFromFrame(frameOf([270, 120], [370, 120], [170, 120], [470, 120])).legSpread).toBeUndefined();
  });
  it('marks a hand as crossed when it is on the opposite side of the body', () => {
    // 실제 카메라처럼 왼쪽 어깨가 이미지 오른쪽(큰 x)에 오는 배치.
    const f: PoseFrame = {
      width: 640,
      height: 480,
      timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 370, y: 120, score: 1 },
        { name: 'right_shoulder', x: 270, y: 120, score: 1 },
        // 왼손이 몸 중심(320)을 넘어 반대편(작은 x)으로 가로지름
        { name: 'left_wrist', x: 250, y: 220, score: 1 },
        { name: 'right_wrist', x: 230, y: 220, score: 1 }
      ]
    };
    const a = anglesFromFrame(f);
    expect(a.leftHandCrossed).toBe(true);
    expect(a.rightHandCrossed).toBe(false);
  });
});

describe('BodyABC', () => {
  it('hides face mask for readability of the top text and guide', () => {
    expect(new BodyABC().hideFace).toBe(true);
  });
  it('draws target letter and skeleton guide without throwing', () => {
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
    const g = new BodyABC();
    g.start();
    for (const t of ALL_TARGETS) {
      g.target = t;
      arcs = 0;
      texts.length = 0;
      expect(() => g.draw(ctx, 640, 480)).not.toThrow();
      // 막대인간 머리(arc 1회 이상) + 목표 글자(상단 큰 글자·가이드 하단 글자)가 그려져야 함
      expect(arcs).toBeGreaterThanOrEqual(1);
      expect(texts.some((a) => a[0] === t)).toBe(true);
    }
  });
  it('accepts held T pose', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    // NOTE: deviation from brief verbatim (binding Tasks 7-8 ruling):
    // pose-ok is single-fire at tick ~63 (holdMs>1000) then holdMs resets,
    // so last-tick-only `events = ...` assignment misses it. Accumulate instead; impl stays verbatim.
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tickAngles({ ...TEMPLATES.T }, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
  it('does not complete Y with an exact T pose (and vice versa)', () => {
    const forY = new BodyABC();
    forY.start();
    forY.target = 'Y';
    const yEvents: { type: string }[] = [];
    for (let i = 0; i < 80; i++) yEvents.push(...forY.tickAngles({ ...TEMPLATES.T }, 16));
    expect(yEvents.some((e) => e.type === 'pose-ok')).toBe(false);
    const forT = new BodyABC();
    forT.start();
    forT.target = 'T';
    const tEvents: { type: string }[] = [];
    for (let i = 0; i < 80; i++) tEvents.push(...forT.tickAngles({ ...TEMPLATES.Y }, 16));
    expect(tEvents.some((e) => e.type === 'pose-ok')).toBe(false);
  });
  it('accepts sloppy poses within tolerance (relaxed judging)', () => {
    // 양팔 합쳐 ±30° 어긋나도 성공: 예전 임계값(0.8)에서는 탈락하던 케이스.
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tickAngles({ leftArm: 120, rightArm: 60, torso: 90 }, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
  it('completes T from a real horizontal-arms frame', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    const f = frameOf([270, 120], [370, 120], [170, 120], [470, 120]);
    const all: { type: string }[] = [];
    for (let i = 0; i < 70; i++) all.push(...g.tick(f, 16));
    expect(all.some((e) => e.type === 'pose-ok')).toBe(true);
  });
  it('presents random targets with no immediate repeat', () => {
    const g = new BodyABC();
    g.start();
    const done: string[] = [];
    for (let i = 0; i < 2000 && done.length < 10; i++) {
      const ideal: Angles = { ...TEMPLATES[g.target] };
      // K는 위로 든 팔 + 반대쪽으로 가로지른 팔이 함께 있어야 인정된다.
      if (g.target === 'K') ideal.rightHandCrossed = true;
      for (const e of g.tickAngles(ideal, 16)) {
        if (e.type === 'pose-ok') done.push(e.label);
      }
    }
    expect(done).toHaveLength(10);
    for (let i = 1; i < done.length; i++) expect(done[i]).not.toBe(done[i - 1]);
    expect(new Set(done).size).toBeGreaterThanOrEqual(2);
  });
  it('accepts arms-down I pose (breather)', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'I';
    expect(holdAll(g, { ...TEMPLATES.I })).toContain('pose-ok');
  });
  it('accepts K with one arm up and the other crossed over', () => {
    const variants: Angles[] = [
      { leftArm: 150, rightArm: 40, torso: 90, rightHandCrossed: true },
      { leftArm: 40, rightArm: 150, torso: 90, leftHandCrossed: true }
    ];
    for (const angles of variants) {
      const g = new BodyABC();
      g.start();
      g.target = 'K';
      expect(holdAll(g, angles)).toContain('pose-ok');
    }
  });
  it('does not complete K with only one arm raised (no crossing)', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'K';
    const hanging: Angles = { leftArm: 150, rightArm: 40, torso: 90, rightHandCrossed: false };
    expect(holdAll(g, hanging)).not.toContain('pose-ok');
  });
  it('X requires spread legs (Y stance is not X)', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'X';
    const yStance: Angles = { leftArm: 150, rightArm: 150, torso: 90, handSpread: 2.4, legSpread: 0.7 };
    expect(holdAll(g, yStance)).not.toContain('pose-ok');
    expect(holdAll(g, { ...yStance, legSpread: 1.8 })).toContain('pose-ok');
  });
  it('Y requires legs together (X stance is not Y)', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'Y';
    const xStance: Angles = { leftArm: 135, rightArm: 135, torso: 90, handSpread: 2.5, legSpread: 1.8 };
    expect(holdAll(g, xStance)).not.toContain('pose-ok');
    expect(holdAll(g, { ...xStance, legSpread: 0.7 })).toContain('pose-ok');
  });
  it('A requires hands together above head and spread legs', () => {
    const aStance: Angles = { leftArm: 160, rightArm: 160, torso: 90, handSpread: 0.3, legSpread: 1.8 };
    const g1 = new BodyABC();
    g1.start();
    g1.target = 'A';
    expect(holdAll(g1, aStance)).toContain('pose-ok');
    const g2 = new BodyABC();
    g2.start();
    g2.target = 'A';
    expect(holdAll(g2, { ...aStance, handSpread: 2.4 })).not.toContain('pose-ok');
    const g3 = new BodyABC();
    g3.start();
    g3.target = 'A';
    expect(holdAll(g3, { ...aStance, legSpread: 0.7 })).not.toContain('pose-ok');
  });
  it('O requires hands together (wide arms are Y, not O)', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'O';
    const wide: Angles = { leftArm: 160, rightArm: 160, torso: 90, handSpread: 2.4, legSpread: 0.7 };
    expect(holdAll(g, wide)).not.toContain('pose-ok');
    expect(holdAll(g, { ...wide, handSpread: 0.3 })).toContain('pose-ok');
  });
  it('seated mode excludes X and A and ignores leg spread', () => {
    const g = new BodyABC();
    expect(g.availableTargets).toHaveLength(8);
    g.mode = 'seated';
    expect(g.availableTargets).toHaveLength(6);
    expect(g.availableTargets).not.toContain('X');
    expect(g.availableTargets).not.toContain('A');
    g.start();
    g.target = 'Y';
    const seatedY: Angles = { leftArm: 135, rightArm: 135, torso: 90, handSpread: 2.5, legSpread: 1.8 };
    expect(holdAll(g, seatedY)).toContain('pose-ok');
  });
});
