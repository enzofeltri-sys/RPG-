import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
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
const CHEST_ID = 'riverroad_chest_1';
const MIN_ENCOUNTER_DISTANCE = 220;
const MAX_ENCOUNTER_DISTANCE = 400;

const FISHERMAN_LINES = [
  "Les marais commencent juste après ce relais. Ne quittez pas le chemin.",
  'On dit que la forêt profonde débute de l\'autre côté des marécages.',
  "Les serpents ne sont pas méchants, tant qu'on ne marche pas dessus.",
];

// Purely decorative — reed patches along the water's edge, no collision, no
// real art yet (increment 10).
const REEDS: { x: number; y: number }[] = [
  { x: 70, y: 80 },
  { x: 110, y: 60 },
  { x: 320, y: 340 },
  { x: 280, y: 360 },
  { x: 180, y: 260 },
  { x: 220, y: 90 },
];

interface RiverRoadData {
  x?: number;
  y?: number;
}

// La "route fluviale" de VISION.md — premier pas hors d'Aiglemont vers la
// région 3 (forestière), accessible depuis le Faubourg des quais plutôt que
// depuis Aiglemont elle-même (les quatre côtés de la ville sont déjà pris).
// Rencontres aléatoires façon Route commerciale/Forêt, avec un nouveau
// monstre propre à ce biome (marsh_serpent) plutôt que de réutiliser un
// monstre existant — première identité de menace de la région 3.
export class RiverRoadScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private fisherman!: Wanderer;
  private fishermanLineIndex = 0;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('RiverRoad');
  }

  init(data: RiverRoadData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#38493a');

    REEDS.forEach((reed) => this.add.circle(reed.x, reed.y, 6, 0x2e5a3a).setStrokeStyle(1, 0x14301c));
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 40, 260, 30, 0x2a4a5a).setStrokeStyle(1, 0x142530);

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 60, ['← Faubourg des quais', '→ Relais des chasseurs']);

    // Ambient fisherman, clear of the signpost and the water patch.
    this.fisherman = new Wanderer(this, 90, 200, 0x6a8a9a, 25);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    this.physics.add.collider(this.player, this.fisherman.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('Faubourg', { x: 210, y: 200 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('HunterOutpost', { x: 40, y: 150 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Faubourg', { fontSize: '10px', color: '#9aa0a6' }).setOrigin(
      0.5,
    );
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Relais →', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // Local const (not `this.fisherman.sprite` inline) so the getters below
    // are plain closures — an object literal's get x()/get y() would
    // otherwise bind `this` to the literal itself, not the scene.
    this.chest = this.add.rectangle(350, 100, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);

    const fishermanSprite = this.fisherman.sprite;
    const interactables: Interactable[] = [
      {
        get x() {
          return fishermanSprite.x;
        },
        get y() {
          return fishermanSprite.y;
        },
        radius: 20,
        onTap: () => this.talkToFisherman(),
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
      await setPlayerAppearance(this, this.player, this.character.race, this.character.class);
      if (!this.scene.isActive()) return;
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'RiverRoad',
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
    this.fisherman.update();

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
        returnScene: 'RiverRoad',
        monsterId: 'marsh_serpent',
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private talkToFisherman(): void {
    const line = FISHERMAN_LINES[this.fishermanLineIndex % FISHERMAN_LINES.length];
    this.fishermanLineIndex += 1;
    this.showMessage(line);
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'RiverRoad');
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
