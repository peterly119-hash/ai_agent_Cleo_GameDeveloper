import type Phaser from 'phaser';
import type { MenuTheme } from '@questwright/lib';
import { ctx } from '../context';
import { C, FONT, hex, textStyle } from '../theme';

export const MENU_THEME: MenuTheme = {
  font: FONT,
  fontSize: 22,
  text: hex(C.text),
  textHover: hex(C.ink),
  fill: C.sky2,
  fillHover: C.gold,
  stroke: C.islandEdge,
  width: 280,
  height: 52,
  gap: 14,
};

/** Simple rectangular text button. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: { fill?: number; size?: number } = {},
): { bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text; setEnabled: (on: boolean) => void } {
  const fill = opts.fill ?? C.sky2;
  const bg = scene.add.rectangle(x, y, w, h, fill).setStrokeStyle(2, C.islandEdge).setInteractive({ useHandCursor: true });
  const text = scene.add.text(x, y, label, textStyle(opts.size ?? 18, C.text, true)).setOrigin(0.5);
  let enabled = true;
  bg.on('pointerover', () => enabled && bg.setStrokeStyle(2, C.gold));
  bg.on('pointerout', () => bg.setStrokeStyle(2, C.islandEdge));
  bg.on('pointerdown', () => {
    if (!enabled) return;
    ctx.audio.play('click');
    onClick();
  });
  return {
    bg,
    text,
    setEnabled(on: boolean) {
      enabled = on;
      bg.setAlpha(on ? 1 : 0.45);
      text.setAlpha(on ? 1 : 0.45);
    },
  };
}

/** A soft floating island backdrop shared by menu screens. */
export function backdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  g.fillStyle(C.sky2, 1);
  const islands: [number, number, number][] = [
    [160, 600, 120],
    [1100, 140, 90],
    [1040, 640, 150],
    [90, 120, 60],
    [640, 690, 200],
  ];
  for (const [x, y, w] of islands) {
    g.fillEllipse(x, y, w * 2, w * 0.5);
  }
  g.fillStyle(C.island, 0.5);
  for (const [x, y, w] of islands) g.fillEllipse(x, y - w * 0.08, w * 1.6, w * 0.28);
}
