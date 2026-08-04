import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { getMainQuestStage, advanceMainQuestStage, MainQuestStage } from '../game/mainQuest';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { playChestOpen, playQuestComplete } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';

const CHEST_ID = 'hamlet_chest_1';
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

// Post-game only ("style Daedra, drôles et étranges" — VISION.md) — Gontrand
// stays a normal (if odd) hamlet resident until the main quest is actually
// finished, then offers a 3-part chain. Checked against the 3 terminal
// endings rather than a single boolean flag so any of them unlocks it.
const POST_GAME_STAGES: MainQuestStage[] = ['ending_new_seal', 'ending_destruction', 'ending_ascension'];
const GONTRAND_QUEST_1 = 'gontrand_rats';
const GONTRAND_QUEST_2 = 'gontrand_wolves';
const GONTRAND_QUEST_3 = 'gontrand_bandit';

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
  private chest!: Phaser.GameObjects.Rectangle;
  private villager!: Wanderer;
  private gontrand!: Phaser.GameObjects.Rectangle;
  private thibaultHouse!: Phaser.GameObjects.Rectangle;
  private solangeHouse!: Phaser.GameObjects.Rectangle;
  private fauvetteHouse!: Phaser.GameObjects.Rectangle;
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
    this.thibaultHouse = this.addBuilding(50, 90, 44, 36);
    this.solangeHouse = this.addBuilding(190, 90, 44, 36);
    // A third hut further south, off the x=120 centerline — keeps the
    // extended hamlet from reading as an empty stretch of grass while
    // staying "deliberately sparse" (see the class doc comment).
    this.fauvetteHouse = this.addBuilding(190, 300, 40, 32);

    // Decoration only, no collision. Kept clear of the x=120 centerline and
    // the farm/shrine transition strips at the world's left/right edges.
    this.addTree(90, 220);
    this.addTree(150, 220);
    this.addBush(30, 180);
    this.addBush(210, 180);

    // An old chest stashed beside that third, mostly-abandoned hut.
    this.chest = this.add.rectangle(150, 330, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);

    this.mentor = this.add.rectangle(150, 130, 14, 20, 0x5a4a3a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.mentor, true);
    addCrispText(this, 150, 110, 'Aldric', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Purely ambient — makes the hamlet read as lived-in rather than a
    // backdrop. Small patrol range, kept clear of the x=120 centerline and
    // every building/zone.
    this.villager = new Wanderer(this, 70, 150, 0x8a7a5a, 20);

    // Kept well clear of every other fixed point here (buildings at
    // (50,90)/(190,90)/(190,300), chest at (150,330), mentor at (150,130)) —
    // see the POST_GAME_STAGES comment above for why he stays quiet until
    // the main quest is done.
    this.gontrand = this.add.rectangle(50, 250, 14, 20, 0x7a6a5a).setStrokeStyle(1, 0x0b0c10);
    addCrispText(this, 50, 230, 'Gontrand', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 30);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.mentor);
    this.physics.add.collider(this.player, this.villager.sprite);
    this.physics.add.existing(this.gontrand, true);
    this.physics.add.collider(this.player, this.gontrand);

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
      { x: this.thibaultHouse.x, y: this.thibaultHouse.y, radius: 30, onTap: () => this.enterInterior('thibault') },
      { x: this.solangeHouse.x, y: this.solangeHouse.y, radius: 30, onTap: () => this.enterInterior('solange') },
      { x: this.fauvetteHouse.x, y: this.fauvetteHouse.y, radius: 30, onTap: () => this.enterInterior('fauvette') },
      { x: this.chest.x, y: this.chest.y, radius: 20, onTap: () => this.handleChestTap() },
      { x: this.gontrand.x, y: this.gontrand.y, radius: 22, onTap: () => this.talkToGontrand() },
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      await setPlayerAppearance(this, this.player, this.character.race, this.character.class);
      if (!this.scene.isActive()) return;
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
      }
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

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  // Purely decorative (no collision).
  private addTree(x: number, y: number): void {
    this.add.circle(x, y, 12, 0x2e5a2e).setStrokeStyle(1, 0x1a3a1a);
    this.add.rectangle(x, y + 10, 5, 8, 0x4a3a2a);
  }

  private addBush(x: number, y: number): void {
    this.add.circle(x, y, 7, 0x3a6a3a).setStrokeStyle(1, 0x1a3a1a);
  }

  // The 3 formerly dead-end "personne ne répond" cabanes, each now their
  // own small InteriorScene — see InteriorScene's doc comment.
  private enterInterior(which: 'thibault' | 'solange' | 'fauvette'): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const returnX = this.player.x;
    const returnY = this.player.y;
    const configs = {
      thibault: {
        label: 'Cabane de Thibault',
        floorColor: 0x2a2420,
        npcName: 'Thibault',
        npcColor: 0x6a5a4a,
        lines: [
          "Vous croyez que c'est fini, voyageur ? Moi je dis qu'il y a sûrement encore un gobelin quelque part qui prépare sa revanche.",
          "J'ai muré la fenêtre côté nord. On ne sait jamais, avec les gobelins. Ou les rats. Ou le vent, en fait, mais surtout les gobelins.",
          "Ma femme dit que j'exagère. Je lui réponds qu'elle exagérera moins le jour où un gobelin passera par la fenêtre nord. Qui est murée. Donc jamais. Ce qui me donne raison.",
        ],
      },
      solange: {
        label: 'Cabane de Solange',
        floorColor: 0x28242a,
        npcName: 'Solange',
        npcColor: 0x8a6a7a,
        lines: [
          'Cette marque sur votre bras, voyageur, quelle nuance exacte ? J\'essaie de la reproduire en laine depuis des semaines et rien n\'y fait.',
          'Le bleu-doré, non. Le doré-bleu, peut-être ? Il me faudrait vous regarder d\'encore plus près, tenez-vous tranquille.',
          "Un jour je tisserai une tapisserie de toute votre histoire. Pour l'instant, j'ai surtout tissé une écharpe. Mais l'ambition est là.",
        ],
      },
      fauvette: {
        label: 'Cabane de Fauvette',
        floorColor: 0x242a24,
        npcName: 'Fauvette',
        npcColor: 0x7a8a6a,
        lines: [
          'Le monde a failli se briser, à ce qu\'on raconte. Mes tomates, elles, se portent très bien, merci de demander.',
          "On m'a dit qu'il y avait un roi démon scellé sous le sanctuaire. Personnellement, je me méfie plus des limaces.",
          "Revenez au printemps, voyageur, je vous donnerai des graines. Ça marche mieux qu'une épée contre l'ennui, à mon âge.",
        ],
      },
    } as const;
    const config = configs[which];
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Interior', { ...config, returnScene: 'Hamlet', returnX, returnY });
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
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.talkToMentorAboutMark();
  }

  // Reached only once wolves_threat is turned in — the main quest thread
  // (Acte 1 de DESIGN.md) picks up from there.
  private talkToMentorAboutMark(): void {
    const stage = getMainQuestStage(this.character);

    if (stage === 'not_started') {
      this.openDialog(
        "Aldric fronce les sourcils. « Ces loups n'agissaient pas comme des bêtes ordinaires. Il y a autre chose dans leur repaire — quelque chose qui les pousse à cette folie. Retournez-y, et affrontez ce qui commande à la meute. Je crains que cela ne vous concerne plus que vous ne le pensez. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'dungeon');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'dungeon') {
      this.openDialog('Le Repaire du Loup, au nord du Champ. Trouvez ce qui commande à la meute.', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'revelation') {
      this.openDialog(
        "Vous racontez à Aldric ce que vous avez trouvé dans l'antre du loup alpha. Son regard s'assombrit en voyant la marque qui luit faiblement sur votre peau depuis le combat. « Ce n'est pas une simple morsure, mon enfant... cette marque appelle quelque chose de très ancien. Je ne peux pas t'aider davantage — mais à Aiglemont, la Guilde des Mages étudie ce genre de choses depuis des décennies. Trouve leur mage, Sélène. Elle saura, elle. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'aiglemont');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'aiglemont') {
      this.openDialog('Rendez-vous à la Tour des Mages, à Aiglemont, et trouvez Sélène.', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    this.openDialog('Faites attention à vous, à Aiglemont. Basse-Combe pense à vous.', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private talkToGontrand(): void {
    if (!POST_GAME_STAGES.includes(getMainQuestStage(this.character))) {
      this.openDialog(
        "Gontrand vous salue de loin sans lever les yeux de ses parchemins. « Occupé, voyageur, très occupé. Une encyclopédie ne s'écrit pas toute seule. Repassez quand le monde sera un peu plus calme. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    const quest = QUESTS[GONTRAND_QUEST_1];
    const progress = getQuestProgress(this.character, GONTRAND_QUEST_1);

    if (!progress) {
      this.openDialog(
        `Gontrand se lève d'un bond, des parchemins glissant de ses genoux. « Vous ! Le héros ! Justement ce qu'il me fallait — quelqu'un qui a l'autorité pour trancher un débat scientifique vieux de vingt ans. » Il brandit un carnet couvert d'une écriture minuscule. « ${quest.description} »`,
        [
          {
            label: 'Accepter',
            onClick: async () => {
              startQuest(this.character, GONTRAND_QUEST_1);
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
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} rats des champs vaincus.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "« Alors ? » Gontrand se penche, avide. Vous décrivez des rats, ordinaires, poilus, nullement infernaux. Un silence. « Hmm. Ils ont dû sentir votre approche et prendre une forme plus discrète, évidemment. L'hypothèse tient toujours. » Il note quelque chose. « Merci, voyageur. Voici pour votre peine. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, GONTRAND_QUEST_1);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToGontrandTome2();
  }

  // Reached only once gontrand_rats is turned in — same chain shape as
  // talkToGuard/talkToGuardAboutLeader in BanditCampScene.
  private talkToGontrandTome2(): void {
    const quest = QUESTS[GONTRAND_QUEST_2];
    const progress = getQuestProgress(this.character, GONTRAND_QUEST_2);

    if (!progress) {
      this.openDialog(`Gontrand tourne déjà la page. « Le Tome II, voyageur, s'impose de lui-même. ${quest.description} »`, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, GONTRAND_QUEST_2);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
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
        "« De la taille d'un cheval de trait, disiez-vous ? » Vous précisez que non, pas vraiment, plutôt la taille d'un grand chien. Gontrand hoche la tête avec assurance. « Un grand chien de la taille d'un cheval de trait, donc. Exactement ce que dit ma source. » Il note quelque chose, très satisfait.",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, GONTRAND_QUEST_2);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToGontrandTome3();
  }

  // Reached only once gontrand_wolves is turned in.
  private talkToGontrandTome3(): void {
    const quest = QUESTS[GONTRAND_QUEST_3];
    const progress = getQuestProgress(this.character, GONTRAND_QUEST_3);

    if (!progress) {
      this.openDialog(
        `Gontrand baisse la voix, comme si le sujet exigeait plus de discrétion que tout le reste réuni. « Le Tome III, voyageur. Celui qui fera ma réputation, ou ma ruine. ${quest.description} »`,
        [
          {
            label: 'Accepter',
            onClick: async () => {
              startQuest(this.character, GONTRAND_QUEST_3);
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
      this.openDialog(`${quest.title}\n\nLe chef des bandits se terre toujours au Champ. Une seule tête suffira comme preuve.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "Une tête. Une seule. Gontrand reste silencieux, déchiré entre vingt ans de certitude et les faits. « ...Il aura fallu que les deux autres se cachent, le temps que vous arriviez. » Il referme son carnet avec la dignité de qui vient de perdre un débat en le croyant gagné. « L'Encyclopédie de Gontrand est achevée. Trois tomes. Toute ma vie. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, GONTRAND_QUEST_3);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.openDialog(
      "« L'Encyclopédie de Gontrand, Tomes I à III. Achevée. » Il caresse la couverture avec fierté. « Un jour, peut-être, quelqu'un me croira. »",
      [{ label: 'Fermer', onClick: () => this.closeDialog() }],
    );
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[], boxHeight = 200): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const boxTop = height / 2 - 100;

    // Measured before the buttons so a long paragraph pushes them down
    // instead of running underneath them (found via testing: Gontrand's
    // Tome III completion text overlapped its own button at the old fixed
    // offset — see ShrineScene.openDialog for the same fix applied there
    // first).
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

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'Hamlet');
    this.chest.setFillStyle(0x3a3428);
    await SaveManager.saveCharacter(this.character);
    if (loot) {
      playChestOpen();
      this.showMessage(chestLootMessage(loot));
    }
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
