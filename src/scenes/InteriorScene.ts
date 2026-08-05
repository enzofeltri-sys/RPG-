import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';

const WORLD_WIDTH = 160;
const WORLD_HEIGHT = 160;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

interface InteriorData {
  // Every "house" on the overworld used to be a flat dead end ("Personne ne
  // répond.") — this scene is the single reusable interior every one of
  // them now opens into, distinguished purely by the data passed in rather
  // than a dedicated scene per building. Keeps "make more buildings
  // enterable" a one-line addition per building instead of a new file each.
  label: string;
  floorColor: number;
  npcName: string;
  npcColor: number;
  // Basename under public/sprites/npc/ (see spritecook-assets-npc.json) —
  // optional so a building without a matching generated portrait yet just
  // keeps the plain colored rectangle.
  npcSpriteKey?: string;
  lines: string[];
  returnScene: ReturnSceneKey;
  returnX: number;
  returnY: number;
}

export class InteriorScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private lineIndex = 0;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private roomData!: InteriorData;

  constructor() {
    super('Interior');
  }

  init(data: InteriorData): void {
    this.roomData = data;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.lineIndex = 0;
    this.dialogElements = [];
    this.cameras.main.setBackgroundColor(this.roomData.floorColor);

    addCrispText(this, this.scale.width / 2, 12, this.roomData.label, {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // A couple of undecorated furniture blocks so the room doesn't read as
    // an empty box — purely decorative, no collision (small room, nothing
    // to dodge).
    this.add.rectangle(30, 40, 24, 16, 0x4a3a2a).setStrokeStyle(1, 0x2e2015);
    this.add.rectangle(WORLD_WIDTH - 30, 40, 16, 16, 0x4a3a2a).setStrokeStyle(1, 0x2e2015);

    const npc = this.add.rectangle(WORLD_WIDTH / 2, 60, 14, 20, this.roomData.npcColor).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(npc, true);
    addCrispText(this, WORLD_WIDTH / 2, 40, this.roomData.npcName, { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    if (this.roomData.npcSpriteKey) {
      const key = this.roomData.npcSpriteKey;
      void attachSpriteOverlay(this, npc, `npc-${key}`, `${import.meta.env.BASE_URL}sprites/npc/${key}.png`, 24);
    }

    this.player = createPlayer(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 30);
    this.physics.add.collider(this.player, npc);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(200);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 8, WORLD_WIDTH, 16);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveInterior());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 20, 'Sortie ↓', {
      fontSize: '9px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    const interactables: Interactable[] = [{ x: npc.x, y: npc.y, radius: 22, onTap: () => this.talkToNpc() }];
    this.tapControl.setInteractables(interactables);

    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      await setPlayerAppearance(this, this.player, save.character.race, save.character.class);
      if (!this.scene.isActive()) return;
      new CharacterSheetPanel(
        this,
        save.character,
        'Interior',
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

  private talkToNpc(): void {
    const line = this.roomData.lines[this.lineIndex % this.roomData.lines.length];
    this.lineIndex += 1;
    this.openDialog(line, [{ label: 'Fermer', onClick: () => this.closeDialog() }]);
  }

  private openDialog(text: string, buttons: { label: string; onClick: () => void }[]): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);

    const { width, height } = this.scale;
    const boxTop = height / 2 - 100;
    const boxHeight = 200;

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

  private leaveInterior(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(this.roomData.returnScene, returnSceneStartData(this.roomData.returnScene, this.roomData.returnX, this.roomData.returnY));
    });
  }
}
