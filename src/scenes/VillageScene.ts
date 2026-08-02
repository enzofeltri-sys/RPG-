import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;

const VILLAGER_LINES = [
  'Valombre reçoit pas mal de voyageurs ces temps-ci.',
  'La forge tourne à plein régime, allez donc voir le forgeron.',
  'On dit qu\'une route commerciale relie maintenant la ville à Aiglemont.',
];

interface VillageData {
  x?: number;
  y?: number;
}

// Valombre — the full-service town (forge, marchande), reached by crossing
// the Champ from the player's home hamlet (Basse-Combe, HamletScene). No
// quest-giver or gathering here anymore (increment 9 world pass) — those
// live in the hamlet and the Champ respectively, so Valombre reads as a real
// town you travel to rather than the same small starting point.
export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private messageText?: Phaser.GameObjects.Text;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private forgeBuilding!: Phaser.GameObjects.Rectangle;
  private villagers: Wanderer[] = [];
  private villagerLineIndex = 0;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Village');
  }

  init(data: VillageData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.drawGround();

    addCrispText(this, this.scale.width / 2, 12, 'Valombre', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    this.addBuilding(120, 160, 70, 50);
    this.addBuilding(300, 210, 60, 60);
    this.forgeBuilding = this.addBuilding(190, 360, 90, 50);
    addCrispText(this, 190, 330, 'Forge', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    this.addBuilding(340, 460, 60, 70);

    this.merchantNpc = this.add.rectangle(300, 270, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 300, 250, 'Marchande', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Market stalls near the merchant + a well further south — purely
    // decorative, no collision, no real art yet (increment 10).
    this.add.rectangle(260, 300, 20, 14, 0x6b5a3a).setStrokeStyle(1, 0x2e2419);
    this.add.rectangle(340, 250, 20, 14, 0x6b5a3a).setStrokeStyle(1, 0x2e2419);
    this.add.circle(240, 550, 16, 0x4a4a52).setStrokeStyle(2, 0x2e2b3a);
    this.add.circle(240, 550, 8, 0x2e5a7a).setStrokeStyle(1, 0x1a3a50);

    // Ambient villagers, clear of every building/zone/signpost.
    this.villagers = [new Wanderer(this, 50, 280, 0x8a7a5a, 15), new Wanderer(this, 400, 150, 0x7a8a6a, 25)];

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 80);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.merchantNpc);
    this.villagers.forEach((v) => this.physics.add.collider(this.player, v.sprite));

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVillage());

    addCrispText(this, WORLD_WIDTH / 2, 40, 'Vers la Grotte ↑', {
      fontSize: '11px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // Second exit south — the "route commerciale" toward Aiglemont (région
    // 2, VISION.md). Well clear of every building (bottommost building ends
    // around y=495).
    const roadZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(roadZone, true);
    this.physics.add.overlap(this.player, roadZone, () => this.leaveToRoad());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Route commerciale ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    addSignpost(this, 240, 300, ['↑ Grotte (vers Basse-Combe)', '↓ Route commerciale (vers Aiglemont)']);

    // Un vieux cimetière à l'écart du village, que les enfants évitent sans
    // qu'on ait besoin de le leur dire — jamais relié à un nom jusqu'à ce
    // qu'un prénom sorti d'une légende y ramène l'enquête. Toujours
    // franchissable, quelle que soit l'étape de la quête en cours.
    const graveZone = this.add.zone(420, 580, 30, 20);
    this.physics.add.existing(graveZone, true);
    this.physics.add.overlap(this.player, graveZone, () => this.enterForgottenGrave());
    addCrispText(this, 420, 593, 'Vieux cimetière ↓', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    const interactables: Interactable[] = [
      {
        x: this.merchantNpc.x,
        y: this.merchantNpc.y,
        radius: 24,
        onTap: () => this.scene.start('Merchant', { x: this.player.x, y: this.player.y }),
      },
      {
        x: this.forgeBuilding.x,
        y: this.forgeBuilding.y,
        radius: 35,
        onTap: () => this.scene.start('Crafting', { x: this.player.x, y: this.player.y }),
      },
      ...this.buildings
        .filter((b) => b !== this.forgeBuilding)
        .map((b) => ({
          x: b.x,
          y: b.y,
          radius: 35,
          onTap: () => this.showMessage('Une maison du village. Personne ne répond.'),
        })),
      // Local consts (not `this.villagers[i].sprite` inline) so the getters
      // below are plain closures — an object literal's get x()/get y() would
      // otherwise bind `this` to the literal itself, not the scene.
      ...this.villagers.map((villager) => {
        const sprite = villager.sprite;
        return {
          get x() {
            return sprite.x;
          },
          get y() {
            return sprite.y;
          },
          radius: 20,
          onTap: () => this.talkToVillager(),
        };
      }),
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
        'Village',
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
    this.villagers.forEach((v) => v.update());
  }

  private talkToVillager(): void {
    const line = VILLAGER_LINES[this.villagerLineIndex % VILLAGER_LINES.length];
    this.villagerLineIndex += 1;
    this.showMessage(line);
  }

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  private drawGround(): void {
    if (!this.textures.exists('groundTile')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x2d4a2d);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x326032);
      g.fillRect(0, 0, 16, 16);
      g.fillRect(16, 16, 16, 16);
      g.generateTexture('groundTile', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'groundTile').setOrigin(0, 0);
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

  private leaveVillage(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Cave', { x: 100, y: 40 });
    });
  }

  private leaveToRoad(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Road', { x: 40, y: 110 });
    });
  }

  private enterForgottenGrave(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ForgottenGrave', { x: 110, y: 380 });
    });
  }
}
