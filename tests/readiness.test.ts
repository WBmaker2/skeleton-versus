// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { checkReadiness, readinessMessage, type Readiness } from '../src/ui/readiness';

function okFetch(): typeof fetch {
  return (async () => ({ ok: true }) as Response) as typeof fetch;
}

describe('checkReadiness', () => {
  it('reports ready when model file is reachable', async () => {
    const r = await checkReadiness(okFetch(), 1000);
    expect(r.modelOk).toBe(true);
  });
  it('reports failure on network error', async () => {
    const fail = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    const r = await checkReadiness(fail, 1000);
    expect(r.modelOk).toBe(false);
  });
  it('reports failure on timeout', async () => {
    const hang = ((_url: string, opts?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    const r = await checkReadiness(hang, 50);
    expect(r.modelOk).toBe(false);
  });
});

describe('readinessMessage', () => {
  const base: Readiness = { modelOk: true, webgl: false, cached: false };
  it('mentions CPU mode without WebGL', () => {
    expect(readinessMessage(base)).toContain('절전 모드');
  });
  it('mentions offline when cached', () => {
    expect(readinessMessage({ ...base, cached: true })).toContain('오프라인');
  });
  it('asks to check connection on failure', () => {
    expect(readinessMessage({ ...base, modelOk: false })).toContain('인터넷 연결');
  });
  it('shows checking state when unknown', () => {
    expect(readinessMessage({ ...base, modelOk: null })).toContain('확인 중');
  });
  it('does not crash without cache API', async () => {
    const g = globalThis as unknown as { caches?: unknown };
    const saved = g.caches;
    delete g.caches;
    try {
      const r = await checkReadiness(okFetch(), 1000);
      expect(r.cached).toBe(false);
    } finally {
      g.caches = saved;
    }
  });
});
