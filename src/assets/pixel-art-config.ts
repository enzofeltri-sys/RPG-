/**
 * Configuration du rendu pixel art pour le RPG
 * 
 * DA : Pixel Art 2D top-down, style GBA / Zelda / Pok é  mon
 */

export const PIXEL_ART_CONFIG = {
  /** Taille des tuiles en pixels */
  TILE_SIZE: 32,

  /** Ré  solution viewport (basse pour effet pixel art) */
  VIEWPORT_WIDTH: 640,
  VIEWPORT_HEIGHT: 360,

  /** Mode de mise à  l'é¼¼chelle */
  SCALE_MODE: 'pixelated' as const,

  /** Filtre texture */
  TEXTURE_FILTER: 'nearest' as const,

  /** Upscale CSS */
  CSS_UPSCALE: true,

  /** Chemins assets */
  ASSETS_PATH: {
    TILESETS: '/assets/tilesets/',
    CHARACTERS: '/assets/characters/',
    NPC: '/assets/npc/',
    MONSTERS: '/assets/monsters/',
    DECOR: '/assets/decor/',
    UI: '/assets/ui/',
    ITEMS: '/assets/items/',
  },

  /** Assets prioritaires */
  PRIORITY_ASSETS: {
    TILESET_OVERWORLD: 'pipoya-rpg-32x32/',
    TILESET_DUNGEON: 'dungeon-tileset-ii/',
    CHARACTERS: '72-character-free/',
    NPC: 'fantasy-npc-pack/',
    UI: 'basic-pixel-ui-rpg/',
  },
} as const;

export function validatePixelArtConfig(): void {
  console.log('[Pixel Art Config]');
  console.log(`  TILE_SIZE: ${PIXEL_ART_CONFIG.TILE_SIZE}px`);
  console.log(`  VIEWPORT: ${PIXEL_ART_CONFIG.VIEWPORT_WIDTH}x${PIXEL_ART_CONFIG.VIEWPORT_HEIGHT}`);
  console.log(`  SCALE_MODE: ${PIXEL_ART_CONFIG.SCALE_MODE}`);
  console.log(`  TEXTURE_FILTER: ${PIXEL_ART_CONFIG.TEXTURE_FILTER}`);
}

export default PIXEL_ART_CONFIG;
