# Skeleton Versus — 카메라 2인 대전

카메라 1대로 즐기는 세로 2분할 실시간 대전 3종. 브라우저에서 설치 없이 동작합니다.

## 시작

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/#/versus-fruit` 접속. 카메라 권한을 허용하세요.
둘이 나란히 2.5~3.5m 거리에서 화면에 다 보여야 합니다.

## 대전 (3종, 60초)

- `#/versus-fruit` 과일 베기 대전: 손으로 과일 베기 (+10). 3콤보마다 상대에게 썩은 과일 (-5). 폭탄 -15점.
- `#/versus-tug` 스쿼트 줄다리기: 앉았다 일어나면 줄 당기기. 박자 Perfect는 2칸. 5연속 Perfect면 파워 당기기 3초.
- `#/versus-math` 수학 달리기 대전: 자기 반쪽 3구역으로 이동 + 손들기. 먼저 정답 +20과 안개 3초, 나중 +10, 오답 -5점.

## 조작법

- 카메라: 두 사람이 좌우로 나란히, 전신이 보이게 2.5~3.5m
- 한 명만 보이면 점수가 멈추고 안내가 나옵니다
- 대전 종료 후 `다시 대전` 버튼으로 바로 재시작

## 기술

- `skeleton-idea`(1인 12종)에서 분리된 별도 사이트
- MediaPipe `numPoses:2` + 코 x좌표 좌우 분리 + 0.5초 스무딩
- 공통: `src/versus/` (split, dual-board, versus-loop, attack, versus-stage)
- 설계: `docs/VERSUS-PLAN.md`
