import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { getMainQuestStage, advanceMainQuestStage } from '../game/mainQuest';
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
