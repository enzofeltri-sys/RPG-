import Phaser from 'phaser';
import { TapController, Interactable } from '../input/TapController';
import { createPlayer, updatePlayerMovement, PlayerSprite, setPlayerAppearance } from '../entities/player';
import { attachSpriteOverlay } from '../entities/spriteOverlay';
import { BuildingSpot, PaintedZone, paintZone } from '../world/zoneArt';
import { VALOMBRE } from '../world/zones/valombre';
import { Wanderer } from '../entities/wanderer';
import { Character, placedStatPoints, resetStatPoints } from '../game/character';
import { QUESTS, getQuestProgress, startQuest, turnInQuest } from '../game/quest';
import { getMainQuestStage, MainQuestStage } from '../game/mainQuest';
import { SaveManager } from '../save/SaveManager';
import { respecCost, resetTalents, talentPointsSpent } from '../game/talents';
import { CharacterSheetPanel } from '../ui/CharacterSheetPanel';
import { addSignpost } from '../ui/signpost';
import { addCrispText } from '../ui/text';
import { playQuestComplete } from '../ui/sound';
import { DialogBox, DialogButton, showBanner } from '../ui/dialog';
import { EXIT_TEXT } from '../ui/kit';

const WORLD_WIDTH = 480;
const WORLD_HEIGHT = 640;

const VILLAGER_LINES = [
  'Valombre reçoit pas mal de voyageurs ces temps-ci.',
  'La forge tourne à plein régime, allez donc voir le forgeron.',
  'On dit qu\'une route commerciale relie maintenant la ville à Aiglemont.',
];

// Post-game only ("style Daedra, drôles et étranges" — VISION.md), same
// unlock condition as Gontrand's chain (HamletScene) — a different comedic
// register here (commerce/greed rather than pseudo-science).
const POST_GAME_STAGES: MainQuestStage[] = ['ending_new_seal', 'ending_destruction', 'ending_ascension'];
const BRASQUE_QUEST_1 = 'brasque_wolf_relic';
const BRASQUE_QUEST_2 = 'brasque_bandit_relic';
const BRASQUE_QUEST_3 = 'brasque_goblin_relic';

interface VillageData {
  x?: number;
  y?: number;
}

// Valombre — the full-service town (forge, marchande), reached by crossing
// the Champ from the player's home hamlet (Basse-Combe, HamletScene). No
// early-game quest-giver or gathering here (increment 9 world pass) — those
// live in the hamlet and the Champ respectively, so Valombre reads as a real
// town you travel to rather than the same small starting point. Brasque
// (below) is the one exception, and deliberately so: he stays silent until
// the main quest is finished, so he never competes with that pacing.
export class VillageScene extends Phaser.Scene {
  private player!: PlayerSprite;
  private tapControl!: TapController;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private buildings: Phaser.GameObjects.Rectangle[] = [];
  private isTransitioning = false;
  private character!: Character;
  private merchantNpc!: Phaser.GameObjects.Rectangle;
  private forgeBuilding!: Phaser.GameObjects.Rectangle;
  private bertrandHouse!: Phaser.GameObjects.Rectangle;
  private ombelineHouse!: Phaser.GameObjects.Rectangle;
  private innBuilding!: Phaser.GameObjects.Rectangle;
  private brasque!: Phaser.GameObjects.Rectangle;
  private weaponMaster!: Phaser.GameObjects.Rectangle;
  private villagers: Wanderer[] = [];
  private villagerLineIndex = 0;
  private dialog?: DialogBox;
  private spawnX?: number;
  private spawnY?: number;

  constructor() {
    super('Village');
  }

  init(data: VillageData): void {
    this.spawnX = data?.x;
    this.spawnY = data?.y;
  }

