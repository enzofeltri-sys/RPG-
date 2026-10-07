import Phaser from 'phaser';
import { addCrispText } from './text';

// UI style A "Parchemin & bois" (graphics pass, UI step), drawn by the game
// itself so panels, buttons and bars stay crisp at any size. Same palette
// and pixel rules as tools/art (ui.py / ui_v3.py): one art pixel = 2 game
// pixels, so every position and size here should be even.

export const PAL = {
  k: 0x221c29,
  B: 0x482c22,
  b: 0x764c2e,
  n: 0xa87244,
  N: 0xd6a86e,
  Q: 0xf0deb2,
  V: 0xd6ba86,
  o: 0xeebc3c,
  Y: 0xfcec8c,
  O: 0xac701e,
  S: 0x424454,
  s: 0x707484,
  r: 0xa2a6b2,
  T: 0x282836,
  x: 0xc6343a,
  y: 0xf27264,
  X: 0x7a1c2c,
  h: 0x68ac44,
  H: 0xa8d65c,
  u: 0x3260b0,
  i: 0x6296de,
  c: 0x34a4ac,
  v: 0x8adece,
  p: 0x985ebc,
  P: 0x5c3480,
  W: 0xf8f8ee,
};

export const INK = {
  text: '#482c22',
  soft: '#764c2e',
  danger: '#7a1c2c',
  button: '#f0deb2',
  buttonShadow: '#482c22',
  disabled: '#a2a6b2',
  gold: '#fcec8c',
  light: '#f8f8ee',
};

const ICON_NAMES = ['sword', 'star', 'skills', 'potion', 'run', 'bag', 'heart', 'book', 'scroll', 'map', 'gear', 'door', 'lock', 'people'];
const STATE_NAMES = [
  'burn', 'poison', 'bleed', 'frozen', 'stun', 'weak', 'vulnerable', 'silence', 'blind', 'shield', 'buff', 'rage',
  'guard', 'regen', 'crit', 'dodge', 'blade', 'shell',
];

// Loads every kit image once; textures are shared by all scenes.
export function preloadUiKit(scene: Phaser.Scene): void {
  const base = `${import.meta.env.BASE_URL}sprites/ui`;
  ICON_NAMES.forEach((name) => {
    if (!scene.textures.exists(`ui-icon-${name}`)) scene.load.image(`ui-icon-${name}`, `${base}/icons/${name}.png`);
  });
  STATE_NAMES.forEach((name) => {
    if (!scene.textures.exists(`ui-state-${name}`)) scene.load.image(`ui-state-${name}`, `${base}/states/${name}.png`);
  });
  if (!scene.textures.exists('ui-battle-grass')) scene.load.image('ui-battle-grass', `${base}/battle_grass.png`);
  if (!scene.textures.exists('ui-hero-back')) scene.load.image('ui-hero-back', `${base}/hero_back.png`);
  if (!scene.textures.exists('ui-hero-face')) scene.load.image('ui-hero-face', `${base}/hero_face.png`);
}

// ------------------------------------------------------------------ shapes

type Rect = (x: number, y: number, w: number, h: number, color: number) => void;

function painter(g: Phaser.GameObjects.Graphics, ox: number, oy: number): Rect {
  // Coordinates in art pixels relative to (ox, oy) in game pixels.
  return (x, y, w, h, color) => {
    if (w <= 0 || h <= 0) return;
    g.fillStyle(color, 1);
    g.fillRect(ox + x * 2, oy + y * 2, w * 2, h * 2);
  };
}

function outline(rect: Rect, w: number, h: number): void {
  rect(1, 0, w - 2, 1, PAL.k);
  rect(1, h - 1, w - 2, 1, PAL.k);
  rect(0, 1, 1, h - 2, PAL.k);
  rect(w - 1, 1, 1, h - 2, PAL.k);
}

// Wooden frame, gold rivets, parchment paper with a light grain.
export function drawPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void {
  const w = Math.round(width / 2);
  const h = Math.round(height / 2);
  const rect = painter(g, x, y);
  outline(rect, w, h);
  rect(1, 1, w - 2, h - 2, PAL.b);
  rect(1, 1, w - 2, 1, PAL.n);
  rect(1, 1, 1, h - 2, PAL.n);
  rect(2, 2, w - 4, h - 4, PAL.B);
  rect(3, 3, w - 6, h - 6, PAL.Q);
  rect(3, h - 4, w - 6, 1, PAL.V);
  rect(w - 4, 3, 1, h - 6, PAL.V);
  for (let gy = 4; gy < h - 4; gy++) {
    for (let gx = 4; gx < w - 5; gx++) {
      if ((((x / 2 + gx) * 73856093) ^ ((y / 2 + gy) * 19349663)) % 61 === 0) rect(gx, gy, 1, 1, PAL.V);
    }
  }
  [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
  ].forEach(([rx, ry]) => rect(rx, ry, 1, 1, PAL.o));
}

export type ButtonState = 'normal' | 'pressed' | 'disabled';

