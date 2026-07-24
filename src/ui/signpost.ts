import Phaser from 'phaser';
import { addCrispText } from './text';

// A landmark at a crossroads: a small wooden post plus a always-readable list
// of directions, e.g. ['↓ Basse-Combe', '↑ Repaire du Loup', '→ Forêt']. Purely
// decorative/informational — no interaction needed, it's visible as soon as
// the player is nearby, same as the existing per-zone exit labels.
export function addSignpost(scene: Phaser.Scene, x: number, y: number, directions: string[]): void {
  scene.add.rectangle(x, y, 6, 22, 0x6b4a2f).setStrokeStyle(1, 0x2e1f14);
  scene.add.rectangle(x, y - 14, 26, 12, 0x8a6a42).setStrokeStyle(1, 0x2e1f14);

  addCrispText(scene, x, y - 34, directions.join('\n'), {
    fontSize: '9px',
    color: '#e8d9b5',
    align: 'center',
    lineSpacing: 3,
  }).setOrigin(0.5);
}
