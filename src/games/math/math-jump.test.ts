// tests/math-jump.test.ts
import { describe, expect, it } from 'vitest';
import { MathJump, makeQuiz, type Quiz } from './math-jump';
import type { PoseFrame } from '../../pose/types';

function answerOf(quiz: Quiz): number {
  const m = quiz.q.match(/^(\d+)([+\-×])(\d+)=\?$/);
  if (!m) throw new Error(`bad quiz: ${quiz.q}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  return m[2] === '+' ? a + b : m[2] === '-' ? a - b : a * b;
}

function centerFrame(x: number, wristY = 90): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: x - 50, y: 100, score: 1 },
      { name: 'right_shoulder', x: x + 50, y: 100, score: 1 },
      { name: 'left_hip', x: x - 40, y: 200, score: 1 },
      { name: 'right_hip', x: x + 40, y: 200, score: 1 },
      { name: 'left_wrist', x, y: wristY, score: 1 },
      { name: 'right_wrist', x, y: wristY, score: 1 }
    ]
  };
}

function oneHandFrame(x: number): PoseFrame {
  const f = centerFrame(x, 150);
  const lw = f.keypoints.find((k) => k.name === 'left_wrist');
  if (lw) lw.y = 60;
  return f;
}

describe('MathJump', () => {
  it('zones split width into thirds', () => {
    const g = new MathJump();
    expect(g.zoneOf(100, 600)).toBe(0);
    expect(g.zoneOf(300, 600)).toBe(1);
    expect(g.zoneOf(500, 600)).toBe(2);
  });
  it('waits think time before confirming answer', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    // 생각 시간(3.5초) 안에는 같은 자리에 있어도 확정되면 안 됨
    const early: string[] = [];
    for (let i = 0; i < 40; i++) early.push(...g.tick(centerFrame(550), 16).map((e) => e.type));
    expect(early.some((t) => t === 'correct' || t === 'wrong')).toBe(false);
    expect(g.isThinking).toBe(true);
    // 생각 시간 + dwell이 지나면 확정됨
    const late: string[] = [];
    for (let i = 0; i < 300; i++) late.push(...g.tick(centerFrame(550), 16).map((e) => e.type));
    expect(late.some((t) => t === 'correct' || t === 'wrong')).toBe(true);
  });
  it('gives think time again after next quiz', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    for (let i = 0; i < 300; i++) g.tick(centerFrame(550), 16);
    // 문제가 바뀌면 다시 생각 중 상태여야 함
    expect(g.isThinking).toBe(true);
    expect(g.thinkRemainingMs).toBeGreaterThan(0);
  });
  it('hides face mask for readability of the top quiz text', () => {
    expect(new MathJump().hideFace).toBe(true);
  });
  it('judges instantly on both hands up even during think time', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    expect(g.isThinking).toBe(true);
    // 예열(1.2초)이 지난 뒤 정답 자리에서 양손을 올리면 즉시 정답
    for (let i = 0; i < 80; i++) g.tick(centerFrame(550), 16);
    const events = g.tick(centerFrame(550, 60), 16);
    expect(events.some((e) => e.type === 'correct')).toBe(true);
    // 새 문제의 생각 시간이 다시 시작됨
    expect(g.isThinking).toBe(true);
  });
  it('judges wrong zone instantly on both hands up', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    for (let i = 0; i < 80; i++) g.tick(centerFrame(100), 16);
    const events = g.tick(centerFrame(100, 60), 16);
    expect(events.some((e) => e.type === 'wrong')).toBe(true);
  });
  it('ignores both-hands-up during warmup after a new question', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    // 문제 시작 직후(예열 전) 양손을 올렸다가 계속 들고 있어도 판정 없음
    g.tick(centerFrame(550), 16);
    expect(g.tick(centerFrame(550, 60), 16).length).toBe(0);
    const held: string[] = [];
    for (let i = 0; i < 100; i++) held.push(...g.tick(centerFrame(550, 60), 16).map((e) => e.type));
    expect(held.length).toBe(0);
    // 손을 내렸다가 예열 후에 다시 들어야 발동
    g.tick(centerFrame(550, 150), 16);
    expect(g.tick(centerFrame(550, 60), 16).length).toBeGreaterThan(0);
  });
  it('ignores both-hands-up right after moving zones', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    for (let i = 0; i < 80; i++) g.tick(centerFrame(100), 16);
    // 다른 자리로 옮기자마자 양손을 올리면 판정 없음 (자리 안정 전)
    g.tick(centerFrame(550), 16);
    expect(g.tick(centerFrame(550, 60), 16).length).toBe(0);
    // 같은 자리에서 잠시 머문 뒤 내렸다 다시 들면 정답
    for (let i = 0; i < 25; i++) g.tick(centerFrame(550, 150), 16);
    expect(g.tick(centerFrame(550, 60), 16).some((e) => e.type === 'correct')).toBe(true);
  });
  it('held-up hands do not chain-trigger next questions', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    for (let i = 0; i < 80; i++) g.tick(centerFrame(550), 16);
    expect(g.tick(centerFrame(550, 60), 16).length).toBeGreaterThan(0);
    // 손을 든 채로 있으면 다음 문제가 저절로 넘어가지 않음
    const chained: string[] = [];
    for (let i = 0; i < 100; i++) chained.push(...g.tick(centerFrame(550, 60), 16).map((e) => e.type));
    expect(chained.length).toBe(0);
    // 손을 내렸다 다시 들어야 발동
    g.tick(centerFrame(550, 150), 16);
    expect(g.tick(centerFrame(550, 60), 16).length).toBeGreaterThan(0);
  });
  it('one hand up during think time does not confirm', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    const events: string[] = [];
    for (let i = 0; i < 40; i++) events.push(...g.tick(oneHandFrame(550), 16).map((e) => e.type));
    expect(events.length).toBe(0);
  });
  it('draws the quiz text 3x large (108px)', () => {
    const fonts: string[] = [];
    const fn = (..._args: unknown[]): undefined => undefined;
    const ctx = new Proxy({}, {
      get: (_t, p) => (p === 'canvas' ? undefined : fn),
      set: (t, p, v) => {
        if (p === 'font') fonts.push(String(v));
        (t as Record<string | symbol, unknown>)[p] = v;
        return true;
      }
    }) as unknown as CanvasRenderingContext2D;
    const g = new MathJump();
    g.start();
    g.draw(ctx, 640, 480);
    // 첫 번째로 그리는 글자가 문제 텍스트: 기존 36px의 3배
    expect(fonts[0]).toContain('108px');
  });
});

describe('makeQuiz', () => {
  it('always points answerIndex at the correct value with unique choices', () => {
    for (let i = 0; i < 200; i++) {
      const quiz = makeQuiz();
      expect(quiz.choices).toHaveLength(3);
      expect(new Set(quiz.choices).size).toBe(3);
      expect(quiz.answerIndex).toBeGreaterThanOrEqual(0);
      expect(quiz.answerIndex).toBeLessThanOrEqual(2);
      expect(quiz.choices[quiz.answerIndex]).toBe(answerOf(quiz));
      expect(quiz.choices.every((c) => c >= 0)).toBe(true);
    }
  });
  it('never repeats the previous question', () => {
    let prev: string | undefined;
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const quiz = makeQuiz(prev);
      expect(quiz.q).not.toBe(prev);
      prev = quiz.q;
      seen.add(quiz.q);
    }
    // 50문제 중 서로 다른 문제가 여러 개 나와야 함 (고정 3문제 순환이 아님)
    expect(seen.size).toBeGreaterThan(3);
  });
  it('keeps kid-friendly ranges (no negative answers)', () => {
    for (let i = 0; i < 200; i++) {
      expect(answerOf(makeQuiz())).toBeGreaterThanOrEqual(0);
    }
  });
});
