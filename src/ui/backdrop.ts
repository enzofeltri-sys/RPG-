import Phaser from 'phaser';
import { renderGround } from '../art/ground';
import { Pixmap } from '../art/pixmap';
import { propArt } from '../world/zonePlan';
import { pixmapTexture } from '../world/drawnArt';
import { FRAME_H } from './screen';

// The meadow behind the title screen and the fights, drawn by the game at
// the screen's full height: grass, a line of trees along the top, and the
// two trodden spots where the fighters stand (in the 216x384 frame).
export function addMeadowBackdrop(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const H = Math.max(FRAME_H, scene.scale.height);
  const off = Math.max(0, Math.floor((H - FRAME_H) / 2));
  const key = `backdrop-meadow-${H}`;
  if (!scene.textures.exists(key)) {
    const pm = renderGround({
      w: 216,
      h: H,
      base: 'grass',
      seed: 17,
      shapes: [
        { kind: 'ellipse', material: 'forest', x: 92, y: off + 124, w: 120, h: 32 },
        { kind: 'ellipse', material: 'forest', x: 4, y: off + 244, w: 112, h: 32 },
      ],
    });
    // Trees along the top, a second row behind them on taller screens.
    const rows = off > 20 ? [off + 6, off + 30] : [off + 30];
    rows.forEach((base, r) => {
      for (let x = r ? 18 : 0; x < 236; x += 36) {
        const a = propArt(r ? 'big_tree' : 'tree', 1 + ((x / 36 + r * 3) % 7));
        place(pm, a.pm, x - a.anchorX + (r ? 0 : 6), base - a.anchorY);
      }
    });
    pixmapTexture(scene, key, pm);
  }
  return scene.add.image(0, -off, key).setOrigin(0, 0).setDepth(-1000);
}

function place(dst: Pixmap, src: Pixmap, x: number, y: number): void {
  dst.blit(src, Math.round(x), Math.round(y));
}
