import Phaser from 'phaser';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { getMainQuestStage } from '../game/mainQuest';
import { MAP_LOCATIONS, MAP_CONNECTIONS, MAIN_QUEST_LOCATION, QUEST_LOCATIONS, MapRegion } from '../game/worldMap';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { addCrispText } from '../ui/text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';
const MUTED = '#9aa0a6';
const CURRENT_COLOR = '#e8d9b5';
const QUEST_COLOR = '#4fa3e3';
const LINE_COLOR = 0x3a3a2a;
const TAB_ACTIVE_BG = '#e8d9b5';
const TAB_INACTIVE_BG = '#3a3428';
const CURRENT_LABEL = 'Vous êtes ici';
const QUEST_LABEL = 'Quête en cours';

export class MapScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private activeRegion: MapRegion = 'start';
  private tabButtons: Record<MapRegion, Phaser.GameObjects.Text> = {} as Record<MapRegion, Phaser.GameObjects.Text>;
  private contentObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Map');
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

    addCrispText(this, width / 2, 14, 'Carte', { fontSize: '16px', color: GOLD }).setOrigin(0.5);

    const currentLocation = MAP_LOCATIONS.find((loc) => loc.key === this.returnScene);
    this.activeRegion = currentLocation?.region ?? 'start';

    this.tabButtons.start = this.makeTabButton(40, 32, 'Région 1', () => this.switchRegion('start'));
    this.tabButtons.aiglemont = this.makeTabButton(140, 32, 'Aiglemont', () => this.switchRegion('aiglemont'));

    this.renderRegion();

    addCrispText(this, 12, 300, `● ${CURRENT_LABEL}`, { fontSize: '9px', color: CURRENT_COLOR }).setOrigin(0, 0);
    addCrispText(this, 12, 316, `● ${QUEST_LABEL}`, { fontSize: '9px', color: QUEST_COLOR }).setOrigin(0, 0);

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

  private makeTabButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = addCrispText(this, x, y, label, {
      fontSize: '9px',
      color: DARK,
      backgroundColor: TAB_INACTIVE_BG,
      padding: { x: 6, y: 4 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    button.on('pointerdown', onClick);
    return button;
  }

  private switchRegion(region: MapRegion): void {
    if (region === this.activeRegion) return;
    this.activeRegion = region;
    this.renderRegion();
  }

  private renderRegion(): void {
    this.contentObjects.forEach((obj) => obj.destroy());
    this.contentObjects = [];

    (Object.keys(this.tabButtons) as MapRegion[]).forEach((region) => {
      this.tabButtons[region].setBackgroundColor(region === this.activeRegion ? TAB_ACTIVE_BG : TAB_INACTIVE_BG);
      this.tabButtons[region].setColor(region === this.activeRegion ? DARK : GOLD);
    });

    const mainQuestLocation = MAIN_QUEST_LOCATION[getMainQuestStage(this.character)];
    const questLocations = new Set<ReturnSceneKey>();
    if (mainQuestLocation) questLocations.add(mainQuestLocation);
    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);
      if (!progress || progress.state === 'turned_in') return;
      const location = QUEST_LOCATIONS[quest.id];
      if (location) questLocations.add(location);
    });

    const locations = MAP_LOCATIONS.filter((loc) => loc.region === this.activeRegion);
    const locationByKey = new Map(locations.map((loc) => [loc.key, loc]));
    // Pushes content below the title/tabs while keeping the last row clear
    // of the legend and the fixed Retour button lower on screen.
    const offsetY = 20;

    // A single Graphics object for every connection segment — Line game
    // objects have origin/positioning quirks that make per-segment Line
    // instances fiddly to place correctly; moveTo/lineTo on one Graphics
    // avoids that entirely.
    const graphics = this.add.graphics();
    graphics.lineStyle(1, LINE_COLOR, 1);
    MAP_CONNECTIONS.forEach(([fromKey, toKey]) => {
      const from = locationByKey.get(fromKey);
      const to = locationByKey.get(toKey);
      if (!from || !to) return;
      graphics.moveTo(from.x, from.y + offsetY);
      graphics.lineTo(to.x, to.y + offsetY);
    });
    graphics.strokePath();
    this.contentObjects.push(graphics);

    locations.forEach((loc) => {
      const isCurrent = loc.key === this.returnScene;
      const isQuestTarget = questLocations.has(loc.key);
      const color = isCurrent ? CURRENT_COLOR : isQuestTarget ? QUEST_COLOR : MUTED;
      const radius = isCurrent ? 6 : 4;

      const dot = this.add.circle(loc.x, loc.y + offsetY, radius, Phaser.Display.Color.HexStringToColor(color).color);
      if (isCurrent) dot.setStrokeStyle(1, 0xffffff);
      this.contentObjects.push(dot);

      const label = addCrispText(this, loc.x, loc.y + offsetY + radius + 3, loc.label, {
        fontSize: '8px',
        color,
        align: 'center',
        wordWrap: { width: 56 },
      }).setOrigin(0.5, 0);
      this.contentObjects.push(label);
    });
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
