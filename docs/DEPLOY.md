# 배포 가이드 (정적 호스팅, 서버 없음)

## 공통

```bash
npm install
npm run build   # dist/ 생성
```

`dist/` 통째로 업로드. 환경변수 없음. HTTPS 필수 (카메라·PWA).

- 참고: dist 약 5.8MB (pose_landmarker 모델 포함, precache 12 entries)
- 주 번들 약 170KB (MediaPipe tasks-vision 래퍼 포함, wasm은 CDN에서 로드)

## GitHub Pages

`vite.config.ts`에 `base: '/skeleton-versus/'` 설정 후 build,
`dist/`를 `gh-pages` 브랜치에 푸시.

```bash
git worktree add /tmp/vs-ghpages gh-pages
find /tmp/vs-ghpages -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. /tmp/vs-ghpages/
git -C /tmp/vs-ghpages add -A
git -C /tmp/vs-ghpages commit -m "deploy <버전>"
git -C /tmp/vs-ghpages push origin gh-pages
git worktree remove --force /tmp/vs-ghpages
```

## Cloudflare Pages

빌드 명령 `npm run build`, 출력 디렉토리 `dist`, 프레임워크 프리셋 Vite.

## 학교 인트라넷

`dist/`를 내부 웹서버에 복사. 포즈 모델(pose_landmarker)은
`dist/models/`에 동봉되어 Service Worker가 첫 방문에 precache하므로,
외부 차단 망에서도 모델은 동작. 유일한 외부 의존성은
`@mediapipe/tasks-vision` wasm (jsdelivr, 첫 실행 시 1회).
완전 오프라인이 필요하면 wasm 파일도 내부 경로에 두고
`src/pose/mediapipe-dual.ts`의 URL을 교체.
