import { describe, expect, it, vi } from 'vitest';

const { estimatePoses } = vi.hoisted(() => ({ estimatePoses: vi.fn() }));

vi.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: { MoveNet: 'movenet' },
  movenet: { modelType: { SINGLEPOSE_LIGHTNING: 'lightning' } },
  createDetector: vi.fn().mockResolvedValue({ estimatePoses, dispose: async () => {} })
}));

import { MoveNetAdapter } from '../src/pose/movenet-adapter';

function fakeVideo(): HTMLVideoElement {
  return { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
}

describe('mirror consistency (single mirror in CSS only)', () => {
  it('requests unflipped coordinates from the model', async () => {
    estimatePoses.mockResolvedValueOnce([{ keypoints: [] }]);
    const adapter = new MoveNetAdapter();
    await adapter.load();
    await adapter.estimate(fakeVideo());
    expect(estimatePoses).toHaveBeenCalledWith(expect.anything(), { flipHorizontal: false });
    await adapter.dispose();
  });
  it('passes model x through unchanged (no double mirror)', async () => {
    estimatePoses.mockResolvedValueOnce([
      { keypoints: [{ name: 'nose', x: 100, y: 200, score: 1 }] }
    ]);
    const adapter = new MoveNetAdapter();
    await adapter.load();
    const frame = await adapter.estimate(fakeVideo());
    // CSS scaleX(-1)가 유일한 반전이므로 모델 x는 그대로여야 한다.
    expect(frame.keypoints[0]).toMatchObject({ name: 'nose', x: 100, y: 200 });
    await adapter.dispose();
  });
});
