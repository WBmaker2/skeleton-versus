// 게임별 폴더의 공개 정보: 랜딩 카드·게임 방법·게임 화면 제목이 모두 여기서 나온다.
// 새 게임은 src/games/<id>/ 폴더에 로직·meta·테스트를 넣고
// src/games/index.ts의 GAMEMETAS에만 meta를 등록하면 된다.
export interface GameMeta {
  id: string;
  no: number;
  name: string;
  rule: string;
  effect: string;
  art: string;
  artAlt: string;
  accent: string;
  help: string[];
}
