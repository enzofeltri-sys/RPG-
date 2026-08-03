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

// Large enough to fill the portrait canvas (216x384) at every camera
// position — see HamletScene's WORLD_HEIGHT comment for why a smaller world
// leaves a black band showing through.
const WORLD_WIDTH = 220;
const WORLD_HEIGHT = 400;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const QUEST_ID = 'shrine_pilgrims';

const LORE_LINES = [
  "Ce lieu est plus ancien que Basse-Combe elle-même. On dit qu'il fut élevé au temps du Sceau originel, pour veiller sur ceux qui portent une marque comme la vôtre.",
  "La corruption ne ronge pas le monde au hasard, jeune voyageur. Quelque chose l'attise, quelque part. Restez prudent sur les routes.",
  "Je n'ai plus la force de voyager, mais je peux encore offrir le repos à qui en a besoin. Reposez-vous autant que nécessaire.",
];

interface ShrineData {
  x?: number;
  y?: number;
}

// The rite passage only exists (visually and as a tap target) once Sélène
// has sent the player here for the actual rite — showing it earlier would
// spoil that the sanctuary itself is the final site, and tapping it before
// then has nothing to do anyway. Stays visible through every stage after,
// including the 3 endings, so the dungeon (and its boss) stays farmable
// like every other dungeon in the game once unlocked.
const FINAL_RITE_STAGES: MainQuestStage[] = [
  'rite_night',
  'rite_climax',
  'ending_new_seal',
  'ending_destruction',
  'ending_ascension',
];

const ENDING_TEXT: Record<'ending_new_seal' | 'ending_destruction' | 'ending_ascension', string> = {
  ending_new_seal:
    "Vous posez la main sur la fissure, et laissez la marque faire ce qu'elle a toujours été destinée à faire. La douleur est brève ; ce qui reste après ne l'est pas. Le sceau ne se referme pas — il se déplace, en vous, vivant, tenu par un choix plutôt que par une pierre. Sélène pleure sans honte. La Veilleuse, pour la première fois, sourit. Vaeloria continuera, fracturée mais debout, gardée par quelqu'un qui a choisi de rester. Ce ne sera plus jamais tout à fait votre histoire à raconter vous-même — mais elle continue, et c'est, après tout ce chemin, exactement ce qu'il fallait.",
  ending_destruction:
    "Aux deux sites extérieurs, les hommes de Bregan tiennent leur position une dernière fois pendant que vous, Sélène et la Veilleuse portez le rite à son terme — non pour contenir, mais pour trancher. Le Roi Démon ne se brise pas en un instant ; il se brise en hurlant, sur trois cents ans de rancœur enfin vidés d'un coup. Quand le silence revient, quelque chose d'immense a cessé d'exister, et Vaeloria, pour la première fois depuis la Rupture, n'a plus besoin de sceau du tout. La victoire a un prix — des noms que Bregan portera en lui, des sites qui ne se relèveront pas indemnes — mais elle est réelle, et elle est à vous trois.",
  ending_ascension:
    "Vous tendez la main vers ce que le rite libère, et au lieu de le combattre, vous le prenez. La Veilleuse crie un avertissement que vous n'entendez plus vraiment ; Sélène recule, le visage traversé d'une terreur qu'elle ne cachera plus jamais tout à fait en votre présence. Le pouvoir du Roi Démon ne vous consume pas — il se love en vous, patient, comme s'il avait toujours su que ce jour viendrait. Vous quittez le sanctuaire différent, plus fort qu'aucun royaume fracturé ne saurait l'être seul. Ce que vous ferez de cette force reste à écrire — mais Vaeloria a, ce jour-là, cessé d'avoir un sceau, et gagné quelque chose d'autre à sa place.",
};

