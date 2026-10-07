import Phaser from 'phaser';
import { INK, KitButton, drawPanel, panelText } from './kit';
import type { PixelText } from './pixelFont';

export interface DialogButton {
  label: string;
  onClick: () => void;
}

// Above world labels (900) and the zone title (960).
const DEPTH = 970;
const PANEL_X = 6;
const TEXT_SIZE = 9;
const BUTTON_H = 24;
const BUTTON_STEP = 28;
// Sentence pieces that cover the whole text: closing marks and the spaces
// after them stay with the sentence they end.
const SENTENCES = /[^.!?…»]*[.!?…»]+[\s.!?…»]*|[^.!?…»]+$/g;

// Dialogue box in UI style A: a parchment panel along the bottom of the
// screen. Long speeches are split into pages (at sentence ends when
// possible) behind a "Suite" button, so nothing ever runs off-screen; the
// caller's choices appear on the last page.
export class DialogBox {
  private objects: { destroy(): void }[] = [];
  private readonly pages: string[];
  private page = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    text: string,
    private readonly buttons: DialogButton[],
  ) {
    this.pages = this.paginate(text);
    this.show();
  }

  private get width(): number {
    return this.scene.scale.width - PANEL_X * 2;
  }

  private textHeightFor(buttonCount: number): number {
    const available = this.scene.scale.height - 12 - 34 - buttonCount * BUTTON_STEP;
    return Math.min(196, available);
  }

  private measure(probe: PixelText, text: string): number {
    probe.setText(text);
    return probe.height;
  }

  private paginate(text: string): string[] {
    const probe = panelText(this.scene, 0, 0, '', TEXT_SIZE, INK.text, {
      wordWrap: { width: this.width - 24 },
      lineSpacing: 3,
    }).setVisible(false);
    const lastCap = this.textHeightFor(Math.max(1, this.buttons.length));
    const midCap = this.textHeightFor(1);
    const pages: string[] = [];
    let rest = text;
    while (rest.length > 0) {
      if (this.measure(probe, rest.trim()) <= lastCap) {
        pages.push(rest.trim());
        break;
      }
      // Fill a page sentence by sentence, then word by word for a sentence
      // longer than a page.
      let page = '';
      const parts = rest.match(SENTENCES) ?? [rest];
      for (const part of parts) {
        if (this.measure(probe, (page + part).trim()) <= midCap) {
          page += part;
          continue;
        }
        if (page === '') {
          for (const word of part.split(/(\s+)/)) {
            if (this.measure(probe, (page + word).trim()) > midCap && page.trim() !== '') break;
            page += word;
          }
        }
        break;
      }
      pages.push(page.trim());
      rest = rest.slice(page.length);
    }
    probe.destroy();
    return pages.length > 0 ? pages : [text];
  }

  private show(): void {
    this.clear();
    const { scene } = this;
    const last = this.page === this.pages.length - 1;
    const buttons: DialogButton[] = last ? this.buttons : [{ label: 'Suite', onClick: () => this.next() }];

    const body = panelText(scene, PANEL_X + 12, 0, this.pages[this.page], TEXT_SIZE, INK.text, {
      wordWrap: { width: this.width - 24 },
      lineSpacing: 3,
    });
    // A page count ("1/2") gets a row of its own above the text.
    const paged = this.pages.length > 1 ? 6 : 0;
    const panelH = Math.ceil((body.height + 30 + paged + buttons.length * BUTTON_STEP) / 2) * 2;
    const top = Math.round((scene.scale.height - 6 - panelH) / 2) * 2;
    const g = scene.add.graphics();
    drawPanel(g, PANEL_X, top, this.width, panelH);
    body.setY(top + 12 + paged);
    this.objects.push(g, body);
    if (this.pages.length > 1) {
      this.objects.push(
        panelText(scene, PANEL_X + this.width - 12, top + 5, `${this.page + 1}/${this.pages.length}`, 7, INK.soft).setOrigin(1, 0),
      );
    }
    const buttonsTop = top + 18 + paged + body.height;
    buttons.forEach((button, i) => {
      this.objects.push(
        new KitButton(scene, PANEL_X + 12, buttonsTop + i * BUTTON_STEP, this.width - 24, BUTTON_H, button.label, {
          size: 9,
          align: 'center',
          onClick: button.onClick,
        }),
      );
    });
    this.objects.forEach((o) => {
      const fixed = o as unknown as { setScrollFactor?(f: number): unknown; setDepth?(d: number): unknown };
      fixed.setScrollFactor?.(0);
      fixed.setDepth?.(DEPTH + 1);
    });
    g.setDepth(DEPTH);
  }

  private next(): void {
    if (this.page < this.pages.length - 1) {
      this.page += 1;
      this.show();
    }
  }

  private clear(): void {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  destroy(): void {
    this.clear();
  }
}

// A short message (loot, discoveries…) in a small parchment banner at the
// top of the screen, below the menu button; a new one replaces the last.
const banners = new WeakMap<Phaser.Scene, { destroy(): void }[]>();

export function showBanner(scene: Phaser.Scene, message: string, duration = 1800): void {
  banners.get(scene)?.forEach((o) => o.destroy());
  const text = panelText(scene, scene.scale.width / 2, 0, message, 9, INK.text, {
    align: 'center',
    wordWrap: { width: scene.scale.width - 48 },
    lineSpacing: 2,
  })
    .setOrigin(0.5, 0)
    .setScrollFactor(0)
    .setDepth(1002);
  const w = Math.ceil(Math.min(scene.scale.width - 24, text.width + 24) / 2) * 2;
  const h = Math.ceil((text.height + 16) / 2) * 2;
  const top = 40;
  text.setY(top + 8);
  const g = scene.add.graphics().setScrollFactor(0).setDepth(1001);
  drawPanel(g, Math.round((scene.scale.width - w) / 4) * 2, top, w, h);
  const objects = [g, text];
  banners.set(scene, objects);
  scene.time.delayedCall(duration, () => {
    objects.forEach((o) => o.destroy());
    if (banners.get(scene) === objects) banners.delete(scene);
  });
}
