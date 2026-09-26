// src/pose/types.ts
export interface Point { x: number; y: number }
export interface Keypoint { x: number; y: number; score: number; name: string }
export interface PoseFrame { keypoints: Keypoint[]; width: number; height: number; timestamp: number }
export type PoseMode = 'seated' | 'standing';
export interface Calibration { scale: number; centerX: number; mode: PoseMode; shoulderWidth: number }
