import type Phaser from 'phaser';
import { ENEMIES } from '../data/enemies';
import type { FactionDef, UnitDef } from '../data/schema';
import { C } from '../theme';

/**
 * Procedural textures (ASSETS.md: "Questwright (generated)"). Everything is derived from
 * content data + faction shape, so new factions/units get art automatically.
 */

type G = Phaser.GameObjects.Graphics;
type Pt = [number, number];

const SHARD: Pt[] = [
  [0.5, 0],
  [0.78, 0.22],
  [0.68, 0.42],
  [1, 0.62],
  [0.62, 1],
  [0.42, 0.78],
  [0.08, 0.9],
  [0.2, 0.5],
  [0, 0.3],
  [0.32, 0.18],
];

function poly(g: G, pts: Pt[], size: number, pad: number, fill: number, outline = 3): void {
  const s = size - pad * 2;
  const points = pts.map(([x, y]) => ({ x: pad + x * s, y: pad + y * s }));
  g.fillStyle(fill, 1);
  g.fillPoints(points, true);
  g.lineStyle(outline, C.ink, 1);
  g.strokePoints(points, true, true);
}

function shapePoints(shape: FactionDef['shape']): Pt[] {
  switch (shape) {
    case 'triangle':
      return [[0.5, 0], [1, 1], [0, 1]];
    case 'square':
      return [[0, 0], [1, 0], [1, 1], [0, 1]];
    case 'diamond':
      return [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];
    case 'circle':
      return Array.from({ length: 20 }, (_, i): Pt => [0.5 + 0.5 * Math.cos((i / 20) * Math.PI * 2), 0.5 + 0.5 * Math.sin((i / 20) * Math.PI * 2)]);
  }
}

function hollow(g: G, pts: Pt[], size: number, pad: number): void {
  // Inner cut-out in ink: "ranged = shape with hollow centre" (STYLE.md).
  const inner = size * 0.36;
  const off = (size - inner) / 2;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const s = size - pad * 2;
  const shiftY = pad + cy * s - (off + inner / 2);
  const shiftX = pad + cx * s - (off + inner / 2);
  g.fillStyle(C.ink, 1);
  g.fillPoints(pts.map(([x, y]) => ({ x: off + shiftX + x * inner, y: off + shiftY + y * inner })), true);
}

export function unitSize(u: UnitDef): number {
  return u.unitType === 'heavy' ? 34 : 22;
}

export function enemySize(id: string): number {
  const e = ENEMIES.find((x) => x.id === id);
  if (!e) return 20;
  if (e.boss) return 72;
  if (e.health >= 50) return 34;
  return 22;
}

function bake(g: G, key: string, w: number, h: number): void {
  g.generateTexture(key, w, h);
  g.clear();
}

