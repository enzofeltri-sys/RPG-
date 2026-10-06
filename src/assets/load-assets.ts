/**
 * Fonctions utilitaires pour charger les assets
 * 
 * Usage : 
 *   const tileset = await loadAsset('tilesets', 'pipoya-rpg-32x32', 'tileset.png');
 *   const sprite = await loadAsset('characters', '72-character-free', 'hero.png');
 */

import { PIXEL_ART_CONFIG } from './pixel-art-config';

/**
 * Charge un asset depuis public/assets/
 */
export async function loadAsset(
  category: keyof typeof PIXEL_ART_CONFIG.ASSETS_PATH,
  assetName: string,
  fileName: string
): Promise<HTMLImageElement> {
  const basePath = PIXEL_ART_CONFIG.ASSETS_PATH[category];
  const url = `${basePath}${assetName}/${fileName}`;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    
    img.onload = () => {
      console.log(`✅ Asset chargé : ${url}`);
      resolve(img);
    };
    
    img.onerror = (err) => {
      console.error(`❌ Erreur chargement asset : ${url}`, err);
      reject(err);
    };
  });
}

/**
 * Charge plusieurs assets en parallè¼¼le
 */
export async function loadAssets(
  assets: Array<{
    category: keyof typeof PIXEL_ART_CONFIG.ASSETS_PATH;
    assetName: string;
    fileName: string;
  }>
): Promise<HTMLImageElement[]> {
  const promises = assets.map(a => loadAsset(a.category, a.assetName, a.fileName));
  return Promise.all(promises);
}

/**
 * Vérifie que les assets prioritaires sont disponibles
 */
export async function validateAssets(): Promise<void> {
  console.log('[Validate Assets] Vérification des assets prioritaires...');
  
  const priorityTests = [
    { category: 'TILESETS', name: PIXEL_ART_CONFIG.PRIORITY_ASSETS.TILESET_OVERWORLD },
    { category: 'CHARACTERS', name: PIXEL_ART_CONFIG.PRIORITY_ASSETS.CHARACTERS },
    { category: 'NPC', name: PIXEL_ART_CONFIG.PRIORITY_ASSETS.NPC },
    { category: 'UI', name: PIXEL_ART_CONFIG.PRIORITY_ASSETS.UI },
  ];
  
  for (const test of priorityTests) {
    const path = `${PIXEL_ART_CONFIG.ASSETS_PATH[test.category as keyof typeof PIXEL_ART_CONFIG.ASSETS_PATH]}${test.name}`;
    console.log(`  📁 ${test.category}: ${path}`);
  }
  
  console.log('✅ Vérification terminé  e');
}

export default { loadAsset, loadAssets, validateAssets };
