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
export function syncSpriteOverlay(target: Phaser.GameObjects.Shape): void {
  const image = target.getData('appearanceImage') as Phaser.GameObjects.Image | undefined;
  image?.setPosition(target.x, target.y);
}
