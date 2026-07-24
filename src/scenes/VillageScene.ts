import Phaser from 'phaser';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { materialLabel, MaterialId } from '../game/material';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { createTouchButton } from '../ui/TouchButton';
import { addCrispText } from '../ui/text';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;
const INTERACT_RADIUS = 60;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

const VILLAGER_QUEST_ID = 'wolves_threat';

interface GatherNode {
  x: number;
  y: number;
  materialId: MaterialId;
  label: string;
}

const GATHER_NODES: GatherNode[] = [
  { x: 400, y: 300, materialId: 'iron_ore', label: 'Gisement de fer' },
  { x: 250, y: 480, materialId: 'herb', label: 'Herbes sauvages' },
];

export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private joystick!: VirtualJoystick;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private messageText?: Phaser.GameObjects.Text;
  private character!: Character;
  private npc!: Phaser.GameObjects.Rectangle;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private forgeBuilding!: Phaser.GameObjects.Rectangle;
  private actionButton!: Phaser.GameObjects.Text;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Village');
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    this.dialogElements = [];
    this.drawGround();

    this.addBuilding(120, 160, 70, 50);
    this.addBuilding(300, 210, 60, 60);
    this.forgeBuilding = this.addBuilding(190, 360, 90, 50);
    addCrispText(this, 190, 330, 'Forge', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    this.addBuilding(340, 460, 60, 70);

    this.npc = this.add.rectangle(120, 225, 14, 20, 0x3a5a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.npc, true);
    addCrispText(this, 120, 205, 'Villageois', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.merchantNpc = this.add.rectangle(300, 270, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.merchantNpc, true);
    addCrispText(this, 300, 250, 'Marchande', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    GATHER_NODES.forEach((node) => {
      this.add.rectangle(node.x, node.y, 16, 16, 0x6b5a3a).setStrokeStyle(1, 0x0b0c10);
      addCrispText(this, node.x, node.y - 16, node.label, { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);
    });

    this.player = createPlayer(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 80);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.npc);
    this.physics.add.collider(this.player, this.merchantNpc);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.joystick = new VirtualJoystick(this);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVillage());

    addCrispText(this, WORLD_WIDTH / 2, 40, 'Sortie du village ↑', {
      fontSize: '11px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    this.actionButton = createTouchButton(this, this.scale.width - 34, this.scale.height - 56, 'Action', () =>
      this.handleAction(),
    );

    const save = await SaveManager.load();
    if (save?.character) {
      this.character = save.character;
      new CharacterSheetPanel(this, save.character, (open) => {
        this.joystick.setEnabled(!open);
        this.actionButton.input!.enabled = !open;
      });
    }
  }

  update(): void {
    updatePlayerMovement(this.player, this.cursors, this.joystick);
  }

  private addBuilding(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, w, h, 0x5a4632).setStrokeStyle(1, 0x2e2419);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
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

  private distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
  }

  private handleAction(): void {
    if (this.distanceTo(this.npc.x, this.npc.y) < INTERACT_RADIUS) {
      this.talkToNpc();
      return;
    }

    if (this.distanceTo(this.merchantNpc.x, this.merchantNpc.y) < INTERACT_RADIUS) {
      this.scene.start('Merchant');
      return;
    }

    if (this.distanceTo(this.forgeBuilding.x, this.forgeBuilding.y) < INTERACT_RADIUS) {
      this.scene.start('Crafting');
      return;
    }

    const node = GATHER_NODES.find((n) => this.distanceTo(n.x, n.y) < INTERACT_RADIUS);
    if (node) {
      this.gather(node);
      return;
    }

    const nearBuilding = this.buildings.find((b) => this.distanceTo(b.x, b.y) < INTERACT_RADIUS);
    this.showMessage(nearBuilding ? 'Une maison du village. Personne ne répond.' : 'Rien à proximité.');
  }

  private async gather(node: GatherNode): Promise<void> {
    this.character.materials[node.materialId] = (this.character.materials[node.materialId] ?? 0) + 1;
    await SaveManager.saveCharacter(this.character);
    this.showMessage(`+1 ${materialLabel(node.materialId)}`);
  }

  private talkToNpc(): void {
    const quest = QUESTS[VILLAGER_QUEST_ID];
    const progress = getQuestProgress(this.character, VILLAGER_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, VILLAGER_QUEST_ID);
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
            turnInQuest(this.character, VILLAGER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog("Merci encore pour votre aide contre les loups corrompus.", [
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

  private showMessage(message: string): void {
    this.messageText?.destroy();
    this.messageText = addCrispText(this, this.scale.width / 2, 30, message, {
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

    this.time.delayedCall(1800, () => {
      this.messageText?.destroy();
      this.messageText = undefined;
    });
  }

  private leaveVillage(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Field');
    });
  }
}
