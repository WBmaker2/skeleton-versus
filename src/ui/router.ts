// 대전 전용 라우터: 랜딩(대전 고르기) + 대전 3종.
export type GameId = 'versus-fruit' | 'versus-tug' | 'versus-math' | 'home';

const ROUTES: GameId[] = ['versus-fruit', 'versus-tug', 'versus-math'];

export function parseHash(hash: string): GameId {
  const id = hash.replace(/^#\//, '') as GameId;
  return (ROUTES as string[]).includes(id) ? id : 'home';
}
