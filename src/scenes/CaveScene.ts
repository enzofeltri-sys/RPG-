import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone } from '../world/zoneArt';
import { CAVE } from '../world/zones/underground';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';
import { showBanner } from '../ui/dialog';
import { DANGER_TEXT, EXIT_TEXT, addZoneTitle } from '../ui/kit';

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
    addZoneTitle(this, 'Grotte');
    // Ground, walls, decor and light drawn by the game (world/zones/underground.ts).
    const painted = paintZone(this, CAVE);

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 40, ['↓ Forêt', '↑ Valombre']);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    painted.follow(this.player);
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
      ...EXIT_TEXT,
    }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH / 2, 22, 'Valombre ↑', {
      fontSize: '10px',
      ...EXIT_TEXT,
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
      setPlayerAppearance(this, this.player, this.character);
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
    void attachSpriteOverlay(this, marker, 'monster-cave_spider', `${import.meta.env.BASE_URL}sprites/monsters/cave_spider.png`, 26);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      ...DANGER_TEXT,
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
    showBanner(this, message);
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