// The "petit sanctuaire" from VISION.md's region-1 description — a small
// dead-end branch off Basse-Combe, east side. No combat here on purpose (a
// sanctuary should read as a safe haven): a hermit offers a free full heal
// plus a bit of world lore, and a quest that sends the player back out to
// the Forêt rather than breaking the no-combat rule locally.
export class ShrineScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private hermit!: Phaser.GameObjects.Rectangle;
  private silhouette?: Phaser.GameObjects.Rectangle;
  private baseInteractables: Interactable[] = [];
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private loreIndex = 0;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Shrine');
  }

  init(data: ShrineData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialogElements = [];
    this.loreIndex = 0;
    this.cameras.main.setBackgroundColor('#3a3a4a');

    addCrispText(this, this.scale.width / 2, 12, 'Le petit sanctuaire', {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Shrine altar + standing stones, purely decorative.
    this.add.rectangle(100, 50, 30, 20, 0x8a8a9a).setStrokeStyle(1, 0x4a4a5a);
    this.add.rectangle(60, 70, 8, 24, 0x6a6a7a).setStrokeStyle(1, 0x35354a);
    this.add.rectangle(140, 70, 8, 24, 0x6a6a7a).setStrokeStyle(1, 0x35354a);

    // A couple more standing stones lining the path up to the altar.
    this.add.rectangle(70, 220, 8, 24, 0x6a6a7a).setStrokeStyle(1, 0x35354a);
    this.add.rectangle(150, 280, 8, 24, 0x6a6a7a).setStrokeStyle(1, 0x35354a);
    this.add.rectangle(90, 340, 8, 24, 0x6a6a7a).setStrokeStyle(1, 0x35354a);

    addCrispText(this, 100, 30, 'Autel', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    // Off the x=100 spawn-to-exit centerline, same lesson as every other camp/NPC.
    this.hermit = this.add.rectangle(140, 100, 14, 20, 0x9a8a6a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.hermit, true);
    addCrispText(this, 140, 80, 'Ermite', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.physics.add.collider(this.player, this.hermit);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveShrine());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // A passage beneath the altar, sealed for three centuries — the hermit
    // never knew it was there. Not a fixed-encounter zone in this scene
    // (the shrine stays combat-free), just a tap-through into
    // SealChamberScene, which has its own gate/boss/chest like every other
    // dungeon.
    //
    // A second tap-through, at the outer standing stone Aldric now
    // recognizes thanks to the fragment — same "combat-free entry into a
    // combat-full scene" shape as the altar above.
    this.baseInteractables = [
      { x: this.hermit.x, y: this.hermit.y, radius: 24, onTap: () => this.talkToHermit() },
      { x: 100, y: 50, radius: 22, onTap: () => this.enterSealChamber() },
      { x: 150, y: 280, radius: 22, onTap: () => this.enterWatchersLodge() },
    ];
    this.tapControl.setInteractables(this.baseInteractables);

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
        'Shrine',
        () => ({ x: this.player.x, y: this.player.y }),
        (open) => {
          this.tapControl.setEnabled(!open);
        },
      );

      // The silhouette, in person, for the first time — only present for
      // this one stage. Kept well clear of the altar's SealChamber
      // tap-through at (100, 50) so the two never compete for a tap.
      if (getMainQuestStage(this.character) === 'awaiting_meeting') {
        this.silhouette = this.add.rectangle(100, 25, 12, 20, 0x2a2a3a).setStrokeStyle(1, 0xe8d9b5);
        addCrispText(this, 100, 10, 'Silhouette', { fontSize: '8px', color: '#e8d9b5' }).setOrigin(0.5);
        this.tapControl.setInteractables([
          ...this.baseInteractables,
          { x: 100, y: 25, radius: 20, onTap: () => this.meetSilhouette() },
        ]);
      }

      // Kept well clear of every existing interactable here (hermit at
      // (140,100)r24, altar at (100,50)r22, outer stone at (150,280)r22) —
      // TapController now warns on overlap (see input/TapController.ts), so
      // this was placed with that check in mind, not just eyeballed.
      if (FINAL_RITE_STAGES.includes(getMainQuestStage(this.character))) {
        this.add.rectangle(180, 340, 14, 22, 0x2a1a3a).setStrokeStyle(1, 0xe8d9b5);
        addCrispText(this, 180, 322, 'Faille du rite', { fontSize: '8px', color: '#e8d9b5' }).setOrigin(0.5);
        this.tapControl.setInteractables([
          ...this.baseInteractables,
          { x: 180, y: 340, radius: 20, onTap: () => this.handleRiteFissure() },
        ]);
      }
    }
  }

  update(_time: number, delta: number): void {
    const arrived = !updatePlayerMovement(this.player, this.cursors, this.tapControl.getMoveTarget());
    if (arrived) this.tapControl.clearMoveTarget();
    this.tapControl.update(delta);
  }

  private talkToHermit(): void {
    const quest = QUESTS[QUEST_ID];
    const progress = getQuestProgress(this.character, QUEST_ID);

    // The free heal stays reachable no matter the quest state (a sanctuary
    // shouldn't stop being one) — folded in as a second button everywhere
    // except the one-shot turn-in dialog, at most 2 buttons per dialog to
    // match every other scene's openDialog layout.
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
        this.restButton(),
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} gobelins éclaireurs vaincus.`,
        [this.restButton(), { label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLes pèlerins vous en seront reconnaissants. Voici votre récompense.`, [
        {
          label: 'Récupérer',
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

    const stage = getMainQuestStage(this.character);
    if (stage === 'hermit_lead') {
      this.talkToHermitAboutWatchers();
      return;
    }
    if (stage === 'hermit_confided') {
      this.openDialog(
        "« Retournez voir votre mage, voyageur. Elle saura quoi faire de ça mieux que moi. »",
        [this.restButton(), { label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    if (stage === 'lodge_lead') {
      this.openDialog(
        "Aldric prend le fragment entre ses mains tremblantes, le tourne vers la lumière. « La pierre extérieure, dans mon propre jardin... » Il secoue la tête, incrédule. « J'ai marché devant cette pierre chaque jour depuis quarante ans, voyageur, sans jamais voir ce que ces marques signifiaient vraiment. » Il vous la désigne, à l'écart du chemin. « Si le mot 'Ensemble' devait vous mener quelque part, c'est là. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    this.showLoreAndRest();
  }

  // One-shot beat (hermit_lead only) — Aldric has never spoken about the main
  // quest before now (his only role until this point was shrine_pilgrims and
  // ambient lore), even though his own shrine sat over the seal chamber the
  // whole time. Reusing him here pays off a Act 1 character rather than
  // introducing a new one for a single line.
  private talkToHermitAboutWatchers(): void {
    this.openDialog(
      "Aldric vous écoute sans surprise, comme s'il attendait cette question depuis longtemps. « 'Veiller, jamais frapper les premiers'... » Il ferme les yeux un instant. « Mon prédécesseur me l'a enseigné, avant moi le sien — un dicton de gardien, pas d'écriture. 'Les veilleurs ne meurent pas de vieillesse. Ils meurent de doute.' » Il rouvre les yeux, graves. « Je ne sais pas si l'ordre existe encore, voyageur. Mais la formule, elle, a survécu. Et une formule qui survit trois siècles n'est jamais tout à fait morte. »",
      [
        {
          label: 'Continuer',
          onClick: async () => {
            advanceMainQuestStage(this.character, 'hermit_confided');
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ],
    );
  }

  // One-shot beat (awaiting_meeting only) — the first time the silhouette
  // appears in person rather than through a message or a token left at the
  // altar. She disappears from the shrine once the stage moves past this,
  // same "moment has passed" convention as every other one-shot NPC beat.
  private meetSilhouette(): void {
    this.openDialog(
      "Elle est là, près de l'autel, comme si elle avait toujours fait partie du paysage — une silhouette qui, de près, cesse enfin d'être une ombre. Un visage. Des yeux qui vous observent avec autant de prudence que de soulagement. « Vous êtes venu », dit-elle, la voix plus jeune que vous ne l'auriez imaginée. « Je pensais que j'aurais plus peur. » Elle jette un regard vers le sanctuaire, vers les pierres, comme pour se rassurer qu'elles sont bien réelles, elle aussi. « Je n'ai pas cherché ce nom, voyageur. Il m'a été donné, comme à ceux avant moi — une charge, pas une légende, quoi qu'en disent les tombes et les registres que vous avez fouillés. » Un silence, plus long que les mots qui l'ont précédé. « Je vous ai observé de loin parce que je devais savoir si vous alliez chercher à réparer le sceau, ou seulement à comprendre ce qui le brise. Ce n'est pas la même chose. » Elle vous tend la main, presque timidement. « Je crois que nous allons devoir faire les deux, maintenant. Ensemble, comme je l'ai écrit. Vraiment, cette fois. »",
      [
        {
          label: 'Continuer',
          onClick: async () => {
            advanceMainQuestStage(this.character, 'first_meeting');
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.silhouette?.destroy();
            this.silhouette = undefined;
            this.tapControl.setInteractables(this.baseInteractables);
            this.closeDialog();
          },
        },
      ],
    );
  }

  // rite_night: first descent, into the final dungeon. rite_climax: the
  // boss is already down — this is where the 3-way ending choice actually
  // lives. The 3 ending stages themselves re-enter the (now just a regular
  // farmable dungeon) depths, same as every other cleared boss in the game.
  private handleRiteFissure(): void {
    const stage = getMainQuestStage(this.character);
    if (stage === 'rite_climax') {
      this.presentEndingChoice();
      return;
    }
    this.enterSanctuaryDepths();
  }

  private presentEndingChoice(): void {
    this.openDialog(
      "Le fragment retombe en poussière. Le sceau, sous vos bottes, tremble encore. Sélène surgit du passage, la Veilleuse à son côté — enfin sans ombre pour se cacher. « Ça a tenu, aux deux autres sites. Mais pas longtemps : le sceau ne peut plus rester ce qu'il était. » Elle vous regarde, grave. « Vous portez la marque, pas nous. C'est votre choix à faire. »",
      [
        { label: "Devenir l'ancre", onClick: () => this.chooseEnding('ending_new_seal', ENDING_TEXT.ending_new_seal) },
        {
          label: 'Détruire, ensemble',
          onClick: () => this.chooseEnding('ending_destruction', ENDING_TEXT.ending_destruction),
        },
        {
          label: 'Absorber le pouvoir',
          onClick: () => this.chooseEnding('ending_ascension', ENDING_TEXT.ending_ascension),
        },
      ],
      260,
    );
  }

  private async chooseEnding(stage: MainQuestStage, epilogue: string): Promise<void> {
    advanceMainQuestStage(this.character, stage);
    await SaveManager.saveCharacter(this.character);
    playQuestComplete();
    this.openDialog(epilogue, [{ label: 'Fermer', onClick: () => this.closeDialog() }]);
  }

  private showLoreAndRest(): void {
    const text = LORE_LINES[this.loreIndex % LORE_LINES.length];
    this.loreIndex += 1;

    this.openDialog(text, [this.restButton(), { label: 'Fermer', onClick: () => this.closeDialog() }]);
  }

  private restButton(): { label: string; onClick: () => void } {
    const alreadyFull = this.character.hp >= this.character.maxHp && this.character.mp >= this.character.maxMp;
    return {
      label: alreadyFull ? 'Déjà reposé(e)' : 'Se reposer (soin complet)',
      onClick: async () => {
        if (!alreadyFull) {
          this.character.hp = this.character.maxHp;
          this.character.mp = this.character.maxMp;
          await SaveManager.saveCharacter(this.character);
        }
        this.closeDialog();
      },
    };
  }

  // boxHeight defaults to the size every other dialog in this scene already
  // fits in; the 3-way ending choice is the first to need more room for a
  // 3rd button, so it passes a taller value instead of every existing call
  // site needing to change.
  private openDialog(text: string, buttons: { label: string; onClick: () => void }[], boxHeight = 200): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const boxTop = height / 2 - 100;

    // Measured before the buttons so a long paragraph can push them down
    // instead of running underneath them — every dialog before the 3-way
    // ending choice stayed short enough that the fixed height/2+50 offset
    // never visibly overlapped, but that was luck, not a guarantee (confirmed
    // by testing: this exact text/button combo overlapped at a fixed offset).
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

    // Clamped so a long paragraph pushes buttons down but never past the
    // visible canvas (height) — an unreachable off-screen button would be
    // strictly worse than the pre-fix behavior of drawing it mid-paragraph
    // at a fixed offset, at least still on-screen and tappable.
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

  private enterSanctuaryDepths(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SanctuaryDepths', { x: 110, y: 380 });
    });
  }

  private enterSealChamber(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SealChamber', { x: 110, y: 380 });
    });
  }

  private enterWatchersLodge(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('WatchersLodge', { x: 110, y: 380 });
    });
  }

  private leaveShrine(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Hamlet', { x: 200, y: 140 });
    });
  }
}
