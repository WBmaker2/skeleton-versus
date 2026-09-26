// src/game/types.ts
import type { PoseFrame } from '../pose/types';

export interface GameEvent { type: string; points: number; label: string }
export interface Game {
  id: string;
  // true면 얼굴 마스크를 그리지·불러오지 않는다 (상단 텍스트와 겹칠 때).
  hideFace?: boolean;
  // 얼굴 마스크 크기 배율 (기본 1). 풍선 헤딩처럼 게임 요소와
  // 겹치면 0.5처럼 줄여서 시인성을 확보한다.
  faceScale?: number;
  start(): void;
  stop(): void;
  tick(frame: PoseFrame, dtMs: number): GameEvent[];
}
