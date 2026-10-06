# Plan d'attaque – Refonte graphique du RPG

> Objectif : transformer le rendu visuel du jeu pour qu'il corresponde à la DA validée
> (Pixel Art 2D top-down, style GBA / Zelda / Pokémon, couleurs vives, monde riche et vivant).
> **On ne touche pas à la logique du jeu** (quêtes, combats, maps, etc.), uniquement aux assets et au rendu.

---

## 0. Rappels de la DA

- **Style :** Pixel Art 2D top-down, inspiré Game Boy Advance / SNES.
- **Références :** *Pokémon Gen III*, *Zelda* (A Link to the Past, Minish Cap).
- **Taille des tuiles :** 32×32 pixels (base).
- **Couleurs :** vives, riches, ni pastel ni trop sombres.
- **Monde :** herbe, arbres, forêts, rochers, cascades, rivières, maisons remplies, PNJ, animaux.
- **Objectif :** rendu **beau** et **quali**, lisible sur mobile.

---

## 1. Phase 0 – Préparation et sécurisation

- Branche : `refonte-graphisme`.
- Lister les fichiers à modifier (rendu, scènes, CSS).
- Sauvegarder l'existant (chemins actuels des assets).

---

## 2. Phase 1 – Sélection et extraction des assets

### 2.1. Assets à extraire en priorité

> **Chemin réel (voir `docs/ASSETS-CONVENTIONS.md`)** : les ZIP sont extraits sous
> `public/game-assets/`, pas `public/assets/` — ce dernier entre en collision
> avec `dist/assets/`, le dossier où Vite place son propre bundle JS/CSS une
> fois le projet buildé. `public/game-assets/` est exclu du cache hors-ligne
> de la PWA (`globIgnores` dans `vite.config.ts`) tant que son contenu n'est
> pas câblé dans une scène.

| Catégorie | Fichier source | Destination |
|-----------|----------------|-------------|
| Tileset extérieur | `asset/tilesets/Pipoya RPG Tileset 32x32.zip` | `public/game-assets/tilesets/pipoya-rpg-32x32/` |
| Tileset donjon | `asset/tilesets/0x72_DungeonTilesetII_v1.7.zip` | `public/game-assets/tilesets/dungeon-tileset-ii/` |
| Personnages | `asset/personnages/72 Character Free.zip` | `public/game-assets/characters/72-character-free/` |
| Personnages toony | `asset/personnages/Fantasy RPG (Toony) 32x32.png` | `public/game-assets/characters/fantasy-rpg-toony/` |
| PNJ | `asset/pnj/FANTASY_NCP_SPRITES_PACK.zip` | `public/game-assets/npc/fantasy-npc-pack/` |
| UI | `asset/interface/Free-Basic-Pixel-Art-UI-for-RPG.zip` | `public/game-assets/ui/basic-pixel-ui-rpg/` |
| Décors arbres | `asset/decors/trees_and_bushes_pack.zip` | `public/game-assets/decor/trees-bushes/` |
| Décors eau | `asset/decors/rc_art_-_nature_aquatic.zip` | `public/game-assets/decor/aquatic/` |
| Monstres | `asset/monstres/Monster_Creatures_Fantasy(Version 1.3).zip` | `public/game-assets/monsters/fantasy-v1/` |
| Items | `asset/items/16x16 Weapons RPG Icons.zip` | `public/game-assets/items/weapons-icons-16x16/` |