export function drawButton(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  state: ButtonState,
): void {
  const w = Math.round(width / 2);
  const h = Math.round(height / 2);
  const rect = painter(g, x, y);
  outline(rect, w, h);
  if (state === 'disabled') {
    // Unavailable: cold grey stone instead of warm wood.
    rect(1, 1, w - 2, h - 2, PAL.S);
    rect(1, 1, w - 2, 1, PAL.s);
    rect(1, h - 2, w - 2, 1, PAL.T);
    return;
  }
  rect(1, 1, w - 2, h - 2, state === 'pressed' ? PAL.b : PAL.n);
  rect(1, 1, w - 2, 1, state === 'pressed' ? PAL.o : PAL.N);
  rect(1, h - 2, w - 2, 1, PAL.B);
}

export function addPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x, y, width, height);
  return g;
}

// ------------------------------------------------------------------ text

export function panelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  color: string = INK.text,
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return addCrispText(scene, x, y, text, { fontSize: `${size}px`, color, ...extra });
}

function shadowed(color: string, shadow: string): Phaser.Types.GameObjects.Text.TextStyle {
  return { color, shadow: { offsetX: 1, offsetY: 1, color: shadow, fill: true } };
}

// ------------------------------------------------------------------ button

export interface KitButtonOptions {
  icon?: string;
  size?: number;
  cost?: string;
  costSize?: number;
  // Small text at the left edge (e.g. "Niv 5"), the label moves past it.
  tag?: string;
  state?: ButtonState;
  align?: 'left' | 'center';
  onClick: () => void;
}

// A wooden button: frame, optional 16px icon, label, optional cost on the
// right. Disabled buttons stay tappable so the caller can explain why.
export class KitButton {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly costText?: Phaser.GameObjects.Text;
  private readonly tagText?: Phaser.GameObjects.Text;
  private readonly iconImage?: Phaser.GameObjects.Image;
  private readonly zone: Phaser.GameObjects.Zone;
  private state: ButtonState;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    text: string,
    options: KitButtonOptions,
  ) {
    this.state = options.state ?? 'normal';
    this.g = scene.add.graphics();
    const size = options.size ?? 10;
    let tx = x + 8;
    if (options.icon) {
      this.iconImage = scene.add.image(x + 6, y + height / 2, `ui-icon-${options.icon}`).setOrigin(0, 0.5);
      tx = x + 26;
    }
    if (options.tag !== undefined) {
      this.tagText = addCrispText(scene, tx - 2, y + height / 2, options.tag, {
        fontSize: '7px',
        ...shadowed(INK.gold, INK.buttonShadow),
      }).setOrigin(0, 0.5);
      tx += 34;
    }
    const centered = options.align === 'center' && !options.icon;
    this.label = addCrispText(scene, centered ? x + width / 2 : tx, y + height / 2, text, {
      fontSize: `${size}px`,
      ...shadowed(INK.button, INK.buttonShadow),
    }).setOrigin(centered ? 0.5 : 0, 0.5);
    if (options.cost !== undefined) {
      this.costText = addCrispText(scene, x + width - 6, y + height / 2, options.cost, {
        fontSize: `${options.costSize ?? 8}px`,
        ...shadowed(INK.gold, INK.buttonShadow),
      }).setOrigin(1, 0.5);
    }
    this.zone = scene.add.zone(x, y, width, height).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', () => options.onClick());
    this.redraw();
  }

  setState(state: ButtonState): this {
    this.state = state;
    this.redraw();
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.zone.input!.enabled = enabled;
    return this;
  }

  setDepth(depth: number): this {
    [this.g, this.label, this.costText, this.tagText, this.iconImage, this.zone].forEach((o) => o?.setDepth(depth));
    return this;
  }

  // Overworld HUD: stays put while the camera follows the player.
  setScrollFactor(factor: number): this {
    [this.g, this.label, this.costText, this.tagText, this.iconImage, this.zone].forEach((o) => o?.setScrollFactor(factor));
    return this;
  }

  setVisible(visible: boolean): this {
    [this.g, this.label, this.costText, this.tagText, this.iconImage].forEach((o) => o?.setVisible(visible));
    this.zone.setVisible(visible);
    if (this.zone.input) this.zone.input.enabled = visible;
    return this;
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  private redraw(): void {
    this.g.clear();
    drawButton(this.g, this.x, this.y, this.width, this.height, this.state);
    const disabled = this.state === 'disabled';
    this.label.setColor(disabled ? INK.disabled : INK.button);
    this.costText?.setColor(disabled ? INK.disabled : INK.gold);
    this.tagText?.setColor(disabled ? INK.disabled : INK.gold);
    this.iconImage?.setAlpha(disabled ? 0.5 : 1);
  }

  destroy(): void {
    [this.g, this.label, this.costText, this.tagText, this.iconImage, this.zone].forEach((o) => o?.destroy());
  }
}

// ------------------------------------------------------------------ bars

