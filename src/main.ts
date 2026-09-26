import { parseHash } from './ui/router';
import type { GameId } from './ui/router';
import { renderLanding } from './landing/landing';
import { startVersus } from './versus/versus-main';
import type { VersusId } from './versus/metas';
import './ui/game.css';

type VersusRoute = Exclude<GameId, 'home'>;

function isVersusRoute(id: GameId): id is VersusRoute {
  return id === 'versus-fruit' || id === 'versus-tug' || id === 'versus-math';
}

export function boot(): void {
  if ((window as unknown as { __skelversus_booted?: boolean }).__skelversus_booted) return;
  (window as unknown as { __skelversus_booted?: boolean }).__skelversus_booted = true;
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const oldVideo = document.getElementById('cam') as HTMLVideoElement | null;
    const oldStream = oldVideo?.srcObject as MediaStream | null;
    if (oldStream && typeof oldStream.getTracks === 'function') oldStream.getTracks().forEach((t) => t.stop());
    const hash = parseHash(window.location.hash);
    if (hash === 'home') {
      document.title = '대전 고르기 | Skeleton Versus';
      renderLanding(app);
      return;
    }
    if (isVersusRoute(hash)) {
      void startVersus(app, hash as VersusId);
      return;
    }
  };
  window.addEventListener('hashchange', render);
  render();
}

boot();
