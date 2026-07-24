import Phaser from 'phaser';

const CRISP_RESOLUTION = 3;

// VT323 (see fonts.css) is a monospaced pixel/terminal font — legible at
// small sizes, but its glyphs sit smaller within their em box than the
// Georgia serif this UI was originally sized for. Scaling every requested
// fontSize up compensates for that in one place instead of hand-tuning
// dozens of call sites.
const FONT_SIZE_MULTIPLIER = 1.2;

function scaleFontSize(fontSize: string | number | undefined): string | number | undefined {
  if (typeof fontSize !== 'string') return fontSize;
  const match = fontSize.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return fontSize;
  return `${Math.round(parseFloat(match[1]) * FONT_SIZE_MULTIPLIER)}px`;
}

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
    fontFamily: 'VT323, Menlo, monospace',
    resolution: CRISP_RESOLUTION,
    ...style,
    fontSize: scaleFontSize(style.fontSize) ?? '17px',
  });
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
}
