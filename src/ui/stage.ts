// 스테이지 좌표계 정합: 캔버스 백킹 스토어를 영상 해상도에 맞추고,
// 프레임 종횡비를 영상에 맞춰 잘림 없는 오버레이를 만든다.
// (좌표 왜곡·어긋남의 원인: 16:9 스트림을 4:3 캔버스에 그대로 그리기 + cover 크롭)
export function fitStageToVideo(
  canvas: HTMLCanvasElement,
  videoWidth: number,
  videoHeight: number
): void {
  const w = videoWidth > 0 ? videoWidth : 640;
  const h = videoHeight > 0 ? videoHeight : 480;
  canvas.width = w;
  canvas.height = h;
  const frame = canvas.closest('.stage-frame') as HTMLElement | null;
  if (frame) frame.style.aspectRatio = `${w} / ${h}`;
}
