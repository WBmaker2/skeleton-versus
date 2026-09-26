# 배포 가이드 (정적 호스팅, 서버 없음)

## 공통

```bash
npm install
npm run build   # dist/ 생성
```

`dist/` 통째로 업로드. 환경변수 없음. HTTPS 필수 (카메라·PWA).

- 참고: dist 약 2.6MB (tfjs+MediaPipe 포함, workbox precache 4MiB 설정)

## GitHub Pages

`vite.config.ts`에 `base: '/<repo>/'` 추가 후 build, `dist/`를 `gh-pages` 브랜치에 푸시.

## Cloudflare Pages

빌드 명령 `npm run build`, 출력 디렉토리 `dist`, 프레임워크 프리셋 Vite.

## 학교 인트라넷

`dist/`를 내부 웹서버에 복사. 포즈 모델(MoveNet + pose_landmarker)은
`dist/models/`에 동봉되어 Service Worker가 첫 방문에 precache하므로,
TFHub·googleapis 차단 망에서도 동작. 유일한 외부 의존성은
`@mediapipe/tasks-vision` wasm (jsdelivr, ABC 게임 첫 실행 시 1회).
완전 오프라인이 필요하면 wasm 파일도 내부 경로에 두고 어댑터 URL 교체.
