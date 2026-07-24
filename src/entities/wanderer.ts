import Phaser from 'phaser';

const WANDER_SPEED = 18;

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

  constructor(scene: Phaser.Scene, x: number, y: number, color: number, range: number) {
    this.sprite = scene.add.rectangle(x, y, 12, 16, color).setStrokeStyle(1, 0x0b0c10) as WandererSprite;
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setSize(12, 16);
    this.sprite.body.setVelocityX(WANDER_SPEED);
    this.minX = x - range;
    this.maxX = x + range;
  }

  update(): void {
    if (this.sprite.x <= this.minX) this.direction = 1;
    else if (this.sprite.x >= this.maxX) this.direction = -1;
    this.sprite.body.setVelocityX(WANDER_SPEED * this.direction);
  }
}
