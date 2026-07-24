# Le Sceau de Vaeloria — Design de référence

Document vivant : mis à jour à chaque incrément. Sert de mémoire du projet entre les sessions.

Portée : ce document couvre la v1 (voir "Portée v1" ci-dessous) et sa roadmap d'implémentation par incréments. Pour la vision long terme du jeu dans son ambition complète (au-delà de la v1), voir `VISION.md`.

## Décisions techniques

- Moteur : Phaser 3, TypeScript, Vite
- Vue : top-down 2D classique (façon Zelda/Pokémon), pas isométrique
- Style graphique : rétro 16-bit façon SNES (résolution interne 216×384 portrait, `pixelArt: true`)
- UI/texte : tout texte passe par `addCrispText` (`src/ui/text.ts`) — `pixelArt: true` applique un filtrage "nearest" à tout, y compris le texte, ce qui le rend flou/blocky une fois agrandi sur mobile ; `addCrispText` force une résolution de rendu plus haute + filtrage linéaire pour ce texte spécifiquement. Ne jamais utiliser `this.add.text(...)` directement pour de l'UI. Police : VT323 (pixel/terminal, OFL, auto-hébergée dans `src/assets/fonts/` + `src/fonts.css`, jamais de CDN Google Fonts — casserait le hors-ligne) remplace la police serif d'origine (Georgia), illisible une fois réduite à la résolution interne ; `addCrispText` applique aussi un multiplicateur de taille (`FONT_SIZE_MULTIPLIER`) car les glyphes VT323 paraissent plus petits que Georgia à taille égale. `main.ts` attend `document.fonts.load(...)` avant de démarrer `Phaser.Game`, sinon le premier rendu du texte peut figer sur la police de repli (Phaser ne redessine pas automatiquement le texte quand une police web finit de charger après coup).
- Contrôles tactiles standards par scène de jeu : joystick virtuel (bas gauche), bouton "Action" (bas droite, interaction contextuelle), bouton "Menu" (haut gauche, fiche personnage + inventaire + options + quitter). Les boutons interactifs ne doivent jamais être des enfants d'un `Phaser.GameObjects.Container` — la détection de clic dessus est peu fiable ; les garder au niveau scène et gérer leur visibilité manuellement en parallèle du container visuel. Piège vécu : un objet `Text` retiré du container pour cette raison doit récupérer manuellement `setScrollFactor(0)` et un `setDepth` au-dessus du fond du panneau — sinon il reste ancré au monde (défile avec la caméra) et/ou se retrouve rendu sous le fond opaque.
- Menu → Options : bouton "Vider le cache et rafraîchir" (désenregistre le service worker + vide le Cache Storage + recharge la page) pour les cas où une mise à jour PWA ne s'applique pas toute seule.
- Combat : tour par tour (menu d'actions), écran de combat dédié
- Contrôles : joystick virtuel tactile + boutons d'action (priorité tactile, mobile en **portrait**, quasi plein écran via CSS `100dvh` + bouton plein écran natif où disponible), clavier flèches en support secondaire pour les tests
- Hors-ligne : PWA (service worker via `vite-plugin-pwa`), sauvegarde locale IndexedDB
- Hébergement de test : GitHub Pages (déploiement auto sur push via `.github/workflows/deploy.yml`), à l'URL `https://enzofeltri-sys.github.io/RPG-/`

## Scénario (pitch validé)

Il y a 300 ans, une confrérie de mages a scellé une entité primordiale — **le Roi Démon** — au prix de leur vie. Le sceau a fracturé les royaumes unifiés en cités-États rivales et dispersé des éclats de corruption qui pervertissent peu à peu faune, flore et parfois hommes.

Ton : sérieux pour la trame principale, pas de comique. Conflits politiques entre cités, ambiguïté morale de certaines factions et de l'antagoniste. Le registre "drôle et étrange" façon Daedra (voir `VISION.md`) est réservé aux quêtes secondaires, en contraste volontaire avec le sérieux de la trame principale.

### Trame principale (3 actes)

**Acte 1 — L'Éveil de la Marque**
Le héros/l'héroïne, originaire d'un village frontalier, survit à une attaque de créature corrompue et découvre une marque liée au rituel de scellement originel. Un aîné du village (mentor) la reconnaît et pousse le héros à enquêter — première quête dans un site rituel voisin corrompu (1er donjon). Fin d'acte : la corruption ne se répand pas au hasard, quelqu'un arrache activement des éclats du sceau quelque part dans les cités.

**Acte 2 — Les Cités Rivales**
Monde ouvert guidé : le héros voyage entre plusieurs cités-États, chacune dominée par une des 3 factions (voir "Factions" ci-dessous). Le héros apprend que sa marque lui permet de s'accorder aux éclats du sceau (les sentir, les extraire, les renforcer) — il/elle devient une cible pour ceux qui veulent protéger le sceau *et* pour ceux qui veulent le briser. Fin d'acte : un donjon majeur (tombeau de la confrérie fondatrice) est pillé par l'antagoniste, qui vole un éclat majeur — une région entière tombe en corruption.

**Acte 3 — Rupture ou Rédemption**
Poursuite de l'antagoniste jusqu'au site originel du scellement (donjon final, version corrompue/miroir d'un lieu déjà visité). Révélation : la confrérie originelle n'a jamais vaincu le Roi Démon, elle n'a fait que le contenir, et le sceau était condamné à s'affaiblir depuis le début — la marque du héros est un fragment de son essence, lié par le sang à la lignée d'un des mages fondateurs (le héros en est un descendant). L'antagoniste n'est pas un simple méchant caricatural : convaincu que le confinement est voué à l'échec, il/elle veut soit détruire le Roi Démon pour de bon, soit absorber son pouvoir avant que quelqu'un de pire ne le fasse.

**Fins multiples**, déterminées par les alliances de faction construites en acte 2 :
1. **Nouveau Sceau** — le héros se lie lui-même comme ancre vivante : le monde est stabilisé, à un prix personnel (sacrifice, fin douce-amère).
2. **Destruction** — avec l'aide des factions alliées, destruction complète du Roi Démon (fin "victoire", avec pertes selon les alliances ratées).
3. **Corruption/Ascension** — le héros absorbe le pouvoir du Roi Démon et devient une nouvelle puissance dominante sur les royaumes fracturés (fin sombre/ambiguë).

### Quêtes secondaires — répartition

- **Acte 1** : quêtes locales au village de départ et alentours (ambiance, premiers PNJ excentriques).
- **Acte 2** (le plus long) : gros de la production de quêtes secondaires et de faction, dispersées librement dans les cités/camps/donjons annexes, pas bloquées derrière la trame principale.
- **Acte 3** : peu de nouvelles quêtes secondaires (rythme resserré vers le climax) ; certaines quêtes de l'acte 2 peuvent s'y conclure selon les choix faits.
- **Post-jeu** : lot dédié de quêtes secondaires débloquées après la fin de la trame principale — contenu supplémentaire jouable après le générique, terrain privilégié pour les quêtes les plus étranges/Daedra-like.

### Factions

Poids volontairement simple (même philosophie que l'artisanat — pas de micro-gestion) :
- **Réputation par faction** → accès à des marchands/objets/recettes exclusifs à cette faction + tarifs préférentiels.
- **Quêtes de faction** → chaînes courtes dédiées, récompensent de l'équipement unique à la faction.
- **Poids sur la fin** → l'aide disponible en acte 3 (qui accompagne le héros dans l'affrontement final, quelle fin est réellement accessible) dépend des factions aidées en acte 2. Pas de jauge complexe : juste "aidée ou pas", qui ouvre/ferme des portes plus tard.

Autres éléments actés :
- Donjons = anciens sites rituels/tombeaux contenant des artefacts uniques
- Artisanat = redécouverte de techniques perdues depuis la Rupture
- Races : Humains (royaumes fracturés) et Elfes (gardiens reclus) au lancement ; Nains (mineurs souterrains) et Orcs (exilés en rédemption) en extension

## Portée v1 (première version jouable)

- 3-4 villes/villages reliés par une zone extérieure explorable (pas le continent entier)
- 4-6 donjons courts à moyens
- 2 classes × 2 races au lancement (Guerrier/Mage × Humain/Elfe), extension à Voleur/Clerc et Nain/Orc ensuite
- 1 quête principale (~5-8 étapes) + 2-4 quêtes secondaires par ville/donjon
- Équipement : tous les emplacements dès la v1 (arme, bouclier, casque, torse, jambes, bottes, gants, 2 anneaux, amulette), rareté commun → rare en v1
- Artisanat de base (récolte + 1 recette forge + 1 recette alchimie) pour valider la boucle

## Règles de loot (à appliquer dès l'implémentation du système d'objets)

- **Objets uniques** (rareté la plus haute, ~0,10% de drop) : répartis sur 10 à 20 donjons/quêtes difficiles au total sur tout le jeu. **Tous les donjons n'en offrent pas** — chaque donjon/quête est explicitement tagué "a une table de loot unique" ou non lors de sa conception ; ne pas en distribuer uniformément.
- **Puissance des objets liée à la progression de l'histoire** : les tables de loot sont segmentées par palier narratif (chapitre/région), pas seulement par difficulté du donjon. Un objet légendaire trouvé tôt dans l'histoire doit être significativement moins puissant qu'un équivalent trouvé dans les zones tardives — la montée en puissance suit l'avancement du scénario, en plus de la rareté.
- Rareté : commun → rare → épique → légendaire → unique, avec effets spéciaux sur les objets rares et au-dessus.

## Roadmap par incréments

1. ✅ Setup projet (Phaser3+TS+Vite+PWA), écran titre, sauvegarde/chargement
2. ✅ Overworld : déplacement (joystick tactile + flèches), 1re map (village de départ, formes géométriques en attendant les vrais tilesets), collisions, transition de zone avec fondu
3. ✅ Combat tour par tour (menu Attaquer/Fuir, 1 monstre test — loup corrompu), rencontres aléatoires en explorant le Champ, XP/niveau désormais fonctionnels (gain d'XP, montée de niveau avec points de stat, restauration PV/PM)
4. ✅ Création de personnage : choix race/classe (Humain/Elfe × Guerrier/Mage), stats dérivées, PV/PM, fiche consultable en jeu. XP/niveaux/points de compétence : structure de données en place (niveau 1, XP 0), sans encore de combat pour les faire progresser (arrive à l'incrément 3)
5. ✅ Inventaire + équipement complet (10 emplacements, stats variables, rareté commun/rare), butin de combat, stats effectives (base + équipement) utilisées en combat. Bouton "Menu" (fiche personnage/inventaire/quitter) disponible à la fois au Village et au Champ. Chaque objet peut être consulté en détail (stats complètes, et pour les objets non équipés une comparaison "avant → après" contre l'objet actuellement dans le même emplacement) avant de confirmer l'équipement/déséquipement. Objets rares : gagnent en plus un effet spécial fixe propre au gabarit d'objet (ex. "Dégâts de feu" sur l'épée courte), au-delà du simple bonus de statistique ×2 — Armure ajoutée comme statistique d'objet standard (boucliers/armures), utilisée en combat pour réduire les dégâts subis ; Dégâts de feu ajouté comme exemple d'effet spécial d'arme, ajouté aux dégâts infligés.
6. ✅ 1er donjon jouable avec butin + boss — "Repaire du Loup", accessible depuis le Champ (zone du haut). 2 combats réguliers (rat des cavernes, loup corrompu) dans un couloir central, puis une barrière physique bloque l'accès au boss (loup alpha corrompu, 70 PV) tant que les deux ne sont pas déclenchés — empêche de foncer direct sur le boss en contournant les rencontres. Butin garanti sur le boss (`rollLootItem({ guaranteed: true, rareChance: 0.5 })`), butin normal (40% de chance) sur les combats réguliers.
7. ✅ Système de quêtes + PNJ/dialogues — mécanisme minimal volontairement (voir note sous l'incrément 9) : `src/game/quest.ts` (`QUESTS` registry, accepter/suivre/terminer, objectif "vaincre N fois tel monstre"), persistance dans `character.quests`. Un PNJ (villageois, près du premier bâtiment) donne la seule quête actuelle ("Menace dans les bois" — vaincre 3 loups corrompus, au Champ ou dans le donjon) via une boîte de dialogue (fond + texte + boutons ; suit la même règle que le Menu : boutons hors `Container`). `CombatScene.victory()` fait avancer toute quête active ciblant le monstre vaincu et le signale dans le journal de combat. Écran "Quêtes" dédié (liste titres/description/statut) accessible depuis le Menu (bouton "Quêtes", grille 2×2 avec Inventaire/Options/Quitter).
8. ✅ Artisanat de base + économie (or, marchand) — `src/game/material.ts` (fer brut, herbe), `src/game/consumable.ts` (potion de soin, `useConsumable`), `src/game/recipe.ts` (`RECIPES` : forge épée courte 3 fer brut, alchimie potion de soin 2 herbes ; `canCraft`/`craft` déduisent les matériaux et ajoutent l'objet/consommable). Récolte : 2 nœuds au Village (gisement de fer, herbes sauvages), bouton Action → `+1 matériau`. Marchande (PNJ dédié au Village) : `MerchantScene` avec vente des objets non équipés de l'inventaire (`sellPrice`, rareté : commun 10 or, rare 25 or) et achat d'un petit catalogue (fer brut, herbe, potion de soin) contre `character.gold`. Forge (bâtiment dédié) : `CraftingScene` liste les recettes par station, affiche matériaux possédés/requis (vert si suffisant), bouton "Fabriquer" désactivé sinon. Combat : chaque victoire rapporte de l'or (`monster.goldReward`) en plus de l'XP/butin ; `CombatScene` propose un bouton "Potion de soin" en combat si le joueur en possède. Fiche personnage : ligne "Or" ajoutée aux stats affichées.
**Retours de playtest post-incrément 8 (corrigés)** : le Menu (Inventaire/Sac/Stats/Quêtes) ramenait systématiquement au point de spawn de la scène au lieu de la position exacte du joueur — pire, depuis le Champ ou le Donjon, il ramenait carrément au Village. Cause : `InventoryScene`/`QuestLogScene` faisaient `this.scene.start('Village')` en dur. Fix : `src/ui/returnContext.ts` (`ReturnSceneKey`, `returnSceneStartData`) fait transiter `{ returnScene, x, y }` à travers toute navigation partant du Menu ou des bâtiments du Village (forge/marchande) ; chaque scène (`Village`/`Field`/`Dungeon`) accepte `x`/`y` en `init()` pour spawn au bon endroit, et le retour vers le Donjon renvoie systématiquement `resume: true` pour ne pas effacer la progression des rencontres. Par la même occasion : la fiche personnage (stats/or/PV/PM/points) a été sortie du panneau Menu vers un écran dédié `StatsScene` ("Stats") ; l'inventaire a été scindé en `InventoryScene` ("Inventaire", emplacements équipés uniquement) et `BagScene` ("Sac", objets non équipés — équiper ou jeter, avec confirmation en deux temps pour le jet). Menu réorganisé en grille 3×2 : Inventaire/Sac, Stats/Quêtes, Options/Quitter. Le Sac a ensuite reçu un filtre à 4 onglets (Objets/Ress./Potions/Quête) pour regrouper tout l'inventaire non-équipement au même endroit : objets non équipés (équiper/jeter, inchangé), ressources d'artisanat (`character.materials`, lecture seule), consommables (`character.consumables`, bouton "Utiliser" direct — soigne immédiatement hors combat), et objets de quête (`src/game/questItem.ts`, `character.questItems` — lecture seule, aucune quête n'en distribue encore ; prêt pour le contenu narratif de l'incrément 9). L'onglet Objets a ensuite été transformé en grille d'icônes carrées (4 colonnes) au lieu d'une liste de noms — chaque case est un badge coloré par rareté (`RARITY_COLORS`) avec un code catégorie à 3 lettres (`categoryIcon()` dans `src/game/item.ts` — vrais visuels prévus à l'incrément 10). Un objet plus puissant que celui actuellement équipé dans son emplacement (`isUpgrade()`, comparaison par somme de stats — la rareté y est déjà intégrée puisqu'elle multiplie les stats) reçoit une bordure épaisse + halo vert sur sa case, et le détail de l'objet affiche "▲ Plus puissant que l'objet équipé" (vert) ou "▼ Moins puissant" (gris) au-dessus du comparatif stat-par-stat déjà existant (`compareItemStats`).
9. 🚧 Extension du contenu v1 (villes/donjons/quêtes restants) — c'est ici qu'arrive le vrai contenu narratif (histoire, quêtes écrites, dialogues) une fois les incréments 6-8 posés ; jusque-là le système de quêtes (incrément 7) restait volontairement un mécanisme technique minimal, pas du contenu.

**Refonte du monde (première passe increment 9)** : jusqu'ici le "Village" cumulait tout (mentor/quête, marchande, forge, récolte) dès la toute première seconde de jeu, et le Champ n'était qu'un couloir vide entre deux zones. Découpage en 3 lieux distincts pour un monde partiellement ouvert, cohérent avec le pitch (survivant d'un village frontalier) :
- **Basse-Combe** (`HamletScene`, nouvelle, clé `Hamlet`) — le hameau de départ, volontairement pauvre : 2 cabanes décoratives + le mentor ("Aldric", ex-"Villageois") qui donne la quête `wolves_threat`. C'est le point d'entrée pour une nouvelle partie et pour "Continuer" (`TitleScene`/`CharacterCreationScene` démarrent sur `Hamlet`, pas `Village`).
- **Le Champ** (`FieldScene`, agrandi 320×240 → 480×480) — désormais un vrai carrefour rempli : une rivière traverse la carte (colliders des deux côtés, seul le pont — sans collider — permet de passer), arbres/rochers décoratifs (aucune collision, pas de vrais assets avant l'incrément 10), les 2 nœuds de récolte (déplacés depuis le Village), et 3 sorties (hameau au sud, Repaire du Loup au nord — de l'autre côté de la rivière —, Forêt à l'est). Bouton "Action" ajouté pour la récolte (le Champ n'en avait pas besoin avant).
- **Valombre** (`VillageScene`, clé `Village` inchangée) — la vraie ville, avec la marchande et la forge ; le PNJ de quête et les nœuds de récolte en sont partis (vers Basse-Combe / le Champ).

Position du joueur préservée à travers toutes ces transitions (spawn au bon endroit selon d'où on vient, via `init(data)` sur chaque scène) — y compris désormais après un combat dans le Champ ou le Donjon (`CombatScene` faisait déjà ça pour le Donjon depuis l'incrément 6 ; étendu au Champ ici via `ReturnSceneKey`/`returnSceneStartData`, en évitant de reporter la position quand la destination diffère de la scène de départ — ex. une défaite renvoie désormais à Basse-Combe, pas Valombre, et n'a pas de position à restaurer). `ReturnSceneKey` (`src/ui/returnContext.ts`) inclut maintenant `'Hamlet'`.

**Route allongée + panneaux (suite immédiate)** : plutôt qu'un unique Champ collé à Valombre, la route Basse-Combe → Valombre traverse maintenant 4 zones : Champ → **Forêt** (`ForestScene`, nouvelle) → **Grotte** (`CaveScene`, nouvelle) → Valombre. Le Champ garde ses 3 sorties, mais celle de l'est mène désormais à la Forêt (pas directement à Valombre). La Forêt (400×480, arbres denses décoratifs) a des rencontres aléatoires piochées entre `corrupted_wolf` et un nouveau `goblin_scout`. La Grotte (200×400, couloir façon donjon) fait volontairement l'impasse sur un vrai 2e donjon (pas de grille/boss) mais n'est pas un simple couloir non plus : 2 rencontres fixes contre un nouveau `cave_spider`, avec le même suivi "cleared" que le Donjon (`clearedEncounterIds` + `resume: true` — sans quoi fuir un combat replace le joueur pile sur la même zone de rencontre, qui se re-déclenche aussitôt). `src/ui/signpost.ts` (`addSignpost`) ajoute des panneaux directionnels aux carrefours (près du pont dans le Champ, aux entrées de la Forêt) — juste un poteau + une liste de directions toujours visible, aucune interaction requise.

**Deux bugs réels trouvés en testant cette route** (donc probablement latents ailleurs, corrigés partout) :
1. Chaque scène fait `const save = await SaveManager.load()` en fin de `create()` avant de construire le `CharacterSheetPanel` — mais Arcade Physics continue de tourner à chaque frame pendant ce await, donc si le joueur atteint une zone de sortie *avant* que ce chargement finisse, la scène est arrêtée puis le `create()` encore en attente se réveille et tente de construire un panneau sur une scène déjà détruite, corrompant l'état interne des colliders de Phaser au prochain pas de physique (`Cannot read properties of undefined (reading 'isParent')`, planté dans `collideObjects`). Fix : `if (!this.scene.isActive()) return;` juste après le `await`, dans les 6 scènes concernées (`Hamlet`/`Village`/`Field`/`Forest`/`Cave`/`Dungeon`).
2. Dans `CaveScene`, le point d'arrivée par défaut (`WORLD_HEIGHT - 20`) tombait exactement sur la bordure de la zone de sortie sud — arriver dans la Grotte re-déclenchait instantanément la sortie vers la Forêt. Plusieurs points d'entrée entre zones avaient une marge de 10px à peine (déjà repérable via la leçon de Basse-Combe sur les passages trop étroits) ; élargis à 20-40px partout où c'était le cas.
10. Polish (effets, son, UI) + test offline complet — c'est le moment prévu pour intégrer de vrais assets graphiques (voir section Assets) à la place des rectangles de couleur actuels.

## Assets

Pas de pack d'art fantasy pour l'instant — tout le rendu (perso, bâtiments, monstres, donjon) est en formes géométriques de couleur en attendant. Le joueur fournira des packs gratuits une fois qu'on attaque le graphisme (prévu à l'incrément 10, polish) : LPC Base Assets, 0x72 DungeonTileset II (+ Extended), Kenney Tiny Dungeon, FreePixel.art RPG, Pixel Fantasy Icons, Ansimuz Legacy, Kenney Mini Dungeon — à intégrer dans cet ordre de priorité. Icônes PWA actuelles = placeholders générés par `scripts/generate-icons.mjs`, à remplacer en même temps.
