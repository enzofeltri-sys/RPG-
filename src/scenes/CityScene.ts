import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { getMainQuestStage, advanceMainQuestStage } from '../game/mainQuest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 520;
const WORLD_HEIGHT = 480;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const QUEST_ID = 'city_road_patrol';

const MAGE_LINES = [
  "La Guilde des Mages étudie la corruption depuis des décennies. Votre marque n'est pas passée inaperçue, voyageur.",
  "Aiglemont n'est que la première des cités-États. Chacune a ses propres intérêts — et ses propres secrets.",
  "Si vous croisez des runes que vous ne comprenez pas, n'y touchez pas. Venez plutôt m'en parler.",
];

const CITIZEN_LINES = [
  'Aiglemont ne dort jamais vraiment, il y a toujours du monde sur les pavés.',
  "La garnison patrouille plus souvent qu'avant sur la route commerciale.",
  'Un jour, peut-être, je verrai les autres cités-États de mes propres yeux.',
];

interface CityData {
  x?: number;
  y?: number;
}

// Aiglemont — la première cité-État (région 2 de VISION.md), reliée à
// Valombre par la route commerciale (RoadScene). Volontairement pas de forge
// ici : l'artisanat reste l'identité de Valombre, Aiglemont apporte plutôt la
// première touche politique/faction (caserne, tour de mages) annoncée pour
// l'acte 2 dans DESIGN.md, sans encore de vrai système de réputation.
export class CityScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private character!: Character;
  private captain!: Phaser.GameObjects.Rectangle;
  private mage!: Phaser.GameObjects.Rectangle;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private citizens: Wanderer[] = [];
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private mageLineIndex = 0;
  private citizenLineIndex = 0;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('City');
  }

  init(data: CityData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.dialogElements = [];
    this.mageLineIndex = 0;
    this.drawGround();

    addCrispText(this, this.scale.width / 2, 12, 'Aiglemont', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    const garrison = this.addBuilding(150, 100, 80, 60);
    addCrispText(this, 150, 68, 'Caserne', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    const tower = this.addBuilding(400, 130, 50, 100);
    addCrispText(this, 400, 78, 'Tour des Mages', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    const market = this.addBuilding(280, 340, 100, 60);
    addCrispText(this, 280, 308, 'Marché', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    // Each NPC kept off the straight west-entrance-to-building lines, same
    // lesson as every other location this session.
    this.captain = this.add.rectangle(150, 190, 14, 20, 0x6a5a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.captain, true);
    addCrispText(this, 150, 170, 'Capitaine Bregan', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.mage = this.add.rectangle(400, 220, 14, 20, 0x4a3a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.mage, true);
    addCrispText(this, 400, 200, 'Mage Sélène', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.merchantNpc = this.add.rectangle(280, 260, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 280, 240, 'Marchand', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    // Stall near the market + a couple of ambient citizens — no collision on
    // the stall, no real art yet (increment 10).
    this.add.rectangle(230, 300, 20, 14, 0x6b5a3a).setStrokeStyle(1, 0x2e2419);
    this.citizens = [new Wanderer(this, 500, 300, 0x7a7a8a, 15), new Wanderer(this, 150, 420, 0x8a7a8a, 20)];

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.physics.add.collider(this.player, [garrison, tower, market]);
    this.physics.add.collider(this.player, this.captain);
    this.physics.add.collider(this.player, this.mage);
    this.physics.add.collider(this.player, this.merchantNpc);
    this.citizens.forEach((c) => this.physics.add.collider(this.player, c.sprite));

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveCity());

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Route commerciale', {
      fontSize: '9px',
      color: MUTED,
      align: 'center',
    }).setOrigin(0.5);

    // South exit — the hard-dungeon detour under the city (VISION.md notes
    // "donjons majeurs dans la capitale ou les cités-États").
    const catacombsZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(catacombsZone, true);
    this.physics.add.overlap(this.player, catacombsZone, () => this.enterCatacombs());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Catacombes ↓', {
      fontSize: '10px',
      color: MUTED,
    }).setOrigin(0.5);

    // East exit — optional detour, first Acte 2 side content outside the
    // city walls proper (see FaubourgScene).
    const faubourgZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(faubourgZone, true);
    this.physics.add.overlap(this.player, faubourgZone, () => this.enterFaubourg());

    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Faubourg des quais →', {
      fontSize: '9px',
      color: MUTED,
      align: 'center',
    }).setOrigin(0.5);

    // North exit — a low-stakes detour behind the Tour des Mages, same idea
    // as Le vieux puits: no gate, no quest, always a bit of loot at the end.
    const archivesZone = this.add.zone(WORLD_WIDTH / 2, 10, WORLD_WIDTH, 20);
    this.physics.add.existing(archivesZone, true);
    this.physics.add.overlap(this.player, archivesZone, () => this.enterArchives());

    addCrispText(this, WORLD_WIDTH / 2, 30, 'Archives scellées ↑', {
      fontSize: '9px',
      color: MUTED,
      align: 'center',
    }).setOrigin(0.5);

    const interactables: Interactable[] = [
      { x: this.captain.x, y: this.captain.y, radius: 24, onTap: () => this.talkToCaptain() },
      { x: this.mage.x, y: this.mage.y, radius: 24, onTap: () => this.talkToMage() },
      {
        x: this.merchantNpc.x,
        y: this.merchantNpc.y,
        radius: 24,
        onTap: () => this.scene.start('Merchant', { x: this.player.x, y: this.player.y, returnScene: 'City' }),
      },
      ...this.buildings.map((b) => ({
        x: b.x,
        y: b.y,
        radius: 40,
        onTap: () => this.showMessage('Un bâtiment fermé pour le moment.'),
      })),
      // Local consts (not `this.citizens[i].sprite` inline) so the getters
      // below are plain closures — an object literal's get x()/get y() would
      // otherwise bind `this` to the literal itself, not the scene.
      ...this.citizens.map((citizen) => {
        const sprite = citizen.sprite;
        return {
          get x() {
            return sprite.x;
          },
          get y() {
            return sprite.y;
          },
          radius: 20,
          onTap: () => this.talkToCitizen(),
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
      this.character = save.character;
      new CharacterSheetPanel(
        this,
        save.character,
        'City',
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
    this.citizens.forEach((c) => c.update());
  }

  private talkToCitizen(): void {
    const line = CITIZEN_LINES[this.citizenLineIndex % CITIZEN_LINES.length];
    this.citizenLineIndex += 1;
    this.showMessage(line);
  }

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a5468).setStrokeStyle(1, 0x2e2b3a);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  private drawGround(): void {
    if (!this.textures.exists('stoneTile')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0x4a4a52);
      g.fillRect(0, 0, 32, 32);
      g.fillStyle(0x545460);
      g.fillRect(0, 0, 16, 16);
      g.fillRect(16, 16, 16, 16);
      g.generateTexture('stoneTile', 32, 32);
      g.destroy();
    }
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'stoneTile').setOrigin(0, 0);
  }

  private talkToCaptain(): void {
    const quest = QUESTS[QUEST_ID];
    const progress = getQuestProgress(this.character, QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} sangliers corrompus vaincus.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLa garnison vous remercie. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog('La route commerciale est plus sûre grâce à vous.', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private talkToMage(): void {
    const stage = getMainQuestStage(this.character);

    if (stage === 'aiglemont') {
      this.openDialog(
        "Sélène examine votre marque avec une attention presque inquiète. « Je l'ai déjà vue, en théorie — dans les textes sur le rituel de scellement originel. Si elle s'éveille chez vous, c'est qu'un déséquilibre progresse quelque part. » Elle marque une pause. « Des rapports nous parviennent de plusieurs cités : des éclats du sceau disparaissent de leurs lieux de garde, un par un. Ce n'est pas le hasard qui répand la corruption. Quelqu'un l'orchestre. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'complete');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'complete') {
      this.openDialog(
        "Sélène déroule une carte usée sur la table. « Les catacombes sous la ville abritent d'anciens sceaux mineurs — le genre de lieu qu'on visiterait en premier pour effacer ses traces. Si quelqu'un s'en est pris à un éclat local, il y a de bonnes chances qu'on en trouve la marque là-dessous. Voulez-vous vérifier ? »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'catacombs');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'catacombs') {
      this.openDialog('Les Catacombes d\'Aiglemont, au sud de la ville. Cherchez ce qui a été profané.', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'trail_found') {
      this.openDialog(
        "Sélène examine ce que vous avez trouvé dans les catacombes, le visage grave. « Ce n'est qu'un début, mais au moins nous savons désormais par où chercher. Reposez-vous, voyageur — la route sera longue. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'debriefed');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'debriefed') {
      this.openDialog('« Restez prudent. Nous reprendrons cette enquête bientôt. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    const text = MAGE_LINES[this.mageLineIndex % MAGE_LINES.length];
    this.mageLineIndex += 1;
    this.openDialog(text, [{ label: 'Fermer', onClick: () => this.closeDialog() }]);
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

  private leaveCity(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Road', { x: 440, y: 110 });
    });
  }

  private enterCatacombs(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Catacombs');
    });
  }

  private enterArchives(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Archives');
    });
  }

  private enterFaubourg(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Faubourg');
    });
  }
}
