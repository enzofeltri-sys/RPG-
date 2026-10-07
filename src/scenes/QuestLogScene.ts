import Phaser from 'phaser';
import { fitText } from '../ui/pixelFont';
import { Character } from '../game/character';
import { QUESTS, getQuestProgress } from '../game/quest';
import { MAIN_QUEST_TITLE, MainQuestStage, getMainQuestStage } from '../game/mainQuest';
import { createItem } from '../game/item';
import { ReturnContext, ReturnSceneKey, returnSceneStartData } from '../ui/returnContext';
import { SaveManager } from '../save/SaveManager';
import { INK, KitButton, addPanel, addScreenPanel, buttonRow, panelText, preloadUiKit } from '../ui/kit';
import { GOOD_INK } from '../ui/itemText';
import { SCREEN_INNER_W, SCREEN_LEFT, actionRow, detailPanel, pager, centerFrame } from '../ui/screen';

const MUTED = INK.soft;
const ACTIVE_COLOR = '#3260b0';
const DONE_COLOR = GOOD_INK;

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
  chercheurs_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Fouillez le passage caché du sanctuaire scellé, dans les Terres Noyées.',
  },
  seekers_confronted: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  seekers_defeated: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  brotherhood_tomb_hinted: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  tomb_location_found: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Fouillez les Ruines englouties — le tombeau se trouve en dessous.',
  },
  tomb_raided: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  act2_complete: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  outpost_corruption_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Rendez-vous au Relais des chasseurs — la corruption y aurait déjà été aperçue.',
  },
  corruption_confirmed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir le chasseur, au Relais des chasseurs.',
  },
  blighted_grove_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Fouillez le bosquet corrompu, près du Relais des chasseurs.',
  },
  grove_purified: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  corruption_contained: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  original_site_revealed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  shrine_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez au petit sanctuaire, près de Basse-Combe — cherchez sous l\'autel.',
  },
  seal_failing: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  antagonist_glimpsed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  identity_search_started: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir Yenn, à Vasenoire.',
  },
  identity_hint_gathered: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  upstream_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez à Vasenoire — Yenn connaît le passage vers la vigie.',
  },
  watchtower_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  watchtower_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  helm_inscription_studied: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  ward_core_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Un escalier caché, dans la Vigie silencieuse.',
  },
  ward_core_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  ward_core_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  hermit_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir Aldric, au petit sanctuaire, près de Basse-Combe.',
  },
  hermit_confided: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  watchers_vault_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une voûte scellée, cachée dans les Archives.',
  },
  watchers_vault_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  watchers_vault_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  silhouette_message_found: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  tomb_depths_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une fissure, dans le tombeau de la confrérie fondatrice.',
  },
  tomb_depths_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  tomb_depths_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  grand_theory_formed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  grove_depths_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Un passage caché dans les racines, au bosquet corrompu.',
  },
  grove_depths_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  grove_depths_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  watcher_hypothesis_formed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  seal_depths_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une faille, derrière la chambre du Sceau originel.',
  },
  seal_depths_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  seal_depths_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  second_token_found: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  lodge_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez voir Aldric, au petit sanctuaire — il reconnaîtra peut-être le fragment.',
  },
  lodge_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  lodge_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  reinforcement_plan_started: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rite_archive_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Un passage plus profond, dans la Loge des Veilleurs.',
  },
  rite_archive_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rite_archive_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  response_sent: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rite_annex_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Des rayonnages scellés, au fond des Archives du Rite.',
  },
  rite_annex_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rite_annex_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  lineage_traced: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  crypt_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une maison scellée, dans le vieux quartier d’Aiglemont.',
  },
  crypt_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  crypt_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  first_name_given: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  elder_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Demandez aux anciens de Valombre.',
  },
  grave_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  grave_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  title_hypothesis: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  notary_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Un escalier caché dans l'entrepôt du Faubourg.",
  },
  registry_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  registry_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  meeting_promised: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  road_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une vieille halte, à l’écart de la route commerciale.',
  },
  waystation_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  waystation_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  awaiting_meeting: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Retournez au petit sanctuaire, elle vous y attend.',
  },
  first_meeting: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  meeting_debriefed: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  chapel_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Une chapelle engloutie, sous les vieux quais du Faubourg.',
  },
  chapel_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  chapel_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  third_site_awaited: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  third_site_lead: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Plus profond dans la Crypte des Aînés.',
  },
  third_site_reached: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  third_site_cleared: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  recruiting_help: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  ally_secured: {
    label: 'Acte 3 en cours',
    color: ACTIVE_COLOR,
    description: "Le capitaine Bregan prêtera main-forte pour les deux sites extérieurs. En attente de son signal.",
  },
  signal_awaited: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: "Retournez voir la mage Sélène, à la Tour des Mages d'Aiglemont.",
  },
  rite_night: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Le sanctuaire, ce soir.',
  },
  rite_climax: {
    label: 'En cours',
    color: ACTIVE_COLOR,
    description: 'Le rite a commencé. Retournez au sanctuaire.',
  },
  ending_new_seal: {
    label: 'Terminé — Nouveau Sceau',
    color: DONE_COLOR,
    description: "Vous êtes devenu(e) l'ancre vivante du sceau. Vaeloria continue, fracturée mais debout.",
  },
  ending_destruction: {
    label: 'Terminé — Destruction',
    color: DONE_COLOR,
    description: "Le Roi Démon a été détruit. Vaeloria n'a plus besoin de sceau.",
  },
  ending_ascension: {
    label: 'Terminé — Ascension',
    color: DONE_COLOR,
    description: 'Vous avez absorbé le pouvoir du Roi Démon. Ce que vous en ferez reste à écrire.',
  },
};

