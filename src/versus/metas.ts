import { fruitDuelMeta } from '../versus-games/fruit-duel/meta';
import { squatTugMeta } from '../versus-games/squat-tug/meta';
import { mathDashMeta } from '../versus-games/math-dash/meta';

export const VERSUS_METAS = [fruitDuelMeta, squatTugMeta, mathDashMeta];
export type VersusId = 'versus-fruit' | 'versus-tug' | 'versus-math';

export function isVersusId(id: string): id is VersusId {
  return id === 'versus-fruit' || id === 'versus-tug' || id === 'versus-math';
}
