# Conventions de rangement des assets

> Où mettre un fichier selon ce qu'il est et où il en est dans le pipeline
> extraction → intégration.

---

## Les trois dossiers

| Dossier | Contenu | Cache PWA hors-ligne |
|---------|---------|----------------------|
| `public/tiles/` | Sols utilisés par le jeu (une tuile ou une feuille de sprites par texture de sol) | Oui |
| `public/sprites/` | Décors, bâtiments, PNJ, monstres, items, consommables utilisés par le jeu | Oui |
| `public/game-assets/` | Packs bruts extraits des ZIP, pas encore câblés dans une scène | Non (exclu, voir `vite.config.ts`) |

## La règle

- **Un asset réellement chargé par une scène** (référencé dans un fichier
  `src/**/*.ts`, via `scene.load.image`/`scene.load.spritesheet`) va dans
  `public/tiles/` (sols) ou `public/sprites/<catégorie>/` (tout le reste) —
  jamais dans `public/game-assets/`.
- **Un pack extrait mais pas encore utilisé nulle part dans le code** reste
  dans `public/game-assets/`. C'est une zone de stockage intermédiaire, pas
  une destination finale : quand un fichier de ce dossier finit par être
  câblé dans une scène, il **migre** vers `public/tiles/` ou
  `public/sprites/` plutôt que d'être chargé depuis `game-assets/`.
- **On évite `public/assets/`**, tout court. Ce nom entre en collision avec
  `dist/assets/` — le dossier où Vite place son propre bundle JS/CSS une fois
  le projet buildé (`public/` est copié tel quel dans `dist/`). Un dossier
  `public/assets/` fusionnerait avec ce bundle, ce qui a déjà causé un vrai
  bug une fois : une tentative d'exclure `public/assets/` du cache hors-ligne
  de la PWA a fini par exclure le bundle applicatif lui-même, cassant le mode
  hors-ligne.

## Pourquoi `game-assets/` est exclu du cache hors-ligne

Le jeu est une PWA jouable hors-ligne (`vite-plugin-pwa`, précache de tout ce
qui est servi). `public/game-assets/` sert à stocker des packs entiers
(plusieurs dizaines à centaines de fichiers, plusieurs Mo) en attendant
qu'une partie en soit utilisée — la plupart de son contenu ne l'est jamais.
Le précacher en entier gonflerait le poids de l'installation hors-ligne pour
des fichiers que le joueur ne verra jamais. D'où l'exclusion :

```ts
// vite.config.ts
workbox: {
  globIgnores: ['game-assets/**'],
}
```

Un fichier qui reste dans `game-assets/` peut toujours être chargé en ligne
(il est servi normalement), mais ne sera pas disponible si le joueur ouvre le
jeu hors connexion sans l'avoir déjà visité en ligne au moins une fois. C'est
acceptable pour du contenu non utilisé ; ça ne l'est pas pour un asset dont
une scène dépend réellement — d'où la règle de migration ci-dessus.

## Exemple concret

La tuile d'herbe Pipoya (`docs/PLAN-ATTAQUE-GRAPHISME.md`, section 3.3) a été
recadrée depuis `asset/tilesets/Pipoya RPG Tileset 32x32.zip` puis placée
directement dans `public/tiles/pipoya-ground-grass.png` — pas dans
`public/game-assets/tilesets/pipoya-rpg-32x32/` — précisément parce qu'elle
est chargée par `src/entities/groundTexture.ts` et doit rester jouable
hors-ligne.
