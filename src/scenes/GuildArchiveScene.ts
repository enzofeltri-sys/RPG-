import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone, placeBarrier } from '../world/zoneArt';
import { GUILD_ARCHIVE } from '../world/zones/aiglemontDepths';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { showBanner } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const CHEST_ID = 'guildarchive_chest_1';

// Vingt-quatrième donjon — les registres notariaux de la guilde des
// marchands, plus profonds que l'entrepôt lui-même : la seule trace civile,
// pas religieuse ni secrète, d'une transmission de titre et de propriété.
// Même gabarit "moyen" que les 23 donjons précédents, palette poussiéreuse
// de papier et de bois plutôt que pierre.
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
  { monsterId: 'corrupted_knight', x: WORLD_WIDTH / 2, y: 320, label: 'Gardiens des registres' },
  { monsterId: 'corrupted_knight', x: WORLD_WIDTH / 2, y: 250, label: 'Gardiens des registres' },
];

const BOSS_MONSTER_ID = 'record_keeper';

interface GuildArchiveData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay's Inventaire/Sac/Stats/Quêtes screens — distinguishes
  // "returning mid-run" from a genuine fresh entry via the warehouse's
  // hidden archive stair.
  resume?: boolean;
  x?: number;
  y?: number;
}

export class GuildArchiveScene extends Phaser.Scene {
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
    super('GuildArchive');
  }

  init(data: GuildArchiveData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#2e2a20');


    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    // Ground, walls, decor and light drawn by the game (world/zones/aiglemontDepths.ts).
    const painted = paintZone(this, GUILD_ARCHIVE);
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
    this.physics.add.overlap(this.player, exitZone, () => this.leaveArchive());

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
        'GuildArchive',
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
    this.gateArt = placeBarrier(this, 'shelves', WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH);
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
      .rectangle(encounter.x, encounter.y, 28, 28, 0x484030, 0.8)
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
    const marker = this.add.rectangle(x, y, 50, 50, 0x1c1810, 0.85).setStrokeStyle(2, 0xe8d9b5);
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
      this.scene.start('Combat', { returnScene: 'GuildArchive', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'GuildArchive');
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

  private leaveArchive(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Warehouse', { x: 196, y: 44, resume: true });
    });
  }
}
