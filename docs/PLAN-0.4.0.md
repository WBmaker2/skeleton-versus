# 0.4.0 구현 계획 (승인됨)

실행 순서: A(문서) → B(전적) → C(파티클) → D(성능·앉음) → 검증·배포.
실패 시 중단·보고 (수정 없이 로그 전달).

## A. 오래된 문서 정리

- `docs/PREDEPLOY.md`를 versus 실측으로 전면 갱신: base `/skeleton-versus/`,
  17 files / 71 tests, precache 12개 5.8MB, 에셋·manifest·scope prefix,
  아이콘 실측(192·512 PNG), 첫 실행 wasm 1회 온라인 명시.
  1P 잔재(`skeleton-idea`, keyboard-run, FallbackEngine, 54 tests) 삭제.
- `docs/DEPLOY.md` 갱신: dist 5.8MB, 모델 동봉(pose task만, MoveNet 삭제),
  wasm jsdelivr 의존.
- `docs/superpowers/` 1P 설계서는 تاریخ 기록이라 손대지 않음.
- 수락: `skeleton-idea·keyboard·MoveNet·54 tests` 잔재 0건 (grep 확인).

## B. 대전 전적·리매치

- 신설 `src/versus/record.ts`: `loadRecord(id)` / `saveResult(id, winner)`,
  localStorage 키 `skelversus:record:<duel>` (1P `skelplay:`와 분리).
- `versus-main.ts` 결과 오버레이에 전적 1줄 (`P1 2승 · P2 1승 · 무 1`).
  승자 판정 로직 재사용, `다시 대전` 버튼 btn-pulse·포커스 유지.
- 테스트 `record.test.ts`: 저장·누적·무승부·깨진 JSON 내성.
- 수락: 3종 승리·무승부 저장 후 새로고침해도 전적 유지.

## C. VersusLoop 파티클·콤보 연출

- `versus-loop.ts` 내부 경량 파티클 (위치·속도·중력·수명, versus 전용 최소 구현).
- `slice/correct/beat`(Perfect) → 득점 쪽 반쪽 중앙 상단 축하 burst 18개.
  `bomb/wrong` → 해당 반쪽 붉은 burst 10개 + 폭탄만 canvas shake.
- 콤보 마일스톤: `left/right.board.combo`를 매 프레임 읽어 5 단위마다 큰 burst
  (인터페이스 변경 없음).
- 그리기 순서: 사이드 클립 → 오버레이 → 스켈레톤 → 크롬 → 파티클(맨 위).
- `prefers-reduced-motion`이면 파티클 0개 (shake는 CSS가 이미 끔).
- 테스트: stub ctx + stub dual engine + rAF 수동 구동.
  rAF가 까다로우면 `tickFrame(nowMs)` 분리 (프로덕션 동작 동일).
- 수락: 베기·정답·Perfect에 파티클, 폭탄에 흔들림+붉은 burst, reduced-motion 조용.

## D. 저사양·앉음 대응

- `VersusLoop`에 `fps` getter (최근 60프레임 이동평균, 인라인 구현).
  캔버스 우하단에 작게 표시 (DOM 변경 없이 오버레이와 같은 패스).
- 자동 품질: fps 25 미만 3초 지속 → 백킹 0.75배 + 파티클 절반,
  30 이상 회복 시 원복 (히스테리시스). `fitStageToVideo`에 scale 인자 (기본 1).
- 앉음 안내: 과일·수학 help에 "앉아서도 가능", 줄다리기는 "서서만" 명시.
- `VERSUS-QA.md` 결과표에 저사양·앉음 실측 행 추가 (미실시).
- 테스트: fps 계산·degrade 경계·help 문구 존재.
- 수락: 가짜 저fps에서 백킹 축소·파티클 감소, help 3종 반영.

## 마무리

1. `tsc` → `vitest` (기대 71+약 15개) → `build` (precache 유지).
2. `UPDATELOG` (같은 날짜 섹션) + `CHANGELOG 0.4.0`.
3. 커밋 1개 → `main` 푸시 → `gh-pages` 게시 → Pages `built`·라이브 200·새 번들 문구 실측.
