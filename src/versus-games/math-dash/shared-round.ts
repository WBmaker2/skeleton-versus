// src/versus-games/math-dash/shared-round.ts
// 수학 달리기 공유 라운드: 양쪽이 같은 문제를 풀고 선착순으로 점수를 나눈다.
// 먼저 맞추면 +20, 같은 문제에 뒤따라 맞추면 +10.
// 새 문제는 문제를 푼 쪽(solvedBy)의 다음 tick에 넘어간다. 그 전까지
// 상대는 옛 문제로 +10을 노릴 수 있다 (같은 프레임 선착순 보장).

import { makeQuiz, type Quiz } from './quiz';

export class SharedMathRound {
  quiz: Quiz = makeQuiz();
  // 이번 문제를 이미 누군가 맞췄는지 (true면 뒤따른 쪽은 +10).
  claimed = false;
  // 방금 문제를 푼 쪽. 이 쪽의 다음 tick에 새 문제로 넘어간다.
  solvedBy: 'p1' | 'p2' | null = null;
  // 문제를 푼 쪽이 다음 tick에 확인할 표시.
  get pendingNext(): boolean {
    return this.solvedBy !== null;
  }
  // 문제 세대. tick 쪽은 이 번호로 새 문제를 감지해 타이머를 리셋한다.
  gen = 0;

  // 문제를 풀었다고 표시한다. 먼저 푼 쪽만 호출 (뒤따른 쪽은 점수만 받음).
  claim(by: 'p1' | 'p2'): boolean {
    const first = !this.claimed;
    this.claimed = true;
    if (first) this.solvedBy = by;
    return first;
  }

  // 새 문제로 넘어간다. 문제를 푼 쪽이 다음 tick에 호출한다.
  next(): void {
    this.quiz = makeQuiz(this.quiz.q);
    this.claimed = false;
    this.solvedBy = null;
    this.gen += 1;
  }
}
