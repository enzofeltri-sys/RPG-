import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const CHEST_ID = 'cave_chest_1';

// Wide enough to fill the portrait canvas (216px) at every camera position —
// see HamletScene's WORLD_HEIGHT comment for why a narrower world leaves a
// black band down the side of the screen.
const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 400;

interface EncounterMarker {
  id: string;
  x: number;
  y: number;
  label: string;
}

// A short passage rather than a full dungeon (no gate, no boss) — the last
// leg of the road into Valombre, made to feel a bit more dangerous than the
// Champ/Forêt's random encounters via two fixed fights instead of chance.
const ENCOUNTERS: EncounterMarker[] = [
  { id: 'spiders_1', x: WORLD_WIDTH / 2, y: 280, label: 'Araignées' },
  { id: 'spiders_2', x: WORLD_WIDTH / 2, y: 150, label: 'Araignées' },
];

const ROCKS: { x: number; y: number }[] = [
  { x: 30, y: 340 },
  { x: 170, y: 320 },
  { x: 40, y: 220 },
  { x: 160, y: 200 },
  { x: 30, y: 90 },
  { x: 170, y: 60 },
  { x: 45, y: 380 },
  { x: 155, y: 380 },
  { x: 45, y: 20 },
  { x: 155, y: 20 },
];

// A little glow in the dark — purely decorative, no collision, no real art
// yet (increment 10).
const CRYSTALS: { x: number; y: number }[] = [
  { x: 55, y: 300 },
  { x: 150, y: 250 },
  { x: 55, y: 180 },
  { x: 145, y: 110 },
  { x: 60, y: 50 },
];

// A single vent off to the side, clear of the central corridor (ENCOUNTERS
// sit at x=110) and the chest (170,240) — no collision, same reasoning as
// every other purely decorative element here (a lava-shaped gap in the
// walkable path is exactly the narrow-gap pathing bug DESIGN.md warns
// about).
const LAVA_POOL = { x: 175, y: 105 };

interface CaveData {
  // Set by CombatScene (via returnSceneStartData) when handing control back
  // after a fled/won fight, or by the Menu overlay — distinguishes
  // "returning mid-run" from a genuine fresh entry via Forêt/Valombre. Without
  // this, a fled fight's encounter zone respawns right under the player and
  // retriggers instantly (Phaser reuses the same scene instance across
  // scene.start() calls, so create() reruns and re-adds it every time).
  resume?: boolean;
  x?: number;
  y?: number;
}

export class CaveScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private clearedEncounterIds = new Set<string>();
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Cave');
  }

  init(data: CaveData): void {
    if (!data?.resume) {
      this.clearedEncounterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#20202a');

    ROCKS.forEach((rock) => {
      const shape = this.add.rectangle(rock.x, rock.y, 18, 12, 0x35353f).setStrokeStyle(1, 0x18181c);
      void attachSpriteOverlay(this, shape, 'decor-rock_small', `${import.meta.env.BASE_URL}sprites/decor/rock_small.png`, 18);
    });
    CRYSTALS.forEach((c) => {
      const shape = this.add.circle(c.x, c.y, 5, 0x5a8ac5, 0.8).setStrokeStyle(1, 0x2e4a6a);
      void attachSpriteOverlay(this, shape, 'decor-crystal_glow', `${import.meta.env.BASE_URL}sprites/decor/crystal_glow.png`, 14);
    });
    const lavaShape = this.add.circle(LAVA_POOL.x, LAVA_POOL.y, 14, 0xb54a1a).setStrokeStyle(1, 0x5a2410);
    this.add.circle(LAVA_POOL.x, LAVA_POOL.y, 7, 0xe8a020, 0.9);
    void attachSpriteOverlay(this, lavaShape, 'decor-lava_pool', `${import.meta.env.BASE_URL}sprites/decor/lava_pool.png`, 28);
    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 40, ['↓ Forêt', '↑ Valombre']);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    ENCOUNTERS.filter((e) => !this.clearedEncounterIds.has(e.id)).forEach((encounter) =>
      this.addEncounterZone(encounter),
    );

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const southZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(southZone, true);
    this.physics.add.overlap(this.player, southZone, () => this.leaveTo('Forest', { x: 360, y: 150 }));

    const northZone = this.add.zone(WORLD_WIDTH / 2, 10, WORLD_WIDTH, 20);
    this.physics.add.existing(northZone, true);
    this.physics.add.overlap(this.player, northZone, () => this.leaveTo('Village', { x: 240, y: 60 }));

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH / 2, 22, 'Valombre ↑', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(170, 240, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);
    void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_closed', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_closed.png`, 16);
    const interactables: Interactable[] = [
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
        void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'Cave',
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
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add.rectangle(encounter.x, encounter.y, 26, 26, 0x4a2a4a, 0.8).setStrokeStyle(1, 0x0b0c10);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      color: '#e8d9b5',
    }).setOrigin(0.5);

    const zone = this.add.zone(encounter.x, encounter.y, 26, 26);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
      zone.destroy();
      this.clearedEncounterIds.add(encounter.id);
      this.startCombat();
    });
  }

  private startCombat(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'Cave',
        monsterId: 'cave_spider',
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'Cave');
    this.chest.setFillStyle(0x3a3428);
    void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
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
