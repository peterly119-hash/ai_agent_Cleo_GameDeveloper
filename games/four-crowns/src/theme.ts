import type Phaser from 'phaser';

/** STYLE.md palette tokens. Use only these. */
export const C = {
  sky: 0x141826,
  sky2: 0x1d2236,
  laneAlt: 0x1a1f31,
  island: 0x3a3f55,
  islandEdge: 0x5a6080,
  ink: 0x0b0d14,
  text: 0xf2eee3,
  textDim: 0xa7a9b8,
  gold: 0xf4c542,
  crown: 0xe9e2c8,
  danger: 0xff4d5e,
  ember: 0xe8573a,
  burn: 0xffb347,
  shard: 0x9b5de5,
  shardGlow: 0xc9a6ff,
} as const;

export const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export const FONT = '"Segoe UI", system-ui, sans-serif';

export function textStyle(size: number, color: number = C.text, bold = false): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: FONT, fontSize: `${size}px`, color: hex(color), fontStyle: bold ? 'bold' : 'normal' };
}

/** 1280×720 layout (STYLE.md). */
export const L = {
  width: 1280,
  height: 720,
  margin: 24,
  topBar: 48,
  tile: 96,
  gap: 8,
  gridX: 40,
  gridY: 160,
  fieldX: 380,
  fieldW: 876,
  handY: 572,
  cardW: 130,
  cardH: 136,
} as const;

/** Centre y of a grid row / battle lane. */
export const rowY = (row: number): number => L.gridY + row * (L.tile + L.gap) + L.tile / 2;
export const colX = (col: number): number => L.gridX + col * (L.tile + L.gap) + L.tile / 2;
