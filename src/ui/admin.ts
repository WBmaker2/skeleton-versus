// 관리자 모드 잠금 상태. PIN은 교실용 가림막이며 보안 장치가 아니다:
// 코드는 모두 브라우저에 노출되므로, 실사용 보호가 필요하면 서버 인증을 둘 것.
export const ADMIN_PIN = '0392';

const UNLOCK_KEY = 'skelplay:admin';

function storage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function isUnlocked(): boolean {
  try {
    return storage()?.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function unlock(pin: string): boolean {
  if (pin !== ADMIN_PIN) return false;
  try {
    storage()?.setItem(UNLOCK_KEY, '1');
  } catch {
    // 저장 실패 시에도 메모리에 열린 표시를 남기지 않는다.
    // 호출자는 isUnlocked()로 확인할 것.
  }
  return isUnlocked();
}

export function lock(): void {
  try {
    storage()?.removeItem(UNLOCK_KEY);
  } catch {
    // 무시
  }
}
