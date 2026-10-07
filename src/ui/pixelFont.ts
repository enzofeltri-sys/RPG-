import Phaser from 'phaser';
import { COMPOSED, GLYPHS, SUBSTITUTES } from './pixelGlyphs';

// The pixel font (ui/pixelGlyphs.ts) as Phaser bitmap fonts, in three
// variants baked once per game: plain, with a soft drop shadow (buttons),
// and outlined (labels in the world). Glyphs are white so a tint gives the
// text its color; the shadow and outline are dark, so tinting keeps them
// dark. PixelText wraps BitmapText with the few Text methods the game uses.

export type FontVariant = 'plain' | 'shadow' | 'outline';
export type FontWidth = 'normal' | 'narrow';

const CELL_H = 11; // 2 accent rows + 7 cap rows + 2 descender rows
const TOP = 2; // first cap row in the cell
export const FONT_SIZE = 11;
const LINE_H = 12;
const SHADOW: [number, number, number] = [58, 42, 36];
const OUTLINE: [number, number, number] = [34, 28, 41];

type Bitmap = boolean[][]; // [row][col], CELL_H rows

// A narrow cut for tight spots (small labels, long button labels): in
// wider glyphs, one column that repeats its neighbor is taken out (the
// glyph keeps its shape: an O gets narrower, a T keeps its stem); glyphs
// without such a column stay as they are.
const NARROW: Record<string, string[]> = Object.fromEntries(
  Object.entries(GLYPHS).map(([ch, rows]) => {
    const w = rows[0].length;
    if (w < 4) return [ch, rows];
    const col = (c: number) => rows.map((r) => r[c]).join('');
    const mid = (w - 1) / 2;
    let best = -1;
    for (let c = 1; c < w; c++) {
      if (col(c) !== col(c - 1)) continue;
      if (best < 0 || Math.abs(c - mid) < Math.abs(best - mid)) best = c;
    }
    if (best < 0) return [ch, rows];
    return [ch, rows.map((r) => r.slice(0, best) + r.slice(best + 1))];
  }),
);

function bitmapOf(ch: string, table: Record<string, string[]> = GLYPHS): Bitmap | undefined {
  const rowsOf = (glyph: string[], w: number): Bitmap => {
    const bm: Bitmap = Array.from({ length: CELL_H }, () => Array(w).fill(false));
    glyph.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) if (row[c] === '#') bm[TOP + r][c] = true;
    });
    return bm;
  };
  if (table[ch]) return rowsOf(table[ch], table[ch][0].length);
  const comp = COMPOSED[ch];
  if (!comp) return undefined;
  const [baseCh, mark] = comp;
  const base = table[baseCh];
  let w = base[0].length;
  let bm = rowsOf(base, w);
  const upper = baseCh === baseCh.toUpperCase();
  if (baseCh === 'i') {
    // A dotless i, widened so the accent fits over it.
    bm = Array.from({ length: CELL_H }, (_, r) => [false, r >= TOP + 2 && r <= TOP + 6, false]);
    w = 3;
  }
  if (mark === 'cedilla') {
    const c = Math.max(0, Math.floor(w / 2) - 1);
    bm[TOP + 7][c + 1] = true;
    bm[TOP + 8][c] = true;
    return bm;
  }
  // Accents sit in the two rows above the letter's top.
  const top = upper ? 0 : TOP;
  const off = Math.max(0, Math.floor((w - 3) / 2) + (w % 2 === 0 ? 1 : 0));
  mark.forEach((row, r) => {
    for (let c = 0; c < 3; c++) if (row[c] === '#' && off + c < w) bm[top + r][off + c] = true;
  });
  return bm;
}

function charset(): string[] {
  return [...new Set([...Object.keys(GLYPHS), ...Object.keys(COMPOSED)])];
}

// Paints every glyph of a variant into an atlas canvas and returns the
// bitmap font data Phaser expects.
function buildVariant(variant: FontVariant, width: FontWidth): { canvas: HTMLCanvasElement; data: Phaser.Types.GameObjects.BitmapText.BitmapFontData } {
  const table = width === 'narrow' ? NARROW : GLYPHS;
  const pad = variant === 'outline' ? 1 : 0;
  const extraW = variant === 'outline' ? 2 : variant === 'shadow' ? 1 : 0;
  const extraH = variant === 'outline' ? 2 : variant === 'shadow' ? 1 : 0;
  const chars = charset();
  const atlasW = 512;
  let x = 0;
  let y = 0;
  const places: { ch: string; bm: Bitmap; x: number; y: number; w: number; h: number }[] = [];
  for (const ch of chars) {
    const bm = bitmapOf(ch, table);
    if (!bm) continue;
    const w = bm[0].length + extraW;
    const h = CELL_H + extraH;
    if (x + w + 1 > atlasW) {
      x = 0;
      y += h + 1;
    }
    places.push({ ch, bm, x, y, w, h });
    x += w + 1;
  }
  const atlasH = y + CELL_H + extraH + 1;
  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(atlasW, atlasH);
  const put = (px: number, py: number, c: [number, number, number]) => {
    const o = (py * atlasW + px) * 4;
    img.data[o] = c[0];
    img.data[o + 1] = c[1];
    img.data[o + 2] = c[2];
    img.data[o + 3] = 255;
  };
  const chData: Record<number, Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData> = {};
  for (const p of places) {
    const gw = p.bm[0].length;
    const ink = (r: number, c: number) => r >= 0 && c >= 0 && r < CELL_H && c < gw && p.bm[r][c];
    // Dark first (shadow or outline), white ink on top.
    for (let r = -1; r <= CELL_H; r++) {
      for (let c = -1; c <= gw; c++) {
        if (ink(r, c)) continue;
        if (variant === 'shadow' && ink(r - 1, c - 1)) put(p.x + c, p.y + r, SHADOW);
        if (variant === 'outline') {
          let near = false;
          for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) if (ink(r + dr, c + dc)) near = true;
          if (near) put(p.x + c + pad, p.y + r + pad, OUTLINE);
        }
      }
    }
    for (let r = 0; r < CELL_H; r++) for (let c = 0; c < gw; c++) if (p.bm[r][c]) put(p.x + c + pad, p.y + r + pad, [255, 255, 255]);
    // xAdvance is read by Phaser but missing from its typings.
    chData[p.ch.codePointAt(0)!] = {
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
      centerX: Math.floor(p.w / 2),
      centerY: Math.floor(p.h / 2),
      xOffset: -pad,
      yOffset: -pad,
      xAdvance: gw + 1,
      data: {},
      kerning: {},
      u0: p.x / atlasW,
      v0: p.y / atlasH,
      u1: (p.x + p.w) / atlasW,
      v1: (p.y + p.h) / atlasH,
    } as unknown as Phaser.Types.GameObjects.BitmapText.BitmapFontCharacterData;
  }
  ctx.putImageData(img, 0, 0);
  return {
    canvas,
    data: { font: fontKey(variant, width), size: FONT_SIZE, lineHeight: LINE_H, retroFont: false, chars: chData },
  };
}

