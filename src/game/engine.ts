// src/game/engine.ts
export class ScoreBoard {
  private _score = 0;
  private _combo = 0;
  get score(): number { return this._score; }
  get combo(): number { return this._combo; }
  add(points: number): void {
    this._score += points + this._combo * 5;
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
