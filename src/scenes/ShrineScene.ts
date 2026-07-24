import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 200;
const WORLD_HEIGHT = 180;
const INTERACT_RADIUS = 60;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

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
// plus a bit of world lore, no quest attached yet.
export class ShrineScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private hermit!: Phaser.GameObjects.Rectangle;
  private actionButton!: Phaser.GameObjects.Text;
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
    this.joystick = new VirtualJoystick(this);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveShrine());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    this.actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

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
          this.joystick.setEnabled(!open);
          this.actionButton.input!.enabled = !open;
        },
      );
    }
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
  }

  private distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
  }

  private handleAction(): void {
    if (this.distanceTo(this.hermit.x, this.hermit.y) < INTERACT_RADIUS) {
      this.talkToHermit();
    }
  }

  private talkToHermit(): void {
    const text = LORE_LINES[this.loreIndex % LORE_LINES.length];
    this.loreIndex += 1;

    const alreadyFull = this.character.hp >= this.character.maxHp && this.character.mp >= this.character.maxMp;

    this.openDialog(text, [
      {
        label: alreadyFull ? 'Déjà reposé(e)' : 'Se reposer (soin complet)',
        onClick: async () => {
          if (!alreadyFull) {
            this.character.hp = this.character.maxHp;
            this.character.mp = this.character.maxMp;
            await SaveManager.saveCharacter(this.character);
          }
          this.closeDialog();
        },
      },
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[]): void {
    this.closeDialog();
    this.joystick.setEnabled(false);
    this.actionButton.input!.enabled = false;

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
    this.joystick.setEnabled(true);
    this.actionButton.input!.enabled = true;
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
