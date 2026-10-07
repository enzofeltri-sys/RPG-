import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone, placeBarrier } from '../world/zoneArt';
import { WATCHERS_LODGE } from '../world/zones/startDepths';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { showBanner } from '../ui/dialog';
import { DANGER_TEXT, EXIT_TEXT, WORLD_TEXT, addZoneTitle } from '../ui/kit';
import type { PixelText } from '../ui/pixelFont';

const CHEST_ID = 'watcherslodge_chest_1';

// Same gabarit "moyen" que les 18 donjons précédents — la loge où l'Ordre
// des Veilleurs se réunissait autrefois, révélée par les marques gravées sur
// le fragment laissé au joueur. Palette chaude, presque accueillante,
// distincte de tous les dungeons précédents : ce lieu n'a jamais été
// hostile, seulement oublié.
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
  { monsterId: 'watcher_echo', x: WORLD_WIDTH / 2, y: 320, label: 'Échos de veilleurs' },
  { monsterId: 'watcher_echo', x: WORLD_WIDTH / 2, y: 250, label: 'Échos de veilleurs' },
];

const BOSS_MONSTER_ID = 'oath_guardian';

interface WatchersLodgeData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay's Inventaire/Sac/Stats/Quêtes screens — distinguishes
  // "returning mid-run" from a genuine fresh entry via the shrine's stone
  // circle.
  resume?: boolean;
  x?: number;
  y?: number;
}

export class WatchersLodgeScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private clearedMonsterIds = new Set<string>();
  private gate?: Phaser.GameObjects.Rectangle;
  private gateCollider?: Phaser.Physics.Arcade.Collider;
  private gateLabel?: PixelText;
  private gateArt?: Phaser.GameObjects.Image;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('WatchersLodge');
  }

  init(data: WatchersLodgeData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#332a20');

    addZoneTitle(this, 'La Loge des Veilleurs');

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    // Ground, walls, decor and light drawn by the game (world/zones/startDepths.ts).
    const painted = paintZone(this, WATCHERS_LODGE);
    painted.follow(this.player);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    this.addBeams();
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
    this.physics.add.overlap(this.player, exitZone, () => this.leaveLodge());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    // A second, half-hidden way in, clear of the boss zone at the top of the
    // center corridor — a door the table's own carvings pointed toward, not
    // visible until the lodge itself had been walked once.
    const archiveZone = this.add.zone(20, 15, 40, 20);
    this.physics.add.existing(archiveZone, true);
    this.physics.add.overlap(this.player, archiveZone, () => this.enterRiteArchive());
    addCrispText(this, 20, 28, 'Archives ↑', { fontSize: '8px', ...EXIT_TEXT }).setOrigin(0.5);

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
        'WatchersLodge',
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

  private addBeams(): void {
    // Purely decorative, kept well clear of the center corridor (x=110) that
    // the encounters, gate, and boss zone all sit on.
    const beam = (x: number, y: number, w: number, h: number) => {
      const rect = this.add.rectangle(x, y, w, h).setVisible(false);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect);
    };
    beam(20, 360, 24, 60);
    beam(WORLD_WIDTH - 20, 280, 24, 60);
    beam(20, 140, 24, 60);
    beam(WORLD_WIDTH - 20, 360, 24, 60);
  }

  private addGate(): void {
    this.gate = this.add.rectangle(WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH, 16).setVisible(false);
    this.gateArt = placeBarrier(this, 'door', WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH);
    this.physics.add.existing(this.gate, true);
    this.gateCollider = this.physics.add.collider(this.player, this.gate);
    this.gateLabel = addCrispText(this, WORLD_WIDTH / 2, GATE_Y - 16, 'Porte close depuis longtemps', {
      fontSize: '8px',
      ...WORLD_TEXT,
    }).setOrigin(0.5);
  }

  private openGateIfCleared(): void {
    if (this.clearedMonsterIds.size < ENCOUNTERS.length) return;
    this.gateCollider?.destroy();
    this.gate?.destroy();
    this.gateLabel?.destroy();
    this.gateArt?.destroy();
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add
      .rectangle(encounter.x, encounter.y, 28, 28, 0x453a2c, 0.8)
      .setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, marker, `monster-${encounter.monsterId}`, `${import.meta.env.BASE_URL}sprites/monsters/${encounter.monsterId}.png`, 28);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      ...DANGER_TEXT,
    }).setOrigin(0.5);

    const zone = this.add.zone(encounter.x, encounter.y, 28, 28);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
      zone.destroy();
      this.clearedMonsterIds.add(encounter.monsterId + encounter.y);
      this.openGateIfCleared();
      this.startCombat(encounter.monsterId);
    });
  }

  private addBossZone(): void {
    const x = WORLD_WIDTH / 2;
    const y = 70;
    const marker = this.add.rectangle(x, y, 50, 50, 0x241e14, 0.85).setStrokeStyle(2, 0xe8d9b5);
    void attachSpriteOverlay(this, marker, `monster-${BOSS_MONSTER_ID}`, `${import.meta.env.BASE_URL}sprites/monsters/${BOSS_MONSTER_ID}.png`, 40);
    addCrispText(this, x, y - 36, 'La table ronde', {
      fontSize: '9px',
      ...DANGER_TEXT,
      align: 'center',
    }).setOrigin(0.5);

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
      this.scene.start('Combat', { returnScene: 'WatchersLodge', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'WatchersLodge');
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

  private enterRiteArchive(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RiteArchive', { x: 110, y: 380 });
    });
  }

  private leaveLodge(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Shrine', { x: 150, y: 260 });
    });
  }
}
