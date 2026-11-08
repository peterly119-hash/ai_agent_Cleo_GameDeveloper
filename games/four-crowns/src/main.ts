import Phaser from 'phaser';
import { ctx, fps, installAudioUnlock } from './context';
import { BootScene } from './scenes/BootScene';
import { FactionScene } from './scenes/FactionScene';
import { RunScene } from './scenes/RunScene';
import { SummaryScene } from './scenes/SummaryScene';
import { TitleScene } from './scenes/TitleScene';
import { C, L } from './theme';

installAudioUnlock();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: L.width,
  height: L.height,
  backgroundColor: C.sky,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, powerPreference: 'high-performance' },
  disableContextMenu: true,
  banner: false,
  audio: { noAudio: true },
  scene: [BootScene, TitleScene, FactionScene, RunScene, SummaryScene],
});

game.events.on(Phaser.Core.Events.STEP, (_time: number, delta: number) => fps.tick(delta));
ctx.hook.state['renderer'] = game.config.renderType === Phaser.CANVAS ? 'canvas' : 'webgl';
