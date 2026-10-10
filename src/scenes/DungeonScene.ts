import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone, placeBarrier } from '../world/zoneArt';
import { WOLF_DEN } from '../world/zones/underground';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { showBanner } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const CHEST_ID = 'dungeon_chest_1';

// Wide enough to fill the portrait canvas (216px) at every camera position —
// see HamletScene's WORLD_HEIGHT comment for why a narrower world leaves a
// black band down the side of the screen.
const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 520;
const GATE_Y = 190;

interface EncounterMarker {
  monsterId: string;
  x: number;
  y: number;
  label: string;
  color: number;
}

// Both regular fights sit dead-center in the only walkable corridor (decorative
// walls stay well clear of it), and a gate blocks the boss room until both are
// triggered — belt and suspenders against a player just walking around them
// and hitting a level-70 boss at level 1. First real dungeon (increment 6);
// later dungeons in v1's scope reuse this same scene shape.
const ENCOUNTERS: EncounterMarker[] = [
  { monsterId: 'cave_rat', x: WORLD_WIDTH / 2, y: 420, label: 'Rats', color: 0x5a3a2a },
  { monsterId: 'corrupted_wolf', x: WORLD_WIDTH / 2, y: 300, label: 'Loups', color: 0x5a3a2a },
];

const BOSS_MONSTER_ID = 'alpha_wolf';

interface DungeonData {
  // Set by CombatScene when handing control back after a fight, or by the Menu
  // overlay's Inventaire/Sac/Stats/Quêtes screens — distinguishes "returning
  // mid-run" from a genuine fresh entry via the Field's dungeon zone.
  resume?: boolean;
  x?: number;
  y?: number;
}

export class DungeonScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  // Phaser reuses the same Scene instance across scene.start() calls, so these
  // survive a Dungeon -> Combat -> Dungeon round trip as long as init() doesn't
  // wipe them on a resume.
  private clearedMonsterIds = new Set<string>();
  private gate?: Phaser.GameObjects.Rectangle;
  private gateArt?: Phaser.GameObjects.Image;
  private gateCollider?: Phaser.Physics.Arcade.Collider;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Dungeon');
  }

  init(data: DungeonData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#1c1c22');
    // Ground, walls, decor and light drawn by the game (world/zones/underground.ts).
    const painted = paintZone(this, WOLF_DEN);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    painted.follow(this.player);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    this.addWalls();
    const remaining = ENCOUNTERS.filter((e) => !this.clearedMonsterIds.has(e.monsterId));
    if (remaining.length > 0) {
      this.addGate();
      remaining.forEach((encounter) => this.addEncounterZone(encounter));
    }
    if (!this.clearedMonsterIds.has(BOSS_MONSTER_ID)) {
      this.addBossZone();
    }

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveDungeon());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, '↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(170, 460, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);
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
        'Dungeon',
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

  private addWalls(): void {
    // Purely decorative, kept well clear of the center corridor (x=100) that
    // the encounters, gate, and boss zone all sit on.
    const wall = (x: number, y: number, w: number, h: number) => {
      const rect = this.add.rectangle(x, y, w, h).setVisible(false);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect);
    };
    wall(20, 440, 30, 60);
    wall(WORLD_WIDTH - 20, 340, 30, 80);
    wall(20, 260, 30, 60);
    wall(WORLD_WIDTH - 20, 120, 30, 60);
  }

  private addGate(): void {
    this.gate = this.add.rectangle(WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH, 16).setVisible(false);
    this.gateArt = placeBarrier(this, 'barricade', WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH);
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
      .rectangle(encounter.x, encounter.y, 28, 28, encounter.color, 0.8)
      .setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, marker, `monster-${encounter.monsterId}`, `${import.meta.env.BASE_URL}sprites/monsters/${encounter.monsterId}.png`, 28);

    const zone = this.add.zone(encounter.x, encounter.y, 28, 28);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      zone.destroy();
      this.clearedMonsterIds.add(encounter.monsterId);
      this.openGateIfCleared();
      this.startCombat(encounter.monsterId);
    });
  }

  private addBossZone(): void {
    const x = WORLD_WIDTH / 2;
    const y = 70;
    const marker = this.add.rectangle(x, y, 50, 50, 0x6b1f1f, 0.85).setStrokeStyle(2, 0xe8d9b5);
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
      this.scene.start('Combat', { returnScene: 'Dungeon', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'Dungeon');
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

  private leaveDungeon(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Field', { x: 240, y: 40 });
    });
  }
}
