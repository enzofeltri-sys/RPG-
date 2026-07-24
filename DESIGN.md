# Le Sceau de Vaeloria — Design de référence

Document vivant : mis à jour à chaque incrément. Sert de mémoire du projet entre les sessions.

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

Il y a 300 ans, une confrérie de mages a scellé une entité primordiale — **le Roi Creux** — au prix de leur vie. Le sceau a fracturé les royaumes unifiés en cités-États rivales et dispersé des éclats de corruption qui pervertissent peu à peu faune, flore et parfois hommes.

Le héros/l'héroïne, originaire d'un village frontalier, survit à une attaque de créature corrompue et découvre qu'il/elle porte une marque liée au rituel de scellement originel. Il/elle part enquêter sur la recrudescence des corruptions à travers les royaumes, et découvre que quelqu'un cherche activement à briser le sceau.

Ton : sérieux, pas de comique. Conflits politiques entre cités, ambiguïté morale de certaines factions.

- Donjons = anciens sites rituels/tombeaux contenant des artefacts uniques
- Quêtes secondaires = conflits locaux causés par la corruption montante
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
8. Artisanat de base + économie (or, marchand)
9. Extension du contenu v1 (villes/donjons/quêtes restants) — c'est ici qu'arrive le vrai contenu narratif (histoire, quêtes écrites, dialogues) une fois les incréments 6-8 posés ; jusque-là le système de quêtes (incrément 7) reste volontairement un mécanisme technique minimal, pas du contenu.
10. Polish (effets, son, UI) + test offline complet — c'est le moment prévu pour intégrer de vrais assets graphiques (voir section Assets) à la place des rectangles de couleur actuels.

## Assets

Pas de pack d'art fantasy pour l'instant — tout le rendu (perso, bâtiments, monstres, donjon) est en formes géométriques de couleur en attendant. Le joueur fournira des packs gratuits une fois qu'on attaque le graphisme (prévu à l'incrément 10, polish) : LPC Base Assets, 0x72 DungeonTileset II (+ Extended), Kenney Tiny Dungeon, FreePixel.art RPG, Pixel Fantasy Icons, Ansimuz Legacy, Kenney Mini Dungeon — à intégrer dans cet ordre de priorité. Icônes PWA actuelles = placeholders générés par `scripts/generate-icons.mjs`, à remplacer en même temps.
