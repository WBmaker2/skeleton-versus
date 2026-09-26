# 후속 스펙: 플레이 가능 루프 + 폴백 + 배포 준비

- 날짜: 2026-09-19
- 부모 스펙: `docs/superpowers/specs/2026-09-19-skeleton-game-design.md`
- 부모 플랜: `docs/superpowers/plans/2026-09-19-skeleton-game.md`
- 목표: 카메라/키보드/터치로 실제 플레이 가능 + 배포 직전 단계 품질
- 비범위: 실기기 manual QA 실행 (체크리스트 문서만, 실행은 사용자 하드웨어에서), 서버랭킹·멀티플레이어 (원 스펙 비범위 유지)

## 1. 배경 (잔여 이슈 인계)

- Critical-유예: end-to-end 배선 없음 (engine/loop/keyboard/fps 미배선), Calibration 미소비
- Important-잔여: openCamera 720p 고정 (폴백 없음)
- Manual QA 미실행: device matrix, 15fps·<200ms, network-tab 무전송, fps<12 폴백
- 문서 부채: 설계문서에 폭탄감점(-15)·콤보*5·MediaPipe 네이밍 매핑 미반영, README·배포가이드·QA체크리스트 없음

## 2. 설계 (채택안)

### A. FallbackEngine (키보드·포인터 → PoseFrame 합성)

`PoseEngine` 구현으로 게임 코드 변경 없이 폴백. 가상 커서를 `right_wrist`로 노출.

```ts
class FallbackEngine implements PoseEngine {
  name = 'fallback';
  cursor: { x: number; y: number };   // 기본 (320, 240), 640x480 기준
  moveTo(x: number, y: number): void;
  attach(el: HTMLElement): void;      // keydown(방향키 240px/s, WASD 동일) + pointermove 리스너
  detach(): void;
  load(): Promise<void>;              // no-op
  estimate(_video: HTMLVideoElement): Promise<PoseFrame>; // 17점 canonical 이름, score 1, right_wrist=cursor
  dispose(): Promise<void>;
}
```

- 방향키/WASD: 240px/s, 경계 클램프. Space: 커서를 150ms 위로 60px 점프 (손들기 제스처).
- `estimate`는 카메라 없이 동작해야 하므로 `_video` 무시, `width 640 height 480 timestamp performance.now()`.
- 필수 keypoints: nose, left/right_shoulder, left/right_elbow, left_wrist, right_wrist(=cursor), left/right_hip, left/right_knee, left/right_ankle. 어깨 y=120, 손목 기본 y=200 (MathJump handUp: cursor y < 100 가능).
- 입력 UX (2026-09-19 개정): onPointer는 버블링 오차를 피하기 위해 `e.target`이 아닌 attach된 el의 `getBoundingClientRect()` 사용. 처리한 키(방향키/WASD/스페이스)는 `preventDefault()`. attach 시 기존 tabindex가 없을 때만 `0` 설정 후 `el.focus()` 호출 (기존 값 보존).

### B. FpsMonitor + 자동 성능저하 대응 (순수 로직)

```ts
class FpsMonitor {
  fps: number;          // EMA, 초기 60
  degraded: boolean;    // fps<12가 3초 지속 시 true (한 번 true면 유지, reset()으로 해제)
  sample(nowMs: number): void;
  reset(): void;
}
```

- GameLoop가 매 프레임 `sample()` 호출, `degraded` 전환 시 `onDegrade` 콜백 → UI 토스트 + 프레임 스킵 (2프레임 중 1프레임만 추론 = 실효 15fps).
- 단위테스트: 가짜 시간 주입으로 60fps→5fps 전이 검증.

### C. openCamera 폴백 체인

```ts
interface CameraInfo { video: HTMLVideoElement; width: number; height: number }
function openCamera(video: HTMLVideoElement): Promise<CameraInfo | null>;
// 시도 순서: 1280x720(facingMode user) → 640x480 → null(키보드 모드)
// 기존 시그니처 openCamera(): Promise<HTMLVideoElement | null> 유지, 내부는 체인 + facingMode 추가
```

- 기존 `main.ts`의 `openCamera()` 시그니처를 깨지 않음 (Task 9 산출물 호환). HUD에 적용 해상도 표시용으로 `video.videoWidth/Height`를 읽으면 되므로 별도 반환 확장 불필요.

### D. Calibration 소비 (최소·정직한 배선)

