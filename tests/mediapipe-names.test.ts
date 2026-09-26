// tests/mediapipe-names.test.ts
import { describe, expect, it } from 'vitest';
import { landmarkName } from '../src/pose/mediapipe-adapter';

describe('landmarkName', () => {
  it('maps canonical indices to MoveNet-compatible names', () => {
    expect(landmarkName(0)).toBe('nose');
    expect(landmarkName(11)).toBe('left_shoulder');
    expect(landmarkName(12)).toBe('right_shoulder');
    expect(landmarkName(13)).toBe('left_elbow');
    expect(landmarkName(14)).toBe('right_elbow');
    expect(landmarkName(15)).toBe('left_wrist');
    expect(landmarkName(16)).toBe('right_wrist');
    expect(landmarkName(23)).toBe('left_hip');
    expect(landmarkName(24)).toBe('right_hip');
    expect(landmarkName(25)).toBe('left_knee');
    expect(landmarkName(26)).toBe('right_knee');
    expect(landmarkName(27)).toBe('left_ankle');
    expect(landmarkName(28)).toBe('right_ankle');
  });
  it('falls back to lm{i} for others', () => {
    expect(landmarkName(1)).toBe('lm1');
    expect(landmarkName(32)).toBe('lm32');
  });
});
