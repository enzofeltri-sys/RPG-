# Assets sélectionnés pour la refonte graphique

> Liste officielle des assets à extraire et intégrer pour le RPG.

> **Destination réelle** : `public/game-assets/`, pas `public/assets/`
> (collision avec `dist/assets/`, le bundle Vite) — voir
> `docs/ASSETS-CONVENTIONS.md`.
>
> **Statut** : les colonnes ✅ ci-dessous indiquent la sélection retenue, pas
> forcément une extraction déjà faite sur cette branche. À ce jour, seule une
> tuile d'herbe recadrée depuis Pipoya (pas le pack entier) est câblée dans
> le jeu — voir `docs/PLAN-ATTAQUE-GRAPHISME.md` section 3.3 et la checklist.

---

## 1. Tilesets

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| Pipoya RPG Tileset 32x32 | `asset/tilesets/Pipoya RPG Tileset 32x32.zip` | `public/game-assets/tilesets/pipoya-rpg-32x32/` | ✅ |
| 0x72 DungeonTileset II | `asset/tilesets/0x72_DungeonTilesetII_v1.7.zip` | `public/game-assets/tilesets/dungeon-tileset-ii/` | ✅ |
| Sunnyside World v2.1 | `asset/tilesets/Sunnyside_World_ASSET_PACK_V2.1.zip` | `public/game-assets/tilesets/sunnyside-world/` | ⚠️ |

---

## 2. Personnages

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| 72 Character Free | `asset/personnages/72 Character Free.zip` | `public/game-assets/characters/72-character-free/` | ✅ |
| Fantasy RPG Toony 32x32 | `asset/personnages/Fantasy RPG (Toony) 32x32.png` | `public/game-assets/characters/fantasy-rpg-toony/` | ✅ |
| Pixel Crawler | `asset/personnages/Pixel Crawler - Free Pack 2.11.zip` | `public/game-assets/characters/pixel-crawler/` | ⚠️ |

---

## 3. PNJ

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| FANTASY_NCP_SPRITES_PACK | `asset/pnj/FANTASY_NCP_SPRITES_PACK.zip` | `public/game-assets/npc/fantasy-npc-pack/` | ✅ |
| premade-npc-spritesheets | `asset/pnj/premade-npc-spritesheets.zip` | `public/game-assets/npc/premade-spritesheets/` | ⚠️ |

---

## 4. Monstres

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| Monster Creatures Fantasy v1.3 | `asset/monstres/Monster_Creatures_Fantasy(Version 1.3).zip` | `public/game-assets/monsters/fantasy-v1/` | ✅ |
| Monsters Creatures Fantasy 2 | `asset/monstres/Monsters Creatures Fantasy 2.zip` | `public/game-assets/monsters/fantasy-v2/` | ⚠️ |
| Fox Sprite Sheet | `asset/monstres/Fox Sprite Sheet.png` | `public/game-assets/monsters/fox/` | ✅ |
| Rat | `asset/monstres/Rat.zip` | `public/game-assets/monsters/rat/` | ✅ |

---

## 5. Décors

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| trees_and_bushes_pack | `asset/decors/trees_and_bushes_pack.zip` | `public/game-assets/decor/trees-bushes/` | ✅ |
| rc_art_-_nature_aquatic | `asset/decors/rc_art_-_nature_aquatic.zip` | `public/game-assets/decor/aquatic/` | ✅ |
| plant repack | `asset/decors/plant repack.png` | `public/game-assets/decor/plants/` | ✅ |
| free fish | `asset/decors/free fish.zip` | `public/game-assets/decor/fish/` | ✅ |

---

## 6. UI

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| Free-Basic-Pixel-Art-UI-for-RPG | `asset/interface/Free-Basic-Pixel-Art-UI-for-RPG.zip` | `public/game-assets/ui/basic-pixel-ui-rpg/` | ✅ |
| Free_Medieval_Fantasy_UI_Pack | `asset/interface/Free_Medieval_Fantasy_UI_Pack.zip` | `public/game-assets/ui/medieval-fantasy/` | ⚠️ |

---

## 7. Items

| Asset | Source | Destination | Statut |
|-------|--------|-------------|--------|
| 16x16 Weapons RPG Icons | `asset/items/16x16 Weapons RPG Icons.zip` | `public/game-assets/items/weapons-icons-16x16/` | ✅ |
| potions | `asset/items/potions.zip` | `public/game-assets/items/potions/` | ✅ |
| Misc_Jewels | `asset/items/Misc_Jewels.png` | `public/game-assets/items/jewels/` | ✅ |
| books_misc0.1 | `asset/items/books_misc0.1.png` | `public/game-assets/items/books/` | ✅ |

---

## 8. Règles d'extraction

1. Extraire uniquement les PNG.
2. Organiser par sous-dossiers clairs.
3. Vérifier taille (32×32 ou 16×16).
4. Supprimer doublons.
5. Garder ZIP dans `asset/`.

---

## 9. Prochaines étapes

1. Extraire assets ✅ dans `public/game-assets/`.
2. Mettre à jour code pour nouveaux chemins.
3. Ajouter CSS `image-rendering: pixelated`.
4. Tester scènes prioritaires.
