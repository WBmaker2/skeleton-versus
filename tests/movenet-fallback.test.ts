import { describe, expect, it, vi } from 'vitest';

const createDetector = vi.fn();

vi.mock('@tensorflow-models/pose-detection', () => ({
  SupportedModels: { MoveNet: 'movenet' },
  movenet: { modelType: { SINGLEPOSE_LIGHTNING: 'lightning' } },
  createDetector: (...args: unknown[]) => createDetector(...args)
}));

import { MoveNetAdapter } from '../src/pose/movenet-adapter';

describe('MoveNetAdapter load fallback', () => {
  it('retries until a source works', async () => {
    createDetector.mockReset();
    createDetector
      .mockRejectedValueOnce(new Error('webgl crash'))
      .mockRejectedValueOnce(new Error('cdn down'))
      .mockResolvedValueOnce({ dispose: async () => {} });
    const adapter = new MoveNetAdapter();
    await adapter.load();
    expect(createDetector).toHaveBeenCalledTimes(3);
    await adapter.dispose();
  });
  it('throws when everything fails', async () => {
    createDetector.mockReset();
    createDetector.mockRejectedValue(new Error('nope'));
    const adapter = new MoveNetAdapter();
    await expect(adapter.load()).rejects.toThrow('nope');
  });
});
