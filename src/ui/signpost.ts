import Phaser from 'phaser';
import { addCrispText } from './text';
import { EXIT_TEXT, PAL } from './kit';

// A landmark at a crossroads: a small wooden post plus an always-readable
// list of directions, e.g. ['↓ Basse-Combe', '↑ Repaire du Loup', '→ Forêt'].
// Purely informational — visible as soon as the player is nearby, in the
// same outlined style as the zone's exit labels.
export function addSignpost(scene: Phaser.Scene, x: number, y: number, directions: string[]): void {
  const g = scene.add.graphics();
  const px = Math.round(x / 2) * 2;
  const py = Math.round(y / 2) * 2;
  // Post.
  g.fillStyle(PAL.k, 1).fillRect(px - 4, py - 18, 8, 30);
  g.fillStyle(PAL.b, 1).fillRect(px - 2, py - 16, 4, 26);
  g.fillStyle(PAL.n, 1).fillRect(px - 2, py - 16, 2, 26);
  // Board.
  g.fillStyle(PAL.k, 1).fillRect(px - 16, py - 24, 32, 14);
  g.fillStyle(PAL.n, 1).fillRect(px - 14, py - 22, 28, 10);
  g.fillStyle(PAL.N, 1).fillRect(px - 14, py - 22, 28, 2);
  g.fillStyle(PAL.b, 1).fillRect(px - 10, py - 18, 20, 2);

  addCrispText(scene, x, y - 30, directions.join('\n'), {
    fontSize: '9px',
    ...EXIT_TEXT,
    align: 'center',
    lineSpacing: 3,
  }).setOrigin(0.5, 1);
}