export function fontKey(variant: FontVariant, width: FontWidth): string {
  return `pixel-${variant}${width === 'narrow' ? '-narrow' : ''}`;
}

export function ensurePixelFonts(scene: Phaser.Scene): void {
  (['plain', 'shadow', 'outline'] as FontVariant[]).forEach((variant) => {
    (['normal', 'narrow'] as FontWidth[]).forEach((width) => {
      const key = fontKey(variant, width);
      if (scene.cache.bitmapFont.exists(key)) return;
      const { canvas, data } = buildVariant(variant, width);
      if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
      scene.cache.bitmapFont.add(key, { data, texture: key, frame: null });
    });
  });
}

// Only the characters the font knows; anything else is replaced or dropped.
export function sanitize(text: string): string {
  let out = '';
  for (const ch of text) {
    if (ch === '\n' || GLYPHS[ch] || COMPOSED[ch]) out += ch;
    else if (SUBSTITUTES[ch] !== undefined) out += SUBSTITUTES[ch];
    else if (ch === '\t') out += ' ';
    else out += '?';
  }
  return out;
}

// Requested CSS sizes (the game asks for sizes made for the old vector
// font, already multiplied by 1.2) map to the pixel font: narrow for the
// smallest, normal, or doubled for titles.
function requested(fontSize: string | number | undefined): number {
  const px = typeof fontSize === 'number' ? fontSize : parseFloat(String(fontSize ?? '20')) || 20;
  return px / 1.2;
}
export function scaleFor(fontSize: string | number | undefined): number {
  return requested(fontSize) >= 14 ? 2 : 1;
}
export function widthFor(fontSize: string | number | undefined): FontWidth {
  return requested(fontSize) < 7.5 ? 'narrow' : 'normal';
}

function parseColor(color: unknown): number | undefined {
  if (typeof color === 'number') return color;
  if (typeof color !== 'string') return undefined;
  const c = Phaser.Display.Color.ValueToColor(color);
  return c.color;
}

export class PixelText extends Phaser.GameObjects.BitmapText {
  private variant: FontVariant;

  constructor(scene: Phaser.Scene, x: number, y: number, content: string | string[], style: Phaser.Types.GameObjects.Text.TextStyle = {}) {
    ensurePixelFonts(scene);
    const variant: FontVariant = style.stroke ? 'outline' : style.shadow ? 'shadow' : 'plain';
    const text = Array.isArray(content) ? content.join('\n') : content;
    const size = style.fontSize as string | number | undefined;
    super(scene, x, y, fontKey(variant, widthFor(size)), sanitize(text), FONT_SIZE * scaleFor(size));
    this.variant = variant;
    const tint = parseColor(style.color);
    if (tint !== undefined) this.setTint(tint);
    const wrap = (style.wordWrap as { width?: number } | undefined)?.width;
    if (wrap) this.setMaxWidth(wrap);
    if (style.align === 'center') this.setCenterAlign();
    else if (style.align === 'right') this.setRightAlign();
    if (typeof style.lineSpacing === 'number') this.setLineSpacing(Math.round(style.lineSpacing / 2));
    scene.add.existing(this);
  }

  setText(value: string | string[]): this {
    return super.setText(sanitize(Array.isArray(value) ? value.join('\n') : String(value)));
  }

  setColor(color: string | number): this {
    const tint = parseColor(color);
    if (tint !== undefined) this.setTint(tint);
    return this;
  }

  // Sizes as the game asks for them (CSS px for the old font).
  setFontSize(size: number | string): this {
    this.setFont(fontKey(this.variant, widthFor(size)), FONT_SIZE * scaleFor(size));
    return this;
  }

  // The narrow cut of the same font, for text that has to fit.
  setNarrow(): this {
    this.setFont(fontKey(this.variant, 'narrow'), this.fontSize);
    return this;
  }

  setWordWrapWidth(width: number | null): this {
    return this.setMaxWidth(width ?? 0);
  }
}

// Makes a single line fit a width: the narrow cut first, then an ellipsis.
export function fitText(text: PixelText, maxWidth: number): PixelText {
  if (text.width <= maxWidth) return text;
  text.setNarrow();
  const full = text.text;
  let t = full;
  while (t.length > 1 && text.width > maxWidth) {
    t = t.slice(0, -1);
    text.setText(`${t.trimEnd()}…`);
  }
  return text;
}
