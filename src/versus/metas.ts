import { fruitDuelMeta } from '../versus-games/fruit-duel/meta';
import { squatTugMeta } from '../versus-games/squat-tug/meta';
import { mathDashMeta } from '../versus-games/math-dash/meta';
import { starDuelMeta } from '../versus-games/star-duel/meta';
import { simonDuelMeta } from '../versus-games/simon-duel/meta';
import { constellDuelMeta } from '../versus-games/constellation-duel/meta';

export const VERSUS_METAS = [
  fruitDuelMeta, squatTugMeta, mathDashMeta,
  starDuelMeta, simonDuelMeta, constellDuelMeta
];
export type VersusId =
  | 'versus-fruit' | 'versus-tug' | 'versus-math'
  | 'versus-star' | 'versus-simon' | 'versus-duo';

export function isVersusId(id: string): id is VersusId {
  return (VERSUS_METAS as Array<{ id: string }>).some((m) => m.id === id);
}
