export interface CameraDevice {
  deviceId: string;
  label: string;
}

const PREF_KEY = 'skelplay:camera';

// 영상 입력 장치를 나열한다. 권한 전에는 label이 비어서 오므로 그때는 번호로 표기한다.
export async function listCameras(): Promise<CameraDevice[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `카메라 ${i + 1}` }));
  } catch {
    return [];
  }
}

export function getPreferredCamera(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}

export function setPreferredCamera(deviceId: string): void {
  try {
    localStorage.setItem(PREF_KEY, deviceId);
  } catch {
    // 저장 실패는 무시 (선택 UI는 계속 동작)
  }
}

// 대전용 카메라 열기. 720p 우선으로 영상 품질을 확보하고,
// 저장된 카메라가 있으면 먼저 정확히 지정해서 시도한다.
export async function openVersusCamera(deviceId?: string): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
  const attempts: MediaTrackConstraints[] = deviceId
    ? [{ deviceId: { exact: deviceId }, width: 1280, height: 720 }]
    : [];
  attempts.push(
    { width: 1280, height: 720, facingMode: 'user' },
    { width: 640, height: 480 }
  );
  for (const vc of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: vc, audio: false });
      video.srcObject = stream;
      await video.play();
      return video;
    } catch {
      // 다음 해상도로 폴백
    }
  }
  return null;
}
