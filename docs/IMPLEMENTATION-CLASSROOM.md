# 구현 계획 — 교실(원거리·단체) · 18종 다듬기 · 듀오 전용

> 결정: 교실 원거리(2.5~3.5m, TV/빔), 18종 신종목 추가보다 튜토리얼·연습으로 다듬기, 솔로는 정식 모드 만들지 않고 듀오 결과 흐름 유지.
> 대상: `docs/UPDATELOG.md`, `src/versus/*`, `src/landing/*`, `src/ui/*`, `src/versus-games/*`, `src/game/engine.ts`

## Phase 0 정리
- 휘두르기 판정 변경(미커밋 12파일) 커밋. `recordLabel/DualBoard` 사용처 결정.

## Phase 1 안정화(P0)
1. 수명: `VersusLoop`/`engine.dispose()`/`타이머`를 `main.ts` 해시 이동 시 정리. 재진입 중복 루프 차단.
2. 타이머: `elapsedSec` 리플레이 버그 수정, 종료 시 `clearInterval`.
3. 재시도: 카메라/모델 실패 시 `retry` 노출.
4. 보정 게이트: `isTPose`로 T자세·둘 다 보임 검증, 스킵은 ‘보정 생략’ 명시. 3-2-1 카운트다운 없음 → 준비 카운트 문구.
5. 추론 실패 `onHint` 노출.

## Phase 2 첫 판 확신(P0)
1. 카드 정보: 앉음/서기·방해·운동량 아이콘+텍스트. `CAT_OF`를 meta로 이동, 긴 `rule` 클램프 해소.
2. 연습 모드: 15초 무방해·미저장, 판정 피드백. `startVersus(mode)` 확장.
3. 무효 피드백 일반화: fruit/punch/balloon(휘둘러야)·mole(내려찍어) 등.

## Phase 3 투명성(P1)
1. HUD: 콤보·다음 공격까지 N회·방해 종류/남은시간·점수 델타. 단일 `#hud` 분리(득점/경고).
2. 콤보 정합: 도움말에 보너스 명시 or 보너스 제거. 목표: ‘적힌 점수=실제 점수’.
3. 줄다리기류 결과: 점수 외 줄 위치/당김 횟수.

## Phase 4 재방문(P1)
1. 전적 복원: 결과 `recordLabel` + 랜딩 카드 ‘P1 3승’.
2. 결과 이동: 리매치/다른 종목/랜덤 다음 판, 다승제 옵션 검토.

## Phase 5 접근성(P1, 교실)
1. 색+숫자+아이콘 3중 부호(P1/P2·성공/실패). 최소 글자 상향.
2. 타겟 48px 통일, 앱 내 소리/움직임 토글, 캔버스 aria-live 미러.

## Phase 6 성능(P2)
1. `registry` 동적 import+번들 분리, wasm 셀프호스팅/캐시, JPG WebP/srcset, precache 정리.
2. E2E 1종 + CI(`tsc --noEmit/vitest run`).

## 수용 기준
- `npm test` 전체 통과, `npm run build` 통과.
- 화면: 로딩 구분·보정 게이트·연습·콤보 HUD·전적·선택지 육안 확인.
- 문서: `docs/UPDATELOG.md`·`CHANGELOG.md` 기록.
