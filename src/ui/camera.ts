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
