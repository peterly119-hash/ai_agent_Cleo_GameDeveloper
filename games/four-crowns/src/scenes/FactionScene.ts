import Phaser from 'phaser';
import { ctx } from '../context';
import { FACTIONS } from '../data/factions';
import type { FactionDef } from '../data/schema';
import { C, L, hex, textStyle } from '../theme';
import { backdrop, button } from './ui';

export class FactionScene extends Phaser.Scene {
  constructor() {
    super('Faction');
  }

  create(): void {
    backdrop(this);
    this.add.text(L.width / 2, 60, 'Choose your Crown', textStyle(40, C.text, true)).setOrigin(0.5);

    const w = 280;
    const gap = 20;
    const startX = (L.width - (w * FACTIONS.length + gap * (FACTIONS.length - 1))) / 2 + w / 2;
    FACTIONS.forEach((f, i) => this.panel(f, startX + i * (w + gap), 370, w));

    button(this, 110, L.height - 50, 140, 44, 'Back', () => this.scene.start('Title'));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('Title'));

    ctx.hook.scene = 'Faction';
    ctx.hook.actions = {
      chooseFaction: (id: string, seed?: number) => this.choose(id, seed),
    } as typeof ctx.hook.actions;
    ctx.progress();
  }

  private choose(id: string, seed?: number): boolean {
    const f = FACTIONS.find((x) => x.id === id);
    if (!f?.playable) {
      ctx.audio.play('invalid');
      return false;
    }
    ctx.audio.play('select');
    this.scene.start('Run', { factionId: id, seed: seed ?? (Date.now() & 0x7fffffff) });
    return true;
  }

  private panel(f: FactionDef, x: number, y: number, w: number): void {
    const h = 480;
    const bg = this.add.rectangle(x, y, w, h, C.sky2).setStrokeStyle(3, f.playable ? f.color : C.islandEdge);
    const alpha = f.playable ? 1 : 0.5;
    this.add.image(x, y - 180, `emblem:${f.id}`).setAlpha(alpha);
    this.add.text(x, y - 128, f.name, textStyle(26, C.text, true)).setOrigin(0.5).setAlpha(alpha);
    this.add.text(x, y - 98, `${f.element} · ${f.primaryResource.name}`, { ...textStyle(16), color: hex(f.color) }).setOrigin(0.5).setAlpha(alpha);
    const body = [
      f.playstyle,
      '',
      `${f.passive.name}: ${f.passive.description}`,
      '',
      `+ ${f.strengths.join(', ')}`,
      `− ${f.weaknesses.join(', ')}`,
    ].join('\n');
    this.add
      .text(x - w / 2 + 16, y - 70, body, { ...textStyle(15, C.textDim), wordWrap: { width: w - 32 }, lineSpacing: 3 })
      .setAlpha(alpha);

    if (f.playable) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setStrokeStyle(4, C.gold));
      bg.on('pointerout', () => bg.setStrokeStyle(3, f.color));
      bg.on('pointerdown', () => this.choose(f.id));
      const b = button(this, x, y + h / 2 - 40, w - 60, 44, 'Rule this Crown', () => this.choose(f.id), { fill: f.color });
      b.text.setColor(hex(C.ink));
    } else {
      this.add.rectangle(x, y + h / 2 - 40, w - 60, 44, C.sky).setStrokeStyle(2, C.islandEdge);
      this.add.text(x, y + h / 2 - 40, 'Coming soon', textStyle(18, C.textDim, true)).setOrigin(0.5);
    }
  }
}
