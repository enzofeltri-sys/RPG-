import Phaser from 'phaser';
import { attachSpriteOverlay, syncSpriteOverlay } from './spriteOverlay';

const WANDER_SPEED = 18;
const APPEARANCE_SIZE = 24;

export type WandererSprite = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

// A small back-and-forth patrol NPC — pure ambiance (villagers, animals,
// travelers) to make a location read as lived-in rather than a static
// backdrop. No dialogue system of its own: the caller wires up tap
// interaction via TapController same as any other NPC, using getters for
// x/y so the hit-test always reads the sprite's current (moving) position.
export class Wanderer {
  readonly sprite: WandererSprite;
  private readonly minX: number;
  private readonly maxX: number;
  private direction: 1 | -1 = 1;
  // Seconds left standing still (grazing, looking around) before going on.
  private pause = 0;
  private last = 0;
  private fleeing = 0; // seconds since it bolted; 0 while it wanders
  gone = false;

  // spriteKey is one of npc/*.png's basenames (see spritecook-assets-npc.json)
  // — optional so existing callers that haven't been given a matching sprite
  // yet just keep the plain colored rectangle.
  constructor(private readonly scene: Phaser.Scene, x: number, y: number, color: number, range: number, spriteKey?: string) {
    this.sprite = scene.add.rectangle(x, y, 12, 16, color).setStrokeStyle(1, 0x0b0c10) as WandererSprite;
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setSize(12, 16);
    this.sprite.body.setVelocityX(WANDER_SPEED);
    this.minX = x - range;
    this.maxX = x + range;
    if (spriteKey) {
      const key = `npc-${spriteKey}`;
      void attachSpriteOverlay(scene, this.sprite, key, `${import.meta.env.BASE_URL}sprites/npc/${spriteKey}.png`, APPEARANCE_SIZE);
    }
  }

  // Bolts away from (x, y) and is gone a moment later (a startled animal).
  flee(fromX: number): void {
    if (this.fleeing) return;
    this.fleeing = 0.001;
    this.direction = this.sprite.x >= fromX ? 1 : -1;
    this.pause = 0;
  }

  update(): void {
    const now = this.scene.time.now;
    const dt = this.last ? Math.min(now - this.last, 100) / 1000 : 0;
    this.last = now;
    if (this.gone) return;
    if (this.fleeing) {
      this.fleeing += dt;
      this.sprite.body.setVelocityX(WANDER_SPEED * 5 * this.direction);
      syncSpriteOverlay(this.sprite, true);
      const fade = Math.max(0, 1 - Math.max(0, this.fleeing - 0.5) / 0.6);
      (this.sprite.getData('appearanceImage') as Phaser.GameObjects.Image | undefined)?.setAlpha(fade);
      (this.sprite.getData('shadow') as Phaser.GameObjects.Ellipse | undefined)?.setAlpha(fade);
      if (fade === 0) {
        this.gone = true;
        this.sprite.body.setVelocityX(0);
        this.sprite.body.enable = false;
      }
      return;
    }
    if (this.pause > 0) {
      this.pause -= dt;
      this.sprite.body.setVelocityX(0);
      syncSpriteOverlay(this.sprite, false);
      return;
    }
    const turn = (this.sprite.x <= this.minX && this.direction < 0) || (this.sprite.x >= this.maxX && this.direction > 0);
    if (turn) this.direction = this.direction > 0 ? -1 : 1;
    // Nobody paces like a pendulum: a stop at each end, now and then
    // midway.
    if (turn || Math.random() < dt * 0.15) {
      this.pause = 1 + Math.random() * 3;
      this.sprite.body.setVelocityX(0);
      syncSpriteOverlay(this.sprite, false);
      return;
    }
    this.sprite.body.setVelocityX(WANDER_SPEED * this.direction);
    syncSpriteOverlay(this.sprite, true);
  }
}
