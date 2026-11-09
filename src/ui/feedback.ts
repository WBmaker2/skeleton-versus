// src/ui/feedback.ts
let ctx: AudioContext | null = null;

const SOUND_KEY = 'skelversus:sound';

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    // 저장 실패는 무시
  }
}

export function beep(kind: 'hit' | 'miss' | 'win'): void {
  if (!isSoundOn()) return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = kind === 'hit' ? 660 : kind === 'win' ? 880 : 180;
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // 오디오 차단 환경에서는 조용히 무시 (자막으로 대체)
  }
}