type QuestTab = 'active' | 'done';

const ROWS_TOP = 132;
const ROW_STEP = 26;
const ROWS_PER_PAGE = 3;

// Quêtes in UI style A: the main quest's current objective on top, then the
// side quests met so far (never-offered ones stay hidden so nothing is
// spoiled), split between "En cours" and "Terminées", with a detail panel.
export class QuestLogScene extends Phaser.Scene {
  private character!: Character;
  private returnScene: ReturnSceneKey = 'Village';
  private returnX?: number;
  private returnY?: number;
  private tab: QuestTab = 'active';
  private page = 0;
  private selected?: string;

  constructor() {
    super('Quests');
  }

  init(data: ReturnContext): void {
    this.returnScene = data?.returnScene ?? 'Village';
    this.returnX = data?.x;
    this.returnY = data?.y;
    this.tab = 'active';
    this.page = 0;
    this.selected = undefined;
  }

  preload(): void {
    preloadUiKit(this);
  }

  async create(): Promise<void> {
    centerFrame(this);
    const save = await SaveManager.load();
    this.character = save!.character!;
    this.render();
  }

  private render(): void {
    this.children.removeAll(true);
    addScreenPanel(this);
    panelText(this, this.scale.width / 2, 14, 'Quêtes', 12).setOrigin(0.5, 0);

    // Main quest card.
    const main = MAIN_QUEST_STATUS[getMainQuestStage(this.character)];
    addPanel(this, SCREEN_LEFT, 34, SCREEN_INNER_W, 66);
    this.add.image(SCREEN_LEFT + 8, 42, 'ui-icon-star').setOrigin(0, 0);
    const tag = panelText(this, SCREEN_LEFT + SCREEN_INNER_W - 10, 44, main.label, 7, main.color).setOrigin(1, 0);
    fitText(panelText(this, SCREEN_LEFT + 28, 43, MAIN_QUEST_TITLE, 9), tag.x - tag.width - 6 - (SCREEN_LEFT + 28));
    const objective = panelText(this, SCREEN_LEFT + 10, 62, main.description, 8, INK.text, {
      wordWrap: { width: SCREEN_INNER_W - 20 },
      lineSpacing: 1,
    });
    if (objective.y + objective.height > 94) objective.setFontSize(Math.round(7 * 1.2));

    // Side quests.
    const quests = Object.values(QUESTS).filter((quest) => {
      const progress = getQuestProgress(this.character, quest.id);
      if (!progress) return false;
      return this.tab === 'active' ? progress.state !== 'turned_in' : progress.state === 'turned_in';
    });
    const counts = { active: 0, done: 0 };
    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);
      if (progress) counts[progress.state === 'turned_in' ? 'done' : 'active'] += 1;
    });
    buttonRow(2, SCREEN_LEFT, SCREEN_INNER_W).forEach(({ x, w }, i) => {
      const tab: QuestTab = i === 0 ? 'active' : 'done';
      new KitButton(this, x, 106, w, 20, `${i === 0 ? 'En cours' : 'Terminées'} (${counts[tab]})`, {
        size: 8,
        align: 'center',
        state: tab === this.tab ? 'pressed' : 'normal',
        onClick: () => {
          if (tab === this.tab) return;
          this.tab = tab;
          this.page = 0;
          this.selected = undefined;
          this.render();
        },
      });
    });
    this.page = pager(this, this.page, quests.length, ROWS_PER_PAGE, (page) => {
      this.page = page;
      this.selected = undefined;
      this.render();
    });
    if (quests.length === 0) {
      panelText(this, this.scale.width / 2, ROWS_TOP + 24, this.tab === 'active' ? 'Aucune quête en cours.' : 'Aucune quête terminée.', 9, INK.soft).setOrigin(0.5, 0);
    }
    quests.slice(this.page * ROWS_PER_PAGE, (this.page + 1) * ROWS_PER_PAGE).forEach((quest, i) => {
      const progress = getQuestProgress(this.character, quest.id)!;
      const tag = progress.state === 'active' ? `${progress.progress}/${quest.objective.count}` : progress.state === 'completed' ? 'À rendre' : undefined;
      new KitButton(this, SCREEN_LEFT, ROWS_TOP + i * ROW_STEP, SCREEN_INNER_W, 22, quest.title, {
        icon: 'scroll',
        size: 9,
        cost: tag,
        costSize: 9,
        state: quest.id === this.selected ? 'pressed' : 'normal',
        onClick: () => {
          this.selected = quest.id;
          this.render();
        },
      });
    });

    const quest = quests.find((q) => q.id === this.selected);
    if (quest) {
      const progress = getQuestProgress(this.character, quest.id)!;
      const status =
        progress.state === 'active'
          ? { text: `En cours : ${progress.progress}/${quest.objective.count}`, color: ACTIVE_COLOR }
          : progress.state === 'completed'
            ? { text: 'Terminée : récompense à récupérer auprès de qui te l’a confiée.', color: GOOD_INK }
            : { text: 'Terminée.', color: GOOD_INK };
      const reward = quest.reward.itemBaseId
        ? `Récompense : ${quest.reward.xp} XP, ${createItem(quest.reward.itemBaseId, quest.reward.itemRarity ?? 'common').name}`
        : `Récompense : ${quest.reward.xp} XP`;
      detailPanel(this, { text: quest.title, color: INK.text }, [
        status,
        { text: quest.description, color: INK.text },
        { text: reward, color: INK.soft },
      ]);
    } else {
      detailPanel(this, { text: 'Quêtes secondaires', color: INK.text }, [
        { text: 'Les habitants confient des tâches : touche une quête pour en voir le détail.', color: INK.soft },
      ]);
    }
    actionRow(this, [{ label: 'Retour', onClick: () => this.goBack() }]);
  }

  private goBack(): void {
    this.scene.start(this.returnScene, returnSceneStartData(this.returnScene, this.returnX, this.returnY));
  }
}
