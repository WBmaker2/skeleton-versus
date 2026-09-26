// src/versus/record.ts
// 대전 전적 저장. 종목별으로 P1 승·P2 승·무승부를 센다.
// 브라우저 localStorage에 두며, 1인 기록(`skelplay:`)과 키가 겹치지 않는다.

import type { VersusId } from './metas';

export type Winner = 'p1' | 'p2' | 'draw';

export interface Record {
  p1: number;
  p2: number;
  draw: number;
}

const KEY_PREFIX = 'skelversus:record:';

function key(id: VersusId): string {
  return `${KEY_PREFIX}${id}`;
}

export function emptyRecord(): Record {
  return { p1: 0, p2: 0, draw: 0 };
}

export function loadRecord(id: VersusId): Record {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return emptyRecord();
    const parsed = JSON.parse(raw) as Partial<Record>;
    return {
      p1: Math.max(0, Math.floor(Number(parsed.p1) || 0)),
      p2: Math.max(0, Math.floor(Number(parsed.p2) || 0)),
      draw: Math.max(0, Math.floor(Number(parsed.draw) || 0))
    };
  } catch {
    // 깨진 저장값은 기본값으로 (덮어쓰지 않고 읽기만).
    return emptyRecord();
  }
}

export function saveResult(id: VersusId, winner: Winner): Record {
  const rec = loadRecord(id);
  if (winner === 'p1') rec.p1 += 1;
  else if (winner === 'p2') rec.p2 += 1;
  else rec.draw += 1;
  try {
    localStorage.setItem(key(id), JSON.stringify(rec));
  } catch {
    // 저장 실패(사생활 모드 등)는 무시 — 이번 판 표시에는 영향 없음.
  }
  return rec;
}

export function recordLabel(rec: Record): string {
  return `지금까지 전적 — P1 ${rec.p1}승 · P2 ${rec.p2}승 · 무 ${rec.draw}`;
}
