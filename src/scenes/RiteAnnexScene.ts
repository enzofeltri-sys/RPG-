import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';

const CHEST_ID = 'riteannex_chest_1';

// Vingt-et-unième donjon — les rayonnages scellés des Archives du Rite,
// jamais consultés faute d'accès : un ward que seule la confiance rendue à
// la silhouette a fini par lever. Même gabarit "moyen" que les 20 donjons
// précédents, palette encore plus sombre que l'Archive elle-même — ces
// rayonnages n'ont pas vu de lumière depuis trois siècles.
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

const BOSS_MONSTER_ID = 'veiled_scribe';

interface RiteAnnexData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay's Inventaire/Sac/Stats/Quêtes screens — distinguishes
  // "returning mid-run" from a genuine fresh entry via the archive's hidden
  // shelves.
  resume?: boolean;
  x?: number;
  y?: number;
}

export class RiteAnnexScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private clearedMonsterIds = new Set<string>();
  private gate?: Phaser.GameObjects.Rectangle;
  private gateCollider?: Phaser.Physics.Arcade.Collider;
  private gateLabel?: Phaser.GameObjects.Text;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('RiteAnnex');
  }

  init(data: RiteAnnexData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.cameras.main.setBackgroundColor('#221c10');

    addCrispText(this, this.scale.width / 2, 12, "L'Annexe scellée", {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);

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
    this.physics.add.overlap(this.player, exitZone, () => this.leaveAnnex());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(170, 380, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);
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
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'RiteAnnex',
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
      const rect = this.add.rectangle(x, y, w, h, 0x2c2414).setStrokeStyle(1, 0x120e08);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect);
    };
    shelf(20, 360, 24, 60);
    shelf(WORLD_WIDTH - 20, 280, 24, 60);
    shelf(20, 140, 24, 60);
    shelf(WORLD_WIDTH - 20, 360, 24, 60);
  }

  private addGate(): void {
    this.gate = this.add
      .rectangle(WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH, 16, 0x2c2414)
      .setStrokeStyle(1, 0x120e08);
    this.physics.add.existing(this.gate, true);
    this.gateCollider = this.physics.add.collider(this.player, this.gate);
    this.gateLabel = addCrispText(this, WORLD_WIDTH / 2, GATE_Y - 16, 'Rayonnages scellés', {
      fontSize: '8px',
      color: '#9aa0a6',
    }).setOrigin(0.5);
  }

  private openGateIfCleared(): void {
    if (this.clearedMonsterIds.size < ENCOUNTERS.length) return;
    this.gateCollider?.destroy();
    this.gate?.destroy();
    this.gateLabel?.destroy();
  }

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add
      .rectangle(encounter.x, encounter.y, 28, 28, 0x362c18, 0.8)
      .setStrokeStyle(1, 0x0b0c10);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      color: '#e8d9b5',
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
    this.add.rectangle(x, y, 50, 50, 0x160f08, 0.85).setStrokeStyle(2, 0xe8d9b5);
    addCrispText(this, x, y - 36, 'Le registre de l’Ordre', {
      fontSize: '9px',
      color: '#e8d9b5',
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
      this.scene.start('Combat', { returnScene: 'RiteAnnex', monsterId, x: this.player.x, y: this.player.y });
    });
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

    this.time.delayedCall(1800, () => {
      this.messageText?.destroy();
      this.messageText = undefined;
    });
  }

  private leaveAnnex(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('RiteArchive', { x: 200, y: 30 });
    });
  }
}
