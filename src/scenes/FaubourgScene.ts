import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite } from '../entities/player';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

// Wide enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment.
const WORLD_WIDTH = 260;
const WORLD_HEIGHT = 400;
const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const QUEST_ID = 'faubourg_smugglers';
const LEADER_QUEST_ID = 'faubourg_smugglers_leader';

interface EncounterMarker {
  id: string;
  x: number;
  y: number;
  label: string;
}

const ENCOUNTERS: EncounterMarker[] = [
  { id: 'smugglers_1', x: 90, y: 100, label: 'Contrebandiers' },
  { id: 'smugglers_2', x: 180, y: 70, label: 'Contrebandiers' },
];

interface FaubourgData {
  resume?: boolean;
  x?: number;
  y?: number;
}

// An optional detour off Aiglemont's east edge — Acte 2's first side content
// outside the city itself, same gabarit as BanditCamp/GoblinCamp (dead end,
// farmable, no gate). Ties loosely into Sélène's revelation (disappearing
// seal shards) without being blocked behind the main quest thread — per
// DESIGN.md, Acte 2 side content stays free-standing.
export class FaubourgScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private character!: Character;
  private informant!: Phaser.GameObjects.Rectangle;
  private dialogElements: Phaser.GameObjects.GameObject[] = [];
  private clearedEncounterIds = new Set<string>();
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Faubourg');
  }

  init(data: FaubourgData): void {
    if (!data?.resume) {
      this.clearedEncounterIds = new Set();
    }
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.dialogElements = [];
    this.cameras.main.setBackgroundColor('#2e3440');

    addCrispText(this, this.scale.width / 2, 12, 'Le Faubourg des quais', {
      fontSize: '10px',
      color: '#9aa0a6',
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(500);

    // Crates and a moored boat hull, purely decorative.
    this.add.rectangle(60, 150, 40, 30, 0x4a4638).setStrokeStyle(1, 0x22201a);
    this.add.rectangle(200, 140, 40, 30, 0x4a4638).setStrokeStyle(1, 0x22201a);
    this.add.rectangle(130, 300, 90, 24, 0x3a4a52).setStrokeStyle(1, 0x1a232a);
    this.add.rectangle(80, 270, 20, 14, 0x4a4030).setStrokeStyle(1, 0x22201a);
    this.add.rectangle(190, 310, 20, 14, 0x4a4030).setStrokeStyle(1, 0x22201a);

    // Off the x=130 centerline (spawn sits on it), same lesson as every other
    // location this session.
    this.informant = this.add.rectangle(190, 185, 14, 20, 0x5a6a7a).setStrokeStyle(1, 0x0b0c10);
    this.physics.add.existing(this.informant, true);
    addCrispText(this, 190, 165, 'Renn', { fontSize: '8px', color: '#9aa0a6' }).setOrigin(0.5);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 40);
    this.physics.add.collider(this.player, this.informant);
    ENCOUNTERS.filter((e) => !this.clearedEncounterIds.has(e.id)).forEach((encounter) =>
      this.addEncounterZone(encounter),
    );

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveFaubourg());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, 'Sortie ↓', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    // North zone — a medium-difficulty dungeon behind the smugglers'
    // operation, between Le vieux puits (easy) and Catacombes (hard).
    const warehouseZone = this.add.zone(WORLD_WIDTH / 2, 10, WORLD_WIDTH, 20);
    this.physics.add.existing(warehouseZone, true);
    this.physics.add.overlap(this.player, warehouseZone, () => this.enterWarehouse());

    addCrispText(this, WORLD_WIDTH / 2, 30, 'Entrepôt ↑', {
      fontSize: '10px',
      color: '#9aa0a6',
    }).setOrigin(0.5);

    const interactables: Interactable[] = [
      { x: this.informant.x, y: this.informant.y, radius: 24, onTap: () => this.talkToInformant() },
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
        'Faubourg',
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

  private talkToInformant(): void {
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
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} contrebandiers vaincus.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nMerci d'avoir nettoyé les quais. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.talkToInformantAboutLeader();
  }

  // Reached only once faubourg_smugglers is turned in — a short local
  // follow-up pointing at the Entrepôt (WarehouseScene) boss, tying that
  // dungeon into this side quest rather than leaving it a standalone fight.
  private talkToInformantAboutLeader(): void {
    const quest = QUESTS[LEADER_QUEST_ID];
    const progress = getQuestProgress(this.character, LEADER_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, LEADER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nToujours pas de nouvelles du capitaine.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\nLe trafic s'arrête ici. Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, LEADER_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    this.openDialog('Les quais sont plus calmes depuis votre passage.', [
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

  private addEncounterZone(encounter: EncounterMarker): void {
    const marker = this.add.rectangle(encounter.x, encounter.y, 26, 26, 0x3a4a5a, 0.8).setStrokeStyle(1, 0x0b0c10);
    const label = addCrispText(this, encounter.x, encounter.y - 22, encounter.label, {
      fontSize: '8px',
      color: '#e8d9b5',
    }).setOrigin(0.5);

    const zone = this.add.zone(encounter.x, encounter.y, 26, 26);
    this.physics.add.existing(zone, true);

    const overlap = this.physics.add.overlap(this.player, zone, () => {
      overlap.destroy();
      marker.destroy();
      label.destroy();
      zone.destroy();
      this.clearedEncounterIds.add(encounter.id);
      this.startCombat();
    });
  }

  private startCombat(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'Faubourg',
        monsterId: 'smuggler_thug',
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private enterWarehouse(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Warehouse');
    });
  }

  private leaveFaubourg(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('City', { x: 500, y: 240 });
    });
  }
}
