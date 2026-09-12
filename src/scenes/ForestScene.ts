import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { addGrassGround } from '../entities/groundTexture';
import { Wanderer } from '../entities/wanderer';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 400;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const MIN_ENCOUNTER_DISTANCE = 200;
const MAX_ENCOUNTER_DISTANCE = 380;
const FOREST_MONSTERS = ['corrupted_wolf', 'goblin_scout'];

// Deliberately dense — a forest reads as a forest mostly through decoration
// density, not layout. No collision on any of it (see DESIGN.md's note on
// narrow-gap pathing bugs) — real art comes in increment 10.
const TREES: { x: number; y: number }[] = [
  { x: 60, y: 40 },
  { x: 120, y: 90 },
  { x: 60, y: 220 },
  { x: 140, y: 250 },
  { x: 260, y: 50 },
  { x: 320, y: 100 },
  { x: 340, y: 230 },
  { x: 270, y: 260 },
  { x: 90, y: 150 },
  { x: 310, y: 160 },
  { x: 30, y: 100 },
  { x: 180, y: 40 },
  { x: 370, y: 60 },
  { x: 380, y: 190 },
  { x: 220, y: 280 },
  { x: 60, y: 280 },
  { x: 100, y: 350 },
  { x: 300, y: 340 },
  { x: 200, y: 380 },
  { x: 40, y: 370 },
  { x: 360, y: 380 },
];

const MUSHROOMS: { x: number; y: number }[] = [
  { x: 100, y: 60 },
  { x: 250, y: 190 },
  { x: 160, y: 130 },
  { x: 330, y: 260 },
];

const ROCKS: { x: number; y: number }[] = [
  { x: 200, y: 150 },
  { x: 150, y: 320 },
  { x: 340, y: 150 },
  { x: 80, y: 200 },
];

// Pipoya decor (extracted from [Base]BaseChip_pipo.png, see
// docs/PLAN-ATTAQUE-GRAPHISME.md) at native size (64px tree, 32px bush/rock)
// to match the 1:1 scale the Pipoya ground tile already uses, rather than
// the smaller sizes the existing SpriteCook decor above uses. Started as a
// single 3-item test cluster to validate the pipeline and the Y-sort depth
// in spriteOverlay.ts; extended here into real density now that both are
// confirmed working. Positions are hand-picked to clear the existing
// TREES/MUSHROOMS/ROCKS above (and each other) by 30px+.
const PIPOYA_TREES: { x: number; y: number }[] = [
  { x: 200, y: 210 },
  { x: 50, y: 130 },
  { x: 355, y: 300 },
  { x: 120, y: 300 },
  { x: 280, y: 120 },
  { x: 360, y: 320 },
  { x: 30, y: 300 },
  { x: 250, y: 350 },
  { x: 365, y: 110 },
];

const PIPOYA_BUSHES: { x: number; y: number }[] = [
  { x: 175, y: 235 },
  { x: 130, y: 60 },
  { x: 320, y: 200 },
  { x: 95, y: 270 },
  { x: 240, y: 90 },
  { x: 370, y: 250 },
];

const PIPOYA_ROCKS: { x: number; y: number }[] = [
  { x: 225, y: 235 },
  { x: 270, y: 300 },
  { x: 45, y: 160 },
  { x: 190, y: 320 },
  { x: 330, y: 60 },
];

interface SimpleNpc {
  x: number;
  y: number;
  spriteKey: string;
  line: string;
}

// Stationary (not patrolling like Wanderer) — "simple" ambient NPCs with a
// single line of flavor text, interactable by walking up and either
// tapping them or pressing E. spriteKey reuses the existing generic NPC art
// already shared across several scenes (see e.g. VillageScene, RoadScene)
// rather than a new asset, since neither needs a named, quest-tied identity.
const FOREST_NPCS: SimpleNpc[] = [
  {
    x: 300,
    y: 30,
    spriteKey: 'villager_wanderer',
    line: 'Fais attention aux loups, plus loin dans les bois...',
  },
  {
    x: 130,
    y: 180,
    spriteKey: 'guard_generic',
    line: "Je garde ce chemin depuis des années. Les gobelins n'osent plus trop s'approcher.",
  },
];

