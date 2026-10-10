import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { paintZone } from '../world/zoneArt';
import { SUNKEN_ROAD } from '../world/zones/terresNoyees';
import { Wanderer } from '../entities/wanderer';
import { Character } from '../game/character';
import { isChestOpened, openChest, chestLootMessage } from '../game/chest';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { playChestOpen, playQuestComplete } from '../ui/sound';
import { SaveManager } from '../save/SaveManager';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';
import { DialogBox, DialogButton, showBanner } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const WORLD_WIDTH = 400;
// Tall enough to fill the portrait canvas at every camera position — see
// HamletScene's WORLD_HEIGHT comment.
const WORLD_HEIGHT = 400;
const CHEST_ID = 'sunkenroad_chest_1';
const MIN_ENCOUNTER_DISTANCE = 220;
const MAX_ENCOUNTER_DISTANCE = 400;

const SENTINELS_QUEST_ID = 'sunkenroad_sentinels';

// Ambient encounter identity, once Odren's quest gives the region's second
// threat a name — picked at random per encounter rather than alternating,
// same "unpredictable danger" feel as every other region's random fights.
const AMBIENT_MONSTER_IDS = ['bog_wraith', 'corrupted_sentinel'];


// Flavor-only lines once Odren's quest is turned in — the same rumor-mill
// role the wanderer played before being given a name and a quest.
const ODREN_LINES = [
  "Vasenoire n'est plus très loin. Suivez les passerelles, ne vous écartez pas — le fond a disparu depuis longtemps par ici.",
  'Les Limaneux contrôlent ce qui reste de terre ferme. Mieux vaut ne pas leur chercher noise.',
  "On raconte que des étrangers armés fouillent les ruines englouties depuis des mois. Personne ne sait pour le compte de qui.",
];

interface SunkenRoadData {
  x?: number;
  y?: number;
}

