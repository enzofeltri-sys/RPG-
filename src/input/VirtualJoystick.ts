import Phaser from 'phaser';

const BASE_RADIUS = 22;
const THUMB_RADIUS = 12;
const DEADZONE = 4;

export class VirtualJoystick {
  private readonly origin: { x: number; y: number };
  private activePointerId: number | null = null;
  private vector = { x: 0, y: 0 };
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly zone: Phaser.GameObjects.Zone;

  constructor(private readonly scene: Phaser.Scene) {
    const { width, height } = scene.scale;
    this.origin = { x: 44, y: height - 56 };

    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(1000);
    this.drawIdle();

    this.zone = scene.add
      .zone(0, height * 0.45, width * 0.55, height * 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive();

    this.zone.on('pointerdown', this.handlePointerDown);
    scene.input.on('pointermove', this.handlePointerMove);
    scene.input.on('pointerup', this.handlePointerUp);
    scene.input.on('pointerupoutside', this.handlePointerUp);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
  }

  getVector(): { x: number; y: number } {
    return this.vector;
  }

  // Disabled while a menu/panel overlay is open, since its invisible touch zone
  // (bottom-left ~55% of the screen) would otherwise intercept taps meant for
  // UI underneath it.
  setEnabled(enabled: boolean): void {
    this.zone.input!.enabled = enabled;
    if (!enabled) {
      this.activePointerId = null;
      this.vector = { x: 0, y: 0 };
      this.drawIdle();
    }
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (this.activePointerId !== null) return;
    this.activePointerId = pointer.id;
    this.updateFromPointer(pointer);
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.activePointerId) return;
    this.updateFromPointer(pointer);
  };

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.id !== this.activePointerId) return;
    this.activePointerId = null;
    this.vector = { x: 0, y: 0 };
    this.drawIdle();
  };

  private updateFromPointer(pointer: Phaser.Input.Pointer): void {
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const distance = Math.min(Math.hypot(dx, dy), BASE_RADIUS);
    const angle = Math.atan2(dy, dx);
    const thumbX = Math.cos(angle) * distance;
    const thumbY = Math.sin(angle) * distance;

    this.vector =
      distance > DEADZONE ? { x: thumbX / BASE_RADIUS, y: thumbY / BASE_RADIUS } : { x: 0, y: 0 };

    this.drawActive(thumbX, thumbY);
  }

  private drawIdle(): void {
    this.graphics.clear();
    this.graphics.fillStyle(0xe8d9b5, 0.25);
    this.graphics.fillCircle(this.origin.x, this.origin.y, BASE_RADIUS);
    this.graphics.fillStyle(0xe8d9b5, 0.5);
    this.graphics.fillCircle(this.origin.x, this.origin.y, THUMB_RADIUS);
  }

  private drawActive(thumbX: number, thumbY: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(0xe8d9b5, 0.35);
    this.graphics.fillCircle(this.origin.x, this.origin.y, BASE_RADIUS);
    this.graphics.fillStyle(0xe8d9b5, 0.75);
    this.graphics.fillCircle(this.origin.x + thumbX, this.origin.y + thumbY, THUMB_RADIUS);
  }

  private destroy = (): void => {
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerupoutside', this.handlePointerUp);
  };
}
