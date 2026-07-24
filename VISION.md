# Le Sceau de Vaeloria — Vision globale (pense-bête)

Ce document est la ligne de conduite long terme du jeu dans son ambition complète. Il ne décrit pas l'état actuel de l'implémentation (voir `DESIGN.md` pour ça, qui suit une portée v1 volontairement réduite et une roadmap par incréments). `VISION.md` sert de référence à consulter quand on décide quoi ajouter après la v1 — certains éléments ci-dessous vont bien au-delà de la portée v1 et arriveront en extension (voir "Portée v1" dans `DESIGN.md`).

## Inspirations

- Skyrim
- Dragon Age
- Diablo 3

## Vision du projet

- Durée : 50h tout compris
- Structure monde : assez guidé, mais pas trop
- Combat : tour par tour classique, simple
- Compétences : plus Diablo-like
- Quêtes : style Daedra (Skyrim), drôles et étranges

## Monde

- Type : monde ouvert délimité par zones
- Paysages : champs, forêts, rivières avec ponts, lacs, grottes, montagnes, cascades
- Lieux : villages, camps de bandits, camps de gobelins, châteaux, manoirs, fermes autour des châteaux
- Structure : découpé en régions séparées, chacune avec une ville principale, plusieurs villages, des routes de transit et des zones sauvages entre les deux — lisible mais avec de vraies possibilités d'exploration (grand RPG à régions contrôlées, pas un continent uniforme). Certaines routes passent par des ponts, cols de montagne, forêts épaisses ou zones dangereuses : de vrais choix de trajet, pas juste un couloir.

## Carte

- Type : carte par régions séparées
- Doit afficher : zones découvertes, points de quête, villes, donjons, camps, sanctuaires

## Régions

Progression géographique qui suit le scénario ; chaque région débloque de nouvelles routes, de nouveaux villages, une nouvelle faction dominante (ou un nouveau rapport de force), de nouveaux biomes et de nouveaux donjons.

1. **Région de départ** — zone frontalière verte : champs, petites forêts, rivières, collines. Village natal du héros, bourg marchand, ferme isolée, petit sanctuaire, route principale vers la 1re cité-État. Zone d'apprentissage : chasse, récolte, combat simple, premiers coffres, 1er donjon rituel corrompu.
2. **Première cité-État**
3. **Région forestière** — dense et humide : bois profonds, lacs cachés, marécages légers, chemins sinueux. Hameaux de bûcherons, relais de chasseurs, campements de gardes chargés de surveiller les routes. Route principale étroite (ponts en bois, passages entre les arbres, clairières, zones de corruption bloquées par quête). Donjons rares mais marquants : grottes anciennes, sanctuaires enterrés, tombeaux perdus.
4. **Région minière** — sèche et rocheuse : falaises, carrières, mines, campements de mineurs, routes taillées à flanc de montagne. Ville principale industrielle et fortifiée, entourée de villages d'ouvriers, de forges, de postes de garde. Routes dangereuses (éboulements, bandits, monstres souterrains). Donjons = mines abandonnées, galeries rituelles, tunnels effondrés.
5. **Région montagneuse** — la plus hostile visuellement : sommets enneigés, cols, cascades, vallées encaissées, ponts suspendus, villages accrochés à la roche. Routes rares, souvent bloquées par des portes naturelles, ponts de pierre, tunnels ou passages gardés. Villages isolés et très soudés, souvent liés à des factions, des cultes ou des traditions anciennes. Donjons peu nombreux mais puissants : forteresses, tombeaux, sanctuaires oubliés, sites de scellement secondaires.
6. **Capitale** — grande cité-État au centre politique du monde connu : routes pavées, quartiers nobles, marché, casernes, tour de mages, port ou grande porte d'accès. Fermes et villages satellites autour, routes protégées par des garnisons, quelques zones de tension avec les autres factions. Les enjeux politiques y deviennent visibles (alliance, réputation, accès à des maîtres d'armes, sanctuaires de soins, marchands rares, donjons majeurs). Peut être liée à un sanctuaire majeur ou au site final de l'histoire.
7. **Royaume final / site originel du scellement**

## Types de villages

