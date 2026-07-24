import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 200;
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
];

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
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private clearedEncounterIds = new Set<string>();
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

    ROCKS.forEach((rock) => this.add.rectangle(rock.x, rock.y, 18, 12, 0x35353f).setStrokeStyle(1, 0x18181c));
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
    this.joystick = new VirtualJoystick(this);

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

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      new CharacterSheetPanel(
        this,
        save.character,
        'Cave',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.joystick.setEnabled(!open);
        },
      );
    }
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
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

  private leaveTo(sceneKey: string, data: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, data);
    });
  }
}
