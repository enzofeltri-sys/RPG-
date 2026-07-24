import Phaser from 'phaser';
import { TapController } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 200;
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
  private gateCollider?: Phaser.Physics.Arcade.Collider;
  private gateLabel?: Phaser.GameObjects.Text;
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

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);

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
    this.addBossZone();

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveDungeon());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
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
      const rect = this.add.rectangle(x, y, w, h, 0x37373f).setStrokeStyle(1, 0x18181c);
      this.physics.add.existing(rect, true);
      this.physics.add.collider(this.player, rect);
    };
    wall(20, 440, 30, 60);
    wall(WORLD_WIDTH - 20, 340, 30, 80);
    wall(20, 260, 30, 60);
    wall(WORLD_WIDTH - 20, 120, 30, 60);
  }

  private addGate(): void {
    this.gate = this.add
      .rectangle(WORLD_WIDTH / 2, GATE_Y, WORLD_WIDTH, 16, 0x37373f)
      .setStrokeStyle(1, 0x18181c);
    this.physics.add.existing(this.gate, true);
    this.gateCollider = this.physics.add.collider(this.player, this.gate);
    this.gateLabel = addCrispText(this, WORLD_WIDTH / 2, GATE_Y - 16, 'Barrière scellée', {
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
      .rectangle(encounter.x, encounter.y, 28, 28, encounter.color, 0.8)
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
      this.clearedMonsterIds.add(encounter.monsterId);
      this.openGateIfCleared();
      this.startCombat(encounter.monsterId);
    });
  }

  private addBossZone(): void {
    const x = WORLD_WIDTH / 2;
    const y = 70;
    this.add.rectangle(x, y, 50, 50, 0x6b1f1f, 0.85).setStrokeStyle(2, 0xe8d9b5);
    addCrispText(this, x, y - 36, 'Antre du Loup alpha', {
      fontSize: '9px',
      color: '#e8d9b5',
      align: 'center',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 50, 50);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => this.startCombat(BOSS_MONSTER_ID));
  }

  private startCombat(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'Dungeon', monsterId, x: this.player.x, y: this.player.y });
    });
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