  async create(): Promise<void> {
    this.isTransitioning = false;
    this.buildings = [];
    const painted = this.drawGround();

    // Buildings and decor are drawn by the game from world/zones/valombre.ts;
    // the scene keeps the buildings' collision boxes.
    const b = VALOMBRE.buildings!;
    this.bertrandHouse = this.addBuilding(b.bertrand);
    this.ombelineHouse = this.addBuilding(b.ombeline);
    this.forgeBuilding = this.addBuilding(b.forge);
    this.innBuilding = this.addBuilding(b.inn);

    this.merchantNpc = this.add.rectangle(300, 270, 14, 20, 0x7a3a5a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.merchantNpc, 'npc-merchant_generic', `${import.meta.env.BASE_URL}sprites/npc/merchant_generic.png`, 24);
    this.physics.add.existing(this.merchantNpc, true);

    // Ambient villagers, clear of every building/zone/signpost.
    this.villagers = [new Wanderer(this, 50, 280, 0x8a7a5a, 15, 'villager_wanderer', 10), new Wanderer(this, 400, 150, 0x7a8a6a, 25, 'villager_wanderer', 12)];

    // Kept well clear of every other fixed point here — see the
    // POST_GAME_STAGES comment above for why he stays quiet until the main
    // quest is done.
    this.brasque = this.add.rectangle(60, 470, 14, 20, 0x8a5a2a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.brasque, 'npc-brasque_merchant', `${import.meta.env.BASE_URL}sprites/npc/brasque_merchant.png`, 24);

    // Resets talents for gold (DESIGN.md, talent system) — next to the
    // forge, clear of the wandering villager's path.
    this.weaponMaster = this.add.rectangle(100, 340, 14, 20, 0x5a5a6a).setStrokeStyle(1, 0x0b0c10);
    void attachSpriteOverlay(this, this.weaponMaster, 'npc-guard_generic', `${import.meta.env.BASE_URL}sprites/npc/guard_generic.png`, 24);

    this.player = createPlayer(this, this.spawnX ?? WORLD_WIDTH / 2, this.spawnY ?? WORLD_HEIGHT - 50);
    painted.follow(this.player);
    this.physics.add.collider(this.player, this.buildings);
    this.physics.add.collider(this.player, this.merchantNpc);
    this.villagers.forEach((v) => this.physics.add.collider(this.player, v.sprite));
    this.physics.add.existing(this.brasque, true);
    this.physics.add.collider(this.player, this.brasque);
    this.physics.add.existing(this.weaponMaster, true);
    this.physics.add.collider(this.player, this.weaponMaster);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.fadeIn(300);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.tapControl = new TapController(this, this.player);

    const exitZone = this.add.zone(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 24);
    this.physics.add.existing(exitZone, true);
    this.physics.add.overlap(this.player, exitZone, () => this.leaveVillage());

    addCrispText(this, WORLD_WIDTH / 2, 40, '↑', {
      fontSize: '11px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    // Second exit south — the "route commerciale" toward Aiglemont (région
    // 2, VISION.md). Well clear of every building (bottommost building ends
    // around y=495).
    const roadZone = this.add.zone(WORLD_WIDTH / 2, WORLD_HEIGHT - 10, WORLD_WIDTH, 20);
    this.physics.add.existing(roadZone, true);
    this.physics.add.overlap(this.player, roadZone, () => this.leaveToRoad());

    addCrispText(this, WORLD_WIDTH / 2, WORLD_HEIGHT - 22, '↓', {
      fontSize: '10px',
      ...EXIT_TEXT,
    }).setOrigin(0.5);

    addSignpost(this, 240, 300, ['↑ Grotte (vers Basse-Combe)', '↓ Route commerciale (vers Aiglemont)']);

    // Un vieux cimetière à l'écart du village, que les enfants évitent sans
    // qu'on ait besoin de le leur dire — jamais relié à un nom jusqu'à ce
    // qu'un prénom sorti d'une légende y ramène l'enquête. Toujours
    // franchissable, quelle que soit l'étape de la quête en cours.
    const graveZone = this.add.zone(420, 580, 30, 20);
    this.physics.add.existing(graveZone, true);
    this.physics.add.overlap(this.player, graveZone, () => this.enterForgottenGrave());
    addCrispText(this, 420, 593, '↓', { fontSize: '8px', ...EXIT_TEXT }).setOrigin(0.5);

    const interactables: Interactable[] = [
      {
        x: this.merchantNpc.x,
        y: this.merchantNpc.y,
        radius: 24,
        onTap: () => this.scene.start('Merchant', { x: this.player.x, y: this.player.y }),
      },
      {
        x: this.forgeBuilding.x,
        y: this.forgeBuilding.y,
        radius: 35,
        onTap: () => this.scene.start('Crafting', { x: this.player.x, y: this.player.y }),
      },
      { x: this.bertrandHouse.x, y: this.bertrandHouse.y, radius: 35, onTap: () => this.enterInterior('bertrand') },
      { x: this.ombelineHouse.x, y: this.ombelineHouse.y, radius: 35, onTap: () => this.enterInterior('ombeline') },
      { x: this.innBuilding.x, y: this.innBuilding.y, radius: 35, onTap: () => this.enterInterior('inn') },
      // Local consts (not `this.villagers[i].sprite` inline) so the getters
      // below are plain closures — an object literal's get x()/get y() would
      // otherwise bind `this` to the literal itself, not the scene.
      ...this.villagers.map((villager) => {
        const sprite = villager.sprite;
        return {
          get x() {
            return sprite.x;
          },
          get y() {
            return sprite.y;
          },
          radius: 20,
          onTap: () => this.talkToVillager(),
        };
      }),
      { x: this.brasque.x, y: this.brasque.y, radius: 22, onTap: () => this.talkToBrasque() },
      { x: this.weaponMaster.x, y: this.weaponMaster.y, radius: 22, onTap: () => this.talkToWeaponMaster() },
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
      new CharacterSheetPanel(
        this,
        save.character,
        'Village',
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
    this.villagers.forEach((v) => v.update());
  }

  private talkToVillager(): void {
    const line = VILLAGER_LINES[this.villagerLineIndex % VILLAGER_LINES.length];
    this.villagerLineIndex += 1;
    this.showMessage(line);
  }

  private talkToWeaponMaster(): void {
    if (!this.character) return;
    const talentsSpent = talentPointsSpent(this.character);
    const statsPlaced = placedStatPoints(this.character);
    if (talentsSpent === 0 && statsPlaced === 0) {
      this.openDialog(
        "Le maître d'armes vous jauge d'un œil sévère. « Tu n'as encore rien appris que je puisse te faire oublier. Reviens quand tu auras choisi ta voie. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }
    const cost = respecCost(this.character.level);
    const buttons: { label: string; onClick: () => void }[] = [];
    if (talentsSpent > 0) {
      buttons.push({ label: `Talents (${cost} or)`, onClick: () => void this.payWeaponMaster(cost, 'talents') });
    }
    if (statsPlaced > 0) {
      buttons.push({ label: `Statistiques (${cost} or)`, onClick: () => void this.payWeaponMaster(cost, 'stats') });
    }
    buttons.push({ label: 'Fermer', onClick: () => this.closeDialog() });
    this.openDialog(
      `« Une technique mal choisie se désapprend, mais ça se paie : ${cost} pièces d'or. Je peux te faire reprendre tes talents de zéro, ou te réapprendre à placer ta force. » (${talentsSpent} point${talentsSpent > 1 ? 's' : ''} de talent, ${statsPlaced} point${statsPlaced > 1 ? 's' : ''} de statistique ; vous avez ${this.character.gold} or.)`,
      buttons,
    );
  }

  private async payWeaponMaster(cost: number, what: 'talents' | 'stats'): Promise<void> {
    if (this.character.gold < cost) {
      this.openDialog("« Reviens avec de quoi payer. Je n'enseigne pas à crédit. »", [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }
    this.character.gold -= cost;
    if (what === 'talents') resetTalents(this.character);
    else resetStatPoints(this.character);
    await SaveManager.saveCharacter(this.character);
    this.openDialog(
      what === 'talents'
        ? "« Voilà. Tes talents sont à nouveau à choisir. Passe par ton menu Talents, et cette fois, réfléchis. »"
        : "« Voilà. Tes points sont à nouveau libres. Répartis-les dans ton menu Stats, et cette fois, réfléchis. »",
      [{ label: 'Fermer', onClick: () => this.closeDialog() }],
    );
  }

  private talkToBrasque(): void {
    if (!POST_GAME_STAGES.includes(getMainQuestStage(this.character))) {
      this.openDialog(
        "Brasque compte des pièces derrière son étal, l'air pensif. « Une idée me trotte dans la tête, voyageur, mais elle n'est pas encore mûre. Repassez plus tard. »",
        [{ label: 'Fermer', onClick: () => this.closeDialog() }],
      );
      return;
    }

    const quest = QUESTS[BRASQUE_QUEST_1];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_1);

    if (!progress) {
      this.openDialog(
        `Brasque bondit de derrière son étal en vous voyant. « VOUS ! Le héros en personne, et à Valombre en plus ! » Il déroule déjà une pancarte à moitié peinte. ${quest.description}`,
        [
          {
            label: 'Accepter',
            onClick: async () => {
              startQuest(this.character, BRASQUE_QUEST_1);
              await SaveManager.saveCharacter(this.character);
              this.closeDialog();
            },
          },
          { label: 'Plus tard', onClick: () => this.closeDialog() },
        ],
      );
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nProgression : ${progress.progress}/${quest.objective.count} loups corrompus vaincus.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "Brasque examine les crocs avec un sérieux tout commercial. « Parfait, parfait. » Il les aligne déjà en vitrine. « Article numéro un : en stock. » Voici votre part, pour la peine.",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_1);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToBrasqueArticle2();
  }

  // Reached only once brasque_wolf_relic is turned in — same chain shape as
  // Gontrand's tomes in HamletScene.
  private talkToBrasqueArticle2(): void {
    const quest = QUESTS[BRASQUE_QUEST_2];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_2);

    if (!progress) {
      this.openDialog(`Brasque a déjà la pancarte suivante en tête. ${quest.description}`, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, BRASQUE_QUEST_2);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nLe chef des bandits se terre toujours au Champ.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "« Magnifique. » Brasque tourne le bouton entre ses doigts comme s'il s'agissait d'un joyau. « Article numéro deux, en stock, prix déjà doublé rien que pour l'histoire qui va avec. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_2);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.talkToBrasqueArticle3();
  }

  // Reached only once brasque_bandit_relic is turned in.
  private talkToBrasqueArticle3(): void {
    const quest = QUESTS[BRASQUE_QUEST_3];
    const progress = getQuestProgress(this.character, BRASQUE_QUEST_3);

    if (!progress) {
      this.openDialog(`Brasque en tremble presque d'avance. ${quest.description}`, [
        {
          label: 'Accepter',
          onClick: async () => {
            startQuest(this.character, BRASQUE_QUEST_3);
            await SaveManager.saveCharacter(this.character);
            this.closeDialog();
          },
        },
        { label: 'Plus tard', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'active') {
      this.openDialog(`${quest.title}\n\nLe chef des gobelins se terre toujours dans la Forêt.`, [
        { label: 'Fermer', onClick: () => this.closeDialog() },
      ]);
      return;
    }

    if (progress.state === 'completed') {
      this.openDialog(
        "Brasque place le trophée en vitrine avec la solennité d'un couronnement. « Le Repaire du Héros est complet, voyageur. Trois articles, trois légendes. » Il hésite, puis sort un dernier bout de parchemin. « Une signature, pendant que vous êtes là ? Ça double la valeur de tout le reste. »",
        [
          {
            label: 'Récupérer la récompense',
            onClick: async () => {
              turnInQuest(this.character, BRASQUE_QUEST_3);
              await SaveManager.saveCharacter(this.character);
              playQuestComplete();
              this.closeDialog();
            },
          },
        ],
      );
      return;
    }

    this.openDialog('« Le Repaire du Héros, voyageur. Article numéro un du commerce local, ces temps-ci. »', [
      { label: 'Fermer', onClick: () => this.closeDialog() },
    ]);
  }

  // Parchment dialogue box (ui/dialog.ts): long speeches page behind "Suite".
  private openDialog(text: string, buttons: DialogButton[], _boxHeight?: number): void {
    this.closeDialog();
    this.tapControl.setEnabled(false);
    this.dialog = new DialogBox(this, text, buttons);
  }

  private closeDialog(): void {
    this.dialog?.destroy();
    this.dialog = undefined;
    this.tapControl.setEnabled(true);
  }

  // Collision box only: the building itself is drawn by paintZone().
  private addBuilding(spot: BuildingSpot): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(spot.x, spot.y, spot.w, spot.h).setVisible(false);
    this.physics.add.existing(rect, true);
    this.buildings.push(rect);
    return rect;
  }

  // The 3 formerly dead-end "personne ne répond" buildings, now each their
  // own small InteriorScene with a distinct resident — see InteriorScene's
  // doc comment for why this is one reusable scene rather than 3 new files.
  private enterInterior(which: 'bertrand' | 'ombeline' | 'inn'): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    const returnX = this.player.x;
    const returnY = this.player.y;
    const configs = {
      bertrand: {
        label: 'Maison de Bertrand',
        room: 'fisher',
        floorColor: 0x2a2420,
        npcName: 'Bertrand',
        npcColor: 0x5a6a7a,
        npcSpriteKey: 'bertrand_fisherman',
        lines: [
          "Vous auriez dû voir la taille de ce poisson, voyageur. Grand comme... enfin, disons deux fois la taille d'un loup corrompu.",
          "Trois fois. En fait, en y repensant bien, c'était plutôt trois fois la taille d'un loup corrompu.",
          "Un jour je le rattraperai. Ou alors ce sera lui qui me rattrapera. À ce stade, difficile de dire qui chasse qui.",
        ],
      },
      ombeline: {
        label: "Maison d'Ombeline",
        room: 'cats',
        floorColor: 0x2a2028,
        npcName: 'Ombeline',
        npcColor: 0x8a5a7a,
        npcSpriteKey: 'ombeline_catlady',
        lines: [
          'Chut, ne réveillez pas Mistigri. Ni Griselda. Ni les onze autres, d\'ailleurs — je ne me souviens plus très bien de tous leurs noms.',
          "On me dit qu'il n'y a pas de chat dans cette pièce, voyageur. Ces gens n'ont manifestement jamais eu de chat invisible.",
          "Un jour j'écrirai un livre sur mes chats. Il sera très court, vu qu'aucun d'eux ne sait lire pour me raconter sa journée.",
        ],
      },
      inn: {
        label: 'Auberge du Cerf Bleu',
        room: 'inn',
        floorColor: 0x2a2418,
        npcName: "Fernand, l'aubergiste",
        npcColor: 0x7a5a3a,
        npcSpriteKey: 'fernand_innkeeper',
        lines: [
          "Bienvenue à l'auberge, voyageur ! On n'a plus de chambres, plus de bière, et le cuisinier a démissionné la semaine dernière — mais l'accueil, ça, c'est gratuit.",
          "On raconte que le sanctuaire porte chance aux voyageurs. Moi je raconte surtout que ma soupe porte malheur à qui la termine.",
          'Un conseil, voyageur : ne demandez jamais ce qu\'il y a dans le ragoût du jour. Certaines réponses ne se pardonnent pas.',
        ],
      },
    } as const;
    const config = configs[which];
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Interior', { ...config, returnScene: 'Village', returnX, returnY });
    });
  }

  // Ground, buildings and decor drawn by the game (world/zoneArt.ts).
  private drawGround(): PaintedZone {
    return paintZone(this, VALOMBRE);
  }

  private showMessage(message: string): void {
    showBanner(this, message);
  }

  private leaveVillage(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Cave', { x: 100, y: 40 });
    });
  }

  private leaveToRoad(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Road', { x: 40, y: 110 });
    });
  }

  private enterForgottenGrave(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('ForgottenGrave', { x: 110, y: 380 });
    });
  }
}
