import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 400;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment.
const WORLD_HEIGHT = 400;
const CHEST_ID = 'sunkenroad_chest_1';
const MIN_ENCOUNTER_DISTANCE = 220;
const MAX_ENCOUNTER_DISTANCE = 400;

const REFUGEE_LINES = [
  "Vasenoire n'est plus très loin. Suivez les passerelles, ne vous écartez pas — le fond a disparu depuis longtemps par ici.",
  'Les Limaneux contrôlent ce qui reste de terre ferme. Mieux vaut ne pas leur chercher noise.',
  "On raconte que des étrangers armés fouillent les ruines englouties depuis des mois. Personne ne sait pour le compte de qui.",
];

// Purely decorative — half-sunken ruins poking out of the water, no
// collision, no real art yet (increment 10).
const RUINS: { x: number; y: number }[] = [
  { x: 80, y: 90 },
  { x: 140, y: 60 },
  { x: 300, y: 340 },
  { x: 260, y: 370 },
  { x: 190, y: 250 },
  { x: 230, y: 100 },
];

interface SunkenRoadData {
  x?: number;
  y?: number;
}

// Première zone des Terres Noyées (Acte 2) — au-delà du Relais des
// chasseurs, plus aucune route entretenue : juste des passerelles de fortune
// entre les ruines à moitié englouties. Rencontres aléatoires façon Route
// fluviale, avec bog_wraith comme première identité de menace de la région.
export class SunkenRoadScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private refugee!: Wanderer;
  private refugeeLineIndex = 0;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('SunkenRoad');
  }

  init(data: SunkenRoadData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#2a3a3a');

    RUINS.forEach((ruin) => this.add.rectangle(ruin.x, ruin.y, 22, 16, 0x2e3a38).setStrokeStyle(1, 0x141c1c));
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 40, 280, 34, 0x1f3a3f).setStrokeStyle(1, 0x0f1e20);

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 60, ['← Relais des chasseurs', '→ Vasenoire']);

    // Ambient refugee, clear of the signpost and the water patch.
    this.refugee = new Wanderer(this, 90, 200, 0x7a7a6a, 25);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    this.physics.add.collider(this.player, this.refugee.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('HunterOutpost', { x: 200, y: 150 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('Vasenoire', { x: 40, y: 150 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Relais', { fontSize: '10px', color: '#9aa0a6' }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Vasenoire →', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(350, 100, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);

    // Local const (not `this.refugee.sprite` inline) so the getters below
    // are plain closures — an object literal's get x()/get y() would
    // otherwise bind `this` to the literal itself, not the scene.
    const refugeeSprite = this.refugee.sprite;
    const interactables: Interactable[] = [
      {
        get x() {
          return refugeeSprite.x;
        },
        get y() {
          return refugeeSprite.y;
        },
        radius: 20,
        onTap: () => this.talkToRefugee(),
      },
      { x: this.chest.x, y: this.chest.y, radius: 20, onTap: () => this.handleChestTap() },
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'SunkenRoad',
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
    this.refugee.update();

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
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'SunkenRoad',
        monsterId: 'bog_wraith',
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private talkToRefugee(): void {
    const line = REFUGEE_LINES[this.refugeeLineIndex % REFUGEE_LINES.length];
    this.refugeeLineIndex += 1;
    this.showMessage(line);
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID);
    this.chest.setFillStyle(0x3a3428);
    await SaveManager.saveCharacter(this.character);
    if (loot) {
      playChestOpen();
      this.showMessage(chestLootMessage(loot));
    }
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

    this.time.delayedCall(2200, () => {
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
