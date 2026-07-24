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

## Carte

- Type : carte par régions séparées
- Doit afficher : zones découvertes, points de quête, villes, donjons, camps, sanctuaires

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
