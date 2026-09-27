import { fruitDuelMeta } from '../versus-games/fruit-duel/meta';
import { squatTugMeta } from '../versus-games/squat-tug/meta';
import { mathDashMeta } from '../versus-games/math-dash/meta';
import { starDuelMeta } from '../versus-games/star-duel/meta';
import { simonDuelMeta } from '../versus-games/simon-duel/meta';
import { constellDuelMeta } from '../versus-games/constellation-duel/meta';
import { abcDuelMeta } from '../versus-games/abc-duel/meta';
import { danceDuelMeta } from '../versus-games/dance-duel/meta';
import { balloonDuelMeta } from '../versus-games/balloon-duel/meta';
import { zombieDuelMeta } from '../versus-games/zombie-duel/meta';
import { punchDuelMeta } from '../versus-games/punch-duel/meta';
import { clapDuelMeta } from '../versus-games/clap-duel/meta';
import { balanceDuelMeta } from '../versus-games/balance-duel/meta';
import { memoryDuelMeta } from '../versus-games/memory-duel/meta';

export const VERSUS_METAS = [
  fruitDuelMeta, squatTugMeta, mathDashMeta,
  starDuelMeta, simonDuelMeta, constellDuelMeta,
  abcDuelMeta, danceDuelMeta, balloonDuelMeta,
  zombieDuelMeta,
  punchDuelMeta, clapDuelMeta, balanceDuelMeta, memoryDuelMeta
];
export type VersusId =
  | 'versus-fruit' | 'versus-tug' | 'versus-math'
  | 'versus-star' | 'versus-simon' | 'versus-duo'
  | 'versus-abc' | 'versus-dance' | 'versus-balloon'
  | 'versus-zombie'
  | 'versus-punch' | 'versus-clap' | 'versus-balance' | 'versus-memory';

export function isVersusId(id: string): id is VersusId {
  return (VERSUS_METAS as Array<{ id: string }>).some((m) => m.id === id);
}
