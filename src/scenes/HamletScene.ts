import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 240;
// Tall enough to fill the portrait canvas (216x384) at every camera
// position — a world shorter than the viewport leaves a solid black band at
// the bottom (the camera can't scroll past its bounds, so there's nothing
// left to draw there). Same fix applied to every other undersized scene.
const WORLD_HEIGHT = 400;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

const MENTOR_QUEST_ID = 'wolves_threat';

const VILLAGER_LINES = [
  'Encore une belle journée à Basse-Combe, calme comme toujours.',
  "Les récoltes ont été bonnes cette année, la ferme s'en sort bien.",
  'On dit que le petit sanctuaire à l\'est porte chance aux voyageurs.',
];

interface HamletData {
  x?: number;
  y?: number;
}

// Basse-Combe — the player's home hamlet: a handful of huts and the mentor
// who sends them off on the first quest. Deliberately sparse (per the
// increment 9 world pass) — the fully-stocked town (forge, marchande) is
// Valombre (VillageScene), reached by crossing the Champ.
export class HamletScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private character!: Character;
  private mentor!: Phaser.GameObjects.Rectangle;
  private villager!: Wanderer;
  private villagerLineIndex = 0;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Hamlet');
  }

  init(data: HamletData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.dialogElements = [];
    this.drawGround();

    addCrispText(this, this.scale.width / 2, 12, 'Basse-Combe', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Kept well clear of the x=120 centerline running from spawn straight up
    // to the exit zone — nothing should block that path (see DESIGN.md's
    // Container/pathing lessons: narrow gaps between colliders make
    // automated and real movement equally unreliable).
    this.addBuilding(50, 90, 44, 36);
    this.addBuilding(190, 90, 44, 36);
    // A third hut further south, off the x=120 centerline — keeps the
    // extended hamlet from reading as an empty stretch of grass while
    // staying "deliberately sparse" (see the class doc comment).
    this.addBuilding(190, 300, 40, 32);

    this.mentor = this.add.rectangle(150, 130, 14, 20, 0x5a4a3a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.mentor, true);
    addCrispText(this, 150, 110, 'Aldric', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Purely ambient — makes the hamlet read as lived-in rather than a
    // backdrop. Small patrol range, kept clear of the x=120 centerline and
    // every building/zone.
    this.villager = new Wanderer(this, 70, 150, 0x8a7a5a, 20);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 30);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.mentor);
    this.physics.add.collider(this.player, this.villager.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveHamlet());

    addCrispText(this, WORLD_WIDTH / 2, 40, 'Vers les champs ↑', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // Two more region-1 landmarks from VISION.md ("ferme isolée", "petit
    // sanctuaire"), kept clear of the north exit zone and both buildings.
    // Span from just below the buildings down to the new south edge, so
    // they stay reachable from anywhere along the hamlet's extended length.
    const sideZoneHeight = WORLD_HEIGHT - 60;
    const sideZoneCenterY = 60 + sideZoneHeight / 2;
    const farmZone = this.add.zone(10, sideZoneCenterY, 20, sideZoneHeight);
    this.physics.add.existing(farmZone, true);
    this.physics.add.overlap(this.player, farmZone, () => this.leaveToFarm());

    const shrineZone = this.add.zone(WORLD_WIDTH - 10, sideZoneCenterY, 20, sideZoneHeight);
    this.physics.add.existing(shrineZone, true);
    this.physics.add.overlap(this.player, shrineZone, () => this.leaveToShrine());

    addCrispText(this, 20, 140, '← Ferme', { fontSize: '9px', color: '#9aa0a6' }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH - 20, 140, 'Sanctuaire →', { fontSize: '9px', color: '#9aa0a6' }).setOrigin(0.5);


    // A local const (not `this.villager.sprite` inline) so the getters below
    // are plain closures — an object literal's get x()/get y() would
    // otherwise bind `this` to the literal itself, not the scene.
    const villagerSprite = this.villager.sprite;
    const interactables: Interactable[] = [
      { x: this.mentor.x, y: this.mentor.y, radius: 24, onTap: () => this.talkToMentor() },
      {
        get x() {
          return villagerSprite.x;
        },
        get y() {
          return villagerSprite.y;
        },
        radius: 20,
        onTap: () => this.talkToVillager(),
      },
      ...this.buildings.map((b) => ({
        x: b.x,
        y: b.y,
        radius: 30,
        onTap: () => this.showMessage('Une cabane du hameau. Personne ne répond.'),
      })),
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      new CharacterSheetPanel(
        this,
        save.character,
        'Hamlet',
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
    this.villager.update();
  }

  private addBuilding(x: number, y: number, w: number, h: number): void {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
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

  private talkToVillager(): void {
    const line = VILLAGER_LINES[this.villagerLineIndex % VILLAGER_LINES.length];
    this.villagerLineIndex += 1;
    this.showMessage(line);
  }

  private talkToMentor(): void {
    const quest = QUESTS[MENTOR_QUEST_ID];
    const progress = getQuestProgress(this.character, MENTOR_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, MENTOR_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} loups vaincus.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nMerci d'avoir écarté cette menace. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, MENTOR_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog("Merci encore pour votre aide contre les loups corrompus.", [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[]): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const bg = this.add
      .rectangle(10, height / 2 - 100, width - 20, 200, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(800)
      .setStrokeStyle(1, 0xe8d9b5);

    const label = addCrispText(this, width / 2, height / 2 - 80, text, {
      fontSize: '10px',
      color: GOLD,
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: width - 44 },
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(801);

    this.dialogElements = [bg, label];

    buttons.forEach((button, i) => {
      const buttonText = addCrispText(this, width / 2, height / 2 + 50 + i * 26, button.label, {
        fontSize: '10px',
        color: DARK,
        backgroundColor: GOLD,
        padding: { x: 8, y: 5 },
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(801)
        .setInteractive({ useHandCursor: true });
      buttonText.on('pointerdown', button.onClick);
      this.dialogElements.push(buttonText);
    });
  }

  private closeDialog(): void {
    this.dialogElements.forEach((el) => el.destroy());
    this.dialogElements = [];
    this.tapControl.setEnabled(true);
  }

  private showMessage(message: string): void {
    const messageText = addCrispText(this, this.scale.width / 2, 30, message, {
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

    this.time.delayedCall(1800, () => messageText.destroy());
  }

  private leaveHamlet(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Field', { x: 240, y: 440 });
    });
  }

  private leaveToFarm(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Farm');
    });
  }

  private leaveToShrine(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Shrine');
    });
  }
}
