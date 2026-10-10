import Phaser from 'phaser';
import { addSceneInteractable } from '../input/TapController';
import { showBanner } from './dialog';
import { placeProp } from '../world/drawnArt';

// A signpost at a crossroads: a small wooden post (world art drawn by the
// game). Its directions, e.g. ['↓ Basse-Combe', '↑ Repaire du Loup'], are
// not written in the world: the player walks up and reads it.
export function addSignpost(scene: Phaser.Scene, x: number, y: number, directions: string[]): void {
  const footY = Math.round(y) + 12;
  placeProp(scene, 'signpost', Math.round(x), footY, 3);
  addSceneInteractable(scene, {
    x,
    y: footY - 8,
    radius: 18,
    onTap: () => showBanner(scene, directions.join('\n'), 3200),
  });
}
