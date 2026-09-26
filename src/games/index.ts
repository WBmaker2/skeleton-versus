import { fruitMeta } from './fruit/meta';
import { squatMeta } from './squat/meta';
import { mathMeta } from './math/meta';
import { abcMeta } from './abc/meta';
import { starMeta } from './star/meta';
import { balloonMeta } from './balloon/meta';
import { zombieMeta } from './zombie/meta';
import { danceMeta } from './dance/meta';
import { simonMeta } from './simon/meta';
import { yogaMeta } from './yoga/meta';
import { duoMeta } from './duo/meta';
import { recycleMeta } from './recycle/meta';
import type { GameMeta } from './meta';

export type { GameMeta };

// 카드 번호순. 새 게임은 meta를 만들고 이 목록에만 추가하면
// 랜딩·게임 방법·게임 제목에 자동 반영된다.
export const GAMEMETAS: GameMeta[] = [
  fruitMeta,
  squatMeta,
  mathMeta,
  abcMeta,
  starMeta,
  balloonMeta,
  zombieMeta,
  danceMeta,
  simonMeta,
  yogaMeta,
  duoMeta,
  recycleMeta
].sort((a, b) => a.no - b.no);