export function makeTextures(scene: Phaser.Scene, factions: readonly FactionDef[]): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  for (const f of factions) {
    const pts = shapePoints(f.shape);
    // Faction emblem (faction select, card backs).
    poly(g, pts, 64, 4, f.color, 4);
    bake(g, `emblem:${f.id}`, 64, 64);

    for (const u of f.units) {
      const size = unitSize(u);
      poly(g, pts, size, 2, f.color);
      if (u.unitType === 'ranged') hollow(g, pts, size, 2);
      bake(g, `unit:${u.id}`, size, size);
    }

    for (const b of f.buildings) {
      const size = 72;
      // Island base.
      g.fillStyle(C.ink, 1);
      g.fillRoundedRect(6, 44, 60, 22, 6);
      g.fillStyle(C.islandEdge, 1);
      g.fillRoundedRect(8, 44, 56, 18, 6);
      const unit = b.unitGeneration ? f.units.find((u) => u.id === b.unitGeneration) : undefined;
      const givesActions = b.upgradePaths[0].passiveEffects.some((e) => e.kind === 'actionsPerTurn');
      if (!unit && givesActions) {
        // Command building: a banner on a pole with a star.
        g.fillStyle(C.ink, 1);
        g.fillRect(20, 6, 6, 40);
        poly(g, [[0, 0], [1, 0.3], [0, 0.6]], 40, 0, f.color, 3);
        g.fillStyle(C.text, 1);
        g.fillPoints(starPoints(34, 18, 7, 3), true);
      } else if (!unit) {
        // Support/aura building: a glowing core.
        g.fillStyle(C.burn, 0.35);
        g.fillCircle(36, 28, 24);
        g.fillStyle(f.color, 1);
        g.fillCircle(36, 28, 16);
        g.lineStyle(3, C.ink, 1);
        g.strokeCircle(36, 28, 16);
        g.fillStyle(C.burn, 1);
        g.fillCircle(36, 28, 7);
      } else {
        const scale = unit.unitType === 'heavy' ? 46 : 38;
        g.save();
        g.translateCanvas((size - scale) / 2, 46 - scale);
        poly(g, pts, scale, 0, f.color, 3);
        if (unit.unitType === 'ranged') hollow(g, pts, scale, 0);
        if (unit.unitType === 'heavy') {
          g.fillStyle(C.burn, 1);
          g.fillCircle(scale / 2, scale * 0.7, 6);
        }
        g.restore();
      }
      bake(g, `bld:${b.id}`, size, size);
    }
  }

  for (const e of ENEMIES) {
    const size = enemySize(e.id);
    if (e.boss) {
      g.fillStyle(C.shardGlow, 0.25);
      g.fillCircle(size / 2, size / 2, size / 2);
    }
    poly(g, SHARD, size, e.boss ? 6 : 2, C.shard, e.boss ? 4 : 3);
    if (e.attackRange > 60) hollow(g, SHARD, size, 2);
    bake(g, `enemy:${e.id}`, size, size);
  }

  // Crown Seat.
  const crown: Pt[] = [[0, 1], [0, 0.3], [0.25, 0.6], [0.5, 0.1], [0.75, 0.6], [1, 0.3], [1, 1]];
  poly(g, crown, 64, 6, C.crown, 4);
  g.fillStyle(C.gold, 1);
  g.fillCircle(32, 46, 5);
  bake(g, 'crown', 64, 64);

  // Small UI bits.
  g.fillStyle(C.gold, 1);
  g.fillCircle(10, 10, 9);
  g.lineStyle(2, C.ink, 1);
  g.strokeCircle(10, 10, 9);
  bake(g, 'icon:gold', 20, 20);

  poly(g, [[0.5, 0], [0.9, 0.6], [0.5, 1], [0.1, 0.6]], 20, 1, C.burn, 2);
  bake(g, 'icon:ember', 20, 20);

  g.fillStyle(C.danger, 1);
  g.fillCircle(6, 7, 5);
  g.fillCircle(14, 7, 5);
  g.fillTriangle(1, 9, 19, 9, 10, 19);
  bake(g, 'icon:heart', 20, 20);

  g.fillStyle(0xffffff, 1);
  g.fillCircle(4, 4, 4);
  bake(g, 'dot', 8, 8);

  // Action point: a four-point star.
  g.fillStyle(C.text, 1);
  g.fillPoints(starPoints(10, 10, 9, 3.5), true);
  g.lineStyle(2, C.ink, 1);
  g.strokePoints(starPoints(10, 10, 9, 3.5), true, true);
  bake(g, 'icon:action', 20, 20);

  // Edict: a sealed scroll.
  g.fillStyle(C.crown, 1);
  g.fillRoundedRect(3, 2, 14, 16, 3);
  g.lineStyle(2, C.ink, 1);
  g.strokeRoundedRect(3, 2, 14, 16, 3);
  g.fillStyle(C.danger, 1);
  g.fillCircle(10, 13, 3);
  bake(g, 'icon:edict', 20, 20);

  g.destroy();
}

function starPoints(cx: number, cy: number, outer: number, inner: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}
