import Phaser from 'phaser';

// The 199 item icons were generated via SpriteCook early in the project
// (see spritecook-assets-items*.json) but never actually wired into any
// UI — every screen showing items still fell back to categoryIcon()'s
// text/emoji badge. Same on-demand load pattern as spriteOverlay.ts, but
// for a plain UI image rather than something overlaid on a physics shape.
async function loadItemTexture(scene: Phaser.Scene, baseId: string): Promise<string | undefined> {
  const key = `item-icon-${baseId}`;
  if (!scene.textures.exists(key)) {
    const url = `${import.meta.env.BASE_URL}sprites/items/${baseId}.png`;
    await new Promise<void>((resolve) => {
      scene.load.image(key, url);
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      scene.load.start();
    });
  }
  if (!scene.scene.isActive() || !scene.textures.exists(key)) return undefined;
  return key;
}

export async function attachItemIcon(
  scene: Phaser.Scene,
  baseId: string,
  x: number,
  y: number,
  size: number,
): Promise<Phaser.GameObjects.Image | undefined> {
  const key = await loadItemTexture(scene, baseId);
  if (!key) return undefined;
  return scene.add.image(x, y, key).setDisplaySize(size, size);
}
