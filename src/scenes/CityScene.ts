import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { getMainQuestStage, advanceMainQuestStage } from '../game/mainQuest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 520;
const WORLD_HEIGHT = 480;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const QUEST_ID = 'city_road_patrol';
const ALPHA_QUEST_ID = 'city_road_patrol_alpha';

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
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.talkToCaptainAboutAlpha();
  }

  // Reached only once city_road_patrol is turned in — the boss itself lives
  // on the Route commerciale (RoadScene), not here, same split as Faubourg
  // (quest dialogue) / Entrepôt (the fight itself).
  private talkToCaptainAboutAlpha(): void {
    const quest = QUESTS[ALPHA_QUEST_ID];
    const progress = getQuestProgress(this.character, ALPHA_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, ALPHA_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nToujours aucune trace de cette bête depuis la route.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLa route commerciale est enfin sûre. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, ALPHA_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
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
              playQuestComplete();
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
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'debriefed') {
      this.openDialog(
        "Sélène vous fait signe avant même que vous n'ayez parlé. « Un contact au Faubourg des quais m'a fait porter un message : des caisses débarquées ces dernières semaines portent une marque qu'on utilisait autrefois pour transporter des reliques scellées. Les contrebandiers qui les déchargent n'y comprennent sans doute rien — mais leur chef, retranché dans un entrepôt au nord des quais, pourrait en savoir plus. Voulez-vous aller y voir ? »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'faubourg_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'faubourg_lead') {
      this.openDialog(
        "« Le Faubourg des quais, à l'est de la ville. Trouvez ce capitaine, et ce qu'il transporte vraiment. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'shard_confirmed') {
      this.openDialog(
        "Sélène déballe avec précaution ce que vous avez rapporté du bureau du capitaine, et pâlit en reconnaissant la texture : un fragment scellé, minuscule mais authentique, une résine grise creusée de runes à moitié effacées. « Les contrebandiers n'étaient que des porteurs. Quelqu'un plus haut dans la chaîne organise ces transports vers... » Elle s'interrompt, le regard tourné vers la marque à votre poignet, qui s'est remise à luire faiblement. « Vers l'ouest, je pense. Vers les cités du fleuve. Ce n'est plus une affaire locale, voyageur — le sceau se déchire à une échelle que je n'avais pas imaginée. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'shards_beyond');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'shards_beyond') {
      this.openDialog(
        "Sélène a passé la nuit sur ses cartes, les traits tirés. « Le Relais des chasseurs, en aval de la route fluviale, surveille tout le trafic qui descend vers l'ouest depuis des années. S'il existe une trace récente de cette caravane, ce sont eux qui l'auront croisée en premier. Allez leur parler — discrètement, la garde du relais n'a pas besoin de s'en mêler. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'trail_west');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'trail_west') {
      this.openDialog(
        '« Le Relais des chasseurs, en aval de la route fluviale. Revenez me voir si vous apprenez quelque chose là-bas. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'river_lead') {
      this.openDialog(
        "Sélène range la carte, le visage grave mais résolu. « Nous savons désormais qu'une main organisée arrache les éclats du sceau, qu'elle opère depuis les cités du fleuve, et que votre marque est directement liée à tout cela. Ce n'est plus une rumeur, voyageur — c'est une menace avérée. » Elle vous regarde longuement. « Vous n'êtes plus un simple survivant d'un village frontalier. Vous êtes devenu la seule personne capable de suivre cette trace jusqu'au bout. Reposez-vous, entraînez-vous, préparez-vous — la route vers les Terres Noyées sera longue, et je ne peux pas encore vous y accompagner. Quand vous serez prêt à la reprendre, revenez me voir. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'act1_complete');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'act1_complete') {
      this.openDialog(
        "Sélène range ses instruments avec la précision de quelqu'un qui s'y est préparé longtemps. « Vous voilà prêt, à ce que je vois. » Elle pose une carte usée sur la table, la dernière portion tracée à l'encre plus récente que le reste. « Vasenoire. La seule cité encore debout dans les Terres Noyées, à ce qu'on raconte — le reste du delta a sombré depuis des générations. Si votre marque vous mène vers l'ouest, c'est probablement là qu'elle vous mène en premier. » Elle marque une pause. « Au-delà d'Aiglemont, mon autorité ne vaut plus grand-chose. Vous serez seul, voyageur. Faites-en bon usage. »",
        [
          {
            label: 'Partir',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'crossing_marshes');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'crossing_marshes') {
      this.openDialog('« Vasenoire, au-delà du Relais des chasseurs. Soyez prudent, voyageur. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'vasenoire_arrival') {
      this.openDialog(
        "« Vous avez atteint Vasenoire, à ce que dit votre marque. Je ne peux plus vous guider depuis ici — la suite se jouera là-bas. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'smugglers_unmasked') {
      this.openDialog(
        "Sélène écoute votre récit sans un mot, jusqu'au bout. « Le capitaine du Faubourg... » Elle secoue la tête, presque amère. « Je le pensais mort avec son secret. Il semble que son réseau lui ait survécu, et qu'il se soit simplement déplacé là où personne ne songeait à regarder. » Elle range ses cartes, plus lentement que d'habitude. « Vous avez fait ce qu'aucun garde d'Aiglemont n'a su faire en deux ans d'enquête, voyageur. Ce fil-là n'est pas coupé — mais il est enfin visible. Reposez-vous. Vous en aurez besoin pour la suite. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'network_reported');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'network_reported') {
      this.openDialog(
        "Sélène relit une dernière fois le rapport que vous avez rapporté du quai clandestin, un sourcil froncé. « Le lieutenant transportait plus que des caisses volées, voyageur. Parmi ses papiers, une adresse codée revient trois fois : un ancien sanctuaire scellé, englouti avec le reste du delta, que les Limaneux évitent depuis des générations — ils prétendent qu'on y entend encore chanter les gardiens. » Elle repose les papiers, le regard sombre. « Si le réseau y stockait un dépôt d'éclats, c'est là qu'il faut chercher, pas dans un entrepôt de plus. L'entrée doit se trouver quelque part près du quai clandestin lui-même — personne d'autre n'aurait pu y accéder aussi facilement. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'sealed_vault_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'sealed_vault_lead') {
      this.openDialog(
        '« Le sanctuaire scellé, près du quai clandestin. Méfiez-vous de ce qui le garde encore, voyageur. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'vault_uncovered') {
      this.openDialog(
        "Sélène manipule le pendentif que vous avez rapporté avec une prudence presque révérencieuse, comme s'il pouvait encore se refermer sur ses doigts. « Un gardien scellé avec le dépôt lui-même... Je n'avais lu cela que dans de très vieux textes, et je pensais qu'ils exagéraient. » Elle le repose enfin, incapable de cacher un frisson. « Ce sanctuaire ne protégeait pas un simple entrepôt de contrebandiers, voyageur — c'était une réserve, dissimulée depuis le rituel de scellement originel lui-même. Si le réseau avait fini par la localiser, la question n'est plus de savoir combien d'éclats circulent. C'est de savoir qui d'autre a fini par la trouver avant eux. » Elle range le pendentif avec soin. « Reposez-vous. Cette découverte va demander qu'on reconsidère bien des choses. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'shard_cache_found');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'shard_cache_found') {
      this.openDialog(
        "« Le sanctuaire englouti a livré son secret, mais pas encore toutes ses réponses. Nous y reviendrons, voyageur — pour l'instant, reposez-vous. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
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
