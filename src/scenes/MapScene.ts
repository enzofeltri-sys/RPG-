import Phaser from 'phaser';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { getMainQuestStage } from '../game/mainQuest';
import { MAP_LOCATIONS, MAP_CONNECTIONS, MAIN_QUEST_LOCATION, QUEST_LOCATIONS, MapLocation, MapRegion, ZONE_LEVEL } from '../game/worldMap';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { TRAVEL_FROM, Waystone, awakeWaystones } from '../game/waystones';
import { INK, KitButton, PAL, addPanel, addScreenPanel, buttonRow, panelText, preloadUiKit } from '../ui/kit';
import { SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel, centerFrame } from '../ui/screen';

const REGIONS: { id: MapRegion; label: string }[] = [
  { id: 'start', label: 'Départ' },
  { id: 'sanctuaire', label: 'Sceau' },
  { id: 'aiglemont', label: 'Aiglemont' },
  { id: 'terresnoyees', label: 'Noyées' },
];

const MAP_TOP = 60;
const MAP_H = 222;
const QUEST_INK = '#3260b0';

// worldMap.ts places each region's locations on a grid of columns and
// rows: each region is spread evenly over the parchment from its own
// distinct columns and rows, labels wrapped to the room between columns.
interface Layout {
  x: (loc: MapLocation) => number;
  y: (loc: MapLocation) => number;
  labelWidth: number;
}

function regionLayout(locations: MapLocation[]): Layout {
  const xs = [...new Set(locations.map((l) => l.x))].sort((a, b) => a - b);
  const ys = [...new Set(locations.map((l) => l.y))].sort((a, b) => a - b);
  const spread = (values: number[], from: number, to: number) => (v: number) => {
    const i = values.indexOf(v);
    const t = values.length > 1 ? i / (values.length - 1) : 0.5;
    return Math.round((from + (to - from) * t) / 2) * 2;
  };
  const margin = xs.length >= 5 ? 22 : 30;
  const sx = spread(xs, SCREEN_LEFT + margin, SCREEN_LEFT + SCREEN_INNER_W - margin);
  const sy = spread(ys, MAP_TOP + 18, MAP_TOP + MAP_H - 48);
  const gap = xs.length > 1 ? (SCREEN_INNER_W - margin * 2) / (xs.length - 1) : 60;
  // With many columns, every other one sits a little lower so neighbouring
  // names don't run into each other.
  const stagger = (l: MapLocation) => (xs.length >= 5 && xs.indexOf(l.x) % 2 === 1 ? 12 : 0);
  return { x: (l) => sx(l.x), y: (l) => sy(l.y) + stagger(l), labelWidth: Math.min(40, Math.floor(gap) - 2) };
}

// Carte in UI style A: a parchment map per region with dotted roads, a red
// marker where the hero stands and blue ones where a quest leads; tapping a
// place shows its monsters' level. Awake passage stones carry a rune; from
// outdoors (or from a stone) the Carte turns to travel: tap a stone's
// place, then Voyager.
export class MapScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private region: MapRegion = 'start';
  private selected?: ReturnSceneKey;
  private travel = false;

  constructor() {
    super('Map');
  }

  init(data: ReturnContext & { travel?: boolean }): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.selected = undefined;
    this.travel = !!data?.travel && TRAVEL_FROM.has(this.returnScene);
  }

  private stones(): Map<ReturnSceneKey, Waystone> {
    return new Map(awakeWaystones(this.character).map((w) => [w.scene, w]));
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
    panelText(this, this.scale.width / 2, 14, this.travel ? 'Voyage' : 'Carte', 12).setOrigin(0.5, 0);
    const stones = this.stones();
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
      // An awake passage stone: a small blue rune at the marker's corner.
      if (stones.has(loc.key)) {
        const rx = x + size / 2 + 1;
        const ry = y - size / 2 - 5;
        markers.fillStyle(PAL.k, 1).fillRect(rx - 1, ry - 1, 6, 8);
        markers.fillStyle(0x8cd6fa, 1).fillRect(rx, ry, 4, 6);
        markers.fillStyle(0xeefaff, 1).fillRect(rx + 1, ry + 1, 2, 2);
      }
      // A parchment patch under each label so roads pass beneath the text.
      const backdrop = this.add.graphics();
      const label = panelText(this, x, y + size / 2 + 6, loc.short ?? loc.label, 7, current ? INK.danger : quest ? QUEST_INK : INK.text, {
        align: 'center',
        wordWrap: { width: layout.labelWidth },
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
    const stone = loc && stones.get(loc.key);
    if (this.travel) {
      if (loc) {
        const here = loc.key === this.returnScene;
        detailPanel(
          this,
          { text: loc.label, color: INK.text },
          [stone ? { text: here ? 'Tu es déjà ici.' : 'Une pierre de passage éveillée.', color: here ? INK.danger : QUEST_INK } : { text: 'Aucune pierre éveillée ici.', color: INK.soft }],
          top,
          340 - top,
        );
      } else {
        detailPanel(
          this,
          { text: 'Pierres de passage', color: INK.text },
          [
            { text: `${stones.size} pierre${stones.size > 1 ? 's' : ''} éveillée${stones.size > 1 ? 's' : ''}.`, color: INK.soft },
            { text: 'Touche un lieu marqué d’une rune.', color: INK.soft },
          ],
          top,
          340 - top,
        );
      }
      actionRow(this, [
        { label: 'Retour', onClick: () => this.goBack() },
        {
          label: 'Voyager',
          disabled: !stone || loc?.key === this.returnScene,
          onClick: () => stone && this.travelTo(stone),
        },
      ]);
      return;
    }
    if (loc) {
      const level = ZONE_LEVEL[loc.key];
      const lines = [
        { text: level ? `Monstres de niveau ${level}.` : 'Pas de monstres : un lieu sûr.', color: INK.text },
      ];
      if (loc.key === this.returnScene) lines.push({ text: 'Tu es ici.', color: INK.danger });
      if (quests.has(loc.key)) lines.push({ text: 'Une quête en cours mène ici.', color: QUEST_INK });
      if (stone) lines.push({ text: 'Une pierre de passage éveillée.', color: QUEST_INK });
      detailPanel(this, { text: loc.label, color: INK.text }, lines, top, 340 - top);
    } else {
      detailPanel(
        this,
        { text: 'Légende', color: INK.text },
        [
          { text: 'Rouge : tu es ici. Bleu : une quête.', color: INK.soft },
          { text: 'Rune : pierre éveillée. Touche un lieu.', color: INK.soft },
        ],
        top,
        340 - top,
      );
    }
    const canTravel = TRAVEL_FROM.has(this.returnScene) && stones.size > 0;
    actionRow(this, [
      { label: 'Retour', onClick: () => this.goBack() },
      ...(canTravel
        ? [
            {
              label: 'Voyager',
              onClick: () => {
                this.travel = true;
                this.selected = undefined;
                this.render();
              },
            },
          ]
        : []),
    ]);
  }

  private travelTo(stone: Waystone): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(stone.scene, { x: stone.arrive[0], y: stone.arrive[1] });
    });
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
