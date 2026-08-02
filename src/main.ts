import Phaser from 'phaser';
import './fonts.css';
import { TitleScene } from './scenes/TitleScene';
import { CharacterCreationScene } from './scenes/CharacterCreationScene';
import { HamletScene } from './scenes/HamletScene';
import { VillageScene } from './scenes/VillageScene';
import { FieldScene } from './scenes/FieldScene';
import { ForestScene } from './scenes/ForestScene';
import { CaveScene } from './scenes/CaveScene';
import { BanditCampScene } from './scenes/BanditCampScene';
import { GoblinCampScene } from './scenes/GoblinCampScene';
import { FarmScene } from './scenes/FarmScene';
import { ShrineScene } from './scenes/ShrineScene';
import { RoadScene } from './scenes/RoadScene';
import { CityScene } from './scenes/CityScene';
import { FaubourgScene } from './scenes/FaubourgScene';
import { WarehouseScene } from './scenes/WarehouseScene';
import { ArchivesScene } from './scenes/ArchivesScene';
import { RiverRoadScene } from './scenes/RiverRoadScene';
import { HunterOutpostScene } from './scenes/HunterOutpostScene';
import { MarshLairScene } from './scenes/MarshLairScene';
import { SunkenRoadScene } from './scenes/SunkenRoadScene';
import { VasenoireScene } from './scenes/VasenoireScene';
import { SunkenRuinsScene } from './scenes/SunkenRuinsScene';
import { ClandestineDockScene } from './scenes/ClandestineDockScene';
import { SealedSanctuaryScene } from './scenes/SealedSanctuaryScene';
import { ShardSeekersCampScene } from './scenes/ShardSeekersCampScene';
import { BrotherhoodTombScene } from './scenes/BrotherhoodTombScene';
import { BlightedGroveScene } from './scenes/BlightedGroveScene';
import { SealChamberScene } from './scenes/SealChamberScene';
import { SilentWatchScene } from './scenes/SilentWatchScene';
import { WardCoreScene } from './scenes/WardCoreScene';
import { WatchersVaultScene } from './scenes/WatchersVaultScene';
import { BrokenSleepScene } from './scenes/BrokenSleepScene';
import { CorruptedRootScene } from './scenes/CorruptedRootScene';
import { SealDepthsScene } from './scenes/SealDepthsScene';
import { WatchersLodgeScene } from './scenes/WatchersLodgeScene';
import { DungeonScene } from './scenes/DungeonScene';
import { CatacombsScene } from './scenes/CatacombsScene';
import { OldWellScene } from './scenes/OldWellScene';
import { CombatScene } from './scenes/CombatScene';
import { InventoryScene } from './scenes/InventoryScene';
import { BagScene } from './scenes/BagScene';
import { StatsScene } from './scenes/StatsScene';
import { QuestLogScene } from './scenes/QuestLogScene';
import { MapScene } from './scenes/MapScene';
import { CraftingScene } from './scenes/CraftingScene';
import { MerchantScene } from './scenes/MerchantScene';

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

// A new deploy's service worker activates in the background (skipWaiting + clientsClaim).
// Without this, an already-open or just-opened tab keeps running the previous build until
// reloaded a second time, which reads as "nothing happened" after a deploy.
// The guard lives in sessionStorage (not a JS variable) because it must survive the reload
// it triggers — otherwise a flapping service worker (e.g. during CDN propagation right after
// a deploy) can reload the page in an infinite loop instead of settling on the new version.
//
// 'controllerchange' also fires the very first time a service worker ever claims a page
// (clientsClaim), not just on updates — e.g. right after a fresh install or after clearing
// site data. That's not a stale-content situation, so reloading there just interrupts
// whatever the player is mid-doing for no reason. Only reload when this page was already
// under an active worker's control at load time and that control just changed hands.
if ('serviceWorker' in navigator) {
  const hadControllerAtLoad = Boolean(navigator.serviceWorker.controller);
  const RELOAD_GUARD_KEY = 'sw-reloaded-once';
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerAtLoad) return;
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
    window.location.reload();
  });
}

// Phaser draws text onto a canvas synchronously at creation time — if the
// custom UI font (VT323, see fonts.css) hasn't finished loading yet, the
// first frame of text bakes in with a fallback font and never gets redrawn
// once VT323 arrives. Waiting here (the boot-status placeholder is still
// showing) guarantees every scene's text uses the right font from frame one.
async function boot(): Promise<void> {
  try {
    await document.fonts.load('16px VT323');
  } catch {
    // Font failed to load (e.g. offline on first-ever visit, before the SW
    // has cached it) — fall back to the generic monospace in the font stack.
  }

  // Reverted from CANVAS back to AUTO (WebGL, falling back to Canvas only if
  // unavailable): Canvas rendering caused visible seams/shimmer on the tiled ground
  // while the camera scrolled, plus a noticeable performance drop — worse tradeoffs
  // than the WebGL-context-exhaustion theory it was meant to guard against, which
  // was never actually confirmed as the real cause of the earlier blank-screen bug.
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
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    scene: [
      TitleScene,
      CharacterCreationScene,
      HamletScene,
      VillageScene,
      FieldScene,
      ForestScene,
      CaveScene,
      BanditCampScene,
      GoblinCampScene,
      FarmScene,
      ShrineScene,
      RoadScene,
      CityScene,
      FaubourgScene,
      WarehouseScene,
      ArchivesScene,
      RiverRoadScene,
      HunterOutpostScene,
      MarshLairScene,
      SunkenRoadScene,
      VasenoireScene,
      SunkenRuinsScene,
      ClandestineDockScene,
      SealedSanctuaryScene,
      ShardSeekersCampScene,
      BrotherhoodTombScene,
      BlightedGroveScene,
      SealChamberScene,
      SilentWatchScene,
      WardCoreScene,
      WatchersVaultScene,
      BrokenSleepScene,
      CorruptedRootScene,
      SealDepthsScene,
      WatchersLodgeScene,
      DungeonScene,
      CatacombsScene,
      OldWellScene,
      CombatScene,
      InventoryScene,
      BagScene,
      StatsScene,
      QuestLogScene,
      MapScene,
      CraftingScene,
      MerchantScene,
    ],
  });

  setupFullscreenToggle();
}

boot();

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
