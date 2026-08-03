import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { getMainQuestStage, MainQuestStage } from '../game/mainQuest';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';
import { playQuestComplete } from '../ui/sound';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

const VILLAGER_LINES = [
  'Valombre reçoit pas mal de voyageurs ces temps-ci.',
  'La forge tourne à plein régime, allez donc voir le forgeron.',
  'On dit qu\'une route commerciale relie maintenant la ville à Aiglemont.',
];

// Post-game only ("style Daedra, drôles et étranges" — VISION.md), same
// unlock condition as Gontrand's chain (HamletScene) — a different comedic
// register here (commerce/greed rather than pseudo-science).
const POST_GAME_STAGES: MainQuestStage[] = ['ending_new_seal', 'ending_destruction', 'ending_ascension'];
const BRASQUE_QUEST_1 = 'brasque_wolf_relic';
const BRASQUE_QUEST_2 = 'brasque_bandit_relic';
const BRASQUE_QUEST_3 = 'brasque_goblin_relic';

interface VillageData {
  x?: number;
  y?: number;
}

// Valombre — the full-service town (forge, marchande), reached by crossing
// the Champ from the player's home hamlet (Basse-Combe, HamletScene). No
// early-game quest-giver or gathering here (increment 9 world pass) — those
// live in the hamlet and the Champ respectively, so Valombre reads as a real
// town you travel to rather than the same small starting point. Brasque
// (below) is the one exception, and deliberately so: he stays silent until
// the main quest is finished, so he never competes with that pacing.
export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private character!: Character;
  private messageText?: Phaser.GameObjects.Text;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private forgeBuilding!: Phaser.GameObjects.Rectangle;
  private bertrandHouse!: Phaser.GameObjects.Rectangle;
  private ombelineHouse!: Phaser.GameObjects.Rectangle;
  private innBuilding!: Phaser.GameObjects.Rectangle;
  private brasque!: Phaser.GameObjects.Rectangle;
  private villagers: Wanderer[] = [];
  private villagerLineIndex = 0;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
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

    this.bertrandHouse = this.addBuilding(120, 160, 70, 50);
    this.ombelineHouse = this.addBuilding(300, 210, 60, 60);
    this.forgeBuilding = this.addBuilding(190, 360, 90, 50);
    addCrispText(this, 190, 330, 'Forge', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    this.innBuilding = this.addBuilding(340, 460, 60, 70);
    addCrispText(this, 340, 420, 'Auberge du Cerf Bleu', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Decoration only, no collision — makes the wide-open grass between
    // buildings read as a village edge rather than an empty field.
    this.addTree(20, 60);
    this.addTree(440, 90);
    this.addTree(430, 320);
    this.addBush(200, 130);
    this.addBush(60, 400);
    this.addBush(380, 540);

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

    // Kept well clear of every other fixed point here — see the
    // POST_GAME_STAGES comment above for why he stays quiet until the main
    // quest is done.
    this.brasque = this.add.rectangle(60, 470, 14, 20, 0x8a5a2a).setStrokeStyle(1, 0x0b0c10);
    addCrispText(this, 60, 450, 'Brasque', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 80);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.merchantNpc);
    this.villagers.forEach((v) => this.physics.add.collider(this.player, v.sprite));
    this.physics.add.existing(this.brasque, true);
    this.physics.add.collider(this.player, this.brasque);

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
      { x: this.bertrandHouse.x, y: this.bertrandHouse.y, radius: 35, onTap: () => this.enterInterior('bertrand') },
      { x: this.ombelineHouse.x, y: this.ombelineHouse.y, radius: 35, onTap: () => this.enterInterior('ombeline') },
      { x: this.innBuilding.x, y: this.innBuilding.y, radius: 35, onTap: () => this.enterInterior('inn') },
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
      { x: this.brasque.x, y: this.brasque.y, radius: 22, onTap: () => this.talkToBrasque() },
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

  private talkToBrasque(): void {
    if (!POST_GAME_STAGES.includes(getMainQuestStage(this.character))) {
      this.openDialog(
        "Brasque compte des pièces derrière son étal, l'air pensif. « Une idée me trotte dans la tête, voyageur, mais elle n'est pas encore mûre. Repassez plus tard. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    const quest = QUESTS[BRASQUE_QUEST_1];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_1);

    if (!progress) {
      this.openDialog(
        `Brasque bondit de derrière son étal en vous voyant. « VOUS ! Le héros en personne, et à Valombre en plus ! » Il déroule déjà une pancarte à moitié peinte. ${quest.description}`,
        [
          {
            label: 'Accepter',
            onClick: async () => {
              startQuest(this.character, BRASQUE_QUEST_1);
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} loups corrompus vaincus.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "Brasque examine les crocs avec un sérieux tout commercial. « Parfait, parfait. » Il les aligne déjà en vitrine. « Article numéro un : en stock. » Voici votre part, pour la peine.",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_1);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToBrasqueArticle2();
  }

  // Reached only once brasque_wolf_relic is turned in — same chain shape as
  // Gontrand's tomes in HamletScene.
  private talkToBrasqueArticle2(): void {
    const quest = QUESTS[BRASQUE_QUEST_2];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_2);

    if (!progress) {
      this.openDialog(`Brasque a déjà la pancarte suivante en tête. ${quest.description}`, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, BRASQUE_QUEST_2);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nLe chef des bandits se terre toujours au Champ.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "« Magnifique. » Brasque tourne le bouton entre ses doigts comme s'il s'agissait d'un joyau. « Article numéro deux, en stock, prix déjà doublé rien que pour l'histoire qui va avec. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_2);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToBrasqueArticle3();
  }

  // Reached only once brasque_bandit_relic is turned in.
  private talkToBrasqueArticle3(): void {
    const quest = QUESTS[BRASQUE_QUEST_3];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_3);

    if (!progress) {
      this.openDialog(`Brasque en tremble presque d'avance. ${quest.description}`, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, BRASQUE_QUEST_3);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nLe chef des gobelins se terre toujours dans la Forêt.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "Brasque place le trophée en vitrine avec la solennité d'un couronnement. « Le Repaire du Héros est complet, voyageur. Trois articles, trois légendes. » Il hésite, puis sort un dernier bout de parchemin. « Une signature, pendant que vous êtes là ? Ça double la valeur de tout le reste. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_3);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.openDialog('« Le Repaire du Héros, voyageur. Article numéro un du commerce local, ces temps-ci. »', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[], boxHeight = 200): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const boxTop = height / 2 - 100;

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

    const bg = this.add
      .rectangle(10, boxTop, width - 20, boxHeight, 0x0b0c10, 0.97)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(800)
      .setStrokeStyle(1, 0xe8d9b5);

    this.dialogElements = [bg, label];

    const maxButtonStartY = height - 20 - (buttons.length - 1) * 26;
    const buttonStartY = Math.min(Math.max(height / 2 + 50, label.y + label.height + 14), maxButtonStartY);
    buttons.forEach((button, i) => {
      const buttonText = addCrispText(this, width / 2, buttonStartY + i * 26, button.label, {
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

    const contentBottom = buttonStartY + (buttons.length - 1) * 26 + 15;
    if (contentBottom - boxTop + 12 > boxHeight) {
      bg.setSize(width - 20, contentBottom - boxTop + 12);
    }
  }

  private closeDialog(): void {
    this.dialogElements.forEach((el) => el.destroy());
    this.dialogElements = [];
    this.tapControl.setEnabled(true);
  }

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  // Purely decorative (no collision) — a wide-open ground tile between
  // buildings otherwise reads as empty rather than "the edge of a village."
  private addTree(x: number, y: number): void {
    this.add.circle(x, y, 12, 0x2e5a2e).setStrokeStyle(1, 0x1a3a1a);
    this.add.rectangle(x, y + 10, 5, 8, 0x4a3a2a);
  }

  private addBush(x: number, y: number): void {
    this.add.circle(x, y, 7, 0x3a6a3a).setStrokeStyle(1, 0x1a3a1a);
  }

  // The 3 formerly dead-end "personne ne répond" buildings, now each their
  // own small InteriorScene with a distinct resident — see InteriorScene's
  // doc comment for why this is one reusable scene rather than 3 new files.
  private enterInterior(which: 'bertrand' | 'ombeline' | 'inn'): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const returnX = this.player.x;
    const returnY = this.player.y;
    const configs = {
      bertrand: {
        label: 'Maison de Bertrand',
        floorColor: 0x2a2420,
        npcName: 'Bertrand',
        npcColor: 0x5a6a7a,
        lines: [
          "Vous auriez dû voir la taille de ce poisson, voyageur. Grand comme... enfin, disons deux fois la taille d'un loup corrompu.",
          "Trois fois. En fait, en y repensant bien, c'était plutôt trois fois la taille d'un loup corrompu.",
          "Un jour je le rattraperai. Ou alors ce sera lui qui me rattrapera. À ce stade, difficile de dire qui chasse qui.",
        ],
      },
      ombeline: {
        label: "Maison d'Ombeline",
        floorColor: 0x2a2028,
        npcName: 'Ombeline',
        npcColor: 0x8a5a7a,
        lines: [
          'Chut, ne réveillez pas Mistigri. Ni Griselda. Ni les onze autres, d\'ailleurs — je ne me souviens plus très bien de tous leurs noms.',
          "On me dit qu'il n'y a pas de chat dans cette pièce, voyageur. Ces gens n'ont manifestement jamais eu de chat invisible.",
          "Un jour j'écrirai un livre sur mes chats. Il sera très court, vu qu'aucun d'eux ne sait lire pour me raconter sa journée.",
        ],
      },
      inn: {
        label: 'Auberge du Cerf Bleu',
        floorColor: 0x2a2418,
        npcName: "Fernand, l'aubergiste",
        npcColor: 0x7a5a3a,
        lines: [
          "Bienvenue à l'auberge, voyageur ! On n'a plus de chambres, plus de bière, et le cuisinier a démissionné la semaine dernière — mais l'accueil, ça, c'est gratuit.",
          "On raconte que le sanctuaire porte chance aux voyageurs. Moi je raconte surtout que ma soupe porte malheur à qui la termine.",
          'Un conseil, voyageur : ne demandez jamais ce qu\'il y a dans le ragoût du jour. Certaines réponses ne se pardonnent pas.',
        ],
      },
    } as const;
    const config = configs[which];
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Interior', { ...config, returnScene: 'Village', returnX, returnY });
    });
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
