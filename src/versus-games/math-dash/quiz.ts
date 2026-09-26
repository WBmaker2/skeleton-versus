// src/versus-games/math-dash/quiz.ts
// 대전용 랜덤 문제 은행. 초등 수준: 덧셈·뺄셈(음수 없음)·구구단,
// 오답은 정답 근처 그럴듯한 값. 1인 수학 퀴즈와 같은 난이도.

export interface Quiz { q: string; choices: [number, number, number]; answerIndex: 0 | 1 | 2 }

type Op = '+' | '-' | '×';

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickDistractors(answer: number): [number, number] {
  const cands = [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + 3];
  const out: number[] = [];
  for (const c of cands) {
    if (c < 0 || c === answer || out.includes(c)) continue;
    out.push(c);
    if (out.length === 2) break;
  }
  let d = answer + 4;
  while (out.length < 2) {
    if (d !== answer && !out.includes(d)) out.push(d);
    d += 1;
  }
  return [out[0], out[1]];
}

function buildQuiz(a: number, op: Op, b: number): Quiz {
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const [d1, d2] = pickDistractors(answer);
  const vals = [d1, d2, answer];
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  return {
    q: `${a}${op}${b}=?`,
    choices: [vals[0], vals[1], vals[2]],
    answerIndex: vals.indexOf(answer) as 0 | 1 | 2
  };
}

export function makeQuiz(prevQ?: string): Quiz {
  let a = 7;
  let op: Op = '+';
  let b = 8;
  for (let attempt = 0; attempt < 8; attempt++) {
    const roll = Math.random();
    if (roll < 0.4) {
      a = randInt(4, 19); b = randInt(3, 9); op = '+';
    } else if (roll < 0.7) {
      a = randInt(5, 19); b = randInt(2, a - 1); op = '-';
    } else {
      a = randInt(2, 9); b = randInt(2, 9); op = '×';
    }
    if (`${a}${op}${b}=?` !== prevQ) break;
  }
  return buildQuiz(a, op, b);
}