interface MonsterMarker {
  id: string;
  x: number;
  y: number;
  monsterId: string;
  label: string;
}

// Visible monster markers — distinct from FOREST_MONSTERS' invisible,
// distance-based random encounters above: the player can see these, choose
// to approach, and fight them once, same pattern as CaveScene/RoadScene's
// addEncounterZone. Both mechanisms coexist: walking through the forest can
// still trigger a random fight, and these two are always there to find.
const MONSTER_MARKERS: MonsterMarker[] = [
  { id: 'wolf_1', x: 350, y: 350, monsterId: 'corrupted_wolf', label: 'Loup corrompu' },
  { id: 'goblin_1', x: 300, y: 250, monsterId: 'goblin_scout', label: 'Éclaireur gobelin' },
];

interface ForestData {
  x?: number;
  y?: number;
  resume?: boolean;
}

export class ForestScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private deer!: Wanderer;
  private messageText?: Phaser.GameObjects.Text;
  private spawnX?: number;
  private spawnY?: number;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private clearedMonsterMarkerIds = new Set<string>();

  constructor() {
    super('Forest');
  }

  init(data: ForestData): void {
    if (!data?.resume) {
      this.clearedMonsterMarkerIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#24401f');
    void addGrassGround(this, WORLD_WIDTH, WORLD_HEIGHT);

    TREES.forEach((tree) => {
      const shape = this.add.circle(tree.x, tree.y, 11, 0x1a3016).setStrokeStyle(1, 0x0e1c0b);
      void attachSpriteOverlay(this, shape, 'decor-tree', `${import.meta.env.BASE_URL}sprites/decor/tree.png`, 24);
    });
    MUSHROOMS.forEach((m) => {
      const shape = this.add.circle(m.x, m.y, 4, 0xb5602a).setStrokeStyle(1, 0x5a2e10);
      void attachSpriteOverlay(this, shape, 'decor-mushroom', `${import.meta.env.BASE_URL}sprites/decor/mushroom.png`, 14);
    });
    ROCKS.forEach((r) => {
      const shape = this.add.rectangle(r.x, r.y, 16, 12, 0x4a4a48).setStrokeStyle(1, 0x24241f);
      void attachSpriteOverlay(this, shape, 'decor-rock_small', `${import.meta.env.BASE_URL}sprites/decor/rock_small.png`, 18);
    });

    PIPOYA_TREES.forEach((t) => {
      const shape = this.add.rectangle(t.x, t.y, 30, 20).setStrokeStyle(1, 0x0e1c0b);
      void attachSpriteOverlay(this, shape, 'decor-pipoya_tree', `${import.meta.env.BASE_URL}sprites/decor/pipoya_tree.png`, 64);
    });
    PIPOYA_BUSHES.forEach((b) => {
      const shape = this.add.rectangle(b.x, b.y, 20, 14).setStrokeStyle(1, 0x1a3a1a);
      void attachSpriteOverlay(this, shape, 'decor-pipoya_bush', `${import.meta.env.BASE_URL}sprites/decor/pipoya_bush.png`, 32);
    });
    PIPOYA_ROCKS.forEach((r) => {
      const shape = this.add.rectangle(r.x, r.y, 20, 12).setStrokeStyle(1, 0x35352f);
      void attachSpriteOverlay(this, shape, 'decor-pipoya_rock', `${import.meta.env.BASE_URL}sprites/decor/pipoya_rock.png`, 32);
    });

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, [
      '← Champ',
      '→ Grotte',
      '↑ Camp de gobelins',
      '↓ Vieux puits',
    ]);

    // A shy bit of wildlife — clear of both zones and the signpost.
    this.deer = new Wanderer(this, 150, 220, 0x9a7a52, 35);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    this.physics.add.collider(this.player, this.deer.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.tapControl = new TapController(this, this.player);

    FOREST_NPCS.forEach((npc) => {
      const shape = this.add.rectangle(npc.x, npc.y, 12, 16).setStrokeStyle(1, 0x0b0c10);
      void attachSpriteOverlay(this, shape, `npc-${npc.spriteKey}`, `${import.meta.env.BASE_URL}sprites/npc/${npc.spriteKey}.png`, 24);
    });

    MONSTER_MARKERS.filter((m) => !this.clearedMonsterMarkerIds.has(m.id)).forEach((m) => this.addMonsterMarker(m));

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('Field', { x: 440, y: 340 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('Cave', { x: 100, y: 360 }));

    // Optional detour, a branch off the main west-east road.
    const goblinCampZone = this.add.zone(200, 10, 100, 20);
    this.physics.add.existing(goblinCampZone, true);
    this.physics.add.overlap(this.player, goblinCampZone, () => this.leaveTo('GoblinCamp', { x: 130, y: 180 }));

    // Another optional, low-stakes detour — no quest attached, see OldWellScene.
    const oldWellZone = this.add.zone(200, WORLD_HEIGHT - 10, 100, 20);
    this.physics.add.existing(oldWellZone, true);
    this.physics.add.overlap(this.player, oldWellZone, () => this.leaveTo('OldWell', { x: 110, y: 260 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Champ', { fontSize: '10px', color: '#9aa0a6' }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Grotte →', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);
    addCrispText(this, 200, 30, 'Camp de gobelins ↑', {
      fontSize: '9px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);
    addCrispText(this, 200, WORLD_HEIGHT - 22, 'Vieux puits ↓', {
      fontSize: '9px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);

    // Local const (not `this.deer.sprite` inline) so the getters below are
    // plain closures — an object literal's get x()/get y() would otherwise
    // bind `this` to the literal itself, not the scene.
    const deerSprite = this.deer.sprite;
    const interactables: Interactable[] = [
      {
        get x() {
          return deerSprite.x;
        },
        get y() {
          return deerSprite.y;
        },
        radius: 18,
        onTap: () => this.showMessage('Un cerf détale dans les fourrés.'),
      },
      ...FOREST_NPCS.map((npc) => ({
        x: npc.x,
        y: npc.y,
        radius: 20,
        onTap: () => this.showMessage(npc.line),
      })),
    ];
    this.tapControl.setInteractables(interactables);

    // A zone overlap can fire and call scene.start() while this load is still
    // pending (Arcade Physics keeps ticking regardless of async create()'s
    // progress) — if that happened, this scene has already been stopped by
    // the time we get here, and touching it further corrupts Phaser's
    // collider state on the next physics step. Bail out instead.
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      await setPlayerAppearance(this, this.player, save.character.race, save.character.class);
      if (!this.scene.isActive()) return;
      new CharacterSheetPanel(
        this,
        save.character,
        'Forest',
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
    this.deer.update();

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tapControl.interactViaKey();
    }

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
    const monsterId = Phaser.Utils.Array.GetRandom(FOREST_MONSTERS);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'Forest', monsterId, x: this.player.x, y: this.player.y });
    });
  }

  // Visible counterpart to startEncounter() above — a MONSTER_MARKERS entry
  // the player can see and choose to approach, rather than a random
  // distance-triggered fight. 'Forest' is registered in RESUMABLE_SCENES
  // (see ui/returnContext.ts) so a fled or won fight against one of these
  // doesn't respawn it right back under the player's feet on return.
  private addMonsterMarker(marker: MonsterMarker): void {
    const shape = this.add.rectangle(marker.x, marker.y, 26, 26, 0x2a3a20, 0.8).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(
      this,
      shape,
      `monster-${marker.monsterId}`,
      `${import.meta.env.BASE_URL}sprites/monsters/${marker.monsterId}.png`,
      26,
    );
    const label = addCrispText(this, marker.x, marker.y - 22, marker.label, {
      fontSize: '8px',
      color: '#e8d9b5',
    }).setOrigin(0.5);

    const zone = this.add.zone(marker.x, marker.y, 26, 26);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      shape.destroy();
      label.destroy();
      zone.destroy();
      this.clearedMonsterMarkerIds.add(marker.id);
      this.startMonsterCombat(marker.monsterId);
    });
  }

  private startMonsterCombat(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', { returnScene: 'Forest', monsterId, x: this.player.x, y: this.player.y });
    });
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
