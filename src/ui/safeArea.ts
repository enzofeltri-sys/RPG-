// The iPhone's status bar (and its blur) at the top and the home
// indicator at the bottom cover part of the screen. The game still draws
// its world under them, but the HUD (menu button, zone name, banners,
// dialogs) keeps clear: these are the covered heights, in game pixels.

let top = 0;
let bottom = 0;

function inset(side: 'top' | 'bottom'): number {
  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;left:0;width:0;visibility:hidden;pointer-events:none;${side}:0;height:env(safe-area-inset-${side})`;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

export function measureSafeArea(gameWidth: number): void {
  const k = gameWidth / (window.innerWidth || gameWidth);
  top = Math.ceil(inset('top') * k);
  bottom = Math.ceil(inset('bottom') * k);
}

export function safeTop(): number {
  return top;
}

export function safeBottom(): number {
  return bottom;
}
