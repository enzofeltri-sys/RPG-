import Phaser from 'phaser';
import { MoveTarget, PlayerSprite } from '../entities/player';

const DEFAULT_RADIUS = 20;
const STUCK_TIMEOUT_MS = 500;
const STUCK_DISTANCE = 1;

export interface Interactable {
  x: number;
  y: number;
  radius?: number;
  onTap: () => void;
}

// Replaces the old joystick + "Action" button: tap empty ground to walk
// there, tap an NPC/object to trigger it directly (and walk toward it for
// visual continuity). No real pathfinding — a target hidden behind an
// obstacle just has the player push against it, so a short stuck-timer
// silently drops the target instead of leaving the player grinding into a
// wall forever.
export class TapController {
  private moveTarget: MoveTarget | null = null;
  private enabled = true;
  private interactables: Interactable[] = [];
  private lastCheckPos: { x: number; y: number } | null = null;
  private stuckTime = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerSprite,
  ) {
    scene.input.on('pointerdown', this.handlePointerDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
  }

  setInteractables(list: Interactable[]): void {
    this.interactables = list;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.moveTarget = null;
  }

  getMoveTarget(): MoveTarget | null {
    return this.moveTarget;
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
  }

  // Call once per frame from the scene's update(), after applying movement
  // for this frame via updatePlayerMovement.
  update(delta: number): void {
    if (!this.moveTarget) {
      this.stuckTime = 0;
      this.lastCheckPos = null;
      return;
    }

    if (!this.lastCheckPos) {
      this.lastCheckPos = { x: this.player.x, y: this.player.y };
      return;
    }

    const moved = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastCheckPos.x, this.lastCheckPos.y);
    if (moved < STUCK_DISTANCE) {
      this.stuckTime += delta;
      if (this.stuckTime > STUCK_TIMEOUT_MS) {
        this.moveTarget = null;
        this.stuckTime = 0;
        return;
      }
    } else {
      this.stuckTime = 0;
    }
    this.lastCheckPos = { x: this.player.x, y: this.player.y };
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.enabled) return;
    // A tap that landed on an interactive UI object (Menu, dialog buttons...)
    // is that object's business, not a world tap.
    if (this.scene.input.hitTestPointer(pointer).length > 0) return;

    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const hit = this.interactables.find(
      (t) => Phaser.Math.Distance.Between(world.x, world.y, t.x, t.y) < (t.radius ?? DEFAULT_RADIUS),
    );

    if (hit) {
      this.moveTarget = { x: hit.x, y: hit.y };
      hit.onTap();
      return;
    }

    this.moveTarget = { x: world.x, y: world.y };
  };

  private destroy = (): void => {
    this.scene.input.off('pointerdown', this.handlePointerDown);
  };
}
