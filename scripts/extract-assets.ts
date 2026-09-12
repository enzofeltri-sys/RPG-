#!/usr/bin/env ts-node
/**
 * Script d'extraction des assets pour le RPG
 * 
 * Usage : npx ts-node scripts/extract-assets.ts
 * 
 * Ce script extrait les ZIP sélectionnés depuis `asset/` vers `public/game-assets/`.
 * Il faut avoir installé les dépendances : npm install adm-zip
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const ASSET_DIR = path.join(__dirname, '..', 'asset');
// Not 'public/assets' — Vite's own build output uses dist/assets/ for its
// hashed JS/CSS bundle, and public/ is copied verbatim into dist/, so that
// name would dump raw asset packs into the same folder as the app bundle.
const PUBLIC_ASSETS_DIR = path.join(__dirname, '..', 'public', 'game-assets');

// Liste des assets à extraire (selon ASSETS-SELECTION.md)
const ASSETS_TO_EXTRACT = [
  {
    category: 'tilesets',
    name: 'pipoya-rpg-32x32',
    zip: 'Pipoya RPG Tileset 32x32.zip',
  },
  {
    category: 'tilesets',
    name: 'dungeon-tileset-ii',
    zip: '0x72_DungeonTilesetII_v1.7.zip',
  },
  {
    category: 'characters',
    name: '72-character-free',
    zip: '72 Character Free.zip',
  },
  {
    category: 'characters',
    name: 'fantasy-rpg-toony',
    zip: 'Fantasy RPG (Toony) 32x32.png',
    isFile: true,
  },
  {
    category: 'npc',
    name: 'fantasy-npc-pack',
    zip: 'FANTASY_NCP_SPRITES_PACK.zip',
  },
  {
    category: 'ui',
    name: 'basic-pixel-ui-rpg',
    zip: 'Free-Basic-Pixel-Art-UI-for-RPG.zip',
  },
  {
    category: 'decor',
    name: 'trees-bushes',
    zip: 'trees_and_bushes_pack.zip',
  },
  {
    category: 'decor',
    name: 'aquatic',
    zip: 'rc_art_-_nature_aquatic.zip',
  },
  {
    category: 'monsters',
    name: 'fantasy-v1',
    zip: 'Monster_Creatures_Fantasy(Version 1.3).zip',
  },
  {
    category: 'items',
    name: 'weapons-icons-16x16',
    zip: '16x16 Weapons RPG Icons.zip',
  },
];

/**
 * Extrait un ZIP vers un dossier de destination
 */
function extractZip(zipPath: string, destPath: string): void {
  console.log(`📦 Extraction : ${zipPath} → ${destPath}`);
  
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  
  // Créer le dossier de destination
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }
  
  // Extraire chaque entrée
  for (const entry of entries) {
    const entryName = entry.entryName;
    
    // Ignorer les fichiers non-PNG (sauf si c'est un PNG direct)
    if (!entry.isDirectory && !entryName.toLowerCase().endsWith('.png')) {
      console.log(`  ⚠️  Ignoré : ${entryName} (pas un PNG)`);
      continue;
    }
    
    // Construire le chemin de destination
    const destFilePath = path.join(destPath, entryName);
    
    // Créer les sous-dossiers si nécessaire
    const destDir = path.dirname(destFilePath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    // Extraire le fichier
    if (!entry.isDirectory) {
      fs.writeFileSync(destFilePath, entry.getData());
      console.log(`  ✅ Extrait : ${entryName}`);
    }
  }
}

/**
 * Copie un fichier PNG direct (pas un ZIP)
 */
function copyFile(srcPath: string, destPath: string): void {
  console.log(`📄 Copie : ${srcPath} → ${destPath}`);
  
  if (!fs.existsSync(srcPath)) {
    console.error(`  ❌ Fichier source introuvable : ${srcPath}`);
    return;
  }
  
  // Créer le dossier de destination
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copier le fichier
  fs.copyFileSync(srcPath, destPath);
  console.log(`  ✅ Copié`);
}

/**
 * Point d'entrée principal
 */
function main(): void {
  console.log('🚀 Début de l\'extraction des assets...\n');

  // Vérifier que le dossier asset existe
  if (!fs.existsSync(ASSET_DIR)) {
    console.error(`❌ Dossier asset introuvable : ${ASSET_DIR}`);
    console.error('Assure-toi de lancer le script depuis la racine du projet.');
    process.exit(1);
  }
  
  // Créer le dossier public/game-assets s'il n'existe pas
  if (!fs.existsSync(PUBLIC_ASSETS_DIR)) {
    fs.mkdirSync(PUBLIC_ASSETS_DIR, { recursive: true });
    console.log(`📁 Créé : ${PUBLIC_ASSETS_DIR}\n`);
  }
  
  // Extraire chaque asset
  for (const asset of ASSETS_TO_EXTRACT) {
    console.log(`\n🎯 ${asset.category}/${asset.name}`);
    console.log(`   ZIP/Fichier : ${asset.zip}`);
    
    const zipPath = path.join(ASSET_DIR,
      asset.category === 'characters' && asset.name === 'fantasy-rpg-toony' ? 'personnages' :
      asset.category === 'npc' ? 'pnj' :
      asset.category === 'monsters' ? 'monstres' :
      asset.category === 'decor' ? 'decors' :
      asset.category === 'items' ? 'items' :
      asset.category === 'ui' ? 'interface' :
      asset.category === 'tilesets' ? 'tilesets' : 'personnages',
      asset.zip);
    
    const destPath = path.join(PUBLIC_ASSETS_DIR, asset.category, asset.name);
    
    if (asset.isFile) {
      // C'est un fichier PNG direct
      copyFile(zipPath, destPath);
    } else {
      // C'est un ZIP à  extraire
      if (!fs.existsSync(zipPath)) {
        console.error(`  ❌ ZIP introuvable : ${zipPath}`);
        continue;
      }
      extractZip(zipPath, destPath);
    }
  }
  
  console.log('\n✅ Extraction terminée !\n');
  console.log('📁 Les assets sont dans : public/game-assets/');
  console.log('\nProchaines étapes :');
  console.log('1. Vérifier que les assets sont bien extraits');
  console.log('2. Lancer le jeu et tester les scènes');
  console.log('3. Ajuster le code si nécessaire\n');
}

// Lancer le script
main();
