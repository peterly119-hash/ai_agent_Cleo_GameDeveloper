import Phaser from 'phaser';
import { createMenu, type MenuHandle } from '@questwright/lib';
import { ctx } from '../context';
import { C, L, textStyle } from '../theme';
import { MENU_THEME, backdrop, button } from './ui';

export class TitleScene extends Phaser.Scene {
  private menu: MenuHandle | null = null;
  private scoresPanel: Phaser.GameObjects.Container | null = null;
  private crown: Phaser.GameObjects.Image | null = null;

  constructor() {
    super('Title');
  }

  create(): void {
    backdrop(this);
    const cx = L.width / 2;
    this.crown = this.add.image(cx, 120, 'crown').setScale(1.2);
    this.add.text(cx, 200, 'FOUR CROWNS', textStyle(64, C.text, true)).setOrigin(0.5);
    this.add.text(cx, 256, 'Rule a shard of the Shattered Reach. Hold it against the swarm.', textStyle(18, C.textDim)).setOrigin(0.5);

    const soundLabel = (): string => `Sound: ${ctx.settings.muted ? 'Off' : 'On'}`;
    this.menu = createMenu(
      this,
      cx,
      340,
      [
        { id: 'play', label: 'Play', onSelect: () => this.scene.start('Faction') },
        { id: 'scores', label: 'High Scores', onSelect: () => this.toggleScores() },
        {
          id: 'sound',
          label: soundLabel(),
          onSelect: () => {
            ctx.settings.muted = ctx.audio.toggleMute();
            ctx.saveSettings();
            this.scene.restart();
          },
        },
      ],
      MENU_THEME,
    );

    this.add.text(cx, L.height - L.margin - 10, 'A Questwright game  ·  M1 vertical slice', textStyle(14, C.textDim)).setOrigin(0.5);

    ctx.hook.scene = 'Title';
    ctx.hook.actions = {
      menuSelect: (id: string) => this.menu?.select(id) ?? false,
    } as typeof ctx.hook.actions;
    ctx.hook.ready = true;
    ctx.progress();
  }

  private toggleScores(): void {
    if (this.scoresPanel) {
      this.scoresPanel.destroy(true);
      this.scoresPanel = null;
      this.crown?.setVisible(true);
      ctx.hook.state['overlay'] = null;
      return;
    }
    const c = this.add.container(L.width / 2, 370);
    const bg = this.add.rectangle(0, 0, 520, 500, C.sky2).setStrokeStyle(3, C.islandEdge).setInteractive();
    const title = this.add.text(0, -206, 'High Scores', textStyle(28, C.gold, true)).setOrigin(0.5);
    c.add([bg, title]);
    const top = ctx.scores.top();
    if (top.length === 0) c.add(this.add.text(0, -40, 'No runs yet. Go claim a crown!', textStyle(18, C.textDim)).setOrigin(0.5));
    top.forEach((e, i) => {
      const y = -130 + i * 34;
      const meta = `${e.meta?.['result'] ?? ''} · round ${e.meta?.['round'] ?? '?'}`;
      c.add(this.add.text(-220, y, `${i + 1}.`, textStyle(18, C.textDim)));
      c.add(this.add.text(-180, y, `${e.score}`, textStyle(18, C.text, true)));
      c.add(this.add.text(-80, y, `${e.name}  ${meta}`, textStyle(16, C.textDim)));
    });
    const close = button(this, 0, 196, 160, 44, 'Close', () => this.toggleScores());
    c.add([close.bg, close.text]);
    this.scoresPanel = c;
    this.crown?.setVisible(false);
    ctx.hook.state['overlay'] = 'scores';
    ctx.progress();
  }
}
