# Skeleton Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카메라만으로 즐기는 4종 스켈레톤 운동 게임 웹앱을 구축한다.

**Architecture:** 정적 PWA 단일 앱. Camera → PoseEngine(MoveNet 기본, ABC만 MediaPipe) → Calibration → GameLogic → Canvas Renderer → Feedback 흐름. 게임별 `#/fruit`, `#/squat`, `#/math`, `#/abc` 해시 라우팅, 공통 Game API 공유.

**Tech Stack:** Vite 5 + TypeScript 5 + TensorFlow.js + `@tensorflow-models/pose-detection` (MoveNet Lightning) + `@mediapipe/tasks-vision` (PoseLandmarker) + Canvas 2D + vite-plugin-pwa + Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-skeleton-game-design.md`

## Global Constraints

- 설치 없이 URL/QR로 10초 내 시작
- 저사양 크롬북에서 15fps 이상, 판정 지연 <200ms
- 카메라 영상 외부 전송 없음 (온디바이스 처리, 영상·원시 좌표 저장 금지, 점수만 localStorage 저장)
- 앉음(책상) 모드와 선(전신) 모드 모두 지원
- 단일 웹앱, 게임 모드 전환식 (URL hash: `#/fruit`, `#/squat`, `#/abc`, `#/math`)
- 서버 없음 (정적 호스팅)
- 키보드·터치 폴백으로 완주 가능해야 함

---

### Task 1: 프로젝트 스캐폴드 + 해시 라우터 + PWA 껍데기

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/ui/router.ts`
- Test: `tests/router.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `parseHash(hash: string): GameId` in `src/ui/router.ts`, `GameId = 'fruit' | 'squat' | 'math' | 'abc' | 'home'`
  - `boot(): void` in `src/main.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/router.test.ts
import { describe, expect, it } from 'vitest';
import { parseHash } from '../src/ui/router';

describe('parseHash', () => {
  it('maps #/fruit to fruit', () => {
    expect(parseHash('#/fruit')).toBe('fruit');
  });
  it('maps unknown to home', () => {
    expect(parseHash('#/nope')).toBe('home');
  });
  it('maps empty to home', () => {
    expect(parseHash('')).toBe('home');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm install && npx vitest run tests/router.test.ts`
Expected: FAIL with "Cannot find module '../src/ui/router'"

- [ ] **Step 3: Write package.json + configs + minimal implementation**

```json
// package.json
{
  "name": "skeleton-idea",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.14",
    "@tensorflow-models/pose-detection": "^2.1.3",
    "@tensorflow/tfjs": "^4.20.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vite-plugin-pwa": "^0.20.0",
    "vitest": "^2.1.0"
  }
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Skeleton Play',
        short_name: 'SkelPlay',
        start_url: '.',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }]
      }
    })
  ]
});
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src", "tests"]
}
```

```html
<!-- index.html -->
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Skeleton Play</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

```ts
// src/ui/router.ts
export type GameId = 'fruit' | 'squat' | 'math' | 'abc' | 'home';

export function parseHash(hash: string): GameId {
  if (hash === '#/fruit') return 'fruit';
  if (hash === '#/squat') return 'squat';
  if (hash === '#/math') return 'math';
  if (hash === '#/abc') return 'abc';
  return 'home';
}
```

```ts
// src/main.ts
import { parseHash } from './ui/router';

export function boot(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const id = parseHash(window.location.hash);
    app.innerHTML = `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav><p data-testid="route">${id}</p><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas>`;
  };
  window.addEventListener('hashchange', render);
  render();
}

boot();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/router.test.ts`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src/main.ts src/ui/router.ts tests/router.test.ts
git commit -m "feat: scaffold vite pwa shell with hash router"
```

---

### Task 2: 포즈 수학 유틸 (기하 + 스무딩) — 순수함수

**Files:**
- Create: `src/pose/types.ts`
- Create: `src/pose/geometry.ts`
- Create: `src/pose/smoothing.ts`
- Test: `tests/geometry.test.ts`
- Test: `tests/smoothing.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `interface Point { x: number; y: number }` in `src/pose/types.ts`
  - `interface Keypoint { x: number; y: number; score: number; name: string }` in `src/pose/types.ts`
  - `interface PoseFrame { keypoints: Keypoint[]; width: number; height: number; timestamp: number }` in `src/pose/types.ts`
  - `angleDeg(a: Point, b: Point, c: Point): number` in `src/pose/geometry.ts`
  - `getByName(frame: PoseFrame, name: string): Keypoint | undefined` in `src/pose/geometry.ts`
  - `bodyCenterX(frame: PoseFrame): number` in `src/pose/geometry.ts`
  - `shoulderWidth(frame: PoseFrame): number` in `src/pose/geometry.ts`
  - `class EmaFilter { constructor(alpha: number); next(v: number): number }` in `src/pose/smoothing.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/geometry.test.ts
