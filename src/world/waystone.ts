import Phaser from 'phaser';
import { glow } from '../art/critters';
import { renderWaystoneRunes } from '../art/props';
import type { Character } from '../game/character';
import { WAYSTONE_BY_ZONE, isWaystoneAwake, wakeWaystone } from '../game/waystones';
import { addSceneInteractable } from '../input/TapController';
import { SaveManager } from '../save/SaveManager';
import { showBanner } from '../ui/dialog';
import { FEET_TO_DEPTH, pixmapTexture } from './drawnArt';
import type { ZoneArt } from './zonePlan';

const GLOW_DEPTH = 805; // above the light map of dark zones, like ambience.ts

// The live side of a zone's passage stone (its picture is one of the
// zone's props): the runes light up once it's awake, tapping it wakes it
// the first time; after that a tap restores the hero when hurt, and opens
// the Carte to travel otherwise.
export function setupWaystone(scene: Phaser.Scene, art: ZoneArt): void {
  const stone = WAYSTONE_BY_ZONE.get(art.key);
  const spot = (art.props ?? []).find((p) => p.kind === 'waystone');
  if (!stone || !spot) return;
  const r = renderWaystoneRunes();
  const runes = scene.add
    .image(spot.x - r.anchorX, spot.y - r.anchorY, pixmapTexture(scene, 'waystone-runes', r.pm))
    .setOrigin(0, 0)
    .setDepth(spot.y - FEET_TO_DEPTH + 0.5)
    .setAlpha(0);
  const halo = scene.add
    .image(spot.x, spot.y - 20, pixmapTexture(scene, 'waystone-glow', glow(16, [120, 200, 255])))
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(GLOW_DEPTH)
    .setAlpha(0);
  let awake = false;
  const breathe = () => {
    awake = true;
    runes.setAlpha(1);
    scene.tweens.add({ targets: runes, alpha: 0.7, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: halo, alpha: { from: 0.35, to: 0.55 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // Motes rising off the stone now and then.
    scene.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => {
        const mote = scene.add
          .image(spot.x + (Math.random() - 0.5) * 12, spot.y - 10 - Math.random() * 20, 'waystone-glow')
          .setScale(0.12)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(GLOW_DEPTH)
          .setAlpha(0.9);
        scene.tweens.add({ targets: mote, y: mote.y - 18, alpha: 0, duration: 1800, onComplete: () => mote.destroy() });
      },
    });
  };
  void SaveManager.load().then((save) => {
    if (save?.character && scene.scene.isActive() && isWaystoneAwake(save.character, stone.id)) breathe();
  });

  let busy = false;
  addSceneInteractable(scene, {
    x: spot.x,
    y: spot.y - 6,
    radius: 22,
    onTap: async () => {
      if (busy) return;
      busy = true;
      // The scene's own character when it has one (it saves it later on:
      // changing only the stored copy would be overwritten), else the save.
      const own = (scene as unknown as { character?: Character }).character;
      const character = own ?? (await SaveManager.load())?.character;
      if (!character || !scene.scene.isActive()) {
        busy = false;
        return;
      }
      if (!awake && wakeWaystone(character, stone.id)) {
        await SaveManager.saveCharacter(character);
        // The mark answers: a flash of light, the runes catch.
        halo.setAlpha(1).setScale(2.2);
        scene.tweens.add({ targets: halo, scale: 1, duration: 900, ease: 'Cubic.out' });
        scene.cameras.main.flash(250, 160, 220, 255);
        breathe();
        showBanner(scene, 'La pierre s’éveille au contact de votre marque.', 2600);
        busy = false;
        return;
      }
      if (!awake) breathe();
      // An awake stone also restores: a place to rest in every region.
      if (character.hp < character.maxHp || character.mp < character.maxMp) {
        character.hp = character.maxHp;
        character.mp = character.maxMp;
        await SaveManager.saveCharacter(character);
        scene.cameras.main.flash(200, 140, 210, 255);
        showBanner(scene, 'La pierre vous apaise : forces restaurées.', 1800);
        busy = false;
        return;
      }
      const player = (scene as unknown as { player?: { x: number; y: number } }).player;
      scene.scene.start('Map', { returnScene: scene.scene.key, x: player?.x, y: player?.y, travel: true });
    },
  });
}