// 8px bar: dark frame, inner track, fill with a lighter top line.
export class KitBar {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly fill: number,
    private readonly light: number,
  ) {
    this.g = scene.add.graphics();
    this.set(1);
  }

  get graphics(): Phaser.GameObjects.Graphics {
    return this.g;
  }

  set(ratio: number): void {
    const w = Math.round(this.width / 2);
    const rect = painter(this.g, this.x, this.y);
    this.g.clear();
    rect(0, 0, w, 4, PAL.k);
    rect(1, 1, w - 2, 2, PAL.B);
    const filled = Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, ratio))));
    rect(1, 1, filled, 2, this.fill);
    rect(1, 1, filled, 1, this.light);
  }
}

// ------------------------------------------------------------------ states

export interface ChipInfo {
  icon: string;
  count: string;
  title: string;
  text: string;
}

// A row of state chips (framed 14px icon + turn count). A long press on a
// chip shows its name and effect.
export class ChipRow {
  private objects: Phaser.GameObjects.GameObject[] = [];
  private tooltip: Phaser.GameObjects.GameObject[] = [];
  private pressTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly darkFrame: boolean,
    private readonly maxWidth: number,
  ) {}

  set(chips: ChipInfo[]): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    let cx = this.x;
    chips.forEach((chip) => {
      const width = chip.count ? 32 : 22;
      if (cx + 18 > this.x + this.maxWidth) return;
      const g = this.scene.add.graphics();
      g.fillStyle(PAL.k, 1).fillRect(cx, this.y, 18, 18);
      g.fillStyle(this.darkFrame ? PAL.B : PAL.V, 1).fillRect(cx + 2, this.y + 2, 14, 14);
      const img = this.scene.add.image(cx + 2, this.y + 2, `ui-state-${chip.icon}`).setOrigin(0, 0);
      this.objects.push(g, img);
      if (chip.count) {
        this.objects.push(
          addCrispText(this.scene, cx + 20, this.y + 9, chip.count, { fontSize: '8px', ...shadowed(INK.light, '#221c29') }).setOrigin(
            0,
            0.5,
          ),
        );
      }
      const zone = this.scene.add.zone(cx, this.y, 18, 18).setOrigin(0, 0).setInteractive();
      zone.on('pointerdown', () => {
        this.pressTimer?.remove();
        this.pressTimer = this.scene.time.delayedCall(350, () => this.showTooltip(chip));
      });
      const release = () => {
        this.pressTimer?.remove();
        this.hideTooltip();
      };
      zone.on('pointerup', release);
      zone.on('pointerout', release);
      this.objects.push(zone);
      cx += width;
    });
  }

  private showTooltip(chip: ChipInfo): void {
    this.hideTooltip();
    const { width } = this.scene.scale;
    const boxW = 168;
    const bx = Math.max(6, Math.min(width - boxW - 6, this.x - 4));
    const by = this.y + 22;
    const g = this.scene.add.graphics().setDepth(2000);
    const title = addCrispText(this.scene, bx + 10, by + 8, chip.title, { fontSize: '10px', color: INK.text }).setDepth(2001);
    const body = addCrispText(this.scene, bx + 10, by + 22, chip.text, {
      fontSize: '8px',
      color: INK.soft,
      wordWrap: { width: boxW - 20 },
    }).setDepth(2001);
    const boxH = Math.ceil((body.y + body.height - by + 10) / 2) * 2;
    drawPanel(g, bx, by, boxW, boxH);
    this.tooltip = [g, title, body];
  }

  private hideTooltip(): void {
    this.tooltip.forEach((o) => o.destroy());
    this.tooltip = [];
  }

  destroy(): void {
    this.hideTooltip();
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }
}

// A short message in a small panel, centered at (cx, cy), gone after a moment.
export function toast(scene: Phaser.Scene, cx: number, cy: number, message: string, color: string = INK.danger): void {
  const text = addCrispText(scene, cx, cy, message, {
    fontSize: '8px',
    color,
    align: 'center',
    wordWrap: { width: 150 },
  })
    .setOrigin(0.5)
    .setDepth(1501);
  const w = Math.ceil((text.width + 20) / 2) * 2;
  const h = Math.ceil((text.height + 14) / 2) * 2;
  const g = scene.add.graphics().setDepth(1500);
  drawPanel(g, Math.round((cx - w / 2) / 2) * 2, Math.round((cy - h / 2) / 2) * 2, w, h);
  scene.time.delayedCall(1600, () => {
    g.destroy();
    text.destroy();
  });
}

// Menu screens: slate backdrop behind a full-height parchment panel.
export function addScreenPanel(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  scene.cameras.main.setBackgroundColor(PAL.T);
  return addPanel(scene, 6, 6, scene.scale.width - 12, scene.scale.height - 12);
}

// Splits a row of buttons evenly between x and x + width.
export function buttonRow(count: number, x: number, width: number, gap = 6): { x: number; w: number }[] {
  const w = Math.floor((width - gap * (count - 1)) / count / 2) * 2;
  return Array.from({ length: count }, (_, i) => ({ x: x + i * (w + gap), w }));
}