> Une fois qu'un asset de `public/game-assets/` est réellement câblé dans une
> scène (comme la tuile d'herbe Pipoya ci-dessous), il migre vers
> `public/tiles/` ou `public/sprites/` selon son type — voir
> `docs/ASSETS-CONVENTIONS.md`.

### 2.2. Règles d'extraction

- Extraire uniquement les PNG utiles.
- Organiser par sous-dossiers clairs.
- Vérifier la taille (32×32 ou 16×16).
- Supprimer les doublons.

---

## 3. Phase 2 – Configuration du rendu pixel art

### 3.1. Fichier de config

`src/assets/pixel-art-config.ts` :

```ts
export const PIXEL_ART_CONFIG = {
  TILE_SIZE: 32,
  VIEWPORT_WIDTH: 640,
  VIEWPORT_HEIGHT: 360,
  SCALE_MODE: 'pixelated' as const,
  TEXTURE_FILTER: 'nearest' as const,
  CSS_UPSCALE: true,
};
```

### 3.2. CSS

```css
canvas, img, .sprite {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

### 3.3. Approche actuelle du sol : texture répétée, pas de tilemap

Important à garder en tête pour la suite du plan — deux choses différentes :

- **Pas de tilemap.** Le jeu n'utilise ni l'API `Phaser.Tilemaps`, ni de carte
  Tiled (JSON/TMX), ni aucune grille logique "ici c'est herbe, ici c'est un
  bord, ici c'est de l'eau". Chaque scène est une classe TypeScript avec des
  coordonnées x/y codées en dur pour chaque bâtiment/décor/rencontre — voir
  `src/scenes/*.ts`.
- **Une seule tuile répétée, pas d'autotile.** Le "sol" d'une scène
  (`src/entities/groundTexture.ts`) est une unique tuile 32×32 (ou 16×16 côté
  Kenney) répétée en plein écran via un `TileSprite` Phaser. Pour Pipoya,
  cette tuile a été découpée à la main dans la feuille d'autotile RPG Maker
  `[A]Grass1_pipo.png` (le seul bloc 8×6 sans transparence, herbe "pleine"
  sans bord) — le système d'autotile de Pipoya (bords herbe/terre/eau qui
  s'assemblent automatiquement selon les voisins) n'est pas exploité.

Deux façons d'aller plus loin plus tard si des transitions de sol propres
deviennent nécessaires :
1. Un petit système d'autotile "maison" qui choisit la bonne frame dans la
   grille Pipoya selon les tuiles voisines, sans passer par une vraie
   tilemap.
2. Une vraie tilemap Phaser (`Phaser.Tilemaps` + JSON Tiled + tileset Pipoya),
   ce qui impliquerait de convertir les scènes actuelles (coordonnées libres)
   en grilles — un chantier nettement plus gros, hors scope de ce plan pour
   l'instant.

---

## 4. Phase 3 – Intégration

- Remplacer `roguelike-rpg.png` et `roguelike-dungeon.png` par Pipoya / 0x72.
- Mapper persos, PNJ, monstres vers nouveaux packs.
- Remplacer UI par Free-Basic-Pixel-Art-UI-for-RPG.

---

## 5. Phase 4 – Tests

Scènes prioritaires : CityScene, ForestScene, DungeonScene, CombatScene, InteriorScene.

Points à vérifier : tuiles alignées, sprites nets, couleurs cohérentes, UI lisible mobile, animations fluides, perfs bonnes.

---

## 6. Phase 5 – Déploiement

- Créer `docs/ASSETS-UTILISES.md`.
- Nettoyer anciens tilesets si plus utilisés.
- Ouvrir PR `refonte-graphisme` → `main`.
- Tester en prod.

---

## 7. Checklist

- [x] Créer branche `refonte-graphisme`
- [x] Découper et câbler une tuile d'herbe Pipoya (une seule frame, pas le pack entier — voir 3.3)
- [ ] Extraire le reste de Pipoya RPG Tileset 32x32 dans `public/game-assets/`
- [ ] Extraire 0x72 DungeonTileset II
- [ ] Extraire 72 Character Free
- [ ] Extraire Fantasy RPG Toony 32x32
- [ ] Extraire FANTASY_NCP_SPRITES_PACK
- [ ] Extraire Free-Basic-Pixel-Art-UI-for-RPG
- [ ] Extraire trees_and_bushes_pack
- [ ] Extraire rc_art_-_nature_aquatic
- [ ] Extraire Monster_Creatures_Fantasy
- [ ] Extraire 16x16 Weapons RPG Icons
- [ ] Créer pixel-art-config.ts
- [ ] Ajouter CSS pixelated
- [ ] Remplacer tilesets
- [ ] Remplacer persos/PNJ/monstres
- [ ] Remplacer UI
- [ ] Tester scènes
- [ ] Vérifier mobile
- [ ] Ouvrir PR

---

> Prochaine étape : extraire les assets et intégrer progressivement.