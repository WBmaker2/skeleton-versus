# 배포 전 검증 기록 (2026-09-19, main 1ab6adf 이후)

대상 호스팅: GitHub Pages (project site). `vite.config.ts` base `/skeleton-idea/`
(저장소명이 다르면 해당 값으로 교체 후 재빌드. 루트 호스팅 시 `/`).

## 자동 검증 (본 환경 실행)

- `npx tsc --noEmit` — clean
- `npx vitest run` — 19 files / 54 tests PASS (기존 50 + keyboard-run 4)
- `npm run build` — 성공, precache 6 entries (2500.91 KiB < workbox 4MiB 제한)
- `tests/keyboard-run.test.ts` — FallbackEngine+실제 게임으로 4종 완주 증명
  (fruit slice / squat duck / math correct / ABC pose-ok)

## dist/PWA 감사

- `dist/`: index.html, assets/index-*.js (2.56MB), icon-192/512.png,
  manifest.webmanifest, sw.js, workbox-*.js, registerSW.js — 총 2.5MB
- 에셋·manifest·SW 경로 전부 `/skeleton-idea/` prefix — project site 정상
- manifest: name Skeleton Play, scope `/skeleton-idea/`, start_url `.`,
  icons 실측 PNG 192x192 / 512x512 (file + IHDR 확인)
- 주의: 첫 실행 시 모델 CDN 1회 온라인 필요 (tasks-vision wasm, pose_landmarker),
  이후 Service Worker 캐시. 카메라·PWA는 HTTPS 필수 (Pages 기본 제공).

## 사용자 측 잔여 단계 (실기기·계정 필요)

1. ~~GitHub 저장소 생성~~ 완료: https://github.com/WBmaker2/skeleton-games (public)
2. ~~`dist/`를 `gh-pages` 브랜치에 게시~~ 완료 — 라이브:
   https://WBmaker2.github.io/skeleton-games/ (index/manifest/icon 200 확인)
   - 재배포: 키즈 랜딩페이지 반영 (게임 선택 카드 4종, 실측 title 확인)
   - 재배포(0.3.0): 카메라 전용 게임 화면 (선택·재인식·30fps·디자인), 라이브 CSS 200 확인
3. 실기기 QA (`docs/QA-CHECKLIST.md` 10항목) 실행 후 결과 기록
4. 문제 발견 시 이슈로 등록 → 다음 플랜에서 수정
