import type { GameMeta } from '../meta';

export const starMeta: GameMeta = {
  id: 'star',
  no: 5,
  name: '별잡기 스트레칭',
  rule: '반짝이는 별에 손을 대고 잠시 기다리면 별을 잡아요.',
  effect: '유연성 · 스트레칭',
  art: 'art/star-catch.jpg',
  artAlt: '밤하늘의 큰 별을 향해 손을 뻗는 귀여운 캐릭터 그림',
  accent: '#7cc496',
  help: [
    '반짝이는 별에 손을 대고 0.3초 기다리세요.',
    '별을 잡으면 다음 별이 다른 곳에 나타나요.',
    '좌우·위아래로 크게 움직여 보세요.'
  ]
};