// Première zone des Terres Noyées (Acte 2) — au-delà du Relais des
// chasseurs, plus aucune route entretenue : juste des passerelles de fortune
// entre les ruines à moitié englouties. Rencontres aléatoires façon Route
// fluviale, avec bog_wraith comme première identité de menace de la région.
export class SunkenRoadScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isTransitioning = false;
  private distanceWalked = 0;
  private encounterThreshold = 0;
  private refugee!: Wanderer;
  private refugeeLineIndex = 0;
  private character!: Character;
  private chest!: Phaser.GameObjects.Rectangle;
  private dialog?: DialogBox;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('SunkenRoad');
  }

  init(data: SunkenRoadData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.distanceWalked = 0;
    this.rollNextEncounterThreshold();
    this.cameras.main.setBackgroundColor('#2a3a3a');
    // The causeway, the bog and the drowned ruins are drawn by the game
    // (world/zones/terresNoyees.ts).
    const painted = paintZone(this, SUNKEN_ROAD);

    addSignpost(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2 - 60, ['← Relais des chasseurs', '→ Vasenoire']);

    // Odren, a refugee wandering clear of the signpost and the water patch —
    // side-quest giver for this region's second ambient threat.
    this.refugee = new Wanderer(this, 90, 200, 0x7a7a6a, 25, 'villager_wanderer', 4);

    this.player = createPlayer(this, this.spawnX ?? 40, this.spawnY ?? WORLD_HEIGHT / 2);
    painted.follow(this.player);
    this.physics.add.collider(this.player, this.refugee.sprite);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const westZone = this.add.zone(10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(westZone, true);
    this.physics.add.overlap(this.player, westZone, () => this.leaveTo('HunterOutpost', { x: 186, y: 150 }));

    const eastZone = this.add.zone(WORLD_WIDTH - 10, WORLD_HEIGHT / 2, 20, WORLD_HEIGHT);
    this.physics.add.existing(eastZone, true);
    this.physics.add.overlap(this.player, eastZone, () => this.leaveTo('Vasenoire', { x: 40, y: 150 }));

    addCrispText(this, 30, WORLD_HEIGHT / 2 - 20, '←', { fontSize: '10px', ...EXIT_TEXT }).setOrigin(0.5);
    addCrispText(this, WORLD_WIDTH - 30, WORLD_HEIGHT / 2 - 20, '→', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    this.chest = this.add.rectangle(350, 100, 18, 14, 0x8a6a2a).setStrokeStyle(1, 0x2e1f10);
    void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_closed', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_closed.png`, 16);

    // Entrance to the ruins dungeon (SunkenRuinsScene), tucked among the
    // decorative RUINS cluster at (300,340)/(260,370) so it reads as part of
    // the same rubble rather than a separate landmark.
    const ruinsEntrance = this.add.zone(280, 355, 40, 40);
    this.physics.add.existing(ruinsEntrance, true);
    this.physics.add.overlap(this.player, ruinsEntrance, () => this.enterSunkenRuins());
    addCrispText(this, 280, 335, '↓', { fontSize: '8px', ...EXIT_TEXT }).setOrigin(0.5);

    // Local const (not `this.refugee.sprite` inline) so the getters below
    // are plain closures — an object literal's get x()/get y() would
    // otherwise bind `this` to the literal itself, not the scene.
    const refugeeSprite = this.refugee.sprite;
    const interactables: Interactable[] = [
      {
        get x() {
          return refugeeSprite.x;
        },
        get y() {
          return refugeeSprite.y;
        },
        radius: 20,
        onTap: () => this.talkToOdren(),
      },
      { x: this.chest.x, y: this.chest.y, radius: 20, onTap: () => this.handleChestTap() },
    ];
    this.tapControl.setInteractables(interactables);

    // See ForestScene.create() for why this must bail if the scene was
    // stopped while the load was pending (a zone overlap can fire and start
    // a new scene mid-await).
    const save = await SaveManager.load();
    if (!this.scene.isActive()) return;

    if (save?.character) {
      this.character = save.character;
      setPlayerAppearance(this, this.player, this.character);
      if (!this.scene.isActive()) return;
      if (isChestOpened(this.character, CHEST_ID)) {
        this.chest.setFillStyle(0x3a3428);
        void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
      }
      new CharacterSheetPanel(
        this,
        save.character,
        'SunkenRoad',
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
    this.refugee.update();

    if (this.isTransitioning) return;

    const speed = this.player.body.velocity.length();
    if (speed > 0) {
      this.distanceWalked += (speed * delta) / 1000;
      if (this.distanceWalked >= this.encounterThreshold) {
        this.startEncounter();
      }
    }
  }

  private rollNextEncounterThreshold(): void {
    this.encounterThreshold = Phaser.Math.Between(MIN_ENCOUNTER_DISTANCE, MAX_ENCOUNTER_DISTANCE);
  }

  private startEncounter(): void {
    this.isTransitioning = true;
    const monsterId = Phaser.Utils.Array.GetRandom(AMBIENT_MONSTER_IDS);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Combat', {
        returnScene: 'SunkenRoad',
        monsterId,
        x: this.player.x,
        y: this.player.y,
      });
    });
  }

  private talkToOdren(): void {
    const quest = QUESTS[SENTINELS_QUEST_ID];
    const progress = getQuestProgress(this.character, SENTINELS_QUEST_ID);

    if (!progress) {
      this.openDialog(quest.description, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, SENTINELS_QUEST_ID);
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
        `${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} sentinelles vaincues.`,
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(`${quest.title} — terminée !\n\n« La brume s'est un peu calmée. Merci, voyageur. » Voici votre récompense.`, [
        {
          label: 'Récupérer la récompense',
          onClick: async () => {
            turnInQuest(this.character, SENTINELS_QUEST_ID);
            await SaveManager.saveCharacter(this.character);
            playQuestComplete();
            this.closeDialog();
          },
        },
      ]);
      return;
    }

    const line = ODREN_LINES[this.refugeeLineIndex % ODREN_LINES.length];
    this.refugeeLineIndex += 1;
    this.showMessage(line);
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

  private async handleChestTap(): Promise<void> {
    if (isChestOpened(this.character, CHEST_ID)) {
      this.showMessage('Ce coffre est vide.');
      return;
    }
    const loot = openChest(this.character, CHEST_ID, 'SunkenRoad');
    this.chest.setFillStyle(0x3a3428);
    void attachSpriteOverlay(this, this.chest, 'decor-treasure_chest_open', `${import.meta.env.BASE_URL}sprites/decor/treasure_chest_open.png`, 16);
    await SaveManager.saveCharacter(this.character);
    if (loot) {
      playChestOpen();
      this.showMessage(chestLootMessage(loot));
    }
  }

  private showMessage(message: string): void {
    showBanner(this, message, 2200);
  }

  private enterSunkenRuins(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('SunkenRuins', { x: 110, y: 380 });
    });
  }

  private leaveTo(sceneKey: string, data: { x: number; y: number }): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(sceneKey, data);
    });
  }
}
