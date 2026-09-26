# 스쿼트 러너 하이브리드 개편 — 설계 기록

- 날짜: 2026-09-21
- 상태: 승인됨 (사용자 선택: 하이브리드형)
- 종류: bounded (기존 `src/game/squat-runner.ts` 1파일 개편)

## 1. 문제

- 스쿼트 판정(무릎각 <100도, 300ms 홀드)은 잘 동작하지만 화면엔 `앉으세요/일어서세요 + N회` 텍스트만 있어 달리는 느낌·회피 긴장감이 없음.
- 실패(부딪힘) 개념이 없어 콤보가 끊길 일이 없고, 60초 내내 같은 템포.

## 2. 목표

- 서있으면 달리기(가속), 장애물이 오면 스쿼트로 숙여 통과하는 정통 러너 루프.
- 서있을 이유(높은 코인+가속)와 앉을 이유(낮은 코인+장애물 회피)를 둘 다 만든다.
- 기존 판정·점수 계약 유지: 스쿼트 1회 `duck` +10점, 10회 `rest` 안내는 그대로.

## 3. 설계 (채택: 하이브리드)

- **트랙:** 플레이어 좌측 고정(`playerX = width*0.22`), 바닥 라인+대시 스크롤(`scrollX += speed*dt`)로 속도감. `isDown`이면 캐릭터 납작(앉음), 아니면 김.
- **장애물(오버헤드 바):** 우→좌 이동. 판정선(`playerX`) 도달 시 서있으면 `caught` + 콤보리셋, 앉아있으면 `dodge` +10점. 스폰 간격 1600ms→900ms로 60초간 가속 (좀비 스텝 `spawn→낙하→판정선` 패턴 재사용).
- **코인 2레인:** 높은 코인은 서서(`!isDown`), 낮은 코인은 앉아서(`isDown`) 획득. `catch` +5점. 빗나가면 그냥 통과(감점 없음, 좌절 방지).
- **속도/거리:** `speed = min(700, 320 + 경과초*4 + 콤보*8) px/s`, `distanceM` 누적. HUD에 `N회 · Xm · 속도` 표시.
- **이벤트:** `duck/rest`(기존) + `dodge/caught/catch`(신규). `loop.ts`의 CELEBRATE(`duck/dodge/catch`)·PENALTY(`caught`) 집합에 이미 있어 파티클·효과음·흔들림이 공짜로 붙음.

## 4. 건드리는 파일

- `src/game/squat-runner.ts` — `Obstacle/Coin` 타입+스폰+충돌+그리기+속도. 공개 API: `obstacles`, `coins`, `distanceM`, `speedPxPerSec`, `spawnObstacle(x?)`, `spawnCoin(lane?)`.
- `tests/squat-runner.test.ts` — 기존 3케이스 유지 + 신규: 서서 부딪힘 / 앉아 회피 / 높은코인 서서 획득 / 낮은코인 앉아 획득 / 빗나가면 미획득.
- `src/ui/help.ts` — `squat` 3줄을 새 규칙(숙여 통과·코인 레인)으로 교체.
- `docs/UPDATELOG.md` + `CHANGELOG.md` — 같은 날짜 섹션에 항목 덧붙이기(프로젝트 운영 규칙).

## 5. 테스트 계획 (TDD)

- RED: 신규 케이스 먼저 추가 → `npm run test -- squat-runner` 실패 확인.
- GREEN: 최소 구현 → 기존 `duck` 테스트 포함 전체 녹색.
- 검증: `npm run test` 전체 + `npm run build` 통과.

## 6. YAGNI (이번에 안 함)

- 점프 판정(발뒤꿈치 상승 등) — 스쿼트 단일 입력 유지.
- 좌우 스텝 회피 — 좀비 게임과 겹치므로 제외.
- 보스·스테이지 전환 — 60초 단일 스테이지 유지.
