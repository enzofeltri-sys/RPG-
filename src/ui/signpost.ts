import Phaser from 'phaser';
import { addCrispText } from './text';
import { EXIT_TEXT } from './kit';
import { placeProp } from '../world/drawnArt';

// A landmark at a crossroads: a small wooden post plus an always-readable
// list of directions, e.g. ['↓ Basse-Combe', '↑ Repaire du Loup', '→ Forêt'].
// Purely informational — visible as soon as the player is nearby, in the
// same outlined style as the zone's exit labels.
export function addSignpost(scene: Phaser.Scene, x: number, y: number, directions: string[]): void {
  // The post itself is world art drawn by the game, standing at the foot
  // of where the old drawn post was.
  placeProp(scene, 'signpost', Math.round(x), Math.round(y) + 12, 3);

  addCrispText(scene, x, y - 30, directions.join('\n'), {
    fontSize: '7px',
    ...EXIT_TEXT,
    align: 'center',
    lineSpacing: 3,
  }).setOrigin(0.5, 1);
}
