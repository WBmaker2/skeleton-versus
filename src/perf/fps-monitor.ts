export class FpsMonitor {
  fps = 30;
  degraded = false;
  private last: number | null = null;
  private lowSince: number | null = null;

  sample(nowMs: number): void {
    if (this.last !== null) {
      const dt = nowMs - this.last;
      if (dt > 0) {
        const inst = 1000 / dt;
        this.fps = this.fps * 0.9 + inst * 0.1;
      }
    }
    this.last = nowMs;
    if (this.fps < 12) {
      if (this.lowSince === null) this.lowSince = nowMs;
      if (nowMs - this.lowSince >= 3000) this.degraded = true;
    } else {
      this.lowSince = null;
    }
  }

  reset(): void {
    this.fps = 30;
    this.degraded = false;
    this.last = null;
    this.lowSince = null;
  }
}
