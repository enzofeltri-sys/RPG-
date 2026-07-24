import Phaser from 'phaser';
import { addCrispText } from './text';

const GOLD = '#e8d9b5';
const DARK = '#0b0c10';

export function createTouchButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onTap: () => void,
): Phaser.GameObjects.Text {
  const button = addCrispText(scene, x, y, label, {
    fontSize: '13px',
    color: DARK,
    backgroundColor: GOLD,
    padding: { x: 10, y: 8 },
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(1000)
    .setInteractive({ useHandCursor: true });

  button.on('pointerdown', onTap);
  return button;
}
