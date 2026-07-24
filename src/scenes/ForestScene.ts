import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 400;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const MIN_ENCOUNTER_DISTANCE = 200;
const MAX_ENCOUNTER_DISTANCE = 380;
const FOREST_MONSTERS = ['corrupted_wolf', 'goblin_scout'];

// Deliberately dense — a forest reads as a forest mostly through decoration
// density, not layout. No collision on any of it (see DESIGN.md's note on
// narrow-gap pathing bugs) — real art comes in increment 10.
const TREES: { x: number; y: number }[] = [
  { x: 60, y: 40 },
  { x: 120, y: 90 },
  { x: 60, y: 220 },
  { x: 140, y: 250 },
  { x: 260, y: 50 },
  { x: 320, y: 100 },
  { x: 340, y: 230 },
  { x: 270, y: 260 },
  { x: 90, y: 150 },
  { x: 310, y: 160 },
  { x: 30, y: 100 },
  { x: 180, y: 40 },
  { x: 370, y: 60 },
  { x: 380, y: 190 },
  { x: 220, y: 280 },
  { x: 60, y: 280 },
  { x: 100, y: 350 },
  { x: 300, y: 340 },
  { x: 200, y: 380 },
  { x: 40, y: 370 },
  { x: 360, y: 380 },
];

const MUSHROOMS: { x: number; y: number }[] = [
  { x: 100, y: 60 },
  { x: 250, y: 190 },
  { x: 160, y: 130 },
  { x: 330, y: 260 },
];

interface ForestData {
  x?: number;
  y?: number;
}

export class ForestScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private deer!: Wanderer;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Forest');
  }

  init(data: ForestData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#24401f');

    TREES.forEach((tree) => this.add.circle(tree.x, tree.y, 11, 0x1a3016).setStrokeStyle(1, 0x0e1c0b));
    MUSHROOMS.forEach((m) => this.add.circle(m.x, m.y, 4, 0xb5602a).setStrokeStyle(1, 0x5a2e10));

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, ['← Champ', '→ Grotte', '↑ Camp de gobelins']);

    // A shy bit of wildlife — clear of both zones and the signpost.
    this.deer = new Wanderer(this, 150, 220, 0x9a7a52, 35);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    this.physics.add.collider(this.player, this.deer.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('Field', { x: 440, y: 340 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('Cave', { x: 100, y: 360 }));

    // Optional detour, a branch off the main west-east road.
    const goblinCampZone = this.add.zone(200, 10, 100, 20);
    this.physics.add.existing(goblinCampZone, true);
    this.physics.add.overlap(this.player, goblinCampZone, () => this.leaveTo('GoblinCamp', { x: 130, y: 180 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Champ', { fontSize: '10px', color: '#9aa0a6' }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Grotte →', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);
    addCrispText(this, 200, 30, 'Camp de gobelins ↑', {
      fontSize: '9px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);

    // Local const (not `this.deer.sprite` inline) so the getters below are
    // plain closures — an object literal's get x()/get y() would otherwise
    // bind `this` to the literal itself, not the scene.
    const deerSprite = this.deer.sprite;
    const interactables: Interactable[] = [
      {
        get x() {
          return deerSprite.x;
        },
        get y() {
          return deerSprite.y;
        },
        radius: 18,
        onTap: () => this.showMessage('Un cerf détale dans les fourrés.'),
      },
    ];
    this.tapControl.setInteractables(interactables);

    // A zone overlap can fire and call scene.start() while this load is still
    // pending (Arcade Physics keeps ticking regardless of async create()'s
    // progress) — if that happened, this scene has already been stopped by
    // the time we get here, and touching it further corrupts Phaser's
    // collider state on the next physics step. Bail out instead.
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      new CharacterSheetPanel(
        this,
        save.character,
        'Forest',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.tapControl.setEnabled(!open);
        },
      );
    }
  }

  update(_time: number, delta: number): void {
    const arrived = !updatePlayerMovement(this.player, this.cursors, this.tapControl.getMoveTarget());
    if (arrived) this.tapControl.clearMoveTarget();
    this.tapControl.update(delta);
    this.deer.update();

    if (this.isTransitioning) return;

    const speed = this.player.body.velocity.length();
    if (speed > 0) {
      this.distanceWalked += (speed * delta) / 1000;
      if (this.distanceWalked >= this.encounterThreshold) {
        this.startEncounter();
      }
    }
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  private startEncounter(): void {
    this.isTransitioning = true;
    const monsterId = Phaser.Utils.Array.GetRandom(FOREST_MONSTERS);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'Forest', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  private showMessage(message: string): void {
    this.messageText?.destroy();
    this.messageText = addCrispText(this, this.scale.width / 2, 30, message, {
      fontSize: '10px',
      color: '#e8d9b5',
      backgroundColor: '#0b0c10',
      padding: { x: 8, y: 5 },
      align: 'center',
      wordWrap: { width: this.scale.width - 20 },
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.time.delayedCall(1800, () => {
      this.messageText?.destroy();
      this.messageText = undefined;
    });
  }

  private leaveTo(sceneKey: string, data: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, data);
    });
  }
}
