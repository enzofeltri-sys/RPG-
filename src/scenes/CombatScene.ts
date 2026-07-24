import Phaser from 'phaser';
import { Character, grantXp } from '../game/character';
import { Monster, createTestMonster } from '../game/monster';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const BAR_WIDTH = 160;

interface CombatData {
  returnScene?: string;
}

export class CombatScene extends Phaser.Scene {
  private character!: Character;
  private monster!: Monster;
  private returnScene = 'Field';
  private busy = false;
  private ended = false;

  private logText!: Phaser.GameObjects.Text;
  private enemyHpFill!: Phaser.GameObjects.Rectangle;
  private enemyHpText!: Phaser.GameObjects.Text;
  private playerHpFill!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private playerMpFill!: Phaser.GameObjects.Rectangle;
  private playerMpText!: Phaser.GameObjects.Text;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private continueButton?: Phaser.GameObjects.Text;

  constructor() {
    super('Combat');
  }

  init(data: CombatData): void {
    this.returnScene = data?.returnScene ?? 'Field';
    this.busy = false;
    this.ended = false;
    this.actionButtons = [];
    this.continueButton = undefined;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    this.cameras.main.setBackgroundColor('#1a1410');
    this.cameras.main.fadeIn(250);

    const save = await SaveManager.load();
    this.character = save!.character!;
    this.monster = createTestMonster();

    addCrispText(this, width / 2, 34, this.monster.name, {
      fontSize: '15px',
      color: GOLD,
    }).setOrigin(0.5);

    this.add.rectangle(width / 2, 90, 64, 64, 0x6b2b2b).setStrokeStyle(1, 0x2e1414);

    const enemyBarX = width / 2 - BAR_WIDTH / 2;
    this.add.rectangle(enemyBarX, 136, BAR_WIDTH, 10, 0x33261f).setOrigin(0, 0.5);
    this.enemyHpFill = this.add.rectangle(enemyBarX, 136, BAR_WIDTH, 10, 0x8a3a3a).setOrigin(0, 0.5);
    this.enemyHpText = addCrispText(this, width / 2, 150, '', { fontSize: '9px', color: MUTED }).setOrigin(0.5);

    addCrispText(this, width / 2, 190, this.characterLabel(), {
      fontSize: '11px',
      color: GOLD,
    }).setOrigin(0.5);

    const playerBarX = width / 2 - BAR_WIDTH / 2;
    addCrispText(this, playerBarX, 208, 'PV', { fontSize: '9px', color: MUTED });
    this.add.rectangle(playerBarX + 24, 213, BAR_WIDTH - 24, 10, 0x1f2a1f).setOrigin(0, 0.5);
    this.playerHpFill = this.add.rectangle(playerBarX + 24, 213, BAR_WIDTH - 24, 10, 0x4a8a4a).setOrigin(0, 0.5);
    this.playerHpText = addCrispText(this, width / 2 + BAR_WIDTH / 2 + 6, 213, '', {
      fontSize: '9px',
      color: MUTED,
    }).setOrigin(0, 0.5);

    addCrispText(this, playerBarX, 228, 'PM', { fontSize: '9px', color: MUTED });
    this.add.rectangle(playerBarX + 24, 233, BAR_WIDTH - 24, 10, 0x1f1f2a).setOrigin(0, 0.5);
    this.playerMpFill = this.add.rectangle(playerBarX + 24, 233, BAR_WIDTH - 24, 10, 0x4a4a8a).setOrigin(0, 0.5);
    this.playerMpText = addCrispText(this, width / 2 + BAR_WIDTH / 2 + 6, 233, '', {
      fontSize: '9px',
      color: MUTED,
    }).setOrigin(0, 0.5);

    this.logText = addCrispText(this, width / 2, 270, `Un ${this.monster.name.toLowerCase()} apparaît !`, {
      fontSize: '10px',
      color: GOLD,
      align: 'center',
      wordWrap: { width: width - 24 },
    }).setOrigin(0.5);

    this.createActionButton(width / 2 - 55, 330, 'Attaquer', () => this.playerAttack());
    this.createActionButton(width / 2 + 55, 330, 'Fuir', () => this.flee());

    this.refreshBars();
  }

