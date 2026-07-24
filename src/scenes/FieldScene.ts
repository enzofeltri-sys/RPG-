import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { materialLabel, MaterialId } from '../game/material';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 480;
const MIN_ENCOUNTER_DISTANCE = 220;
const MAX_ENCOUNTER_DISTANCE = 420;
const INTERACT_RADIUS = 60;

// The river splits the Champ roughly in half; only the bridge gap is
// crossable, so reaching the dungeon (north bank) takes a real detour from
// the hamlet/town side (south bank) instead of a straight walk.
const RIVER_Y = 192;
const RIVER_HEIGHT = 24;
const BRIDGE_X = 240;
const BRIDGE_WIDTH = 80;

interface GatherNode {
  x: number;
  y: number;
  materialId: MaterialId;
  label: string;
}

const GATHER_NODES: GatherNode[] = [
  { x: 90, y: 380, materialId: 'iron_ore', label: 'Gisement de fer' },
  { x: 350, y: 400, materialId: 'herb', label: 'Herbes sauvages' },
];

// Purely decorative — no collision, no real art yet (increment 10). Just
// enough visual density that the Champ doesn't read as an empty box.
const TREES: { x: number; y: number }[] = [
  { x: 50, y: 60 },
  { x: 420, y: 60 },
  { x: 330, y: 100 },
  { x: 60, y: 260 },
  { x: 430, y: 260 },
  { x: 300, y: 260 },
  { x: 150, y: 440 },
];

const ROCKS: { x: number; y: number }[] = [
  { x: 150, y: 90 },
  { x: 240, y: 140 },
  { x: 180, y: 320 },
  { x: 400, y: 440 },
];

interface FieldData {
  x?: number;
  y?: number;
}

export class FieldScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private spawnX?: number;
  private spawnY?: number;
  private character!: Character;
  private actionButton!: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;

  constructor() {
    super('Field');
  }

  init(data: FieldData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#3a5a3a');

    this.drawDecorations();

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.addRiver();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const hamletZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(hamletZone, true);
    this.physics.add.overlap(this.player, hamletZone, () => this.returnToHamlet());

    const dungeonZone = this.add.zone(WORLD_WIDTH / 2, 10, WORLD_WIDTH, 20);
    this.physics.add.existing(dungeonZone, true);
    this.physics.add.overlap(this.player, dungeonZone, () => this.enterDungeon());

    const forestZone = this.add.zone(WORLD_WIDTH - 10, 340, 20, 140);
    this.physics.add.existing(forestZone, true);
    this.physics.add.overlap(this.player, forestZone, () => this.enterForest());

    addCrispText(this, WORLD_WIDTH / 2, 30, 'Repaire du Loup ↑', {
      fontSize: '11px',
      color: '#e8d9b5',
      align: 'center',
    }).setOrigin(0.5);

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Retour au hameau ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    addCrispText(this, WORLD_WIDTH - 20, 340, 'Forêt →', {
      fontSize: '10px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);

    // Crossroads landmark near the bridge, the natural meeting point of the
    // three roads (hameau/Repaire du Loup/Forêt vers Valombre).
    addSignpost(this, BRIDGE_X + BRIDGE_WIDTH / 2, RIVER_Y + 50, [
      '↓ Basse-Combe',
      '↑ Repaire du Loup',
      '→ Forêt (vers Valombre)',
    ]);

    GATHER_NODES.forEach((node) => {
      this.add.rectangle(node.x, node.y, 16, 16, 0x6b5a3a).setStrokeStyle(1, 0x0b0c10);
      addCrispText(this, node.x, node.y - 16, node.label, { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    });

    this.actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      new CharacterSheetPanel(
        this,
        save.character,
        'Field',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.joystick.setEnabled(!open);
          this.actionButton.input!.enabled = !open;
        },
      );
    }
  }

  update(_time: number, delta: number): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);

    if (this.isTransitioning) return;

    const speed = this.player.body.velocity.length();
    if (speed > 0) {
      this.distanceWalked += (speed * delta) / 1000;
      if (this.distanceWalked >= this.encounterThreshold) {
        this.startEncounter();
      }
    }
  }

  private drawDecorations(): void {
    TREES.forEach((tree) => this.add.circle(tree.x, tree.y, 10, 0x24401f).setStrokeStyle(1, 0x162a13));
    ROCKS.forEach((rock) => this.add.rectangle(rock.x, rock.y, 14, 10, 0x5a5a52).setStrokeStyle(1, 0x35352f));
  }

  private addRiver(): void {
    const color = 0x2e5a7a;
    const rightWidth = WORLD_WIDTH - BRIDGE_X - BRIDGE_WIDTH;

    const leftRiver = this.add
      .rectangle(BRIDGE_X / 2, RIVER_Y, BRIDGE_X, RIVER_HEIGHT, color)
      .setStrokeStyle(1, 0x1a3a50);
    this.physics.add.existing(leftRiver, true);
    this.physics.add.collider(this.player, leftRiver);

    const rightRiver = this.add
      .rectangle(BRIDGE_X + BRIDGE_WIDTH + rightWidth / 2, RIVER_Y, rightWidth, RIVER_HEIGHT, color)
      .setStrokeStyle(1, 0x1a3a50);
    this.physics.add.existing(rightRiver, true);
    this.physics.add.collider(this.player, rightRiver);

    this.add
      .rectangle(BRIDGE_X + BRIDGE_WIDTH / 2, RIVER_Y, BRIDGE_WIDTH, RIVER_HEIGHT, 0x6b4a2f)
      .setStrokeStyle(1, 0x2e1f14);
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  private startEncounter(): void {
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'Field', x: this.player.x, y: this.player.y });
    });
  }

  private returnToHamlet(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Hamlet', { x: 120, y: 40 });
    });
  }

  private enterDungeon(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Dungeon');
    });
  }

  private enterForest(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Forest', { x: 40, y: 150 });
    });
  }

  private distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
  }

  private handleAction(): void {
    const node = GATHER_NODES.find((n) => this.distanceTo(n.x, n.y) < INTERACT_RADIUS);
    if (node) {
      this.gather(node);
      return;
    }

    this.showMessage('Rien à proximité.');
  }

  private async gather(node: GatherNode): Promise<void> {
    this.character.materials[node.materialId] = (this.character.materials[node.materialId] ?? 0) + 1;
    await SaveManager.saveCharacter(this.character);
    this.showMessage(`+1 ${materialLabel(node.materialId)}`);
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
}
