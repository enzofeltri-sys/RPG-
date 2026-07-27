import Phaser from 'phaser';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { MAIN_QUEST_TITLE, MainQuestStage, getMainQuestStage } from '../game/mainQuest';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const ACTIVE_COLOR = '#4fa3e3';
const DONE_COLOR = '#5fbf6a';

const MAIN_QUEST_STATUS: Record<MainQuestStage, { label: string; color: string; description: string }> = {
  not_started: { label: 'Non commencée', color: MUTED, description: 'Parlez à Aldric, à Basse-Combe.' },
  dungeon: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez au Repaire du Loup et affrontez ce qui commande à la meute.',
  },
  revelation: { label: 'En cours', color: ACTIVE_COLOR, description: 'Retournez voir Aldric, à Basse-Combe.' },
  aiglemont: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Trouvez la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  complete: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  catacombs: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Fouillez les Catacombes d'Aiglemont.",
  },
  trail_found: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  debriefed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  faubourg_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Trouvez le capitaine des contrebandiers, dans un entrepôt au nord du Faubourg des quais.',
  },
  shard_confirmed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  shards_beyond: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  trail_west: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Interrogez les chasseurs, au Relais des chasseurs.',
  },
  river_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  act1_complete: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  crossing_marshes: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Traversez les Terres Noyées, au-delà du Relais des chasseurs, jusqu\'à Vasenoire.',
  },
  vasenoire_arrival: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Gagnez la confiance des Limaneux, à Vasenoire.',
  },
  delta_conspiracy: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Discutez avec Yenn, à Vasenoire.',
  },
  limaneux_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Enquêtez sur le quai clandestin, au nord de Vasenoire.',
  },
  network_exposed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir Yenn, à Vasenoire.',
  },
  smugglers_unmasked: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  network_reported: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  sealed_vault_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Trouvez le sanctuaire scellé, près du quai clandestin.',
  },
  vault_uncovered: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  shard_cache_found: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rival_hunters_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir Yenn, à Vasenoire.',
  },
  rival_hunters_confirmed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  threat_acknowledged: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
};

// Just below the title and just above the "Retour" button — the list scrolls
// inside this band instead of overflowing under the button once there are
// enough quests to exceed it (6 already do, more are coming).
const VIEWPORT_TOP = 32;
const VIEWPORT_BOTTOM = 345;

export class QuestLogScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private listContainer!: Phaser.GameObjects.Container;
  private minScrollY = 0;
  private dragging = false;
  private dragStartY = 0;
  private containerStartY = 0;

  constructor() {
    super('Quests');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
  }

  async create(): Promise<void> {
    const { width } = this.scale;
    const save = await SaveManager.load();
    this.character = save!.character!;

    addCrispText(this, width / 2, 14, 'Quêtes', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    this.listContainer = this.add.container(0, 0);
    let y = VIEWPORT_TOP + 8;

    const addToList = (obj: Phaser.GameObjects.GameObject) => this.listContainer.add(obj);

    const mainStage = getMainQuestStage(this.character);
    const mainStatus = MAIN_QUEST_STATUS[mainStage];
    addToList(addCrispText(this, 12, y, MAIN_QUEST_TITLE, { fontSize: '12px', color: GOLD }).setOrigin(0, 0));
    y += 18;
    addToList(addCrispText(this, 12, y, mainStatus.label, { fontSize: '9px', color: mainStatus.color }).setOrigin(0, 0));
    y += 16;
    addToList(
      addCrispText(this, 12, y, mainStatus.description, {
        fontSize: '9px',
        color: MUTED,
        wordWrap: { width: width - 24 },
        lineSpacing: 3,
      }).setOrigin(0, 0),
    );
    y += 50;

    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);

      let statusLabel: string;
      let color: string;
      if (!progress) {
        statusLabel = 'Non commencée';
        color = MUTED;
      } else if (progress.state === 'active') {
        statusLabel = `En cours (${progress.progress}/${quest.objective.count})`;
        color = ACTIVE_COLOR;
      } else {
        statusLabel = progress.state === 'completed' ? 'Terminée — récompense à récupérer' : 'Terminée';
        color = DONE_COLOR;
      }

      addToList(addCrispText(this, 12, y, quest.title, { fontSize: '12px', color: GOLD }).setOrigin(0, 0));
      y += 18;
      addToList(addCrispText(this, 12, y, statusLabel, { fontSize: '9px', color }).setOrigin(0, 0));
      y += 16;
      addToList(
        addCrispText(this, 12, y, quest.description, {
          fontSize: '9px',
          color: MUTED,
          wordWrap: { width: width - 24 },
          lineSpacing: 3,
        }).setOrigin(0, 0),
      );
      y += 50;
    });

    if (Object.keys(QUESTS).length === 0) {
      addToList(addCrispText(this, 12, y, 'Aucune quête pour le moment.', { fontSize: '10px', color: MUTED }));
    }

    this.setupScrolling(y);

    const backButton = addCrispText(this, width / 2, 362, 'Retour', {
      fontSize: '13px',
      color: DARK,
      backgroundColor: GOLD,
      padding: { x: 10, y: 6 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    backButton.on('pointerdown', () => this.goBack());
  }

  // contentBottom is the y just past the last entry drawn into listContainer.
  // Only the list scrolls (drag up/down) — the title and "Retour" button stay
  // fixed, since they're plain scene-level objects, not container children.
  private setupScrolling(contentBottom: number): void {
    const { width } = this.scale;
    const viewportHeight = VIEWPORT_BOTTOM - VIEWPORT_TOP;
    const contentHeight = contentBottom - VIEWPORT_TOP;
    this.minScrollY = Math.min(0, viewportHeight - contentHeight);

    const maskShape = this.make.graphics({}, false);
    maskShape.fillRect(0, VIEWPORT_TOP, width, viewportHeight);
    this.listContainer.setMask(maskShape.createGeometryMask());

    if (this.minScrollY === 0) return; // Everything fits — no need to drag.

    const dragZone = this.add
      .zone(width / 2, VIEWPORT_TOP + viewportHeight / 2, width, viewportHeight)
      .setInteractive();
    dragZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartY = pointer.y;
      this.containerStartY = this.listContainer.y;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      const newY = this.containerStartY + (pointer.y - this.dragStartY);
      this.listContainer.y = Phaser.Math.Clamp(newY, this.minScrollY, 0);
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
    });
    this.input.on('pointerupoutside', () => {
      this.dragging = false;
    });
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