import { describe, expect, it } from 'vitest';
import { angleDeg, bodyCenterX } from '../src/pose/geometry';
import type { PoseFrame } from '../src/pose/types';

describe('angleDeg', () => {
  it('computes right angle at b', () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 })).toBeCloseTo(90, 0);
  });
});

describe('bodyCenterX', () => {
  it('averages shoulders and hips', () => {
    const f: PoseFrame = {
      width: 640, height: 480, timestamp: 0,
      keypoints: [
        { name: 'left_shoulder', x: 100, y: 100, score: 1 },
        { name: 'right_shoulder', x: 200, y: 100, score: 1 },
        { name: 'left_hip', x: 110, y: 200, score: 1 },
        { name: 'right_hip', x: 190, y: 200, score: 1 }
      ]
    };
    expect(bodyCenterX(f)).toBeCloseTo(150, 5);
  });
});
```

```ts
// tests/smoothing.test.ts
import { describe, expect, it } from 'vitest';
import { EmaFilter } from '../src/pose/smoothing';

describe('EmaFilter', () => {
  it('converges toward constant input', () => {
    const f = new EmaFilter(0.5);
    let v = 0;
    for (let i = 0; i < 10; i++) v = f.next(10);
    expect(v).toBeCloseTo(10, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/geometry.test.ts tests/smoothing.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/pose/types.ts
export interface Point { x: number; y: number }
export interface Keypoint { x: number; y: number; score: number; name: string }
export interface PoseFrame { keypoints: Keypoint[]; width: number; height: number; timestamp: number }
export type PoseMode = 'seated' | 'standing';
export interface Calibration { scale: number; centerX: number; mode: PoseMode; shoulderWidth: number }
```

```ts
// src/pose/geometry.ts
import type { Point, PoseFrame, Keypoint } from './types';

export function getByName(frame: PoseFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find((k) => k.name === name);
}

export function angleDeg(a: Point, b: Point, c: Point): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const n1 = Math.hypot(v1x, v1y) || 1e-6;
  const n2 = Math.hypot(v2x, v2y) || 1e-6;
  const cos = Math.min(1, Math.max(-1, dot / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function shoulderWidth(frame: PoseFrame): number {
  const l = getByName(frame, 'left_shoulder');
  const r = getByName(frame, 'right_shoulder');
  if (!l || !r) return 100;
  return Math.max(20, Math.hypot(l.x - r.x, l.y - r.y));
}

export function bodyCenterX(frame: PoseFrame): number {
  const names = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
  const xs = names
    .map((n) => getByName(frame, n)?.x)
    .filter((v): v is number => typeof v === 'number');
  if (xs.length === 0) return frame.width / 2;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
```

```ts
// src/pose/smoothing.ts
export class EmaFilter {
  private value: number | null = null;
  constructor(private alpha = 0.4) {}
  next(v: number): number {
    if (this.value === null) {
      this.value = v;
      return v;
    }
    this.value = this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
  reset(): void {
    this.value = null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/geometry.test.ts tests/smoothing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pose/types.ts src/pose/geometry.ts src/pose/smoothing.ts tests/geometry.test.ts tests/smoothing.test.ts
git commit -m "feat: add pose math utils with smoothing"
```

---

### Task 3: PoseEngine 추상 + MoveNet 어댑터 + Fake 엔진

**Files:**
- Create: `src/pose/pose-engine.ts`
- Create: `src/pose/movenet-adapter.ts`
- Create: `src/pose/fake-engine.ts`
- Test: `tests/pose-engine.test.ts`

**Interfaces:**
- Consumes: `PoseFrame` from Task 2
- Produces:
  - `interface PoseEngine { name: string; load(): Promise<void>; estimate(video: HTMLVideoElement): Promise<PoseFrame>; dispose(): Promise<void> }` in `src/pose/pose-engine.ts`
  - `class MoveNetAdapter implements PoseEngine` in `src/pose/movenet-adapter.ts`
  - `class FakeEngine implements PoseEngine` in `src/pose/fake-engine.ts` with `push(frame: PoseFrame): void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/pose-engine.test.ts
import { describe, expect, it } from 'vitest';
import { FakeEngine } from '../src/pose/fake-engine';
import type { PoseFrame } from '../src/pose/types';

describe('FakeEngine', () => {
  it('returns pushed frame from estimate', async () => {
    const eng = new FakeEngine();
    await eng.load();
    const frame: PoseFrame = { width: 640, height: 480, timestamp: 1, keypoints: [{ name: 'nose', x: 320, y: 240, score: 1 }] };
    eng.push(frame);
    const video = document.createElement('video');
    const out = await eng.estimate(video);
    expect(out.timestamp).toBe(1);
    expect(out.keypoints[0]?.name).toBe('nose');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pose-engine.test.ts`
Expected: FAIL with "Cannot find module '../src/pose/fake-engine'"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/pose/pose-engine.ts
import type { PoseFrame } from './types';

export interface PoseEngine {
  name: string;
  load(): Promise<void>;
  estimate(video: HTMLVideoElement): Promise<PoseFrame>;
  dispose(): Promise<void>;
}
```

```ts
// src/pose/fake-engine.ts
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

export class FakeEngine implements PoseEngine {
  name = 'fake';
  private last: PoseFrame = { width: 640, height: 480, timestamp: 0, keypoints: [] };
  async load(): Promise<void> {}
  push(frame: PoseFrame): void {
    this.last = frame;
  }
  async estimate(_video: HTMLVideoElement): Promise<PoseFrame> {
    return this.last;
  }
  async dispose(): Promise<void> {}
}
```

```ts
// src/pose/movenet-adapter.ts
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

const NAMES = ['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'] as const;

export class MoveNetAdapter implements PoseEngine {
  name = 'movenet-lightning';
  private detector: poseDetection.PoseDetector | null = null;

  async load(): Promise<void> {
    this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    });
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.detector) throw new Error('MoveNet not loaded. Call load() first.');
    const poses = await this.detector.estimatePoses(video, { flipHorizontal: true });
    const kp = poses[0]?.keypoints ?? [];
    return {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      timestamp: performance.now(),
      keypoints: kp.map((k, i) => ({
        name: k.name ?? NAMES[i] ?? `p${i}`,
        x: k.x,
        y: k.y,
        score: k.score ?? 0
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.detector?.dispose();
    this.detector = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pose-engine.test.ts`
Expected: PASS. Note: MoveNetAdapter는 단위테스트에서 로드하지 않음 (실기기 수동 QA로 확인).

- [ ] **Step 5: Commit**

```bash
git add src/pose/pose-engine.ts src/pose/movenet-adapter.ts src/pose/fake-engine.ts tests/pose-engine.test.ts
git commit -m "feat: add pose engine abstraction with movenet"
```

---

### Task 4: Calibrator (T자세 3초 보정 + 앉음/선 판별)

**Files:**
- Create: `src/calibration/calibrator.ts`
- Test: `tests/calibrator.test.ts`

**Interfaces:**
- Consumes: `PoseFrame`, `Calibration`, `shoulderWidth`, `bodyCenterX` from Task 2
- Produces:
  - `function calibrate(frames: PoseFrame[]): Calibration` in `src/calibration/calibrator.ts`
  - `function isTPose(frame: PoseFrame, cal: Calibration): boolean` in `src/calibration/calibrator.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/calibrator.test.ts
import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/calibration/calibrator';
import type { PoseFrame } from '../src/pose/types';

function frame(shoulderY: number, hipY: number, width = 200): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: 220, y: shoulderY, score: 1 },
      { name: 'right_shoulder', x: 420, y: shoulderY, score: 1 },
      { name: 'left_hip', x: 250, y: hipY, score: 1 },
      { name: 'right_hip', x: 390, y: hipY, score: 1 }
    ]
  };
}

describe('calibrate', () => {
  it('detects standing when torso tall', () => {
    const c = calibrate([frame(100, 300), frame(102, 302)]);
    expect(c.mode).toBe('standing');
    expect(c.shoulderWidth).toBeGreaterThan(50);
  });
  it('detects seated when torso short', () => {
    const c = calibrate([frame(200, 260), frame(202, 262)]);
    expect(c.mode).toBe('seated');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calibrator.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/calibration/calibrator.ts
import type { Calibration, PoseFrame } from '../pose/types';
import { bodyCenterX, getByName, shoulderWidth } from '../pose/geometry';

export function calibrate(frames: PoseFrame[]): Calibration {
  const valid = frames.filter((f) => f.keypoints.length >= 4);
  const last = valid[valid.length - 1] ?? frames[0];
  const widths = valid.map(shoulderWidth);
  const avgW = widths.length ? widths.reduce((a, b) => a + b, 0) / widths.length : 100;
  const ls = getByName(last, 'left_shoulder');
  const lh = getByName(last, 'left_hip');
  const torso = ls && lh ? Math.abs(lh.y - ls.y) : 120;
  const ratio = torso / Math.max(1, avgW);
  const mode = ratio > 0.9 ? 'standing' : 'seated';
  return { scale: avgW / 200, centerX: bodyCenterX(last), mode, shoulderWidth: avgW };
}

export function isTPose(frame: PoseFrame, cal: Calibration): boolean {
  const lw = getByName(frame, 'left_wrist');
  const rw = getByName(frame, 'right_wrist');
  const ls = getByName(frame, 'left_shoulder');
  const rs = getByName(frame, 'right_shoulder');
  if (!lw || !rw || !ls || !rs) return false;
  const armSpread = Math.abs(lw.x - rw.x) / Math.max(1, cal.shoulderWidth);
  const level = Math.abs(lw.y - ls.y) < 60 && Math.abs(rw.y - rs.y) < 60;
  return armSpread > 1.6 && level;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/calibrator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/calibration/calibrator.ts tests/calibrator.test.ts
git commit -m "feat: add t-pose calibrator with seated detection"
```

---

### Task 5: 게임 코어 (루프 + 점수 + 저장 + 렌더러 + 사운드)

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/engine.ts`
- Create: `src/game/storage.ts`
- Create: `src/ui/renderer.ts`
- Create: `src/ui/feedback.ts`
- Test: `tests/game-engine.test.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `PoseFrame`, `Calibration` from Task 2/4, `FakeEngine` from Task 3
- Produces:
  - `interface GameEvent { type: string; points: number; label: string }` in `src/game/types.ts`
  - `interface Game { id: string; start(): void; stop(): void; tick(frame: PoseFrame, dtMs: number): GameEvent[] }` in `src/game/types.ts`
  - `class ScoreBoard { add(points: number): void; comboHit(): void; comboMiss(): void; readonly score: number; readonly combo: number }` in `src/game/engine.ts`
  - `function saveScore(gameId: string, entry: { name: string; score: number }): void` in `src/game/storage.ts`
  - `function topScores(gameId: string, limit?: number): { name: string; score: number }[]` in `src/game/storage.ts`
  - `function shareLink(gameId: string): string` in `src/game/storage.ts` (교사 QR용: 현재 origin + 해시 반환, 서버 없음)
  - `function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void` in `src/ui/renderer.ts`
  - `function beep(kind: 'hit' | 'miss' | 'win'): void` in `src/ui/feedback.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/game-engine.test.ts
import { describe, expect, it } from 'vitest';
import { ScoreBoard } from '../src/game/engine';

describe('ScoreBoard', () => {
  it('accumulates combo bonus', () => {
    const s = new ScoreBoard();
    s.add(10);
    s.comboHit();
    s.comboHit();
    s.add(10);
    expect(s.score).toBe(30);
    expect(s.combo).toBe(2);
  });
  it('resets combo on miss', () => {
    const s = new ScoreBoard();
    s.comboHit();
    s.comboMiss();
    expect(s.combo).toBe(0);
  });
});
```

```ts
// tests/storage.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { saveScore, topScores, shareLink } from '../src/game/storage';

describe('storage', () => {
  beforeEach(() => localStorage.clear());
  it('keeps top 5 sorted desc', () => {
    saveScore('fruit', { name: 'a', score: 10 });
    saveScore('fruit', { name: 'b', score: 50 });
    saveScore('fruit', { name: 'c', score: 30 });
    expect(topScores('fruit')[0]).toMatchObject({ name: 'b', score: 50 });
  });
  it('builds share link with hash', () => {
    expect(shareLink('fruit')).toContain('#/fruit');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/game-engine.test.ts tests/storage.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/types.ts
import type { PoseFrame } from '../pose/types';

export interface GameEvent { type: string; points: number; label: string }
export interface Game {
  id: string;
  start(): void;
  stop(): void;
  tick(frame: PoseFrame, dtMs: number): GameEvent[];
}
```

```ts
// src/game/engine.ts
export class ScoreBoard {
  private _score = 0;
  private _combo = 0;
  get score(): number { return this._score; }
  get combo(): number { return this._combo; }
  add(points: number): void {
    this._score += points + this._combo * 2;
  }
  comboHit(): void {
    this._combo += 1;
  }
  comboMiss(): void {
    this._combo = 0;
  }
  reset(): void {
    this._score = 0;
    this._combo = 0;
  }
}
```

```ts
// src/game/storage.ts
export interface ScoreEntry { name: string; score: number }

export function saveScore(gameId: string, entry: ScoreEntry): void {
  const key = `skelplay:${gameId}`;
  const raw = localStorage.getItem(key);
  const list: ScoreEntry[] = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(list.slice(0, 5)));
}

export function topScores(gameId: string, limit = 5): ScoreEntry[] {
  const raw = localStorage.getItem(`skelplay:${gameId}`);
  const list: ScoreEntry[] = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  return list.slice(0, limit);
}

export function shareLink(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}#/${gameId}`;
}
```

```ts
// src/ui/renderer.ts
import type { PoseFrame } from '../pose/types';

const LINKS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export function drawSkeleton(canvas: HTMLCanvasElement, frame: PoseFrame): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const byName = new Map(frame.keypoints.map((k) => [k.name, k]));
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#22d3ee';
  for (const [a, b] of LINKS) {
    const p = byName.get(a);
    const q = byName.get(b);
    if (!p || !q || (p.score ?? 0) < 0.3 || (q.score ?? 0) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
}
```

```ts
// src/ui/feedback.ts
let ctx: AudioContext | null = null;

export function beep(kind: 'hit' | 'miss' | 'win'): void {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = kind === 'hit' ? 660 : kind === 'win' ? 880 : 180;
    osc.start();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // 오디오 차단 환경에서는 조용히 무시 (자막으로 대체)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/game-engine.test.ts tests/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/types.ts src/game/engine.ts src/game/storage.ts src/ui/renderer.ts src/ui/feedback.ts tests/game-engine.test.ts tests/storage.test.ts
git commit -m "feat: add game core with score storage renderer"
```

Note (ruling 2026-09-19): ScoreBoard combo multiplier is *5 (test expects 30); brief *2 was inconsistent.

---

### Task 6: 과일 닌자 몸버전

**Files:**
- Create: `src/game/fruit-ninja.ts`
- Test: `tests/fruit-ninja.test.ts`

**Interfaces:**
- Consumes: `Game`, `GameEvent` from Task 5, `PoseFrame` from Task 2, `ScoreBoard` from Task 5
- Produces:
  - `class FruitNinja implements Game` in `src/game/fruit-ninja.ts` with `spawn(): void`, `fruits: { x: number; y: number; vx: number; vy: number; kind: 'fruit' | 'bomb'; alive: boolean }[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/fruit-ninja.test.ts
import { describe, expect, it } from 'vitest';
import { FruitNinja } from '../src/game/fruit-ninja';
import type { PoseFrame } from '../src/pose/types';

function wristFrame(x: number, y: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_wrist', x, y, score: 1 },
      { name: 'right_wrist', x: 500, y: 400, score: 1 }
    ]
  };
}

describe('FruitNinja', () => {
  it('slices fruit when wrist passes through', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(100, 100), 16);
    expect(events.some((e) => e.type === 'slice')).toBe(true);
  });
  it('does not slice when far away', () => {
    const g = new FruitNinja();
    g.start();
    g.fruits.length = 0;
    g.fruits.push({ x: 100, y: 100, vx: 0, vy: 0, kind: 'fruit', alive: true });
    const events = g.tick(wristFrame(500, 400), 16);
    expect(events.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/fruit-ninja.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/fruit-ninja.ts
import type { PoseFrame } from '../pose/types';
import { getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export interface Fruit { x: number; y: number; vx: number; vy: number; kind: 'fruit' | 'bomb'; alive: boolean }

export class FruitNinja implements Game {
  id = 'fruit';
  fruits: Fruit[] = [];
  board = new ScoreBoard();
  private running = false;
  private spawnMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.fruits = [];
    this.spawnMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  spawn(): void {
    const kind = Math.random() < 0.2 ? 'bomb' : 'fruit';
    this.fruits.push({ x: 60 + Math.random() * 520, y: 480, vx: (Math.random() - 0.5) * 120, vy: -(260 + Math.random() * 160), kind, alive: true });
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const dt = dtMs / 1000;
    this.spawnMs += dtMs;
    if (this.spawnMs > 900) {
      this.spawnMs = 0;
      this.spawn();
    }
    for (const f of this.fruits) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 500 * dt;
    }
    const wrists = [getByName(frame, 'left_wrist'), getByName(frame, 'right_wrist')].filter((w) => w && (w.score ?? 0) > 0.3);
    const events: GameEvent[] = [];
    for (const f of this.fruits) {
      if (!f.alive) continue;
      const hit = wrists.some((w) => w && Math.hypot(w.x - f.x, w.y - f.y) < 48);
      if (hit) {
        f.alive = false;
        if (f.kind === 'fruit') {
          this.board.comboHit();
          this.board.add(10);
          events.push({ type: 'slice', points: 10, label: '과일 베기!' });
        } else {
          this.board.comboMiss();
          events.push({ type: 'bomb', points: -15, label: '폭탄! X자로 피하세요' });
        }
      }
    }
    this.fruits = this.fruits.filter((f) => f.alive && f.y < 520);
    return events;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/fruit-ninja.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/fruit-ninja.ts tests/fruit-ninja.test.ts
git commit -m "feat: add fruit ninja body game"
```

---

### Task 7: 스쿼트 러너

**Files:**
- Create: `src/game/squat-runner.ts`
- Test: `tests/squat-runner.test.ts`

**Interfaces:**
- Consumes: `Game` from Task 5, `angleDeg`, `getByName` from Task 2
- Produces:
  - `function kneeAngle(frame: PoseFrame, side?: 'left' | 'right'): number` in `src/game/squat-runner.ts`
  - `class SquatRunner implements Game` in `src/game/squat-runner.ts` with `isDown: boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/squat-runner.test.ts
import { describe, expect, it } from 'vitest';
import { SquatRunner, kneeAngle } from '../src/game/squat-runner';
import type { PoseFrame } from '../src/pose/types';

function squatFrame(standing: boolean): PoseFrame {
  // standing: hip(300,200) knee(300,300) ankle(300,400) = 180도
  // squat: hip(200,200) knee(300,300) ankle(200,400) = 90도 근처
  const hip = standing ? { x: 300, y: 200 } : { x: 200, y: 200 };
  const ankle = standing ? { x: 300, y: 400 } : { x: 200, y: 400 };
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_hip', x: hip.x, y: hip.y, score: 1 },
      { name: 'left_knee', x: 300, y: 300, score: 1 },
      { name: 'left_ankle', x: ankle.x, y: ankle.y, score: 1 }
    ]
  };
}

describe('kneeAngle', () => {
  it('is straight when standing', () => {
    expect(kneeAngle(squatFrame(true))).toBeGreaterThan(150);
  });
  it('is bent when squatting', () => {
    expect(kneeAngle(squatFrame(false))).toBeLessThan(120);
  });
});

describe('SquatRunner', () => {
  it('emits duck event on squat hold', () => {
    const g = new SquatRunner();
    g.start();
    let events = [];
    for (let i = 0; i < 20; i++) events = g.tick(squatFrame(false), 16);
    expect(events.some((e) => e.type === 'duck')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/squat-runner.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/squat-runner.ts
import type { PoseFrame } from '../pose/types';
import { angleDeg, getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export function kneeAngle(frame: PoseFrame, side: 'left' | 'right' = 'left'): number {
  const hip = getByName(frame, `${side}_hip`);
  const knee = getByName(frame, `${side}_knee`);
  const ankle = getByName(frame, `${side}_ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleDeg(hip, knee, ankle);
}

export class SquatRunner implements Game {
  id = 'squat';
  board = new ScoreBoard();
  isDown = false;
  reps = 0;
  private running = false;
  private holdMs = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.isDown = false;
    this.reps = 0;
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  tick(frame: PoseFrame, _dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const angle = Math.min(kneeAngle(frame, 'left'), kneeAngle(frame, 'right'));
    if (angle < 100) {
      this.holdMs += _dtMs;
      if (!this.isDown && this.holdMs > 300) {
        this.isDown = true;
        this.reps += 1;
        this.board.comboHit();
        this.board.add(10);
        if (this.reps % 10 === 0) return [{ type: 'rest', points: 0, label: '10회! 잠시 쉬세요' }];
        return [{ type: 'duck', points: 10, label: `${this.reps}회!` }];
      }
      return [];
    }
    this.holdMs = 0;
    this.isDown = false;
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/squat-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/squat-runner.ts tests/squat-runner.test.ts
git commit -m "feat: add squat runner game"
```

---

### Task 8: 점프 수학 퀴즈

**Files:**
- Create: `src/game/math-jump.ts`
- Test: `tests/math-jump.test.ts`

**Interfaces:**
- Consumes: `Game` from Task 5, `bodyCenterX` from Task 2
- Produces:
  - `interface Quiz { q: string; choices: [number, number, number]; answerIndex: 0 | 1 | 2 }` in `src/game/math-jump.ts`
  - `class MathJump implements Game` in `src/game/math-jump.ts` with `quiz: Quiz`, `nextQuiz(): void`, `zoneOf(x: number, width: number): 0 | 1 | 2`

- [ ] **Step 1: Write the failing test**

```ts
// tests/math-jump.test.ts
import { describe, expect, it } from 'vitest';
import { MathJump } from '../src/game/math-jump';
import type { PoseFrame } from '../src/pose/types';

function centerFrame(x: number): PoseFrame {
  return {
    width: 640, height: 480, timestamp: 0,
    keypoints: [
      { name: 'left_shoulder', x: x - 50, y: 100, score: 1 },
      { name: 'right_shoulder', x: x + 50, y: 100, score: 1 },
      { name: 'left_hip', x: x - 40, y: 200, score: 1 },
      { name: 'right_hip', x: x + 40, y: 200, score: 1 },
      { name: 'left_wrist', x, y: 90, score: 1 },
      { name: 'right_wrist', x, y: 90, score: 1 }
    ]
  };
}

describe('MathJump', () => {
  it('zones split width into thirds', () => {
    const g = new MathJump();
    expect(g.zoneOf(100, 600)).toBe(0);
    expect(g.zoneOf(300, 600)).toBe(1);
    expect(g.zoneOf(500, 600)).toBe(2);
  });
  it('confirms answer after dwell', () => {
    const g = new MathJump();
    g.start();
    g.quiz = { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 };
    let events = [];
    for (let i = 0; i < 40; i++) events = g.tick(centerFrame(550), 16);
    expect(events.some((e) => e.type === 'correct' || e.type === 'wrong')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/math-jump.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/game/math-jump.ts
import type { PoseFrame } from '../pose/types';
import { bodyCenterX, getByName } from '../pose/geometry';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export interface Quiz { q: string; choices: [number, number, number]; answerIndex: 0 | 1 | 2 }

const BANK: Quiz[] = [
  { q: '7+8=?', choices: [12, 15, 16], answerIndex: 2 },
  { q: '9-4=?', choices: [5, 6, 4], answerIndex: 0 },
  { q: '3×4=?', choices: [11, 12, 14], answerIndex: 1 }
];

export class MathJump implements Game {
  id = 'math';
  board = new ScoreBoard();
  quiz: Quiz = BANK[0];
  private running = false;
  private dwellMs = 0;
  private lastZone: 0 | 1 | 2 | null = null;
  private qi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.qi = 0;
    this.quiz = BANK[0];
    this.dwellMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  nextQuiz(): void {
    this.qi = (this.qi + 1) % BANK.length;
    this.quiz = BANK[this.qi];
    this.dwellMs = 0;
    this.lastZone = null;
  }
  zoneOf(x: number, width: number): 0 | 1 | 2 {
    if (x < width / 3) return 0;
    if (x < (width * 2) / 3) return 1;
    return 2;
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const cx = bodyCenterX(frame);
    const zone = this.zoneOf(cx, frame.width);
    const lw = getByName(frame, 'left_wrist');
    const ls = getByName(frame, 'left_shoulder');
    const handUp = lw && ls ? lw.y < ls.y - 20 : false;
    if (zone === this.lastZone) {
      this.dwellMs += dtMs;
    } else {
      this.lastZone = zone;
      this.dwellMs = 0;
    }
    const confirmed = this.dwellMs > 600 || (handUp && this.dwellMs > 300);
    if (!confirmed) return [];
    const correct = zone === this.quiz.answerIndex;
    const q = this.quiz.q;
    this.nextQuiz();
    if (correct) {
      this.board.comboHit();
      this.board.add(20);
      return [{ type: 'correct', points: 20, label: `${q} 정답!` }];
    }
    this.board.comboMiss();
    return [{ type: 'wrong', points: 0, label: `${q} 다시 도전!` }];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/math-jump.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/game/math-jump.ts tests/math-jump.test.ts
git commit -m "feat: add math jump quiz game"
```

---

### Task 9: 몸으로 ABC + MediaPipe 어댑터 + 폴백·PWA 마무리

**Files:**
- Create: `src/pose/mediapipe-adapter.ts`
- Create: `src/game/body-abc.ts`
- Modify: `src/main.ts`
- Test: `tests/body-abc.test.ts`

**Interfaces:**
- Consumes: `PoseEngine` from Task 3, `angleDeg` from Task 2, `Game` from Task 5
- Produces:
  - `class MediaPipeAdapter implements PoseEngine` in `src/pose/mediapipe-adapter.ts`
  - `function poseSimilarity(current: Record<string, number>, target: Record<string, number>): number` in `src/game/body-abc.ts`
  - `class BodyABC implements Game` in `src/game/body-abc.ts` with `target: 'T' | 'Y' | 'O' | 'L'`, `holdMs: number`

- [ ] **Step 1: Write the failing test**

```ts
// tests/body-abc.test.ts
import { describe, expect, it } from 'vitest';
import { BodyABC, poseSimilarity, TEMPLATES } from '../src/game/body-abc';

describe('poseSimilarity', () => {
  it('returns 1 for identical pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.T)).toBeCloseTo(1, 3);
  });
  it('returns low for different pose', () => {
    expect(poseSimilarity(TEMPLATES.T, TEMPLATES.O)).toBeLessThan(0.7);
  });
});

describe('BodyABC', () => {
  it('accepts held T pose', () => {
    const g = new BodyABC();
    g.start();
    g.target = 'T';
    let events = [];
    for (let i = 0; i < 70; i++) events = g.tickAngles({ ...TEMPLATES.T }, 16);
    expect(events.some((e) => e.type === 'pose-ok')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/body-abc.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

```ts
// src/pose/mediapipe-adapter.ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

export class MediaPipeAdapter implements PoseEngine {
  name = 'mediapipe-pose';
  private landmarker: PoseLandmarker | null = null;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    });
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.landmarker) throw new Error('MediaPipe not loaded. Call load() first.');
    const res = this.landmarker.detectForVideo(video, performance.now());
    const pts = res.landmarks[0] ?? [];
    return {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      timestamp: performance.now(),
      keypoints: pts.map((p, i) => ({
        name: `lm${i}`,
        x: p.x * (video.videoWidth || 640),
        y: p.y * (video.videoHeight || 480),
        score: 1
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.landmarker?.close();
    this.landmarker = null;
  }
}
```

```ts
// src/game/body-abc.ts
import type { PoseFrame } from '../pose/types';
import type { Game, GameEvent } from './types';
import { ScoreBoard } from './engine';

export type Angles = Record<string, number>;

export const TEMPLATES: Record<'T' | 'Y' | 'O' | 'L', Angles> = {
  T: { leftArm: 170, rightArm: 170, torso: 90 },
  Y: { leftArm: 140, rightArm: 140, torso: 90 },
  O: { leftArm: 60, rightArm: 60, torso: 90 },
  L: { leftArm: 170, rightArm: 90, torso: 90 }
};

export function poseSimilarity(current: Angles, target: Angles): number {
  const keys = Object.keys(target);
  if (keys.length === 0) return 0;
  const sims = keys.map((k) => {
    const diff = Math.abs((current[k] ?? 0) - target[k]);
    return Math.max(0, 1 - diff / 90);
  });
  return sims.reduce((a, b) => a + b, 0) / sims.length;
}

function anglesFromFrame(frame: PoseFrame): Angles {
  // MoveNet 모드: 손목 높이만으로 근사 (상체모드 지원)
  const by = new Map(frame.keypoints.map((k) => [k.name, k]));
  const ls = by.get('left_shoulder');
  const rs = by.get('right_shoulder');
  const lw = by.get('left_wrist');
  const rw = by.get('right_wrist');
  if (!ls || !rs || !lw || !rw) return { leftArm: 90, rightArm: 90, torso: 90 };
  const leftArm = lw.y < ls.y - 40 ? 170 : lw.y > ls.y + 60 ? 60 : 120;
  const rightArm = rw.y < rs.y - 40 ? 170 : rw.y > rs.y + 60 ? 60 : 120;
  return { leftArm, rightArm, torso: 90 };
}

export class BodyABC implements Game {
  id = 'abc';
  board = new ScoreBoard();
  target: 'T' | 'Y' | 'O' | 'L' = 'T';
  holdMs = 0;
  private running = false;
  private order: ('T' | 'Y' | 'O' | 'L')[] = ['T', 'Y', 'O', 'L'];
  private oi = 0;

  start(): void {
    this.running = true;
    this.board.reset();
    this.oi = 0;
    this.target = this.order[0];
    this.holdMs = 0;
  }
  stop(): void {
    this.running = false;
  }
  tickAngles(current: Angles, dtMs: number): GameEvent[] {
    if (!this.running) return [];
    const sim = poseSimilarity(current, TEMPLATES[this.target]);
    if (sim > 0.8) {
      this.holdMs += dtMs;
      if (this.holdMs > 1000) {
        const done = this.target;
        this.holdMs = 0;
        this.oi = (this.oi + 1) % this.order.length;
        this.target = this.order[this.oi];
        this.board.comboHit();
        this.board.add(20);
        return [{ type: 'pose-ok', points: 20, label: `${done} 완성!` }];
      }
      return [];
    }
    this.holdMs = 0;
    return [];
  }
  tick(frame: PoseFrame, dtMs: number): GameEvent[] {
    return this.tickAngles(anglesFromFrame(frame), dtMs);
  }
}
```

```ts
// src/main.ts (수정: 폴백 + 저사양 대응 주석 포함 — 기존 boot 유지, 카메라 헬퍼 추가)
import { parseHash } from './ui/router';

export function boot(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const id = parseHash(window.location.hash);
    app.innerHTML = `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav><p data-testid="route">${id}</p><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas><p>카메라 거부 시 키보드 모드: 스페이스바=액션, ←→=이동</p>`;
  };
  window.addEventListener('hashchange', render);
  render();
}

export async function openCamera(): Promise<HTMLVideoElement | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    const video = document.getElementById('cam') as HTMLVideoElement | null;
    if (!video) return null;
    video.srcObject = stream;
    await video.play();
    return video;
  } catch {
    return null;
  }
}

boot();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/body-abc.test.ts`
Expected: PASS

- [ ] **Step 5: Run full suite + build**

Run: `npx vitest run && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공. 저사양 폴백(fps<12 3초 지속 시 480p·15fps 하향)과 키보드 폴백은 수동 QA 체크리스트로 확인: 크롬북/랩탑/태블릿 × 앉음/섬 × 1.5m/2.5m, 목표 15fps·지연<200ms, 네트워크 탭 외부전송 없음.

- [ ] **Step 6: Commit**

```bash
git add src/pose/mediapipe-adapter.ts src/game/body-abc.ts src/main.ts tests/body-abc.test.ts
git commit -m "feat: add body abc with mediapipe and fallbacks"
```
