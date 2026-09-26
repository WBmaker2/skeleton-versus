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
