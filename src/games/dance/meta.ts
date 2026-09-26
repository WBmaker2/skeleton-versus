import type { GameMeta } from '../meta';

export const danceMeta: GameMeta = {
  id: 'dance',
  no: 8,
  name: '리듬 댄스 카피',
  rule: '박자에 맞춰 화면의 포즈를 따라 추는 댄스 게임이에요.',
  effect: '리듬감 · 전신 운동',
  art: 'art/rhythm-dance.jpg',
  artAlt: '음표와 함께 신나게 춤추는 귀여운 캐릭터 그림',
  accent: '#5d34d0',
  help: [
    '화면에 나오는 포즈(왼손·오른손·양손·내리기·T자세·Y자세·동그라미·박수·허리손·머리손)를 따라 하세요.',
    '오른쪽 위 스켈레톤 그림이 이번 박자의 정답 모양이에요.',
    '포즈를 맞히면 다음 박자로 넘어가요.',
    '1.8초 동안 못 맞히면 다음 박기로 넘어가요.'
  ]
};
