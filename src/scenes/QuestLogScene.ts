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

    let visibleSideQuests = 0;
    Object.values(QUESTS).forEach((quest) => {
      const progress = getQuestProgress(this.character, quest.id);
      // Quests never offered by their NPC yet have no progress entry at all —
      // showing them here would spoil every quest in the game up front
      // instead of only what the player has actually encountered.
      if (!progress) return;
      visibleSideQuests += 1;

      let statusLabel: string;
      let color: string;
      if (progress.state === 'active') {
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

    if (visibleSideQuests === 0) {
      addToList(addCrispText(this, 12, y, 'Aucune quête secondaire pour le moment.', { fontSize: '10px', color: MUTED }));
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
