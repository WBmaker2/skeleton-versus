// src/game/storage.ts
export interface ScoreEntry {
  name: string;
  score: number;
  // 저장 시각(ms). 구버전 항목에는 없을 수 있다.
  date?: number;
}

// 이름 중복 병합: 앞뒤 공백을 제거한 이름 기준으로 최고점 1개만 남긴다.
// 구버전 저장값의 중복도 읽을 때 정리되므로 별도 마이그레이션이 필요 없다.
function mergeByName(list: ScoreEntry[]): ScoreEntry[] {
  const byName = new Map<string, ScoreEntry>();
  for (const e of list) {
    const key = e.name.trim();
    const cur = byName.get(key);
    if (!cur || e.score > cur.score) byName.set(key, { ...e, name: key });
  }
  return [...byName.values()];
}

function readList(gameId: string): ScoreEntry[] {
  const raw = localStorage.getItem(`skelplay:${gameId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(parsed) ? mergeByName(parsed) : [];
  } catch {
    return [];
  }
}

function writeList(gameId: string, list: ScoreEntry[]): void {
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(`skelplay:${gameId}`, JSON.stringify(list.slice(0, 5)));
}

export function saveScore(gameId: string, entry: ScoreEntry): ScoreEntry {
  const name = entry.name.trim();
  const list = readList(gameId);
  const i = list.findIndex((e) => e.name.trim() === name);
  if (i >= 0) {
    // 같은 이름이 있으면 더 높은 점수만 남긴다. 낮으면 기존 기록을 그대로 반환.
    if (entry.score > list[i].score) {
      const saved = { ...entry, name, date: entry.date ?? Date.now() };
      list[i] = saved;
      writeList(gameId, list);
      return saved;
    }
    return list[i];
  }
  const saved = { ...entry, name, date: entry.date ?? Date.now() };
  list.push(saved);
  writeList(gameId, list);
  return saved;
}

export function updateScore(gameId: string, index: number, entry: ScoreEntry): void {
  const list = readList(gameId);
  if (index < 0 || index >= list.length) return;
  list[index] = { ...entry, date: entry.date ?? list[index].date ?? Date.now() };
  writeList(gameId, list);
}

export function removeScore(gameId: string, index: number): void {
  const list = readList(gameId);
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  writeList(gameId, list);
}

export function topScores(gameId: string, limit = 5): ScoreEntry[] {
  return readList(gameId).slice(0, limit);
}

export function shareLink(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}#/${gameId}`;
}
