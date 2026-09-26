# 대전 QA 체크리스트 (VERSUS-QA)

카메라 1대 2인 대전 전용 확인 목록. 자동 검증은 CI 대신 로컬에서 실행하고,
실기기 항목은 교실·거실에서 직접 확인 후 결과를 기록한다.

## 자동 검증 (2026-09-27, 0.3.0 기준 통과)

- `npx tsc --noEmit` — clean
- `npx vitest run` — 17 files / 71 tests PASS
  (공유 라운드 선착순·공유 스폰 대칭·줄 승자·박자 오차·개별 보정·라우터·카메라 폴백 등)
- `npm run build` — 성공, precache 12 entries (5.8MB, 1인 코드 제거 후 16MB→5.8MB)
- `dist/` 감사: `index.html`·에셋 경로 전부 `/skeleton-versus/` prefix,
  manifest name `Skeleton Versus`, scope `/skeleton-versus/`,
  아이콘 실측 PNG 192×192 / 512×512, `models/pose_landmarker_lite.task` 동봉
- 라이브: `/`, `/#/versus-fruit`, `/#/versus-tug`, `/#/versus-math`,
  `manifest.webmanifest`, `icon-192.png`, versus 게임 청크 200 확인

## 실기기 확인 (직접 해보고 체크)

- [ ] 거리 2.5~3.5m에서 둘이 전신으로 들어오는지
- [ ] 밝은 형광등·역광에서 코 추적이 튀지 않는지
- [ ] 가운데선 근처에서 P1/P2가 뒤바뀌지 않는지 (0.5초 스무딩)
- [ ] 겹쳐 섰을 때 점수가 멈추고 안내가 나오는지
- [ ] 저사양 기기(크롬북)에서 30fps 근처가 나오는지
- [ ] 수학: 같은 문제가 양쪽에 보이고 먼저 푼 쪽이 +20인지
- [ ] 과일: 양쪽에 같은 종류가 대칭 위치에 나오는지
- [ ] 줄다리기: 줄·박자바가 보이고 Perfect에 2칸 당겨지는지
- [ ] 세로 화면(휴대폰)에서 점수판이 겹치지 않는지
- [ ] 오프라인(두 번째 방문, 와이파이 끔)에서 실행되는지

## 결과 기록

| 날짜 | 기기·환경 | 결과 |
|---|---|---|
| (미실시) | | 자동 검증만 통과, 실기기는 다음에 확인 |
