// 대전 전용 라우터: 랜딩(대전 고르기) + 대전 종목.
// 새 종목은 VERSUS_METAS에만 추가하면 라우트도 따라온다.
import { VERSUS_METAS, type VersusId } from '../versus/metas';

export type GameId = VersusId | 'home';

export function parseHash(hash: string): GameId {
  const id = hash.replace(/^#\//, '');
  return (VERSUS_METAS as Array<{ id: string }>).some((m) => m.id === id)
    ? (id as VersusId)
    : 'home';
}
