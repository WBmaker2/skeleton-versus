import type { GameMeta } from '../meta';

export const simonMeta: GameMeta = {
  id: 'simon',
  no: 9,
  name: '사이먼 AI 선생님',
  rule: '선생님의 지시를 듣고 몸으로 재빨리 답해요.',
  effect: '듣기 · 반응 속도',
  art: 'art/simon-says.jpg',
  artAlt: '확성기로 지시를 내리는 귀여운 로봇 선생님 그림',
  accent: '#7cc496',
  help: [
    '선생님의 지시(왼손·오른손·양손·가만히)를 듣고 몸으로 답하세요.',
    '양손은 두 손을 어깨보다 살짝 위로 올리면 돼요 (모으거나 벌려도 돼요).',
    '맞히면 15점, 2.5초가 지나면 다음 지시로 넘어가요.'
  ]
};
