import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
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
    void attachSpriteOverlay(this, this.captain, 'npc-city_captain', `${import.meta.env.BASE_URL}sprites/npc/city_captain.png`, 24);
    this.physics.add.existing(this.captain, true);
    addCrispText(this, 150, 170, 'Capitaine Bregan', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.mage = this.add.rectangle(400, 220, 14, 20, 0x4a3a7a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.mage, 'npc-city_mage', `${import.meta.env.BASE_URL}sprites/npc/city_mage.png`, 24);
    this.physics.add.existing(this.mage, true);
    addCrispText(this, 400, 200, 'Mage Sélène', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    this.merchantNpc = this.add.rectangle(280, 260, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.merchantNpc, 'npc-merchant_generic', `${import.meta.env.BASE_URL}sprites/npc/merchant_generic.png`, 24);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 280, 240, 'Marchand', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

    // Stall near the market + a couple of ambient citizens — no collision on
    // the stall, no real art yet (increment 10).
    this.add.rectangle(230, 300, 20, 14, 0x6b5a3a).setStrokeStyle(1, 0x2e2419);
    this.citizens = [new Wanderer(this, 500, 300, 0x7a7a8a, 15, 'villager_wanderer'), new Wanderer(this, 150, 420, 0x8a7a8a, 20, 'villager_wanderer')];

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

    // Une ruelle du vieux quartier que tout le monde évite depuis des
    // générations, sans trop savoir pourquoi — une porte de cave scellée,
    // jamais rattachée à un nom jusqu'à ce que le registre en révèle un.
    // Toujours franchissable, quelle que soit l'étape de la quête en cours.
    const cryptZone = this.add.zone(470, 400, 30, 20);
    this.physics.add.existing(cryptZone, true);
    this.physics.add.overlap(this.player, cryptZone, () => this.enterAncestralCrypt());
    addCrispText(this, 470, 413, 'Ruelle oubliée ↓', { fontSize: '8px', color: MUTED }).setOrigin(0.5);

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
      await setPlayerAppearance(this, this.player, this.character.race, this.character.class);
      if (!this.scene.isActive()) return;
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
        "Sélène range enfin le pendentif, mais son inquiétude ne retombe pas. « J'ai relu vos notes sur le sanctuaire, voyageur. Le passage que vous avez emprunté n'était pas intact — quelqu'un l'avait forcé bien avant le lieutenant et son réseau, à en juger par l'état des scellés extérieurs. » Elle fait les cent pas. « Les Limaneux connaissent ce delta mieux que quiconque. Si un autre groupe rôdait dans les parages avant les contrebandiers, Yenn en aura forcément entendu parler — les Limaneux ne laissent jamais un étranger armé traverser leurs terres sans le remarquer. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rival_hunters_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'rival_hunters_lead') {
      this.openDialog(
        "« Retournez voir Yenn, à Vasenoire. Si quelqu'un d'autre fouillait le delta avant le réseau du lieutenant, les Limaneux le sauront. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'rival_hunters_confirmed') {
      this.openDialog(
        "Sélène écoute votre récit, le visage fermé. « Les Chercheurs d'éclats... » Elle répète le nom comme pour se convaincre qu'elle ne l'invente pas. « Si un groupe organisé traque ces fragments depuis des années, sans lien avec les contrebandiers que vous avez démantelés, alors ce n'est plus une question de trafic, voyageur. C'est une question de savoir qui, exactement, cherche à reconstituer le sceau — et pourquoi. » Elle range ses instruments plus lentement que d'habitude. « Je n'ai pas de piste à vous donner cette fois. Juste un nom, et l'intuition que nous n'avons pas fini d'en entendre parler. Reposez-vous, voyageur. La suite demandera qu'on sache où chercher. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'threat_acknowledged');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'threat_acknowledged') {
      this.openDialog(
        "Sélène vous fait signe d'approcher avant même que vous n'ayez parlé, un pli à la main. « Yenn m'a fait porter ceci. Les Limaneux ont fouillé le sanctuaire scellé après votre départ, par prudence — et ont trouvé un passage que ni vous ni le gardien n'aviez remarqué, dissimulé derrière l'autel où reposait le pendentif. » Elle déplie la lettre. « Des traces montrent qu'il servait encore, il n'y a pas si longtemps. Si les Chercheurs d'éclats ont un point d'ancrage dans le delta, voyageur, il est probablement là. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'chercheurs_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'chercheurs_lead') {
      this.openDialog(
        "« Le passage caché, au fond du sanctuaire scellé. Prudence, voyageur — s'ils sont encore là, ils ne vous laisseront pas repartir avec leurs secrets aussi facilement que le gardien. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'seekers_confronted') {
      this.openDialog(
        "Sélène examine le sceau que vous avez rapporté sans un mot, longtemps. « Ainsi les Chercheurs d'éclats n'ont jamais vraiment disparu — ils se sont juste terrés, patiemment, en attendant de trouver ce qu'ils cherchaient. » Elle repose le sceau. « Vous venez de leur ôter leur avance et leur meilleur limier, voyageur. Ce n'est pas rien. Mais une organisation pareille ne tient pas sur un seul homme — s'ils avaient un plan, quelqu'un d'autre le poursuit déjà. » Elle vous regarde, presque à contrecœur. « Reposez-vous. Nous en saurons davantage bien assez tôt, j'en ai peur. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'seekers_defeated');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'seekers_defeated') {
      this.openDialog(
        "Sélène a passé des jours à décortiquer les carnets de l'archiviste, et son visage en dit long quand vous entrez. « Les Chercheurs d'éclats ne travaillaient pas pour leur propre compte, voyageur. Chaque piste qu'ils suivaient, chaque éclat qu'ils cataloguaient, tout convergeait vers un seul objectif : localiser le tombeau de la confrérie fondatrice — le site où reposent, depuis trois siècles, les mages qui ont scellé le Roi Démon. » Elle repousse les carnets, comme si leur seul contact la salissait. « Si un groupe de chercheurs isolés y consacrait des années entières, ce n'est pas par simple curiosité érudite. Quelqu'un, au-dessus d'eux, veut ce tombeau — et je crains fort que ce ne soit pas pour l'honorer. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'brotherhood_tomb_hinted');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'brotherhood_tomb_hinted') {
      this.openDialog(
        "Sélène a passé du temps sur d'anciennes cartes et des relevés antérieurs à la Rupture. « Le tombeau de la confrérie fondatrice n'a jamais été retrouvé, voyageur — officiellement. Mais les récits qui ont survécu convergent tous vers un seul endroit : sous les ruines englouties, au sud du delta, là où vous avez déjà affronté les pillards du réseau. Ce que vous preniez pour le fond des ruines n'était peut-être qu'un plafond. » Elle roule la carte avec soin. « Si quelqu'un cherche vraiment ce tombeau, c'est là qu'il faudra le devancer. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'tomb_location_found');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'tomb_location_found') {
      this.openDialog('« Sous les Ruines englouties, voyageur. Cherchez ce qui ne devrait pas s\'y trouver. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'tomb_raided') {
      this.openDialog(
        "Sélène vous écoute en silence, incapable de masquer son effroi. « Un émissaire du Roi Démon lui-même, ici, dans ce monde... » Elle se reprend. « Vous l'avez vaincu, et c'est plus que quiconque n'a jamais fait avant vous. Mais si un tel être a été envoyé pour ce tombeau, c'est qu'il n'était pas venu les mains vides : un éclat majeur, gardé depuis trois siècles, a disparu avec lui avant même que vous n'atteigniez la chambre funéraire. » Elle s'assoit lourdement. « Les premiers rapports arrivent déjà des Terres Noyées, voyageur. La corruption gagne du terrain, plus vite qu'elle ne l'a jamais fait. Ce que vous avez empêché là-bas... ce n'était qu'un début. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'act2_complete');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'act2_complete') {
      this.openDialog(
        "Sélène ne vous laisse pas fermer la porte derrière vous. « Les premiers rapports que je redoutais sont arrivés, voyageur — plus vite que je ne l'espérais. » Elle déplie une carte tachée d'encre fraîche. « Le Relais des chasseurs, à la lisière des Terres Noyées, signale des bêtes qui fuient sans raison apparente et des cultures qui noircissent du jour au lendemain. C'est exactement ainsi que la corruption s'est propagée près de chez vous, il y a des années. » Elle vous regarde, grave. « Si la région tombe vraiment, ce sera le premier endroit touché de ce côté du delta. Allez voir par vous-même. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'outpost_corruption_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'outpost_corruption_lead') {
      this.openDialog('« Le Relais des chasseurs, voyageur. Voyez ce qu\'il en est vraiment. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'corruption_confirmed') {
      this.openDialog(
        "« La corruption gagne déjà le Relais des chasseurs, voyageur. Restez-y, et voyez ce que vous pouvez faire. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (stage === 'blighted_grove_lead') {
      this.openDialog('« Le bosquet corrompu, près du Relais des chasseurs. Soyez prudent, voyageur. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'grove_purified') {
      this.openDialog(
        "Sélène examine la cuirasse noircie que vous avez rapportée, presque incrédule. « Un cœur de corruption, formé spontanément autour de l'éclat qui fuit... » Elle repose l'objet avec précaution. « Vous venez de contenir le premier foyer, voyageur. Mais un éclat majeur continue de répandre son influence quelque part — celui-ci n'était qu'une retombée, pas la source. » Elle se tait un instant. « Vous avez gagné du temps. Pas la guerre. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'corruption_contained');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'corruption_contained') {
      this.openDialog(
        "Sélène étale ses recherches, épuisée mais méthodique. « J'ai recoupé les carnets du tombeau avec ce que nous savons du bosquet, et un détail me trouble depuis des jours. » Elle pointe un passage ancien, presque effacé. « Le site où la confrérie fondatrice a scellé le Roi Démon, il y a trois siècles, n'a jamais été 'perdu', voyageur. Il a simplement été oublié — rebâti dessus, renommé, jusqu'à ce que plus personne ne se souvienne de ce qu'il abritait vraiment. » Elle relève les yeux vers vous, presque incrédule de ce qu'elle s'apprête à dire. « Le petit sanctuaire, près de Basse-Combe. Celui où vous avez grandi. C'est là. Ça a toujours été là. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'original_site_revealed');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'original_site_revealed') {
      this.openDialog(
        "Sélène a passé la nuit à préparer ce qu'elle va vous dire. « Je ne peux pas vous accompagner au sanctuaire, voyageur — pas encore. Mais je peux vous dire ce qu'il faut y chercher : un passage que l'ermite lui-même ignore sans doute, scellé sous l'autel depuis trois siècles. » Elle referme son grimoire. « Si le site originel du scellement se trouve vraiment là, la vérité sur ce qui s'y est passé vous y attend aussi. Soyez prêt à ce que vous y trouverez. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'shrine_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (stage === 'shrine_lead') {
      this.openDialog('« Le petit sanctuaire, près de Basse-Combe. Cherchez sous l\'autel, voyageur. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'seal_failing') {
      this.openDialog(
        "Sélène ausculte la lame que vous rapportez, incapable de cacher son trouble. « Le Gardien primordial... la magie même du rituel de scellement, devenue hostile. » Elle repose l'arme avec précaution. « Vous n'étiez pas seul là-dessous, voyageur. » Elle hésite, comme si les mots lui coûtaient. « Une silhouette, dans la chambre funéraire — partie avant que vous n'ayez pu l'affronter. Elle n'a rien volé. Elle n'a rien détruit. Elle a seulement... regardé. Comme si elle cherchait la même chose que vous. » Elle vous fixe, grave. « Nous ne sommes plus seuls à remonter cette piste, voyageur. Et je crains que celui — ou celle — qui la remonte avec nous n'ait pas les mêmes intentions. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'antagonist_glimpsed');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'antagonist_glimpsed') {
      this.openDialog(
        "« Nous devons découvrir qui cherche ce que vous cherchez, voyageur, et pourquoi. » Sélène feuillette son grimoire, en vain. « Mes propres moyens ne suffiront pas à mettre un nom sur cette silhouette — mais je connais quelqu'un dont ce serait le métier. Yenn, à Vasenoire : les rumeurs du delta remontent jusqu'à elle avant quiconque d'autre. Si quelqu'un d'autre s'intéresse au sceau, elle l'aura peut-être déjà entendu dire. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'identity_search_started');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'identity_search_started') {
      this.openDialog(
        "« Allez voir Yenn, à Vasenoire, voyageur. Si quelqu'un peut avoir entendu quelque chose, c'est elle. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'identity_hint_gathered') {
      this.openDialog(
        "« Yenn a bon flair pour ce genre de choses. » Sélène étale une carte usée du delta sur sa table. « Une passagère solitaire, en amont... Il n'y a qu'un seul endroit qui vaille la peine d'un tel détour par là-bas : la vieille vigie de la confrérie fondatrice, abandonnée depuis des générations. Si elle y est allée, c'est qu'elle savait ce qu'elle cherchait — et je crains que nous devions le découvrir nous-mêmes, avant elle. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'upstream_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'upstream_lead') {
      this.openDialog(
        "« La vieille vigie, en amont de Vasenoire. Yenn connaît le passage, voyageur. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'watchtower_reached') {
      this.openDialog(
        "Sélène examine le heaume terni que vous rapportez, le visage grave. « Le gardien de la vigie... encore fidèle à son serment, trois siècles après que tout le monde l'a oublié. Il ne protégeait plus rien — ou plutôt si : il protégeait tout, indistinctement, ami comme ennemi. » Elle repose l'objet avec un respect prudent. « Si votre passagère solitaire cherchait la même chose que nous ici, voyageur, elle a dû l'affronter aussi. Ou elle savait comment l'éviter. Dans un cas comme dans l'autre, elle nous devance toujours d'un pas. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'watchtower_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'watchtower_cleared') {
      this.openDialog(
        "Sélène vous accueille quelques jours plus tard, les yeux cernés mais brillants. « Je l'ai. » Elle retourne le heaume vers vous, désignant une ligne de runes presque effacées sous le rebord. « Ce n'est pas un simple mot d'ordre militaire, voyageur. C'est un serment — 'Veiller, jamais frapper les premiers.' » Elle repose l'objet, pensive. « Si la confrérie fondatrice a juré cela, et que votre silhouette porte encore ce même serment... alors elle ne nous a peut-être pas suivis pour nous nuire. » Elle secoue la tête, comme pour chasser un espoir trop hâtif. « Ou alors je me trompe complètement, et je préfère ne pas parier votre vie là-dessus. Restons prudents, voyageur. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'helm_inscription_studied');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'helm_inscription_studied') {
      this.openDialog(
        "« Veiller, jamais frapper les premiers. » Sélène répète le serment à mi-voix, comme pour se le rappeler. « Un seul gardien ne jure pas seul, voyageur. Un serment comme celui-là suppose un réseau — d'autres postes, quelque part, qui veillaient avec lui. Et si la vigie que vous avez traversée n'était qu'un maillon, ce qu'elle protégeait vraiment doit se trouver ailleurs, plus profond. » Elle hésite. « Retournez-y. Cherchez ce que son gardien gardait, pas seulement le gardien lui-même. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'ward_core_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'ward_core_lead') {
      this.openDialog(
        '« Cherchez plus profond dans la vigie, voyageur. Un escalier, une trappe — quelque chose que le gardien seul ne suffit pas à expliquer. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'ward_core_reached') {
      this.openDialog(
        "Sélène reste silencieuse un long moment après votre récit. « Un cœur de réseau, sous la vigie... et quelque chose qu'aucun texte de la confrérie ne nomme, scellé dessous depuis aussi longtemps que le reste. » Elle se ressaisit. « Pas le Roi Démon — les textes en auraient parlé, même à demi-mot. Autre chose. Quelque chose que la confrérie a jugé assez dangereux pour lui bâtir tout un réseau de vigies, sans jamais oser lui donner de nom. » Elle vous regarde, grave. « Et si votre silhouette du sanctuaire cherchait précisément ça, voyageur... je ne sais plus si nous devons espérer qu'elle le trouve avant nous, ou après. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'ward_core_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'ward_core_cleared') {
      this.openDialog(
        "« Un nom nous manque encore, voyageur — celui du réseau, et celui de la silhouette. » Sélène s'arrête, songeuse. « Il y a quelqu'un que nous n'avons pas encore interrogé, pourtant : Aldric, le vieil ermite du sanctuaire. Il veille sur ce lieu depuis plus longtemps qu'aucun de nous ne le croit. S'il existe une mémoire de ce serment en dehors des textes de la confrérie, c'est peut-être la sienne. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'hermit_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'hermit_lead') {
      this.openDialog(
        '« Retournez voir Aldric, au petit sanctuaire, voyageur. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'hermit_confided') {
      this.openDialog(
        "Sélène écoute votre récit, le regard lointain. « 'Ils meurent de doute'... » Elle referme son grimoire, puis le rouvre presque aussitôt. « Un dicton de gardien qui survit trois siècles, ça se transmet — à l'oral, mais parfois aussi par écrit, quelque part, pour ceux qui savent où chercher. » Elle hésite. « Les Archives d'Aiglemont. J'y ai moi-même étudié, et je n'ai jamais entendu parler d'un Ordre des Veilleurs dans ce qu'on m'a montré. Ce qui veut dire soit qu'il n'existe pas, soit qu'on ne montre pas tout. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'watchers_vault_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'watchers_vault_lead') {
      this.openDialog(
        '« Les Archives d\'Aiglemont, voyageur. Si un secret s\'y cache, il ne se donnera pas facilement. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'watchers_vault_reached') {
      this.openDialog(
        "Sélène pose les bottes récupérées sur sa table, sans un mot pendant un long moment. « L'Ordre des Veilleurs. » Elle répète le nom, comme pour se convaincre qu'il est réel. « Trois siècles à surveiller quelque chose d'assez dangereux pour mériter tout un réseau, et personne à Aiglemont n'en a jamais entendu parler. Soit ils ont gardé le secret à la perfection, voyageur, soit... » Elle s'arrête. « Soit quelqu'un a veillé à ce qu'on l'oublie. » Elle vous regarde, grave. « Dans un cas comme dans l'autre, nous devons continuer à tirer ce fil. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'watchers_vault_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'watchers_vault_cleared') {
      this.openDialog(
        "Sélène vous convoque tôt, l'air troublé. Sur sa table, un morceau de parchemin plié, qu'elle n'a pas laissé elle-même. « Je l'ai trouvé ce matin, ici, dans une pièce que je verrouille toujours. » Elle vous le tend. Une seule ligne, tracée d'une main sûre : 'Vous cherchez la mauvaise question. Ce n'est pas qui je suis qui compte — c'est ce qui se réveille.' Pas de signature. Juste, en dessous, la même marque que sur le heaume rapporté de la vigie : un cercle brisé. Sélène referme les doigts sur le parchemin, visiblement secouée. « Elle est entrée ici, voyageur. Dans MA tour. Sans qu'aucune garde ne la voie. » Elle relève les yeux. « Soit elle a voulu qu'on le sache, soit elle a voulu que vous le sachiez, vous précisément. Dans les deux cas... elle nous parle, maintenant. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'silhouette_message_found');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'silhouette_message_found') {
      this.openDialog(
        "« 'Ce n'est pas qui je suis qui compte — c'est ce qui se réveille.' » Sélène a gardé le parchemin sur elle depuis, le relisant sans doute plus de fois qu'elle ne l'admettrait. « J'ai fini par comprendre où chercher, voyageur. Le tombeau de la confrérie — là où l'éclat majeur a été volé. Nous n'avons jamais fouillé au-delà de la chambre funéraire. Nous avons vaincu l'émissaire, récupéré ce que nous pouvions, et nous sommes partis. » Elle hésite. « Si quelque chose s'est réveillé, voyageur, c'est peut-être là, plus profond que nous ne sommes jamais descendus, qu'il faut chercher. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'tomb_depths_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'tomb_depths_lead') {
      this.openDialog(
        '« Le tombeau de la confrérie, voyageur. Plus profond que la chambre funéraire, cette fois. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'tomb_depths_reached') {
      this.openDialog(
        "Sélène pose l'égide récupérée sur sa table sans un mot, le regard perdu dessus un long moment. « Ce n'était donc pas seulement l'émissaire du Roi Démon qui gardait ce tombeau. » Elle relève enfin les yeux. « Quelque chose dormait dessous, voyageur, depuis bien avant que la confrérie ne scelle quoi que ce soit — et le vol de l'éclat l'a réveillé, ne serait-ce qu'un peu. » Elle serre le parchemin de la silhouette dans son autre main. « 'Ce qui se réveille.' Elle savait. Elle savait avant même que nous ne redescendions. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'tomb_depths_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'tomb_depths_cleared') {
      this.openDialog(
        "Sélène passe la nuit à tout recouper — le dicton d'Aldric, le nom de l'Ordre, le message de la silhouette, ce qui dormait sous le tombeau. Au matin, elle vous convoque, les traits tirés mais l'œil vif. « Je crois que je comprends, voyageur. Pas tout. Mais assez. » Elle étale ses notes. « Ce n'est pas un seul événement qui se réveille — c'est une chaîne. Le vol de l'éclat a fragilisé le sceau original, quelque part. Et cette fragilité se propage : au tombeau, à la vigie, peut-être ailleurs que nous n'avons pas encore trouvé. » Elle pose le doigt sur le mot Ordre, souligné trois fois. « Et si la silhouette suit exactement la même piste que nous, avec une longueur d'avance à chaque fois... c'est peut-être qu'elle essaie d'arriver avant que la chaîne ne se referme mal. Pas pour nous en priver, voyageur. Pour nous devancer. » Elle vous regarde, grave. « Nous devons faire vite. Mais nous devons aussi faire juste. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'grand_theory_formed');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'grand_theory_formed') {
      this.openDialog(
        "« La chaîne, voyageur. Chaque maillon compte. » Sélène ressort une vieille carte, celle du Relais des chasseurs et du bosquet corrompu. « Nous avons vaincu le cœur de la corruption là-bas, mais nous n'avons jamais vraiment su ce qui l'alimentait — nous l'avons pris pour l'origine, pas pour un symptôme de plus. » Elle trace du doigt un cercle sous le bosquet. « Si votre théorie est juste, voyageur, il y a peut-être encore une racine à trouver là-dessous. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'grove_depths_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'grove_depths_lead') {
      this.openDialog(
        '« Le bosquet corrompu, voyageur. Cherchez sous la clairière flétrie, cette fois. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'grove_depths_reached') {
      this.openDialog(
        "Sélène examine les gants rapportés, encore humides de sève noircie. « Une racine-mère. » Elle secoue la tête, presque incrédule. « Le cœur de la corruption n'était donc que ce qu'elle laissait pousser en surface — la vraie source dormait dessous depuis le début, et nous ne l'avons jamais su. » Elle relève les yeux, la théorie de la veille visiblement confirmée. « La chaîne tient, voyageur. Le tombeau, la vigie, le bosquet — trois maillons du même mal, trois symptômes d'une seule fragilité. » Elle inspire. « Il ne nous manque plus qu'à savoir combien d'autres maillons nous attendent encore. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'grove_depths_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'grove_depths_cleared') {
      this.openDialog(
        "Sélène passe des heures à comparer tout ce que nous savons de la silhouette avec ce que nous savons de l'Ordre. Elle finit par reposer sa plume, presque hésitante à le dire à voix haute. « Le message. La marque du cercle brisé, la même que sur le heaume. Sa connaissance du serment avant même qu'Aldric ne nous le confie. Et cette manière d'arriver systématiquement avant nous, à chaque maillon. » Elle vous regarde. « Je pense qu'elle n'enquête pas sur l'Ordre des Veilleurs, voyageur. Je pense qu'elle EST l'Ordre des Veilleurs — ou ce qu'il en reste. La dernière, peut-être, à tenir encore le serment. » Elle secoue la tête devant sa propre conclusion. « Si j'ai raison, nous ne poursuivons pas une menace. Nous poursuivons quelqu'un qui fait, seule, depuis Dieu sait combien de temps, exactement ce que nous essayons de faire à plusieurs. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'watcher_hypothesis_formed');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'watcher_hypothesis_formed') {
      this.openDialog(
        "« Une veilleuse solitaire, voyageur — pas une ennemie. Du moins, c'est mon hypothèse. » Sélène s'arrête, songeuse. « Trois maillons trouvés, tous des symptômes d'une seule fragilité. Mais nous n'avons jamais vraiment cherché à la source elle-même — la chambre du Sceau, derrière le gardien primordial que vous avez déjà vaincu. » Elle hésite. « Si votre hypothèse sur la silhouette est juste, voyageur, c'est peut-être exactement là qu'elle se dirige en ce moment même. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'seal_depths_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'seal_depths_lead') {
      this.openDialog(
        '« La chambre du Sceau, voyageur. Cherchez au-delà du gardien primordial, cette fois. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'seal_depths_reached') {
      this.openDialog(
        "Sélène vous écoute décrire la faille, le visage de plus en plus pâle. « Pas le Roi Démon. » Elle répète, comme pour s'en convaincre. « Juste la contrainte du sceau elle-même, qui cède un peu plus, à la source de tout ce que nous avons trouvé. » Elle repose ses notes, épuisée. « Quatre maillons, voyageur. Le tombeau, la vigie, le bosquet, et maintenant la source elle-même. Ce n'est plus une chaîne isolée — c'est le sceau tout entier qui vacille. » Elle vous regarde, la voix posée mais grave. « Je ne sais pas combien de temps il nous reste. Mais je sais que nous ne sommes plus seuls à le savoir aussi. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'seal_depths_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'seal_depths_cleared') {
      this.openDialog(
        "En rentrant du Sceau, vous découvrez dans votre propre sacoche un objet qui n'y était pas ce matin — un petit fragment de pierre gravé du même cercle brisé. Sélène l'examine avec autant d'inquiétude que de fascination. « Elle s'est approchée de vous directement, cette fois. Pas de ma tour — de vous. » Elle retourne le fragment entre ses doigts. Au dos, à peine visible : un seul mot gravé. 'Ensemble.' Elle relève les yeux, incertaine. « Une main tendue, voyageur ? Ou un avertissement de plus ? Je ne sais pas si je dois m'en réjouir ou m'en inquiéter davantage. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'second_token_found');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'second_token_found') {
      this.openDialog(
        "« 'Ensemble', voyageur. Un mot qui pourrait tout changer — ou rien du tout. » Sélène retourne le fragment une dernière fois. « Je ne reconnais pas ces marques, mais quelqu'un le pourrait. Aldric a passé sa vie près du Sceau — s'il existe un lien entre ce fragment et l'Ordre, c'est lui qui le verra le premier. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'lodge_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'lodge_lead') {
      this.openDialog(
        '« Retournez voir Aldric, au petit sanctuaire, voyageur. Montrez-lui le fragment. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'lodge_reached') {
      this.openDialog(
        "Sélène vous écoute décrire la loge, silencieuse jusqu'au bout du récit. « Elle vous attendait. » Ce n'est pas une question. « Pas d'attaque, pas de piège — juste elle, à la table où l'Ordre se réunissait autrefois. » Vous lui rapportez ce qui s'est dit : peu de mots, prudents des deux côtés, mais un visage, enfin, derrière la silhouette. Sélène reste longtemps silencieuse. « Un nom, voyageur ? » Vous secouez la tête — elle n'en a pas donné. Sélène hoche lentement la tête, presque soulagée. « Alors nous avons le temps d'apprendre à lui faire confiance avant d'avoir à le faire tout à fait. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'lodge_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'lodge_cleared') {
      this.openDialog(
        "Sélène étale toutes ses notes une dernière fois, dans un silence différent des précédents — plus déterminé que troublé. « Nous avons passé des semaines à comprendre ce qui se brise, voyageur. Il est temps de nous demander comment le réparer. » Elle referme son grimoire. « Un sceau ne se renforce pas avec de la magie seule — il a fallu toute une confrérie, autrefois, pour le poser. S'il existe un moyen de le stabiliser à nouveau, je doute qu'il tienne dans un seul grimoire, ou entre les mains d'une seule personne. » Elle vous regarde, presque avec espoir. « Peut-être est-ce pour ça qu'elle a écrit 'Ensemble', voyageur. Peut-être le sait-elle déjà. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'reinforcement_plan_started');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'reinforcement_plan_started') {
      this.openDialog(
        "« Réparer, pas seulement comprendre, voyageur. » Sélène s'arrête net, comme frappée par une évidence. « La Loge. Nous n'avons vu que la table ronde, l'endroit où l'Ordre se réunissait — pas où il gardait ses écrits. Un ordre qui a posé un sceau pareil n'a certainement pas confié la méthode à la seule mémoire. » Elle referme son grimoire d'un coup sec. « S'il existe des instructions quelque part, voyageur, c'est là qu'elles doivent être. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rite_archive_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'rite_archive_lead') {
      this.openDialog(
        '« Retournez à la Loge, voyageur. Cherchez plus profond que la table ronde, cette fois. »',
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'rite_archive_reached') {
      this.openDialog(
        "Sélène étale sur sa table les pages récupérées, encore fragiles après trois siècles. « Ce n'est pas complet, voyageur — des pages manquent, d'autres sont illisibles. Mais c'est plus que nous n'en avions espéré. » Elle suit du doigt une ligne, pensive. « Le rite original demandait plusieurs mains, à plusieurs endroits, au même instant. Pas un sortilège qu'on lance seul. » Elle relève les yeux vers vous. « Si nous devons le refaire, voyageur, nous ne pourrons pas le faire à deux. Il nous faudra du monde — et peut-être elle, aussi. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rite_archive_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'rite_archive_cleared') {
      this.openDialog(
        "Sélène passe la nuit à réfléchir, puis vous tend un petit objet — une pierre plate, gravée d'un seul mot en retour : 'Comment ?' Elle vous regarde, presque nerveuse. « Si elle a pu nous trouver deux fois sans qu'on la voie venir, voyageur, elle saura peut-être trouver ça aussi. Laissez-le quelque part qui compte pour vous. Un endroit qu'elle pourrait reconnaître, si elle vous connaît vraiment. » Vous portez la pierre au petit sanctuaire, et la laissez au pied de l'autel. Le lendemain matin, en retournant voir Sélène, un mot vous attend déjà — griffonné à la hâte, dans une écriture que vous ne reconnaissez pas encore, mais qui, vous le sentez, ne vous sera bientôt plus étrangère : 'Bientôt.'",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'response_sent');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'response_sent') {
      this.openDialog(
        "Sélène vous convoque tôt le matin, un second mot à la main — arrivé pendant la nuit, glissé sous le petit sanctuaire à côté du premier. Griffonné plus vite, moins soigné : « Les rayonnages du fond. Ceux que je n'ai jamais pu ouvrir. » Elle relève les yeux, surprise elle-même. « Un ward, voyageur — posé par l'Ordre, pas par nous. Je n'ai jamais compris pourquoi il ne cédait pas. » Elle hésite. « Peut-être qu'il ne cédait à personne qui n'avait pas déjà répondu. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rite_annex_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'rite_annex_lead') {
      this.openDialog(
        "« Retournez aux Archives du Rite, voyageur. Cherchez au fond, derrière le dernier rayonnage — le ward devrait avoir cédé, maintenant. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'rite_annex_reached') {
      this.openDialog(
        "Sélène feuillette lentement ce que vous avez rapporté — un registre entier, noms et marques, certains vieux de plusieurs siècles, d'autres bien plus récents. Elle s'arrête sur une page, longuement silencieuse. « Ils n'ont jamais vraiment disparu, voyageur. L'Ordre s'est juste tu. » Elle referme le registre avec précaution, comme s'il pouvait encore se briser. « Ce que nous cherchions n'était pas une personne isolée. C'était les restes de quelque chose qui a continué, discrètement, tout ce temps. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rite_annex_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'rite_annex_cleared') {
      this.openDialog(
        "Sélène vous demande quelques jours de patience — le registre est vaste, l'écriture parfois presque effacée, et elle veut croiser chaque nom avec ce que vous avez déjà découvert : la Loge, le Sommeil brisé, la Voûte des Veilleurs. Quand elle vous rappelle, elle a les traits tirés mais les yeux brillants. « Un nom revient, voyageur. Pas partout — mais assez souvent, sur plusieurs générations, pour que ce ne soit pas un hasard. » Elle pose le doigt sur trois lignes du registre, séparées de plusieurs décennies chacune. « La même famille, je crois. Ou du moins le même sang. » Elle relève les yeux vers vous, hésitante. « Je ne sais pas encore ce que ça signifie pour elle. Mais ça restreint beaucoup de choses. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'lineage_traced');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'lineage_traced') {
      this.openDialog(
        "Sélène a passé du temps aux archives de la ville, cette fois, pas celles de l'Ordre. « Le nom du registre existe aussi dans les actes de propriété d'Aiglemont, voyageur. Une maison, dans le vieux quartier — jamais vendue, jamais démolie, seulement 'scellée', depuis des générations. Personne ne se souvient pourquoi. » Elle hésite. « Ce genre d'oubli ne se produit pas tout seul. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'crypt_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'crypt_lead') {
      this.openDialog(
        "« Cherchez dans le vieux quartier, voyageur — une ruelle que tout le monde évite depuis des générations, sans trop savoir pourquoi. C'est là, je crois, que se trouve cette maison. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'crypt_reached') {
      this.openDialog(
        "Sélène examine longuement ce que vous avez trouvé dans le caveau — un blason familial, usé mais reconnaissable, gravé sur chaque tombe. Elle le compare, main tremblante, aux marques déjà relevées sur le fragment de la Loge et les pages de l'Archive. « Le même symbole, voyageur. Pas une coïncidence, pas cette fois. » Elle repose l'objet avec précaution. « Cette famille n'a pas seulement connu l'Ordre. Elle en a peut-être fait partie, jusqu'au bout. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'crypt_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'crypt_cleared') {
      this.openDialog(
        "Vous portez le blason au petit sanctuaire, comme la pierre et le mot avant lui — un geste devenu presque un rituel entre vous. Le lendemain, la réponse est différente des précédentes : plus longue, l'écriture moins assurée, presque hâtive. « Vous êtes allés trop loin pour que je continue à me taire complètement. » Un seul mot suit, souligné deux fois : un prénom. Sélène le reconnaît aussitôt — pas de nulle part en particulier, mais d'une vieille légende locale qu'elle croyait n'être qu'une légende, justement. Elle vous regarde, presque pâle. « Ce nom ne devrait appartenir à personne de vivant, voyageur. Pas depuis longtemps. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'first_name_given');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'first_name_given') {
      this.openDialog(
        "Sélène referme ses livres, presque frustrée. « Les archives ne mentionnent jamais ce prénom autrement que comme légende, voyageur — jamais comme un fait. Ce genre d'histoire ne survit que par la bouche des gens, pas par l'écrit. » Elle vous regarde. « Vous venez de Valombre, non ? Les anciens du village se souviennent parfois de choses qu'aucun livre n'a jamais notées. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'elder_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'elder_lead') {
      this.openDialog(
        "« Retournez à Valombre, voyageur. Demandez aux plus âgés — ceux qui se souviennent des histoires d'avant les histoires. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'grave_reached') {
      this.openDialog(
        "Vous décrivez à Sélène ce que vous avez trouvé dans le vieux cimetière — une tombe portant le prénom, la date gravée retracée à intervalles réguliers depuis des siècles, comme si quelqu'un revenait sans cesse l'entretenir. Aucun corps à l'intérieur : seulement une pierre plate, gravée d'un seul mot. Un mot que vous reconnaissez aussitôt — celui que vous aviez laissé vous-même au petit sanctuaire. Sélène pâlit. « Elle savait que vous viendriez ici, voyageur. Elle le savait peut-être avant même de vous rencontrer. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'grave_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'grave_cleared') {
      this.openDialog(
        "Sélène passe des jours dans les archives religieuses de la ville, celles qu'elle consulte rarement — pas celles de l'Ordre, mais celles, bien plus anciennes, de la cité elle-même. Elle finit par trouver un précédent : certaines lignées, autrefois, ne transmettaient pas seulement leur sang, mais un nom rituel, porté tour à tour par celui ou celle qui menait la famille — un titre, pas une seule personne éternelle. Elle repose le vieux volume, presque soulagée. « Ce n'est pas rassurant, voyageur, mais c'est la première explication qui tienne debout. Pas un fantôme depuis trois siècles. Une charge, transmise. » Elle hésite. « Reste à savoir qui la porte aujourd'hui. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'title_hypothesis');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'title_hypothesis') {
      this.openDialog(
        "« Une charge, voyageur, ça se transmet aussi par le droit, pas seulement par la religion. » Sélène se redresse, une idée neuve dans le regard. « Un changement de propriété, un nom qui passe d'une main à une autre — la guilde des marchands garde ce genre de trace depuis des siècles, dans son propre entrepôt. Ce ne sont pas des moines qui l'ont tenu à jour, mais des notaires. Et les notaires, eux, ne croient pas aux légendes : ils écrivent des dates. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'notary_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'notary_lead') {
      this.openDialog(
        "« Retournez à l'entrepôt du Faubourg, voyageur. Il paraît qu'il cache un escalier vers les vieux registres de la guilde, sous les caisses. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'registry_reached') {
      this.openDialog(
        "Sélène déroule les pages que vous avez rapportées sur toute la longueur de sa table — un acte de propriété transféré, encore et encore, toujours au même nom, jamais à la même personne : chaque transfert daté d'une génération à l'autre, sans jamais un seul jour de vide entre deux titulaires. « Une succession sans interruption, voyageur. Organisée, documentée, presque légale. » Elle repose la dernière page, la plus récente. « Et celle-ci ne date que de quelques années. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'registry_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'registry_cleared') {
      this.openDialog(
        "Le lendemain de votre passage aux Registres, un message vous attend déjà au petit sanctuaire — vous n'avez rien déposé, cette fois. La silhouette a su avant même que vous ne demandiez. Le mot est court, tremblant : « Vous êtes trop près, maintenant. Encore un peu de temps, et je viendrai moi-même. Pas de recherche. Une rencontre. » Sélène relit la phrase plusieurs fois. « Une rencontre, voyageur. Pas une lettre, pas un objet laissé quelque part. Elle parle de venir. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'meeting_promised');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'meeting_promised') {
      this.openDialog(
        "Un courrier arrive de la route commerciale avant même que Sélène n'ait pu organiser quoi que ce soit : la halte de voyageurs entre Valombre et Aiglemont, désertée depuis des années, montre des signes de corruption fraîche — les mêmes que ceux du Bosquet, en pire. Sélène blêmit. « Ça ne peut pas être une coïncidence, voyageur. Si elle doit emprunter cette route pour venir jusqu'ici... » Elle n'achève pas la phrase. « Il faut sécuriser le passage. Avant elle, pas après. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'road_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'road_lead') {
      this.openDialog(
        "« La route commerciale, voyageur, entre Valombre et Aiglemont. Cherchez la vieille halte à l'écart du chemin — c'est là que la corruption est repartie. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'waystation_reached') {
      this.openDialog(
        "Sélène examine ce que vous rapportez de la halte avec un mélange d'inquiétude et de soulagement. « Contenue, pas éteinte — comme le Bosquet, comme la Racine. Ce n'est pas fini, voyageur, ça ne le sera peut-être jamais complètement tant que le sceau reste faible. » Elle marque une pause. « Mais la route est sûre, maintenant. Si elle vient, elle pourra venir. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'waystation_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'waystation_cleared') {
      this.openDialog(
        "Les jours passent sans nouvelle, puis un message arrive enfin — pas au sanctuaire, cette fois, mais porté par un jeune garçon du village qui dit ne pas se souvenir de qui le lui a confié. Un seul mot : « Maintenant. » Sélène relève les yeux vers vous, la voix tendue. « Maintenant, voyageur. Retournez au sanctuaire. Je crois qu'elle vous attend déjà. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'awaiting_meeting');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'awaiting_meeting') {
      this.openDialog(
        "« Le sanctuaire, voyageur. Allez-y maintenant. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'first_meeting') {
      this.openDialog(
        "Vous racontez à Sélène chaque mot de la rencontre, aussi précisément que vous le pouvez. Elle vous écoute sans interrompre, pour une fois — puis referme longuement les yeux. « Une charge, pas une légende. Elle vous l'a dit elle-même. » Elle rouvre les yeux, presque émue. « Après tout ce temps à courir après une ombre, voyageur, vous avez enfin un visage en face de vous. » Elle se redresse, retrouvant son sérieux habituel. « Reste à savoir ce que 'réparer le sceau ensemble' veut vraiment dire, concrètement. Mais ça, voyageur, c'est une autre histoire — pour une prochaine fois. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'meeting_debriefed');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'meeting_debriefed') {
      this.openDialog(
        "Quelques jours plus tard, un message arrive — cette fois signé, pour la première fois, d'un prénom seul. Elle a cherché de son côté ce que « plusieurs endroits » pouvait vouloir dire concrètement, et a trouvé une piste : une chapelle engloutie sous les quais du Faubourg, bâtie à la même époque que le Sceau originel, oubliée depuis que les eaux ont monté. « Si le rite demandait plusieurs sites, celui-ci en est peut-être un second », écrit-elle. Sélène relève les yeux du message. « Le Faubourg, voyageur. Sous les quais, à l'ouest — je ne savais même pas qu'il y avait quelque chose là-dessous. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'chapel_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'chapel_lead') {
      this.openDialog(
        "« Le Faubourg des quais, voyageur. Cherchez à l'ouest, sous les vieux quais. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'chapel_reached') {
      this.openDialog(
        "Sélène étudie ce que vous rapportez de la chapelle engloutie — des gravures presque effacées par l'eau, mais assez nettes pour reconnaître le même symbole que celui du Sceau originel, gravé ici sur un second autel, plus petit, manifestement pensé pour fonctionner en miroir du premier. « Un second site, confirmé, voyageur. Ce n'est plus une hypothèse. » Elle marque une pause. « Reste à savoir combien il en faut encore, et où les trouver. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'chapel_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'chapel_cleared') {
      this.openDialog(
        "En superposant les gravures du second autel à ce qui subsistait des pages de l'Archive du Rite, Sélène recompte, une fois, deux fois, comme pour être sûre. « Trois, voyageur. Trois sites, pas plus, si je lis ça correctement — le premier sous ce sanctuaire même, le second sous les quais. » Elle pose le doigt sur une ligne presque effacée. « Il en manque un troisième, quelque part. Et cette fois, je crois que c'est elle qui va devoir nous aider à le trouver — ses archives à elle, pas les nôtres. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'third_site_awaited');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'third_site_awaited') {
      this.openDialog(
        "Un mot arrive du sanctuaire, à nouveau signé de son prénom : elle a fouillé ce qui reste des archives de sa propre famille, et trouvé une mention — vague, presque effacée, mais insistante. « Sous la crypte, plus profond que ce que vous avez déjà trouvé. Nous n'avons jamais cherché plus loin parce que nous pensions avoir déjà tout trouvé. » Sélène relit la phrase deux fois. « La Crypte des Aînés, voyageur. Encore. Plus profond, cette fois. »",
        [
          {
            label: 'Accepter',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'third_site_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }
    if (stage === 'third_site_lead') {
      this.openDialog(
        "« La Crypte des Aînés, voyageur. Cherchez plus profond que la dernière fois. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'third_site_reached') {
      this.openDialog(
        "Sélène examine ce que vous rapportez du troisième autel — identique aux deux premiers dans sa facture, mais celui-ci porte quelque chose que les autres n'avaient pas : une liste de noms gravée en marge, dont le dernier n'est séparé du présent que de quelques années. Elle relève les yeux, la voix presque tremblante. « Les trois sites, voyageur. Nous les avons tous. » Un silence. « Reste à savoir si les avoir suffit, ou si quelque chose d'autre nous attend encore. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'third_site_cleared');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'third_site_cleared') {
      this.openDialog(
        "Sélène passe des jours à établir un plan, avec l'aide de messages de plus en plus fréquents venus du sanctuaire. « Le rite doit se produire aux trois sites en même temps, voyageur — pas l'un après l'autre. » Elle pose une carte griffonnée à la main sur la table. « Ça veut dire qu'il nous faut du monde à chaque endroit, au même instant, et quelqu'un capable de tenir le site principal pendant que les deux autres répondent. » Elle relève les yeux. « Nous ne sommes que deux, voyageur. Enfin, trois avec elle. Il va falloir trouver d'autres mains. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'recruiting_help');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'recruiting_help') {
      this.openDialog(
        "« Trouver d'autres mains, voyageur, mais des mains qui ne poseront pas trop de questions. » Sélène réfléchit un instant, puis son regard s'éclaire. « Le capitaine Bregan. Il a déjà vu ce que la corruption fait aux terres autour d'Aiglemont, il sait que quelque chose cloche depuis des mois — et il vous fait confiance. S'il accepte de détacher quelques hommes sans exiger toute la vérité, ça suffira pour tenir les deux sites extérieurs pendant que nous tenons le principal. Laissez-moi lui en toucher un mot avant que vous n'y alliez vous-même ; ce sera mieux reçu venant de moi, entre gens d'Aiglemont. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'ally_secured');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'ally_secured') {
      this.openDialog(
        "« C'est fait, voyageur. » Sélène a l'air à la fois soulagée et un peu incrédule. « Bregan a accepté sans même discuter le prix — il a juste demandé qu'on lui explique, un jour, ce que tout cela voulait dire. Ses hommes tiendront les deux sites extérieurs le moment venu. Reste le site principal : vous, moi, et elle. » Un temps. « Il ne manque plus qu'un mot d'elle pour savoir quand. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'signal_awaited');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'signal_awaited') {
      this.openDialog(
        "Les jours passent sans nouvelle, puis un mot finit par arriver du sanctuaire — un seul, souligné deux fois : « Ce soir. » Sélène relève les yeux du message, la voix tendue mais calme. « Ce soir, voyageur. Bregan a déjà reçu l'ordre d'envoyer ses hommes aux deux sites extérieurs. Il ne reste que le nôtre. » Elle range le message avec un soin presque cérémonieux. « Allez vous préparer. Je vous retrouve au sanctuaire à la tombée du jour. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'rite_night');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }
    if (stage === 'rite_night') {
      this.openDialog("« Le sanctuaire, voyageur. Ce soir. Je vous y retrouve. »", [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }
    if (stage === 'rite_climax') {
      this.openDialog(
        "La tour est vide. Sélène est déjà partie pour le sanctuaire, avec elle — vous devriez les y rejoindre.",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'ending_new_seal') {
      this.openDialog("La tour de Sélène est calme, presque paisible. Le monde tient — c'est déjà beaucoup.", [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }
    if (stage === 'ending_destruction') {
      this.openDialog(
        "Sélène range ses derniers grimoires, le sourire fatigué de qui a enfin gagné quelque chose. « C'est fini, voyageur. Vraiment fini, cette fois. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'ending_ascension') {
      this.openDialog('La tour de Sélène est vide. Personne à Aiglemont ne semble savoir où elle est partie.', [
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

  private enterAncestralCrypt(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('AncestralCrypt', { x: 110, y: 380 });
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
