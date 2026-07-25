import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { getMainQuestStage, advanceMainQuestStage } from '../game/mainQuest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { playQuestComplete } from '../ui/sound';
import { addCrispText } from '../ui/text';

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
// Hub sûr comme Valombre/Aiglemont (pas de rencontre aléatoire) : Yenn, une
// Limaneux, porte la trame principale pour l'instant — pas encore de
// marchande/forge/quêtes secondaires ici, ça viendra une fois ce premier
// point d'ancrage posé (voir DESIGN.md, incrément Acte 2).
export class VasenoireScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private yenn!: Phaser.GameObjects.Rectangle;
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

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 30);
    this.physics.add.collider(this.player, this.yenn);

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

    const interactables: Interactable[] = [
      { x: this.yenn.x, y: this.yenn.y, radius: 24, onTap: () => this.talkToYenn() },
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
      this.openDialog(
        "« Les ruines englouties au sud du delta, voilà par où commencer si vous voulez gagner la confiance des Limaneux. Revenez me voir quand vous aurez de quoi la prouver. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    this.openDialog("« Les Terres Noyées ne pardonnent pas l'imprudence, étranger. »", [
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

  private leaveVasenoire(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SunkenRoad', { x: WORLD_WIDTH - 40, y: 150 });
    });
  }
}
