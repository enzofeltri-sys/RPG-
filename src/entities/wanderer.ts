import Phaser from 'phaser';
import { attachSpriteOverlay, syncSpriteOverlay } from './spriteOverlay';

const WANDER_SPEED = 18;
const APPEARANCE_SIZE = 24;

export type WandererSprite = Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };

// A small NPC that wanders about its spot — pure ambiance (villagers,
// animals, travelers) to make a location read as lived-in rather than a
// static backdrop. It strolls to a point of its area, stops a moment
// (grazing, looking around), picks another. No dialogue system of its
// own: the caller wires up tap interaction via TapController same as any
// other NPC, using getters for x/y so the hit-test always reads the
// sprite's current (moving) position.
export class Wanderer {
  readonly sprite: WandererSprite;
  private readonly area: Phaser.Geom.Rectangle;
  private target: Phaser.Math.Vector2;
  // Seconds left standing still before going on.
  private pause = 0;
  private stuck = 0;
  private last = 0;
  private fleeing = 0; // seconds since it bolted; 0 while it wanders
  private fleeDir = 1;
  gone = false;

  // The area is range to either side of (x, y), rangeY above and below
  // (0: a back-and-forth along one line). spriteKey is one of npc/*.png's
  // basenames or a look drawn by the game.
  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    color: number,
    range: number,
    spriteKey?: string,
    rangeY = 0,
  ) {
    this.sprite = scene.add.rectangle(x, y, 12, 16, color).setStrokeStyle(1, 0x0b0c10) as WandererSprite;
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setSize(12, 16);
    this.area = new Phaser.Geom.Rectangle(x - range, y - rangeY, range * 2, rangeY * 2);
    this.target = new Phaser.Math.Vector2(x, y);
    this.pause = Math.random() * 2;
    if (spriteKey) {
      const key = `npc-${spriteKey}`;
      void attachSpriteOverlay(scene, this.sprite, key, `${import.meta.env.BASE_URL}sprites/npc/${spriteKey}.png`, APPEARANCE_SIZE);
    }
  }

  // Bolts away from x and is gone a moment later (a startled animal).
  flee(fromX: number): void {
    if (this.fleeing) return;
    this.fleeing = 0.001;
    this.fleeDir = this.sprite.x >= fromX ? 1 : -1;
    this.pause = 0;
  }

  private pickTarget(): void {
    const { x, y } = this.sprite;
    // Somewhere else in the area, not just a step away.
    for (let i = 0; i < 6; i++) {
      const p = this.area.getRandomPoint();
      if (Math.hypot(p.x - x, p.y - y) > Math.min(14, this.area.width / 2)) {
        this.target.set(p.x, p.y);
        return;
      }
    }
    this.target.set(this.area.centerX, this.area.centerY);
  }

  private stand(): void {
    this.sprite.body.setVelocity(0, 0);
    syncSpriteOverlay(this.sprite, false);
  }

  update(): void {
    const now = this.scene.time.now;
    const dt = this.last ? Math.min(now - this.last, 100) / 1000 : 0;
    this.last = now;
    if (this.gone) return;
    if (this.fleeing) {
      this.fleeing += dt;
      this.sprite.body.setVelocity(WANDER_SPEED * 5 * this.fleeDir, 0);
      syncSpriteOverlay(this.sprite, true);
      const fade = Math.max(0, 1 - Math.max(0, this.fleeing - 0.5) / 0.6);
      (this.sprite.getData('appearanceImage') as Phaser.GameObjects.Image | undefined)?.setAlpha(fade);
      (this.sprite.getData('shadow') as Phaser.GameObjects.Ellipse | undefined)?.setAlpha(fade);
      if (fade === 0) {
        this.gone = true;
        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.enable = false;
      }
      return;
    }
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) this.pickTarget();
      this.stand();
      return;
    }
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const d = Math.hypot(dx, dy);
    // Arrived, or held up (the hero in the way): stop, then go elsewhere.
    const speed = this.sprite.body.velocity.length();
    this.stuck = speed < WANDER_SPEED * 0.3 && this.last > 0 && d > 2 ? this.stuck + dt : 0;
    if (d < 2 || this.stuck > 1.2) {
      this.stuck = 0;
      this.pause = 1 + Math.random() * 3;
      this.stand();
      return;
    }
    this.sprite.body.setVelocity((dx / d) * WANDER_SPEED, (dy / d) * WANDER_SPEED);
    syncSpriteOverlay(this.sprite, true);
  }
}
