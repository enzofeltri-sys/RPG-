import Phaser from 'phaser';

// The 199 item icons were generated via SpriteCook early in the project
// (see spritecook-assets-items*.json) but never actually wired into any
// UI — every screen showing items still fell back to categoryIcon()'s
// text/emoji badge. Same on-demand load pattern as spriteOverlay.ts, but
// for a plain UI image rather than something overlaid on a physics shape.
async function loadIconTexture(scene: Phaser.Scene, cacheKey: string, url: string): Promise<string | undefined> {
  if (!scene.textures.exists(cacheKey)) {
    await new Promise<void>((resolve) => {
      scene.load.image(cacheKey, url);
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => resolve());
      scene.load.start();
    });
  }
  if (!scene.scene.isActive() || !scene.textures.exists(cacheKey)) return undefined;
  return cacheKey;
}

export async function attachItemIcon(
  scene: Phaser.Scene,
  baseId: string,
  x: number,
  y: number,
  size: number,
): Promise<Phaser.GameObjects.Image | undefined> {
  const key = await loadIconTexture(
    scene,
    `item-icon-${baseId}`,
    `${import.meta.env.BASE_URL}sprites/items/${baseId}.png`,
  );
  if (!key) return undefined;
  return scene.add.image(x, y, key).setDisplaySize(size, size);
}

// Two hand-picked icons (a plain and a "+"-badged potion) from the Shikashi
// Fantasy Icons Pack — the game only has 2 consumable ids, so unlike items
// this didn't need a per-id generation batch (see DESIGN.md's Assets
// section for the pack's license/attribution).
export async function attachConsumableIcon(
  scene: Phaser.Scene,
  consumableId: string,
  x: number,
  y: number,
  size: number,
): Promise<Phaser.GameObjects.Image | undefined> {
  const key = await loadIconTexture(
    scene,
    `consumable-icon-${consumableId}`,
    `${import.meta.env.BASE_URL}sprites/consumables/${consumableId}.png`,
  );
  if (!key) return undefined;
  return scene.add.image(x, y, key).setDisplaySize(size, size);
}

// Loads every listed item icon in one pass, so a screen that redraws itself
// can then place them synchronously (missing files are simply skipped).
export async function preloadItemIcons(scene: Phaser.Scene, baseIds: string[]): Promise<void> {
  const missing = [...new Set(baseIds)].filter((id) => !scene.textures.exists(`item-icon-${id}`));
  if (missing.length === 0) return;
  await new Promise<void>((resolve) => {
    missing.forEach((id) => scene.load.image(`item-icon-${id}`, `${import.meta.env.BASE_URL}sprites/items/${id}.png`));
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.start();
  });
}

// The icon at (cx, cy) fitted in a size×size square, if it loaded.
export function placeItemIcon(scene: Phaser.Scene, baseId: string, cx: number, cy: number, size: number): Phaser.GameObjects.Image | undefined {
  const key = `item-icon-${baseId}`;
  if (!scene.textures.exists(key)) return undefined;
  return scene.add.image(cx, cy, key).setDisplaySize(size, size);
}
