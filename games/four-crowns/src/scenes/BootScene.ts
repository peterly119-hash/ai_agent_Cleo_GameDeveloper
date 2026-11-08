import Phaser from 'phaser';
import { ctx } from '../context';
import { FACTIONS } from '../data/factions';
import { makeTextures } from '../render/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    ctx.hook.scene = 'Boot';
    makeTextures(this, FACTIONS);
    this.scene.start('Title');
  }
}
