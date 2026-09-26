// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openCamera } from '../src/main';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('openCamera fallback chain', () => {
  it('tries 720p first for tracking quality', async () => {
    const stream720 = new MediaStream();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error('overconstrained'))
      .mockResolvedValueOnce(stream720);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = document.createElement('video');
    video.id = 'cam';
    video.play = vi.fn().mockResolvedValue(undefined);
    document.body.appendChild(video);
    const out = await openCamera();
    expect(out).toBe(video);
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      video: { width: 1280, height: 720, facingMode: 'user' },
      audio: false
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, {
      video: { width: 640, height: 480 },
      audio: false
    });
    expect(video.srcObject).toBe(stream720);
  });
  it('returns null when all fail', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = document.createElement('video');
    video.id = 'cam';
    video.play = vi.fn().mockResolvedValue(undefined);
    document.body.appendChild(video);
    await expect(openCamera()).resolves.toBe(null);
  });
});

describe('openCamera device selection', () => {
  it('tries exact deviceId first', async () => {
    const stream = new MediaStream();
    const getUserMedia = vi.fn().mockResolvedValueOnce(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const video = document.createElement('video');
    video.id = 'cam';
    video.play = vi.fn().mockResolvedValue(undefined);
    document.body.appendChild(video);
    const out = await openCamera('abc123');
    expect(out).toBe(video);
    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      video: { deviceId: { exact: 'abc123' }, width: 1280, height: 720 },
      audio: false
    });
  });
});

describe('camera helpers', () => {
  it('lists videoinput with numbered fallback labels', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'a', label: '' },
          { kind: 'audioinput', deviceId: 'b', label: 'mic' }
        ])
      }
    });
    const { listCameras } = await import('../src/ui/camera');
    expect(await listCameras()).toEqual([{ deviceId: 'a', label: '카메라 1' }]);
  });
  it('persists preferred camera', async () => {
    const { getPreferredCamera, setPreferredCamera } = await import('../src/ui/camera');
    localStorage.clear();
    expect(getPreferredCamera()).toBe(null);
    setPreferredCamera('xyz');
    expect(getPreferredCamera()).toBe('xyz');
  });
});
