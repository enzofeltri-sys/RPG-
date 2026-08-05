import Phaser from 'phaser';

// Shared by player.ts, wanderer.ts, and any scene overlaying a real sprite
// on top of an existing collision rectangle: loads the texture on demand
// (many callers don't know which key they need until after an async load —
// race/class from the save, an NPC identity picked per scene, etc. — well
// after Phaser's own preload() already ran), then swaps in an Image that
// tracks the rectangle's position every frame while the rectangle itself
// keeps driving physics/collision, just hidden.
export async function attachSpriteOverlay(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Shape,
  textureKey: string,
  url: string,
  displaySize: number,
): Promise<void> {
  if (!scene.textures.exists(textureKey)) {
    await new Promise<void>((resolve) => {
      scene.load.image(textureKey, url);
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      scene.load.start();
    });
  }
  if (!scene.scene.isActive() || !scene.textures.exists(textureKey)) return;

  const existing = target.getData('appearanceImage') as Phaser.GameObjects.Image | undefined;
  if (existing) {
    existing.setTexture(textureKey);
    return;
  }
  const image = scene.add.image(target.x, target.y, textureKey).setDisplaySize(displaySize, displaySize);
  target.setData('appearanceImage', image);
  target.setVisible(false);
}

// Call once per frame (or per Wanderer.update()) for any rectangle that may
// have an overlay attached — a no-op until attachSpriteOverlay resolves.
// `moving` adds a small vertical bob: every character sprite here is a
// single static pose (no per-race/class walk-cycle animation exists), so
// without this a moving character just glides in place — technically
// tracking position correctly, but reading as "not actually walking."
export function syncSpriteOverlay(target: Phaser.GameObjects.Shape, moving = false): void {
  const image = target.getData('appearanceImage') as Phaser.GameObjects.Image | undefined;
  if (!image) return;
  if (!moving) {
    target.setData('walkPhase', 0);
    image.setPosition(target.x, target.y);
    return;
  }
  const phase = ((target.getData('walkPhase') as number | undefined) ?? 0) + 1;
  target.setData('walkPhase', phase);
  const bob = Math.sin(phase * 0.35) * 1.6;
  image.setPosition(target.x, target.y + bob);
}
