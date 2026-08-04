import Phaser from 'phaser';
import { MoveTarget, PlayerSprite, SPEED } from '../entities/player';

const DEFAULT_RADIUS = 20;
// How much closer to the target counts as "real" progress, as opposed to
// jitter/noise while sliding along an obstacle's edge — using raw
// no-movement-at-all as the stuck signal (the old approach) meant sideways
// drift back toward the target's column read as progress even while stuck
// dead against the same wall, which is exactly the case that most needs
// detecting (a target directly behind an obstacle).
const PROGRESS_EPSILON = 2;
// Below this, we're pushing straight into an obstacle rather than just
// walking slowly — short enough that a real dead-end (target on the far
// side of a house) gets noticed quickly instead of the player visibly
// grinding into the wall for half a second first.
const STUCK_SIDESTEP_MS = 200;
// Escalating step lengths: a narrow obstacle clears on the first, wider
// ones need the later, longer attempts. Bounded so a target that's
// genuinely unreachable (fully enclosed, or the scene has no way around)
// fails fast instead of shuffling forever.
const SIDESTEP_DURATIONS_MS = [400, 700, 1000, 1400, 1800];

export interface Interactable {
  x: number;
  y: number;
  radius?: number;
  onTap: () => void;
}

// Replaces the old joystick + "Action" button: tap empty ground to walk
// there, tap an NPC/object to walk toward it and trigger it on arrival. No
// real pathfinding, but a target on the far side of an obstacle no longer
// just grinds the player into it forever either — see maybeSidestep().
export class TapController {
  private moveTarget: MoveTarget | null = null;
  private enabled = true;
  private interactables: Interactable[] = [];
  private stuckTime = 0;
  // Closest distance-to-target achieved so far this trip — the yardstick
  // for "stuck", instead of raw per-frame displacement (see
  // PROGRESS_EPSILON above).
  private bestDistance = Infinity;
  // Set on tap, fired once the player is actually within range instead of
  // the instant it's tapped — otherwise e.g. a chest visibly opens before
  // the character has walked anywhere near it.
  private pendingInteractable: Interactable | null = null;
  // While set, update() drives the body directly (pure sideways motion)
  // instead of letting updatePlayerMovement's straight-line-to-target
  // velocity stand, so the player actually slides along whatever they're
  // stuck against instead of the direct vector cancelling itself back out.
  private sidestep: { axis: 'x' | 'y'; sign: 1 | -1; elapsed: number } | null = null;
  // Committed for the whole obstacle encounter once picked — re-deciding it
  // from the live direction to target on every attempt is what caused the
  // player to oscillate back into the very obstacle it was trying to clear
  // whenever the target sits roughly behind the obstacle's center.
  private sidestepSign: 1 | -1 | null = null;
  private sidestepAttempts = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: PlayerSprite,
  ) {
    scene.input.on('pointerdown', this.handlePointerDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
  }

  setInteractables(list: Interactable[]): void {
    this.interactables = list;
    this.warnOnOverlaps(list);
  }

  // handlePointerDown resolves a tap to the FIRST interactable within its
  // radius (Array.find, order-dependent) — two interactables placed close
  // enough that their radii overlap means the second one silently becomes
  // untappable wherever the radii intersect. Nothing stops a scene from
  // introducing that by accident, so this warns in the console the moment
  // it happens instead of relying on a manual audit to catch it. Dev-only
  // signal, not a correctness fix: it doesn't change which one wins.
  private warnOnOverlaps(list: Interactable[]): void {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const minDistance = (a.radius ?? DEFAULT_RADIUS) + (b.radius ?? DEFAULT_RADIUS);
        if (Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) < minDistance) {
          console.warn(
            `[TapController] Interactables ${i} and ${j} in scene "${this.scene.scene.key}" overlap ` +
              `(distance ${Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y).toFixed(1)}px < combined radius ${minDistance}px) — ` +
              'a tap in the overlap always resolves to the first one.',
          );
        }
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.moveTarget = null;
      this.pendingInteractable = null;
      this.resetObstacleState();
    }
  }

  getMoveTarget(): MoveTarget | null {
    return this.moveTarget;
  }

  clearMoveTarget(): void {
    this.moveTarget = null;
    this.pendingInteractable = null;
    this.resetObstacleState();
  }

  private resetObstacleState(): void {
    this.sidestep = null;
    this.sidestepSign = null;
    this.sidestepAttempts = 0;
    this.stuckTime = 0;
    this.bestDistance = Infinity;
  }

  // Call once per frame from the scene's update(), after applying movement
  // for this frame via updatePlayerMovement — this may overwrite that
  // frame's velocity again when a sidestep is in progress (see below).
  update(delta: number): void {
    if (this.pendingInteractable) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        this.pendingInteractable.x,
        this.pendingInteractable.y,
      );
      if (distance < (this.pendingInteractable.radius ?? DEFAULT_RADIUS)) {
        const interactable = this.pendingInteractable;
        this.pendingInteractable = null;
        this.moveTarget = null;
        this.resetObstacleState();
        interactable.onTap();
        return;
      }
    }

    if (!this.moveTarget) {
      this.resetObstacleState();
      return;
    }

    if (this.sidestep) {
      this.runSidestep(delta);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
    if (distance < this.bestDistance - PROGRESS_EPSILON) {
      // Genuinely closing in on the target — not just sideways drift while
      // still pinned against the same obstacle.
      this.bestDistance = distance;
      this.stuckTime = 0;
      this.sidestepSign = null;
      this.sidestepAttempts = 0;
      return;
    }

    this.stuckTime += delta;
    if (this.stuckTime > STUCK_SIDESTEP_MS) {
      this.stuckTime = 0;
      if (!this.beginSidestep()) {
        // Tried going around a few times and still can't make progress —
        // treat it as unreachable rather than shuffling forever.
        this.moveTarget = null;
        this.pendingInteractable = null;
        this.resetObstacleState();
      }
    }
  }

  // Picks a direction perpendicular to whichever way the body actually
  // collided, and commits to that SAME side for every attempt on this
  // obstacle (only the step length grows) — re-deriving the direction from
  // "which side is the target on" on every attempt is what caused the
  // player to oscillate back into the obstacle whenever the target sits
  // roughly behind its center, since that direction is by definition still
  // blocked.
  private beginSidestep(): boolean {
    if (this.sidestepAttempts >= SIDESTEP_DURATIONS_MS.length || !this.moveTarget) return false;

    const blocked = this.player.body.blocked;
    let axis: 'x' | 'y' | null = null;
    if (blocked.left || blocked.right) axis = 'y';
    else if (blocked.up || blocked.down) axis = 'x';
    if (!axis) {
      // Not actually blocked against anything solid (e.g. genuinely too
      // slow to register progress) — nothing to route around, so this
      // doesn't count as an attempt; let normal steering keep trying.
      return false;
    }

    if (this.sidestepSign === null) {
      // First encounter with this obstacle: arbitrary but consistent
      // default (blocked.right/down means we approached from the
      // negative side, so try the "start" direction of the free axis
      // first — as good a default as any without real obstacle geometry).
      this.sidestepSign = 1;
    }

    this.sidestepAttempts += 1;
    this.sidestep = { axis, sign: this.sidestepSign, elapsed: 0 };
    return true;
  }

  private runSidestep(delta: number): void {
    if (!this.sidestep) return;
    this.sidestep.elapsed += delta;

    const vx = this.sidestep.axis === 'x' ? this.sidestep.sign * SPEED : 0;
    const vy = this.sidestep.axis === 'y' ? this.sidestep.sign * SPEED : 0;
    this.player.body.setVelocity(vx, vy);

    const duration = SIDESTEP_DURATIONS_MS[this.sidestepAttempts - 1];
    if (this.sidestep.elapsed >= duration) {
      this.sidestep = null;
      // Fresh window to judge whether normal steering is making progress
      // again now that we've (hopefully) cleared the obstacle's edge —
      // re-baseline against the current distance rather than the one from
      // before the sidestep, which the sidestep itself may not have
      // improved on directly (it moved sideways, not toward the target).
      this.stuckTime = 0;
      if (this.moveTarget) {
        this.bestDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.moveTarget.x, this.moveTarget.y);
      }
    }
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
    this.resetObstacleState();

    if (hit) {
      this.moveTarget = { x: hit.x, y: hit.y };
      // Fires from update() once the player is actually within range —
      // already-in-range taps resolve on the very next frame.
      this.pendingInteractable = hit;
      return;
    }

    this.pendingInteractable = null;
    this.moveTarget = { x: world.x, y: world.y };
  };

  private destroy = (): void => {
    this.scene.input.off('pointerdown', this.handlePointerDown);
  };
}
