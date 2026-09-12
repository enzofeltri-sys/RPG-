# Plan d'attaque – Refonte graphique du RPG

> Objectif : transformer le rendu visuel du jeu pour qu'il corresponde à la DA validé¼¼e  
> (Pixel Art 2D top-down, style GBA / Zelda / Pok é  mon, couleurs vives, monde riche et vivant).  
> **On ne touche pas à la logique du jeu** (qu ê  tes, combats, maps, etc.), uniquement aux assets et au rendu.

---

## 0. Rappels de la DA

- **Style :** Pixel Art 2D top-down, inspir é  Game Boy Advance / SNES.
- **Ré¼¼é¼¼rences :** *Pok é  mon Gen III*, *Zelda* (A Link to the Past, Minish Cap).
- **Taille des tuiles :** 32×¼32 pixels (base).
- **Couleurs :** vives, riches, ni pastel ni trop sombres.
- **Monde :** herbe, arbres, for ê  ts, rochers, cascades, riviè¼¼res, maisons remplies, PNJ, animaux.
- **Objectif :** rendu **beau** et **quali**, lisible sur mobile.

---

## 1. Phase 0 – Préparation et sécurisation

- Branche : `refonte-graphisme`.
- Lister les fichiers à modifier (rendu, scènes, CSS).
- Sauvegarder l'existant (chemins actuels des assets).

---

## 2. Phase 1 – Sélection et extraction des assets

### 2.1. Assets à extraire en priorité

| Catégorie | Fichier source | Destination |
|-----------|----------------|-------------|
| Tileset extérieur | `asset/tilesets/Pipoya RPG Tileset 32x32.zip` | `public/assets/tilesets/pipoya-rpg-32x32/` |
| Tileset donjon | `asset/tilesets/0x72_DungeonTilesetII_v1.7.zip` | `public/assets/tilesets/dungeon-tileset-ii/` |
| Personnages | `asset/personnages/72 Character Free.zip` | `public/assets/characters/72-character-free/` |
| Personnages toony | `asset/personnages/Fantasy RPG (Toony) 32x32.png` | `public/assets/characters/fantasy-rpg-toony/` |
| PNJ | `asset/pnj/FANTASY_NCP_SPRITES_PACK.zip` | `public/assets/npc/fantasy-npc-pack/` |
| UI | `asset/interface/Free-Basic-Pixel-Art-UI-for-RPG.zip` | `public/assets/ui/basic-pixel-ui-rpg/` |
| Décors arbres | `asset/decors/trees_and_bushes_pack.zip` | `public/assets/decor/trees-bushes/` |
| Décors eau | `asset/decors/rc_art_-_nature_aquatic.zip` | `public/assets/decor/aquatic/` |
| Monstres | `asset/monstres/Monster_Creatures_Fantasy(Version 1.3).zip` | `public/assets/monsters/fantasy-v1/` |
| Items | `asset/items/16x16 Weapons RPG Icons.zip` | `public/assets/items/weapons-icons-16x16/` |

### 2.2. Règles d'extraction

- Extraire uniquement les PNG utiles.
- Organiser par sous-dossiers clairs.
- Vérifier la taille (32×¼32 ou 16×¼16).
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

---

## 4. Phase 3 – Inté¼¼gration

- Remplacer `roguelike-rpg.png` et `roguelike-dungeon.png` par Pipoya / 0x72.
- Mapper persos, PNJ, monstres vers nouveaux packs.
- Remplacer UI par Free-Basic-Pixel-Art-UI-for-RPG.

---

## 5. Phase 4 – Tests

Scè¼¼nes prioritaires : CityScene, ForestScene, DungeonScene, CombatScene, InteriorScene.

Points à vé  rifier : tuiles aligné¼¼es, sprites nets, couleurs cohé¼¼rentes, UI lisible mobile, animations fluides, perfs bonnes.

---

## 6. Phase 5 – Déploiement

- Créer `docs/ASSETS-UTILISES.md`.
- Nettoyer anciens tilesets si plus utilisés.
- Ouvrir PR `refonte-graphisme` → `main`.
- Tester en prod.

---

## 7. Checklist

- [x] Créer branche `refonte-graphisme`
- [ ] Extraire Pipoya RPG Tileset 32x32
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

> Prochaine é  tape : extraire les assets et int é grer progressivement.