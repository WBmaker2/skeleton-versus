// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fitStageToVideo } from '../src/ui/stage';

function mountedCanvas(): HTMLCanvasElement {
  document.body.innerHTML = '<div class="stage-frame"><canvas id="stage"></canvas></div>';
  return document.getElementById('stage') as HTMLCanvasElement;
}

describe('fitStageToVideo', () => {
  it('matches canvas backing store to video resolution', () => {
    const canvas = mountedCanvas();
    fitStageToVideo(canvas, 1280, 720);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });
  it('matches frame aspect to video to avoid crop misalignment', () => {
    const canvas = mountedCanvas();
    fitStageToVideo(canvas, 1280, 720);
    const frame = canvas.closest('.stage-frame') as HTMLElement;
    expect(frame.style.aspectRatio).toBe('1280 / 720');
  });
  it('falls back to 640x480 on zero dims', () => {
    const canvas = mountedCanvas();
    fitStageToVideo(canvas, 0, 0);
    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(480);
  });
});