- **Frontalier** : petit, pauvre, exposé aux monstres, souvent le point de départ
- **Bûcherons** : proche des forêts, centré sur le bois et la chasse
- **Minier** : proche des montagnes/carrières, centré sur le minerai
- **Agricole** : entouré de champs, moulins, granges, fermes
- **Religieux** : autour d'un sanctuaire, d'un temple ou d'un lieu sacré
- **Marchand** : sur une route importante, avec auberge, marché, caravanes
- **Caché** : débloqué par quête, lié à une faction ou à un mystère

## Routes entre villes

Chaque route a une identité visuelle et narrative propre — certaines sûres et pavées, d'autres sauvages, boueuses ou coupées par la corruption.

- **Commerciale** : relie deux grandes villes, caravanes, relais, péages, bandits
- **Forestière** : bois, clairières, ponts en bois
- **Fluviale** : longe une rivière, gués, ponts, moulins, petits ports
- **De montagne** : cols, gorges, tunnels
- **Sacrée** : mène à un sanctuaire ou une ville religieuse
- **Interdite** : fermée au départ, débloquée par quête ou niveau
- **De corruption** : zone contaminée, plus dangereuse, parfois optionnelle

## Biomes

Plaine agricole, forêt tempérée, forêt profonde, marais, rivière et vallée, lacs et zones humides, collines, montagnes rocheuses, montagnes enneigées, canyons/falaises, ruines anciennes, terres corrompues, zones de cendre (site final).

## Donjons — répartition

Pas dans toutes les zones : placés comme des points forts du monde, pas uniformément.

- Donjons de départ dans la région frontalière
- Tombeaux et sanctuaires dans la forêt
- Mines abandonnées et galeries rituelles dans la région minière
- Forteresses, colosses, grottes glacées dans les montagnes
- Donjons majeurs dans la capitale ou les cités-États
- Donjons cachés débloqués par quête ou réputation

## Races

- Humain
- Orc
- Elfe
- Nain

## Classes

- Chevalier
- Vampire
- Mage
- Voleur
- Archer
- Barbare

## Éléments de magie

- Feu
- Glace
- Poison
- Vent
- Eau
- Terre
- Électricité

## Stats du personnage

- Intelligence (dégât magique)
- Force (dégât physique)
- Vitalité (vie)
- Agilité (coup critique, vitesse)
- Mana (total mana)
- Chance (chance de butin)

## Progression

- Niveau max : 60 à 80
- Compétences : arbre à points de talent

## Équipement

- Armes : épée, hache, dague, arc, arbalète, épée à deux mains, hache longue
- Armures : lourde et légère
- Bouclier : compatible arme 1 main, pas avec les armes à deux mains

## Ressources et artisanat

- Philosophie : système simple, pas de micro-gestion, mais diversifié
- Métiers : cueillette, bûcheron, mineur, peau (récolte sur monstres)
- Butin monstres : cuir, viande, ressources spéciales (écailles, os, cœurs, etc.)

## Raretés

- Commun
- Rare
- Peu Rare
- Épique
- Légendaire
- Unique

## Économie

- Monnaie : or
- Marchands : généraliste, forgeron, alchimiste, marchand magique, marchand noir
- Prix dynamiques selon ville, réputation, offre/demande

## Factions

- Nombre max : 3
- Exemples : Ordre des Chevaliers, Guilde des Mages, Confrérie des Voleurs

## Coffres

- Types : commun, rare, caché, de quête, de donjon, unique
- Contenu : or, ressources, potions, armes, objets rares

## Familier

- Types : chat, bébé dragon, chien/loup, fée
- Progression : XP + nourriture
- Combat : joueur + familier vs 4 monstres/persos
- Raretés : commun, rare, épique, légendaire/unique

## PNJ

- Pas de compagnons humains
- PNJ importants : seigneur, forgeron, alchimiste, marchand, ermite, chef de guilde

## Sauvegarde et mort

- Sauvegarde : automatique
- Mort : retour dernière ville ou début du donjon

## Téléportation

- Principe : voyage rapide uniquement vers les lieux déjà découverts

## Zones et villes déblocables

- Conditions : quêtes, puissance, réputation, événements monde

## Technique

- Moteur : PWA (HTML/JS), 100% gratuit, offline
- Assets : LPC, 0x72, Kenney, FreePixel, etc.
- Dev tool : Claude Code
