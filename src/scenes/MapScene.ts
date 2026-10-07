import Phaser from 'phaser';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { getMainQuestStage } from '../game/mainQuest';
import { MAP_LOCATIONS, MAP_CONNECTIONS, MAIN_QUEST_LOCATION, QUEST_LOCATIONS, MapLocation, MapRegion, ZONE_LEVEL } from '../game/worldMap';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { INK, KitButton, PAL, addPanel, addScreenPanel, buttonRow, panelText, preloadUiKit } from '../ui/kit';
import { SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel, centerFrame } from '../ui/screen';

const REGIONS: { id: MapRegion; label: string }[] = [
  { id: 'start', label: 'Région 1' },
  { id: 'aiglemont', label: 'Aiglemont' },
  { id: 'terresnoyees', label: 'Terres Noyées' },
];

const MAP_TOP = 60;
const MAP_H = 222;
const QUEST_INK = '#3260b0';

// worldMap.ts places locations on a loose grid (x 40..200, y 55..275) that
// later additions squeezed: each region is spread evenly over the parchment
// from its own distinct columns and rows, so labels keep their room.
interface Layout {
  x: (loc: MapLocation) => number;
  y: (loc: MapLocation) => number;
}

function regionLayout(locations: MapLocation[]): Layout {
  const xs = [...new Set(locations.map((l) => l.x))].sort((a, b) => a - b);
  const ys = [...new Set(locations.map((l) => l.y))].sort((a, b) => a - b);
  const spread = (values: number[], from: number, to: number) => (v: number) => {
    const i = values.indexOf(v);
    const t = values.length > 1 ? i / (values.length - 1) : 0.5;
    return Math.round((from + (to - from) * t) / 2) * 2;
  };
  const sx = spread(xs, SCREEN_LEFT + 28, SCREEN_LEFT + SCREEN_INNER_W - 28);
  const sy = spread(ys, MAP_TOP + 18, MAP_TOP + MAP_H - 40);
  return { x: (l) => sx(l.x), y: (l) => sy(l.y) };
}

// Carte in UI style A: a parchment map per region with dotted roads, a red
// marker where the hero stands and blue ones where a quest leads; tapping a
// place shows its monsters' level.
export class MapScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private region: MapRegion = 'start';
  private selected?: ReturnSceneKey;

  constructor() {
    super('Map');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.selected = undefined;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    centerFrame(this);
    const save = await SaveManager.load();
    this.character = save!.character!;
    this.region = MAP_LOCATIONS.find((loc) => loc.key === this.returnScene)?.region ?? 'start';
    this.render();
  }

  private questLocations(): Set<ReturnSceneKey> {
    const keys = new Set<ReturnSceneKey>();
    const main = MAIN_QUEST_LOCATION[getMainQuestStage(this.character)];
    if (main) keys.add(main);
    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);
      if (!progress || progress.state === 'turned_in') return;
      const location = QUEST_LOCATIONS[quest.id];
      if (location) keys.add(location);
    });
    return keys;
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Carte', 12).setOrigin(0.5, 0);
    buttonRow(REGIONS.length, SCREEN_LEFT, SCREEN_INNER_W).forEach(({ x, w }, i) => {
      const region = REGIONS[i];
      new KitButton(this, x, 34, w, 20, region.label, {
        size: 8,
        align: 'center',
        state: region.id === this.region ? 'pressed' : 'normal',
        onClick: () => {
          if (region.id === this.region) return;
          this.region = region.id;
          this.selected = undefined;
          this.render();
        },
      });
    });

    addPanel(this, SCREEN_LEFT, MAP_TOP, SCREEN_INNER_W, MAP_H);
    const locations = MAP_LOCATIONS.filter((loc) => loc.region === this.region);
    const byKey = new Map(locations.map((loc) => [loc.key, loc]));
    const quests = this.questLocations();
    const layout = regionLayout(locations);
    const mapX = layout.x;
    const mapY = layout.y;

    // Dotted roads.
    const roads = this.add.graphics().fillStyle(PAL.n, 1);
    MAP_CONNECTIONS.forEach(([fromKey, toKey]) => {
      const from = byKey.get(fromKey);
      const to = byKey.get(toKey);
      if (!from || !to) return;
      const [x1, y1, x2, y2] = [mapX(from), mapY(from), mapX(to), mapY(to)];
      const steps = Math.max(1, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 6));
      for (let s = 1; s < steps; s++) {
        const px = Math.round((x1 + ((x2 - x1) * s) / steps) / 2) * 2;
        const py = Math.round((y1 + ((y2 - y1) * s) / steps) / 2) * 2;
        roads.fillRect(px - 1, py - 1, 2, 2);
      }
    });

    const markers = this.add.graphics();
    locations.forEach((loc) => {
      const x = mapX(loc);
      const y = mapY(loc);
      const current = loc.key === this.returnScene;
      const quest = quests.has(loc.key);
      const size = current ? 10 : 8;
      const [fill, light] = current ? [PAL.x, PAL.y] : quest ? [PAL.u, PAL.i] : [PAL.b, PAL.N];
      markers.fillStyle(PAL.k, 1).fillRect(x - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);
      markers.fillStyle(fill, 1).fillRect(x - size / 2, y - size / 2, size, size);
      markers.fillStyle(light, 1).fillRect(x - size / 2, y - size / 2, size, 2);
      if (loc.key === this.selected) {
        markers.fillStyle(PAL.o, 1).fillRect(x - size / 2 - 4, y + size / 2 + 4, size + 8, 2);
      }
      // A parchment patch under each label so roads pass beneath the text.
      const backdrop = this.add.graphics();
      const label = panelText(this, x, y + size / 2 + 6, loc.label, 7, current ? INK.danger : quest ? QUEST_INK : INK.text, {
        align: 'center',
        wordWrap: { width: 40 },
      }).setOrigin(0.5, 0);
      backdrop.fillStyle(PAL.Q, 1).fillRect(Math.round(label.x - label.width / 2) - 1, label.y, Math.ceil(label.width) + 2, Math.ceil(label.height));
      this.add
        .zone(x - 20, y - 10, 40, 30)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selected = loc.key;
          this.render();
        });
    });

    const loc = locations.find((l) => l.key === this.selected);
    const top = MAP_TOP + MAP_H + 4;
    if (loc) {
      const level = ZONE_LEVEL[loc.key];
      const lines = [
        { text: level ? `Monstres de niveau ${level}.` : 'Pas de monstres : un lieu sûr.', color: INK.text },
      ];
      if (loc.key === this.returnScene) lines.push({ text: 'Tu es ici.', color: INK.danger });
      if (quests.has(loc.key)) lines.push({ text: 'Une quête en cours mène ici.', color: QUEST_INK });
      detailPanel(this, { text: loc.label, color: INK.text }, lines, top, 340 - top);
    } else {
      detailPanel(
        this,
        { text: 'Légende', color: INK.text },
        [
          { text: 'Rouge : tu es ici. Bleu : une quête.', color: INK.soft },
          { text: 'Touche un lieu : niveau des monstres.', color: INK.soft },
        ],
        top,
        340 - top,
      );
    }
    actionRow(this, [{ label: 'Retour', onClick: () => this.goBack() }]);
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
