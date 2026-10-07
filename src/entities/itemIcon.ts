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
  return scene.add.image(cx, cy, crispIcon(scene, key, size));
}

// The big painted icons (60–76 px) squeezed into 24 px by nearest-pixel
// sampling look noisy. This redraws one at its real display size as a
// pixel icon: trimmed, each target pixel the average of the source pixels
// it covers, a hard silhouette (no half-transparent edge) and a dark
// outline like the rest of the game's art. Once per icon and size.
export function crispIcon(scene: Phaser.Scene, key: string, size: number): string {
  const outKey = `${key}-px${size}`;
  if (scene.textures.exists(outKey)) return outKey;
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const sw = src.width;
  const sh = src.height;
  const read = document.createElement('canvas');
  read.width = sw;
  read.height = sh;
  const rctx = read.getContext('2d', { willReadFrequently: true })!;
  rctx.drawImage(src, 0, 0);
  const sp = rctx.getImageData(0, 0, sw, sh).data;
  // Trim to the painted part.
  let x0 = sw;
  let y0 = sh;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (sp[(y * sw + x) * 4 + 3] < 40) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const octx = out.getContext('2d')!;
  const img = octx.createImageData(size, size);
  if (x1 >= 0) {
    // Fit inside size-2 (one pixel left all around for the outline).
    const inner = size - 2;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const scale = Math.max(bw, bh) / inner;
    const dw = Math.max(1, Math.round(bw / scale));
    const dh = Math.max(1, Math.round(bh / scale));
    const ox = 1 + Math.floor((inner - dw) / 2);
    const oy = 1 + Math.floor((inner - dh) / 2);
    const ink = new Uint8Array(size * size);
    for (let ty = 0; ty < dh; ty++) {
      for (let tx = 0; tx < dw; tx++) {
        const sx0 = x0 + tx * scale;
        const sy0 = y0 + ty * scale;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let n = 0;
        for (let yy = Math.floor(sy0); yy < Math.min(sh, Math.ceil(sy0 + scale)); yy++) {
          for (let xx = Math.floor(sx0); xx < Math.min(sw, Math.ceil(sx0 + scale)); xx++) {
            const o = (yy * sw + xx) * 4;
            const al = sp[o + 3] / 255;
            r += sp[o] * al;
            g += sp[o + 1] * al;
            b += sp[o + 2] * al;
            a += al;
            n++;
          }
        }
        if (!n || a / n < 0.45) continue;
        const o = ((oy + ty) * size + ox + tx) * 4;
        // A touch more contrast, so small shapes still read.
        const boost = (v: number) => Math.max(0, Math.min(255, (v - 128) * 1.12 + 128));
        img.data[o] = boost(r / a);
        img.data[o + 1] = boost(g / a);
        img.data[o + 2] = boost(b / a);
        img.data[o + 3] = 255;
        ink[(oy + ty) * size + ox + tx] = 1;
      }
    }
    // Outline: the bordering color darkened, around the silhouette.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (ink[y * size + x]) continue;
        let nb = -1;
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size && ink[ny * size + nx]) {
            nb = (ny * size + nx) * 4;
            break;
          }
        }
        if (nb < 0) continue;
        const o = (y * size + x) * 4;
        img.data[o] = img.data[nb] * 0.22 + 34 * 0.78;
        img.data[o + 1] = img.data[nb + 1] * 0.22 + 28 * 0.78;
        img.data[o + 2] = img.data[nb + 2] * 0.22 + 41 * 0.78;
        img.data[o + 3] = 255;
      }
    }
  }
  octx.putImageData(img, 0, 0);
  scene.textures.addCanvas(outKey, out);
  return outKey;
}
