import type { GameMeta } from '../meta';

export const abcMeta: GameMeta = {
  id: 'abc',
  no: 4,
  name: '몸으로 ABC',
  rule: 'T, Y, O, L, I, K, X, A 모양을 몸으로 만들어요.',
  effect: '영어 공부 · 유연성',
  art: 'art/body-abc.jpg',
  artAlt: '팔을 벌려 T자 모양을 만드는 귀여운 캐릭터 그림',
  accent: '#5d34d0',
  help: [
    '제시되는 알파벳(T, Y, O, L, I, K, X, A) 모양을 몸으로 만드세요.',
    '오른쪽 위 그림(스켈레톤 예시)을 보고 따라 해보세요.',
    '모양을 1초 동안 유지하면 인정돼요.',
    'X와 A는 다리를 벌려야 하고, 서서 할 때만 나와요.',
    'K는 한 팔을 위로 비스듬히, 다른 팔은 몸 앞을 가로질러 반대쪽 아래로 내려요.',
    '앉아서 할 때는 상체 모양만 봐요.'
  ]
};
