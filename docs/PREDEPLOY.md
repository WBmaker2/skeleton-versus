# 배포 전 검증 기록 (2026-09-27, 0.3.0 기준)

대상 호스팅: GitHub Pages (project site). `vite.config.ts` base `/skeleton-versus/`
(저장소명이 다르면 해당 값으로 교체 후 재빌드. 루트 호스팅 시 `/`).

## 자동 검증 (본 환경 실행)

- `npx tsc --noEmit` — clean
- `npx vitest run` — 17 files / 71 tests PASS (대전 코어·3종·카메라·라우터·모달 등)
- `npm run build` — 성공, precache 12 entries (5827 KiB)
- 1인 12종 코드 제거 후 번들이 16MB에서 5.8MB로 감소 (tfjs·MoveNet 모델·1인 아트 삭제)

## dist/PWA 감사

- `dist/`: index.html, assets/index-*.js (약 170KB), icon-192/512.png,
  manifest.webmanifest, sw.js, workbox-*.js, registerSW.js, models/pose_landmarker_lite.task
- 에셋·manifest·SW 경로 전부 `/skeleton-versus/` prefix — project site 정상
- manifest: name Skeleton Versus - 2인 대전, scope `/skeleton-versus/`, start_url `.`,
  icons 실측 PNG 192x192 / 512x512 (file 확인)
- 주의: 첫 실행 시 tasks-vision wasm 1회 온라인 필요 (jsdelivr),
  이후 Service Worker 캐시. 카메라·PWA는 HTTPS 필수 (Pages 기본 제공).

## 사용자 측 잔여 단계 (실기기·계정 필요)

1. GitHub 저장소: https://github.com/WBmaker2/skeleton-versus (public)
2. `dist/`를 `gh-pages` 브랜치에 게시 — 라이브:
   https://WBmaker2.github.io/skeleton-versus/ (index/manifest/icon 200 확인)
   - 대전 3종: `/#/versus-fruit`, `/#/versus-tug`, `/#/versus-math`
   - 재배포: `git worktree add /tmp/vs-ghpages gh-pages` 후 dist 복사·푸시
3. 실기기 QA (`docs/VERSUS-QA.md` 10항목) 실행 후 결과 기록
4. 문제 발견 시 이슈로 등록 → 다음 플랜에서 수정
