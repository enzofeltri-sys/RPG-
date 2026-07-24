import Phaser from 'phaser';

const CRISP_RESOLUTION = 3;

// The game renders with pixelArt:true (nearest-neighbor scaling) so sprites stay crisp,
// but that same filtering makes normal anti-aliased text look blurry/chunky once scaled
// up to fill a phone screen. Rendering text at a higher internal resolution and forcing
// linear filtering on just that texture keeps UI text legible without affecting sprites.
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string | string[],
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, content, {
    fontFamily: 'Georgia, serif',
    resolution: CRISP_RESOLUTION,
    ...style,
  });
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
}
