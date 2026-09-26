import type { GameMeta } from '../meta';

export const fruitMeta: GameMeta = {
  id: 'fruit',
  no: 1,
  name: '과일 닌자 몸버전',
  rule: '손으로 과일을 베어라! 폭탄은 건드리면 안 돼요.',
  effect: '어깨 스트레칭 · 순발력',
  art: 'art/fruit-ninja.jpg',
  artAlt: '웃는 얼굴의 귀여운 닌자가 하늘에 뜬 과일을 베는 그림',
  accent: '#7cc496',
  help: [
    '카메라 앞에 서서 손을 크게 움직여 과일을 베세요.',
    '폭탄에 손이 닿으면 15점이 깎이니 피하세요.',
    '연속으로 베면 콤보 보너스가 붙어요.'
  ]
};