  private characterLabel(): string {
    return `Niveau ${this.character.level}`;
  }

  private createActionButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = addCrispText(this, x, y, label, {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', onClick);
    this.actionButtons.push(button);
  }

  private setActionsEnabled(enabled: boolean): void {
    this.actionButtons.forEach((button) => {
      button.input!.enabled = enabled;
      button.setAlpha(enabled ? 1 : 0.5);
    });
  }

  private hideActions(): void {
    this.actionButtons.forEach((button) => button.setVisible(false));
  }

  private refreshBars(): void {
    this.enemyHpFill.width = BAR_WIDTH * Math.max(0, this.monster.hp / this.monster.maxHp);
    this.enemyHpText.setText(`${Math.max(0, this.monster.hp)}/${this.monster.maxHp}`);

    const hpWidth = BAR_WIDTH - 24;
    this.playerHpFill.width = hpWidth * Math.max(0, this.character.hp / this.character.maxHp);
    this.playerHpText.setText(`${Math.max(0, this.character.hp)}/${this.character.maxHp}`);
    this.playerMpFill.width = hpWidth * Math.max(0, this.character.mp / this.character.maxMp);
    this.playerMpText.setText(`${Math.max(0, this.character.mp)}/${this.character.maxMp}`);
  }

  private playerAttack(): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    this.setActionsEnabled(false);

    const damage = Phaser.Math.Between(2, 5) + Math.floor(this.character.stats.strength / 2);
    this.monster.hp -= damage;
    this.refreshBars();
    this.logText.setText(`Vous infligez ${damage} dégâts.`);

    if (this.monster.hp <= 0) {
      this.time.delayedCall(600, () => this.victory());
      return;
    }

    this.time.delayedCall(900, () => this.enemyTurn());
  }

  private enemyTurn(): void {
    const damage = Math.max(1, this.monster.attack + Phaser.Math.Between(-1, 2));
    this.character.hp = Math.max(0, this.character.hp - damage);
    this.refreshBars();
    this.logText.setText(`${this.monster.name} vous inflige ${damage} dégâts.`);

    if (this.character.hp <= 0) {
      this.time.delayedCall(600, () => this.defeat());
      return;
    }

    this.busy = false;
    this.setActionsEnabled(true);
  }

  private flee(): void {
    if (this.busy || this.ended) return;
    this.busy = true;
    this.setActionsEnabled(false);
    this.logText.setText('Vous prenez la fuite.');
    this.time.delayedCall(500, () => this.leaveTo(this.returnScene));
  }

  private async victory(): Promise<void> {
    this.ended = true;
    this.hideActions();
    const levelsGained = grantXp(this.character, this.monster.xpReward);
    await SaveManager.saveCharacter(this.character);
    this.refreshBars();

    const message =
      levelsGained > 0
        ? `Victoire ! +${this.monster.xpReward} XP — niveau supérieur !`
        : `Victoire ! +${this.monster.xpReward} XP`;
    this.logText.setText(message);
    this.showContinue(() => this.leaveTo(this.returnScene));
  }

  private async defeat(): Promise<void> {
    this.ended = true;
    this.hideActions();
    this.character.hp = Math.max(1, Math.floor(this.character.maxHp * 0.2));
    await SaveManager.saveCharacter(this.character);
    this.logText.setText('Vous avez été vaincu... et ramené au village.');
    this.showContinue(() => this.leaveTo('Village'));
  }

  private showContinue(onClick: () => void): void {
    this.continueButton = addCrispText(this, this.scale.width / 2, 330, 'Continuer', {
      fontSize: '12px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.continueButton.on('pointerdown', onClick);
  }

  private leaveTo(sceneKey: string): void {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey);
    });
  }
}
