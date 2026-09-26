import type { GameMeta } from '../meta';

export const yogaMeta: GameMeta = {
  id: 'yoga',
  no: 10,
  name: '요가 거울',
  rule: '산·전사·만세·합장·삼각·나무 6자세를 3초 동안 흔들리지 않고 버텨요.',
  effect: '균형 · 자세 교정',
  art: 'art/yoga-mirror.jpg',
  artAlt: '나무 자세로 균형을 잡는 귀여운 캐릭터 그림',
  accent: '#00ffff',
  help: [
    '산 자세부터 시작해 3초 동안 흔들리지 않고 버티세요.',
    '오른쪽 위 스켈레톤 그림이 이번 자세의 정답 모양이에요.',
    '산→전사→만세→합장→삼각→나무 순서로 넘어가요. (전사·삼각은 다리를 벌려요)',
    '삼각은 어느 쪽 팔을 올려도 돼요.',
    '자세가 흐트러지면 처음부터 다시 세어요.'
  ]
};
