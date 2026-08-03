import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment for why a shorter world leaves a black
// band at the bottom of the screen.
const WORLD_HEIGHT = 400;
const MIN_ENCOUNTER_DISTANCE = 220;
const MAX_ENCOUNTER_DISTANCE = 400;

const TRAVELER_LINES = [
  'Je fais la navette entre Valombre et Aiglemont depuis des années.',
  'Les caravanes se font escorter depuis que les sangliers corrompus rôdent.',
  'Bon vent, voyageur. La route est longue mais sûre en plein jour.',
];

// Purely decorative — parked wagons/crates along the roadside, no collision,
// no real art yet (increment 10).
const WAGONS: { x: number; y: number }[] = [
  { x: 90, y: 60 },
  { x: 380, y: 150 },
  { x: 220, y: 180 },
  { x: 130, y: 300 },
  { x: 400, y: 330 },
  { x: 280, y: 360 },
];

const BOULDERS: { x: number; y: number }[] = [
  { x: 40, y: 200 },
  { x: 440, y: 60 },
  { x: 320, y: 260 },
  { x: 60, y: 340 },
];

const ALPHA_ZONE_ID = 'boar_alpha_zone';

interface RoadData {
  // Set by CombatScene when handing control back after a fight, or by the
  // Menu overlay — distinguishes "returning mid-run" from a genuine fresh
  // entry, so the alpha boar zone (once cleared) doesn't respawn under the
  // player. Ambient encounters don't need this (no fixed state).
  resume?: boolean;
  x?: number;
  y?: number;
}

// La "route commerciale" de VISION.md — relie Valombre (région de départ) à
// Aiglemont, la première cité-État (région 2). Un garde de caravane offre un
// peu de mise en contexte ; rencontres aléatoires façon Forêt/Ferme, avec
// corrupted_boar comme menace propre à la route (voir city_road_patrol,
// donné par le capitaine d'Aiglemont — sans ça, cette quête n'aurait aucun
// endroit où trouver son objectif).
export class RoadScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private guard!: Phaser.GameObjects.Rectangle;
  private traveler!: Wanderer;
  private travelerLineIndex = 0;
  private messageText?: Phaser.GameObjects.Text;
  private clearedMonsterIds = new Set<string>();
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Road');
  }

  init(data: RoadData): void {
    if (!data?.resume) {
      this.clearedMonsterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#6b5a42');

    WAGONS.forEach((wagon) => this.add.rectangle(wagon.x, wagon.y, 26, 16, 0x4a3a28).setStrokeStyle(1, 0x1f1810));
    BOULDERS.forEach((b) => this.add.rectangle(b.x, b.y, 20, 16, 0x6a6a62).setStrokeStyle(1, 0x38382f));

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2, ['← Valombre', '→ Aiglemont']);

    // Off the horizontal centerline, same lesson as every NPC this session.
    this.guard = this.add.rectangle(150, 60, 14, 20, 0x5a5a6a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.guard, true);
    addCrispText(this, 150, 40, 'Garde de caravane', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Ambient traveler, clear of both the guard and the wagon decorations.
    this.traveler = new Wanderer(this, 320, 60, 0x6a7a5a, 30);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    this.physics.add.collider(this.player, this.guard);
    this.physics.add.collider(this.player, this.traveler.sprite);
    this.addAlphaZone();

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('Village', { x: 240, y: 600 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('City', { x: 40, y: 280 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Valombre', { fontSize: '10px', color: '#9aa0a6' }).setOrigin(
      0.5,
    );
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Aiglemont →', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // Une vieille halte à l'écart de la route, où la corruption ressurgit
    // soudainement — comme si elle réagissait à l'approche de la
    // silhouette. Toujours franchissable, quelle que soit l'étape de la
    // quête en cours.
    const waystationZone = this.add.zone(240, 15, 40, 20);
    this.physics.add.existing(waystationZone, true);
    this.physics.add.overlap(this.player, waystationZone, () => this.enterCorruptedWaystation());
    addCrispText(this, 240, 28, 'Vieille halte ↑', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Local const (not `this.traveler.sprite` inline) so the getters below
    // are plain closures — an object literal's get x()/get y() would
    // otherwise bind `this` to the literal itself, not the scene.
    const travelerSprite = this.traveler.sprite;
    const interactables: Interactable[] = [
      {
        x: this.guard.x,
        y: this.guard.y,
        radius: 24,
        onTap: () =>
          this.showMessage("« Aiglemont n'est plus très loin. Restez sur vos gardes, la route attire les bêtes. »"),
      },
      {
        get x() {
          return travelerSprite.x;
        },
        get y() {
          return travelerSprite.y;
        },
        radius: 20,
        onTap: () => this.talkToTraveler(),
      },
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      new CharacterSheetPanel(
        this,
        save.character,
        'Road',
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
    this.traveler.update();

    if (this.isTransitioning) return;

    const speed = this.player.body.velocity.length();
    if (speed > 0) {
      this.distanceWalked += (speed * delta) / 1000;
      if (this.distanceWalked >= this.encounterThreshold) {
        this.startEncounter('corrupted_boar');
      }
    }
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  // Always present (not gated behind accepting city_road_patrol_alpha) —
  // same precedent as every other camp/farm boss: fightable on its own, the
  // quest (given by the City captain — see CityScene.talkToCaptainAboutAlpha)
  // just tracks/rewards the same kill. Placed clear of every wagon, the
  // guard, and the traveler's wander range.
  private addAlphaZone(): void {
    if (this.clearedMonsterIds.has(ALPHA_ZONE_ID)) return;

    const x = 60;
    const y = 250;
    const marker = this.add.rectangle(x, y, 34, 34, 0x4a3a2a, 0.85).setStrokeStyle(2, 0xe8d9b5);
    const label = addCrispText(this, x, y - 26, 'Sanglier alpha', {
      fontSize: '9px',
      color: '#e8d9b5',
      align: 'center',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, 34, 34);
    this.physics.add.existing(zone, true);
    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
      zone.destroy();
      this.clearedMonsterIds.add(ALPHA_ZONE_ID);
      this.startEncounter('corrupted_boar_alpha');
    });
  }

  private startEncounter(monsterId: string): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'Road',
        monsterId,
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private talkToTraveler(): void {
    const line = TRAVELER_LINES[this.travelerLineIndex % TRAVELER_LINES.length];
    this.travelerLineIndex += 1;
    this.showMessage(line);
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

    this.time.delayedCall(2200, () => {
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

  private enterCorruptedWaystation(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('CorruptedWaystation', { x: 110, y: 380 });
    });
  }
}
