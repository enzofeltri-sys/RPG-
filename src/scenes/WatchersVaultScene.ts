import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone, placeBarrier } from '../world/zoneArt';
import { WATCHERS_VAULT } from '../world/zones/aiglemontDepths';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { showBanner } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const CHEST_ID = 'watchersvault_chest_1';

// Same gabarit "moyen" que les 14 donjons précédents — une voûte scellée
// plus profonde sous les Archives d'Aiglemont, jamais visitée depuis
// qu'Aldric et sa lignée n'en gardaient plus que le dicton. La première fois
// que l'Ordre des Veilleurs est nommé comme tel, pas seulement décrit.
// Palette parcheminée, distincte des dungeons précédents (pierre/froid), pour
// marquer un lieu construit plutôt que naturel ou ruiné.
const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 420;
const GATE_Y = 190;

interface EncounterMarker {
  monsterId: string;
  x: number;
  y: number;
  label: string;
}

const ENCOUNTERS: EncounterMarker[] = [
  { monsterId: 'archive_wisp', x: WORLD_WIDTH / 2, y: 320, label: 'Feux-follets des Veilleurs' },
  { monsterId: 'archive_wisp', x: WORLD_WIDTH / 2, y: 250, label: 'Feux-follets des Veilleurs' },
];

const BOSS_MONSTER_ID = 'last_watcher';

interface WatchersVaultData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay's Inventaire/Sac/Stats/Quêtes screens — distinguishes
  // "returning mid-run" from a genuine fresh entry via the Archives' hidden
  // passage.
  resume?: boolean;
  x?: number;
  y?: number;
}

export class WatchersVaultScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private clearedMonsterIds = new Set<string>();
  private gate?: Phaser.GameObjects.Rectangle;
  private gateCollider?: Phaser.Physics.Arcade.Collider;
  private gateArt?: Phaser.GameObjects.Image;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('WatchersVault');
  }

  init(data: WatchersVaultData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#332c22');


    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    // Ground, walls, decor and light drawn by the game (world/zones/aiglemontDepths.ts).
    const painted = paintZone(this, WATCHERS_VAULT);
    painted.follow(this.player);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    this.addShelves();
    const remaining = ENCOUNTERS.filter((e) => !this.clearedMonsterIds.has(e.monsterId + e.y));
    if (remaining.length > 0) {
      this.addGate();
      remaining.forEach((encounter) => this.addEncounterZone(encounter));
    }
    if (!this.clearedMonsterIds.has(BOSS_MONSTER_ID)) {
      this.addBossZone();
    }

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVault());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, '↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(170, 380, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);
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
      setPlayerAppearance(this, this.player, this.character);
      if (!this.scene.isActive()) return;
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
        void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'WatchersVault',
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

  private addShelves(): void {
    // Purely decorative, kept well clear of the center corridor (x=110) that
    // the encounters, gate, and boss zone all sit on.
    const shelf = (x: number, y: number, w: number, h: number) => {
      const rect = this.add.rectangle(x, y, w, h).setVisible(false);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect);
    };
    shelf(20, 360, 24, 60);
    shelf(WORLD_WIDTH - 20, 280, 24, 60);
    shelf(20, 140, 24, 60);
    shelf(WORLD_WIDTH - 20, 360, 24, 60);
  }

  private addGate(): void {
    this.gate = this.add.rectangle(WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH, 16).setVisible(false);
    this.gateArt = placeBarrier(this, 'rubble', WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH);
    this.physics.add.existing(this.gate, true);
    this.gateCollider = this.physics.add.collider(this.player, this.gate);
  }

  private openGateIfCleared(): void {
    if (this.clearedMonsterIds.size < ENCOUNTERS.length) return;
    this.gateCollider?.destroy();
    this.gate?.destroy();
    this.gateArt?.destroy();
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add
      .rectangle(encounter.x, encounter.y, 28, 28, 0x453c2e, 0.8)
      .setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, marker, `monster-${encounter.monsterId}`, `${import.meta.env.BASE_URL}sprites/monsters/${encounter.monsterId}.png`, 28);

    const zone = this.add.zone(encounter.x, encounter.y, 28, 28);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      zone.destroy();
      this.clearedMonsterIds.add(encounter.monsterId + encounter.y);
      this.openGateIfCleared();
      this.startCombat(encounter.monsterId);
    });
  }

  private addBossZone(): void {
    const x = WORLD_WIDTH / 2;
    const y = 70;
    const marker = this.add.rectangle(x, y, 50, 50, 0x201b12, 0.85).setStrokeStyle(2, 0xe8d9b5);
    void attachSpriteOverlay(this, marker, `monster-${BOSS_MONSTER_ID}`, `${import.meta.env.BASE_URL}sprites/monsters/${BOSS_MONSTER_ID}.png`, 40);

    const zone = this.add.zone(x, y, 50, 50);
    this.physics.add.existing(zone, true);
    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      this.clearedMonsterIds.add(BOSS_MONSTER_ID);
      this.startCombat(BOSS_MONSTER_ID);
    });
  }

  private startCombat(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'WatchersVault', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'WatchersVault');
    this.chest.setFillStyle(0x3a3428);
    void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
    await SaveManager.saveCharacter(this.character);
    if (loot) {
      playChestOpen();
      this.showMessage(chestLootMessage(loot));
    }
  }

  private showMessage(message: string): void {
    showBanner(this, message);
  }

  private leaveVault(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Archives', { x: 40, y: 58 });
    });
  }
}
