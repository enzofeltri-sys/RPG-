import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { getMainQuestStage, advanceMainQuestStage, MainQuestStage } from '../game/mainQuest';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';

const RUINS_QUEST_ID = 'vasenoire_ruins';
const RUINS_LEADER_QUEST_ID = 'vasenoire_ruins_leader';
const FISHERMAN_QUEST_ID = 'vasenoire_fisherman';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

// Wide enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment.
const WORLD_WIDTH = 240;
const WORLD_HEIGHT = 320;

interface VasenoireData {
  x?: number;
  y?: number;
}

// Première cité de l'Acte 2 (Terres Noyées) — la seule encore debout dans un
// delta englouti depuis des générations, tenue par la guilde des Limaneux.
// Hub sûr comme Valombre/Aiglemont (pas de rencontre aléatoire) : Yenn porte
// la trame principale ainsi qu'une première quête secondaire locale, et la
// cité dispose désormais de sa propre marchande et de sa forge — les deux
// scènes globales (Merchant/Crafting) déjà utilisées ailleurs, simplement
// rendues accessibles ici avec `returnScene: 'Vasenoire'`.
export class VasenoireScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private yenn!: Phaser.GameObjects.Rectangle;
  private merchantStall!: Phaser.GameObjects.Rectangle;
  private forge!: Phaser.GameObjects.Rectangle;
  private toma!: Phaser.GameObjects.Rectangle;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Vasenoire');
  }

  init(data: VasenoireData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialogElements = [];
    this.cameras.main.setBackgroundColor('#2e3a34');

    addCrispText(this, this.scale.width / 2, 12, 'Vasenoire', {
      fontSize: '11px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Stilt huts and a boardwalk, purely decorative — no real art yet
    // (increment 10).
    this.add.rectangle(60, 100, 50, 38, 0x4a3a30).setStrokeStyle(1, 0x241d16);
    this.add.rectangle(180, 90, 44, 34, 0x4a3a30).setStrokeStyle(1, 0x241d16);
    this.add.rectangle(120, 220, 60, 40, 0x4a3a30).setStrokeStyle(1, 0x241d16);
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 200, 20, 0x3a4a44).setStrokeStyle(1, 0x1c2622);

    // Off the x=120 spawn-to-exit centerline, same lesson as every other
    // NPC placement this project.
    this.yenn = this.add.rectangle(170, 190, 14, 20, 0x6a5a4a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.yenn, true);
    addCrispText(this, 170, 170, 'Yenn', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.merchantStall = this.add.rectangle(50, 170, 28, 22, 0x5a4a30).setStrokeStyle(1, 0x241d16);
    this.physics.add.existing(this.merchantStall, true);
    addCrispText(this, 50, 156, 'Étal', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.forge = this.add.rectangle(190, 230, 32, 26, 0x3a3a3a).setStrokeStyle(1, 0x161616);
    this.physics.add.existing(this.forge, true);
    addCrispText(this, 190, 214, 'Forge', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Clear of the hut/forge footprints — see MarshLairScene's ENCOUNTERS
    // comment for why every placement in this project double-checks this.
    this.toma = this.add.rectangle(70, 260, 14, 20, 0x5a6a6a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.toma, true);
    addCrispText(this, 70, 240, 'Toma', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 30);
    this.physics.add.collider(this.player, this.yenn);
    this.physics.add.collider(this.player, this.merchantStall);
    this.physics.add.collider(this.player, this.forge);
    this.physics.add.collider(this.player, this.toma);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVasenoire());

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '← Terres Noyées', {
      fontSize: '9px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);

    // North exit — a Limaneux-only path, only worth mentioning on-screen once
    // the main quest actually points there, same "always walkable, narratively
    // gated by dialogue rather than by physics" approach as everywhere else.
    const dockZone = this.add.zone(WORLD_WIDTH / 2, 10, WORLD_WIDTH, 20);
    this.physics.add.existing(dockZone, true);
    this.physics.add.overlap(this.player, dockZone, () => this.leaveToClandestineDock());

    addCrispText(this, WORLD_WIDTH / 2, 24, 'Quai clandestin ↑', {
      fontSize: '8px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // East edge — the same discreet upstream passage Yenn described, always
    // walkable rather than dialogue-gated, same "physics not dialogue"
    // approach as ClandestineDock's sanctuaryZone and Shrine's altar.
    const upstreamZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(upstreamZone, true);
    this.physics.add.overlap(this.player, upstreamZone, () => this.enterSilentWatch());

    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, 'Passage discret →', {
      fontSize: '9px',
      color: '#9aa0a6',
      align: 'center',
    }).setOrigin(0.5);

    const interactables: Interactable[] = [
      { x: this.yenn.x, y: this.yenn.y, radius: 24, onTap: () => this.talkToYenn() },
      {
        x: this.merchantStall.x,
        y: this.merchantStall.y,
        radius: 24,
        onTap: () => this.scene.start('Merchant', { x: this.player.x, y: this.player.y, returnScene: 'Vasenoire' }),
      },
      {
        x: this.forge.x,
        y: this.forge.y,
        radius: 26,
        onTap: () => this.scene.start('Crafting', { x: this.player.x, y: this.player.y, returnScene: 'Vasenoire' }),
      },
      { x: this.toma.x, y: this.toma.y, radius: 24, onTap: () => this.talkToToma() },
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
        'Vasenoire',
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

  private talkToYenn(): void {
    const stage = getMainQuestStage(this.character);

    if (stage === 'crossing_marshes') {
      this.openDialog(
        "Une femme aux bottes couvertes de vase vous observe descendre du chemin flottant. « Un étranger portant la marque du Sceau ? Ça ne s'était pas vu par ici depuis longtemps. » Elle se présente : Yenn, des Limaneux — la guilde qui tient debout ce qui reste de Vasenoire depuis que les cités de l'intérieur ont cessé de s'en soucier. « Si vous cherchez qui arrache des éclats du sceau, vous êtes au bon endroit : ça fait des mois qu'on voit des étrangers armés fouiller les ruines englouties, sans jamais s'annoncer à quiconque. Les Limaneux n'aiment pas qu'on farfouille sur leurs terres sans permission. » Elle vous jauge du regard. « Vous voulez de l'aide ? Il va falloir la mériter. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'vasenoire_arrival');
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'vasenoire_arrival') {
      this.talkToYennAboutRuins();
      return;
    }

    if (
      stage === 'delta_conspiracy' ||
      stage === 'limaneux_lead' ||
      stage === 'network_exposed' ||
      stage === 'smugglers_unmasked'
    ) {
      this.talkToYennAboutSmugglers(stage);
      return;
    }

    if (stage === 'rival_hunters_lead') {
      this.talkToYennAboutRivals();
      return;
    }

    if (stage === 'identity_search_started') {
      this.talkToYennAboutIdentitySearch();
      return;
    }

    if (stage === 'upstream_lead') {
      this.openDialog(
        "« Le passage est là, à l'est du village, voyageur — pas gardé, juste discret. Personne ne s'en vante. » Yenn hésite. « Ce qu'il y a en amont, je ne saurais pas vous le dire. Mais vous n'êtes pas le premier à l'avoir emprunté récemment. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    this.openDialog("« Les Terres Noyées ne pardonnent pas l'imprudence, étranger. »", [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  // Reached once talkToYenn() confirms the main quest is at vasenoire_arrival
  // — same single-NPC funnel as HunterOutpostScene's hunter, except the local
  // questline's payoff (talkToYennAboutConspiracy) feeds back into the main
  // quest instead of stopping at a side reward.
  private talkToYennAboutRuins(): void {
    const quest = QUESTS[RUINS_QUEST_ID];
    const progress = getQuestProgress(this.character, RUINS_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, RUINS_QUEST_ID);
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
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} spectres des tourbières vaincus.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        `${quest.title} — terminée !\n\n« Vous avez tenu parole. Les Limaneux n'oublient pas ça. » Voici votre récompense.`,
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, RUINS_QUEST_ID);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToYennAboutRuinsLeader();
  }

  // Reached only once vasenoire_ruins is turned in — same local follow-up
  // pattern as HunterOutpostScene's hunter → matriarch chain, pointant vers
  // les Ruines englouties (SunkenRuinsScene) plutôt que de laisser la
  // première quête sans suite.
  private talkToYennAboutRuinsLeader(): void {
    const quest = QUESTS[RUINS_LEADER_QUEST_ID];
    const progress = getQuestProgress(this.character, RUINS_LEADER_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, RUINS_LEADER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nIl se terre au cœur des ruines englouties, au sud de la route.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        `${quest.title} — terminée !\n\n« Vous l'avez retrouvé... Les Limaneux vous doivent des réponses, pas seulement une récompense. » Voici votre récompense.`,
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, RUINS_LEADER_QUEST_ID);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (getMainQuestStage(this.character) === 'vasenoire_arrival') {
      this.talkToYennAboutConspiracy();
      return;
    }

    this.openDialog(
      "« Vous avez notre confiance, étranger. Ce n'est pas rien, par ici. »",
      [{ label: 'Fermer', onClick: () => this.closeDialog() }],
    );
  }

  // Reached once vasenoire_ruins_leader is turned in and the main quest is
  // still sitting at vasenoire_arrival — the local questline's payoff feeds
  // straight back into the main thread, same "side quest closes, main quest
  // reopens" shape as smuggler_captain/faubourg_lead in Act 1.
  private talkToYennAboutConspiracy(): void {
    this.openDialog(
      "Yenn examine ce que vous avez rapporté du cœur des ruines en silence, plus longtemps que nécessaire. « Ce n'étaient pas des pillards ordinaires. Ils fouillaient sur ordre — quelqu'un les payait pour retrouver quelque chose de précis là-dedans, et je doute que ce soit la première fois. » Elle relève la tête vers vous. « Les Limaneux tiennent ce delta depuis trop longtemps pour laisser filer ça sans réponse. Vous avez notre confiance, étranger — et maintenant, notre attention. Ce qui se prépare ici dépasse Vasenoire. »",
      [
        {
          label: 'Continuer',
          onClick: async () => {
            advanceMainQuestStage(this.character, 'delta_conspiracy');
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ],
    );
  }

  // Covers delta_conspiracy through smugglers_unmasked — the reveal that the
  // ruins looters answer to the same smuggler network from Act 1's Faubourg
  // (smuggler_thug/smuggler_captain), rather than a brand new, unrelated
  // antagonist this late in development.
  private talkToYennAboutSmugglers(stage: MainQuestStage): void {
    if (stage === 'delta_conspiracy') {
      this.openDialog(
        "Yenn revient vers vous quelques jours plus tard, une carte usée à la main. « Les Limaneux ont fait circuler la question dans tout le delta. » Elle a l'air moins sereine qu'à l'accoutumée. « Une réponse nous est revenue, du côté d'un quai qu'on croyait abandonné, au nord de la ville — des gens qui n'ont de compte à rendre à personne, et surtout pas à nous. Si votre marque vous mène vers la vérité, c'est par là qu'elle passe maintenant. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'limaneux_lead');
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    if (stage === 'limaneux_lead') {
      this.openDialog('« Le quai clandestin, au nord. Revenez me voir quand vous aurez des réponses. »', [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (stage === 'network_exposed') {
      this.openDialog(
        "Yenn écoute votre récit sans vous interrompre. « Les contrebandiers du Faubourg, ici, dans le delta... » Elle secoue la tête. « Ce n'était donc pas une bande isolée qui fouillait ces ruines — c'est tout un réseau, qui s'étend bien au-delà d'Aiglemont. » Elle vous regarde longuement. « Vous avez fait plus que gagner notre confiance, étranger. Vous nous avez donné un nom à traquer. »",
        [
          {
            label: 'Continuer',
            onClick: async () => {
              advanceMainQuestStage(this.character, 'smugglers_unmasked');
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
      "« Le delta garde encore ses secrets, étranger. Mais vous nous avez donné une longueur d'avance — les Limaneux n'oublieront pas. »",
      [{ label: 'Fermer', onClick: () => this.closeDialog() }],
    );
  }

  // One-shot beat (rival_hunters_lead only) — Sélène sends the player back to
  // Yenn rather than a new NPC, same "ask the person who already knows this
  // territory" logic as delta_conspiracy/limaneux_lead above.
  private talkToYennAboutRivals(): void {
    this.openDialog(
      "Yenn écoute votre question sans surprise, comme si elle l'attendait. « Le sanctuaire scellé ? Bien sûr qu'on savait qu'il existait — mais personne d'assez fou pour y toucher, en tout cas jusqu'à ces contrebandiers. » Elle réfléchit un instant. « Il y a bien eu un groupe, avant eux, remontant le delta il y a peut-être deux ans. Pas des pillards ordinaires : ils posaient des questions précises, cherchaient des lieux précis, ne s'intéressaient à rien d'autre. On les appelait les Chercheurs d'éclats, dans le coin — mais ils ont disparu du jour au lendemain, sans qu'on sache pourquoi. » Elle vous regarde, sérieuse. « Si votre sanctuaire portait leurs traces, voyageur, c'est peut-être qu'ils n'ont pas disparu — qu'ils ont juste appris à se cacher mieux. »",
      [
        {
          label: 'Continuer',
          onClick: async () => {
            advanceMainQuestStage(this.character, 'rival_hunters_confirmed');
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ],
    );
  }

  // One-shot beat (identity_search_started only) — Sélène's own means came up
  // empty, so she sends the player back to Yenn a second time, for a
  // genuinely new question this time rather than reopening the Chercheurs
  // d'éclats thread that rival_hunters_confirmed already closed.
  private talkToYennAboutIdentitySearch(): void {
    this.openDialog(
      "Yenn écoute la description que vous lui donnez — une silhouette, rien de plus — sans se moquer de son imprécision. « Une seule personne, seule, qui regarde et ne prend rien... » Elle réfléchit longuement. « Ça ne ressemble à aucun des groupes qui ont fouillé ce delta ces dernières années. Ceux-là, on les entend venir de loin. » Elle hausse les épaules, presque inquiète. « Mais on m'a rapporté, il y a peu, qu'une passagère solitaire avait payé cher pour un passage discret vers l'amont, sans donner de nom, sans expliquer pourquoi. Ça ne prouve rien, voyageur. Mais si votre ombre du sanctuaire cherchait à passer inaperçue, elle a peut-être laissé une trace après tout. »",
      [
        {
          label: 'Continuer',
          onClick: async () => {
            advanceMainQuestStage(this.character, 'identity_hint_gathered');
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ],
    );
  }

  private enterSilentWatch(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SilentWatch', { x: 110, y: 380 });
    });
  }

  private leaveToClandestineDock(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ClandestineDock', { x: 110, y: 380 });
    });
  }

  // Standalone side quest, independent of the main thread — Toma has no
  // stake in the Limaneux/smuggler plot, just a fisherman fed up with torn
  // nets. Same shape as wolves_threat/crop_pests etc.: accept, track, turn
  // in, no main-quest interaction at all.
  private talkToToma(): void {
    const quest = QUESTS[FISHERMAN_QUEST_ID];
    const progress = getQuestProgress(this.character, FISHERMAN_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, FISHERMAN_QUEST_ID);
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
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} contrebandiers vaincus.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\n« Mes filets vous remercient. » Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, FISHERMAN_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog('« Bonne pêche, grâce à vous. »', [{ label: 'Fermer', onClick: () => this.closeDialog() }]);
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

  private leaveVasenoire(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SunkenRoad', { x: WORLD_WIDTH - 40, y: 150 });
    });
  }
}
