import { GAMEMETAS } from '../games';
import type { PlayableId } from './app';

export interface GameHelp {
  name: string;
  steps: string[];
}

// 각 게임의 플레이 방법은 해당 게임 폴더의 meta에서 가져온다.
export const RULES: Record<PlayableId, GameHelp> = Object.fromEntries(
  GAMEMETAS.map((m) => [m.id, { name: m.name, steps: m.help }])
) as Record<PlayableId, GameHelp>;
