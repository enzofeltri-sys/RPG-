import Phaser from 'phaser';
import { PixelText } from './pixelFont';

// Sizes are asked for as they were made for the old vector font, which
// were scaled up by 1.2 in one place; setFontSize() callers pass scaled
// sizes. The pixel font maps them to 1x or 2x.
const FONT_SIZE_MULTIPLIER = 1.2;

function scaleFontSize(fontSize: string | number | undefined): string | number | undefined {
  if (typeof fontSize !== 'string') return fontSize;
  const match = fontSize.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return fontSize;
  return `${Math.round(parseFloat(match[1]) * FONT_SIZE_MULTIPLIER)}px`;
}

// Every text of the game, in the pixel font (ui/pixelFont.ts): crisp on
// the pixel grid instead of a vector font blurred at 8–12 px. Takes the
// same style options as Phaser text (color, outline, shadow, word wrap,
// alignment) and maps the requested size to 1x or 2x.
export function addCrispText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string | string[],
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): PixelText {
  const text = new PixelText(scene, Math.round(x), Math.round(y), content, { ...style, fontSize: scaleFontSize(style.fontSize) ?? '20px' });
  // World labels (names, exits, monsters — ui/kit.ts's outlined styles)
  // float above the world art, which is depth-sorted by ground y.
  if (style.stroke === '#221c29' && style.strokeThickness === 3) text.setDepth(900);
  return text;
}
