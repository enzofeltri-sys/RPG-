import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene';

// Portrait internal resolution (same total pixel budget as the previous 384x216 landscape design).
const GAME_WIDTH = 216;
const GAME_HEIGHT = 384;

// Surface JS crashes visibly instead of leaving a silent blank screen on mobile.
function showFatalError(message: string): void {
  const el = document.getElementById('game');
  if (el) {
    el.innerHTML = `<div style="color:#e8d9b5;font-family:sans-serif;padding:24px;font-size:14px;">${message}</div>`;
  }
}

window.addEventListener('error', (e) => showFatalError(`Erreur : ${e.message}`));
window.addEventListener('unhandledrejection', (e) => showFatalError(`Erreur : ${String(e.reason)}`));

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0c10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene],
});

setupFullscreenToggle();

function setupFullscreenToggle(): void {
  const el = document.documentElement;
  const canFullscreen = typeof el.requestFullscreen === 'function';
  if (!canFullscreen) return;

  const button = document.createElement('button');
  button.textContent = '⛶';
  button.setAttribute('aria-label', 'Plein écran');
  Object.assign(button.style, {
    position: 'fixed',
    top: 'max(8px, env(safe-area-inset-top))',
    right: 'max(8px, env(safe-area-inset-right))',
    zIndex: '1000',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    lineHeight: '1',
    background: 'rgba(232, 217, 181, 0.85)',
    color: '#0b0c10',
    border: 'none',
    borderRadius: '6px',
  } satisfies Partial<CSSStyleDeclaration>);

  button.addEventListener('click', () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {
        /* ignore: some mobile browsers reject without a direct enough gesture */
      });
    }
  });

  document.body.appendChild(button);
}
