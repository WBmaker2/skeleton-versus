import type { GameMeta } from '../meta';

export const recycleMeta: GameMeta = {
  id: 'recycle',
  no: 12,
  name: '분리수거 스트레칭',
  rule: '몸을 기울여 플라스틱은 왼쪽, 캔은 오른쪽 통에 넣어요.',
  effect: '환경 공부 · 유연성',
  art: 'art/recycle-sort.jpg',
  artAlt: '재활용 통에 쓰레기를 나누어 담는 귀여운 캐릭터 그림',
  accent: '#5d34d0',
  help: [
    '가운데에 랜덤으로 나온 쓰레기에 손을 가져가 잡으세요. (왼손·오른손 모두 가능)',
    '플라스틱은 왼쪽, 캔은 오른쪽 통으로 가져가세요. 빛나는 쪽이 목표 통이에요.',
    '통 자리에서 0.5초 버티면 성공, 반대쪽 통에 있으면 실패예요.'
  ]
};
