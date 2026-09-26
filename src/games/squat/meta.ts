import type { GameMeta } from '../meta';

export const squatMeta: GameMeta = {
  id: 'squat',
  no: 2,
  name: '스쿼트 러너',
  rule: '앉았다 일어서기로 장애물을 피하는 달리기 게임이에요.',
  effect: '하체 운동 · 심폐 지구력',
  art: 'art/squat-runner.jpg',
  artAlt: '모자를 쓴 귀여운 러너 캐릭터가 신나게 달리는 그림',
  accent: '#00ffff',
  help: [
    '박자 순간에 앉고, 박자 사이에는 일어나세요.',
    '앉기까지 초를 세어주고, 타이밍이 되면 지금 앉아!가 나와요.',
    '주황↓은 앉아서, 하늘↑ 코인은 서서 모으세요.'
  ]
};