- `FruitNinja.radiusScale: number = 1` 공개 필드 추가. hit 반경 `48 * radiusScale`. GameLoop가 `calibrate()` 후 `radiusScale = cal.scale` 대입. (기본 보정 어깨 200px 기준이므로 scale≈1 전후)
- `BodyABC.mode: PoseMode = 'standing'` 공개 필드 추가. HUD 표시 + 향후 가중치 분기용으로 보관 (현 템플릿이 이미 상체 위주이므로 판정식 변경 없음 — 과장 금지).
- `SquatRunner`, `MathJump`: 변경 없음 (무릎각도·x존 방식이 거리 불변량). 단 MathJump는 `zoneOf` 기준선(`centerX`)을 캔버스에 표시 (Renderer에 `drawZones(canvas, width)` 추가).
- 보정 실패/스킵 시 기본값: `{ scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 }` (Task 4 빈배열 가드와 일관).

### E. GameLoop + HUD + App 배선

```ts
type GameEventHandler = (events: GameEvent[], board: { score: number; combo: number }) => void;
class GameLoop {
  constructor(opts: {
    video: HTMLVideoElement | null;
    canvas: HTMLCanvasElement;
    engine: PoseEngine;
    game: Game & { board: ScoreBoard };
    calibration: Calibration;
    showSkeleton: boolean;
    onEvent?: GameEventHandler;
    onDegrade?: (fps: number) => void;
  });
  start(): void;   // rAF 시작, dt 클램프(≤100ms)
  stop(): void;    // rAF 취소 + engine.dispose() 호출하지 않음(소유권은 App)
  readonly fps: number;
}
```

- 틱 순서: `engine.estimate(video!)` (video null이면 FallbackEngine이므로 더미 video 전달) → `game.tick(frame, dt)` → `drawSkeleton` (옵션) → `onEvent`(beep+점수DOM) → `FpsMonitor.sample`.
- App (`main.ts` boot 확장): hash→게임 팩토리(`fruit| squat|math|abc`), ABC만 MediaPipeAdapter·나머지 MoveNetAdapter, 카메라 실패 시 FallbackEngine+키보드 안내. 보정 오버레이: T자세 3초 카운트다운 + 스킵 버튼(기본 seated). HUD: 점수·콤보·fps·모드·해상도·공유링크(`shareLink`). 에러 토스트: 카메라 거부·모델 로드 실패 → 폴백 안내.
- 기존 `boot()`·`openCamera()` export 유지 (하위호환).

### F. 문서 (구현과 함께 기록)

1. 설계문서 §7 수정: 폭탄 `board.add(-15)` 감점 명시.
2. 설계문서 §5/§11 비고: ScoreBoard 콤보 `*5` (테스트가 계약), MediaPipe canonical 네이밍 매핑표.
3. `README.md`: 실행 (`npm i/dev/build/preview`), 조작법 (카메라/키보드/터치), 게임별 규칙, 트러블슈팅.
4. `docs/DEPLOY.md`: 정적 호스팅 3종 (GitHub Pages / Cloudflare Pages / 학교 인트라넷), PWA 주의 (HTTPS 필수, 모델 CDN 최초 1회 온라인 필요), 환경변수 없음.
5. `docs/QA-CHECKLIST.md`: 디바이스 매트릭스 표 (크롬북/랩탑/태블릿 × 앉음/섬 × 1.5m/2.5m), 15fps·<200ms, network-tab 무전송, fps<12 폴백, 키보드 완주, 체크박스형.
6. `CHANGELOG.md`: 0.1.0 (프로토타입) → 0.2.0 (플레이 가능) 항목.

## 3. 수락 기준

- `npm run dev` 후 카메라·키보드·터치 모두로 4종 완주 가능 (키보드: FallbackEngine).
- 카메라 거부 시 자동으로 키보드 모드, 플레이 차단 없음.
- 보정 스킵 시 seated 기본값으로 즉시 시작.
- 저사양 시뮬레이션 (예: devtools CPU 스로틀) 에서 degraded 토스트 + 15fps 스킵 동작.
- `npx vitest run` + `tsc --noEmit` + `npm run build` 전부 green.
- README/DEPLOY/QA-CHECKLIST/CHANGELOG + 설계문서 수정 포함.
- 실기기 매트릭스는 문서 체크박스로 인계 (본 환경 실행 불가).
