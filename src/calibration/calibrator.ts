// src/calibration/calibrator.ts
import type { Calibration, PoseFrame } from '../pose/types';
import { bodyCenterX, getByName, shoulderWidth } from '../pose/geometry';

export function calibrate(frames: PoseFrame[]): Calibration {
  if (!frames.length) return { scale: 1, centerX: 320, mode: 'seated', shoulderWidth: 100 };
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
  const thresh = 60 * Math.max(0.5, cal.scale);
  const level = Math.abs(lw.y - ls.y) < thresh && Math.abs(rw.y - rs.y) < thresh;
  return armSpread > 1.6 && level;
}
