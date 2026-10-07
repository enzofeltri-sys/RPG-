import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addCrispText } from '../ui/text';
import { ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { DialogBox, DialogButton } from '../ui/dialog';
import { EXIT_TEXT, WORLD_TEXT, addZoneTitle } from '../ui/kit';

const WORLD_WIDTH = 160;
const WORLD_HEIGHT = 160;

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
  private dialog?: DialogBox;
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
    this.dialog = undefined;
    this.cameras.main.setBackgroundColor(this.roomData.floorColor);

    addZoneTitle(this, this.roomData.label);

    // A couple of undecorated furniture blocks so the room doesn't read as
    // an empty box — purely decorative, no collision (small room, nothing
    // to dodge).
    this.add.rectangle(30, 40, 24, 16, 0x4a3a2a).setStrokeStyle(1, 0x2e2015);
    this.add.rectangle(WORLD_WIDTH - 30, 40, 16, 16, 0x4a3a2a).setStrokeStyle(1, 0x2e2015);

    const npc = this.add.rectangle(WORLD_WIDTH / 2, 60, 14, 20, this.roomData.npcColor).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(npc, true);
    addCrispText(this, WORLD_WIDTH / 2, 40, this.roomData.npcName, { fontSize: '8px', ...WORLD_TEXT }).setOrigin(0.5);
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
      ...EXIT_TEXT,
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

  // Parchment dialogue box (ui/dialog.ts): long speeches page behind "Suite".
  private openDialog(text: string, buttons: DialogButton[]): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);
    this.dialog = new DialogBox(this, text, buttons);
  }

  private closeDialog(): void {
    this.dialog?.destroy();
    this.dialog = undefined;
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
