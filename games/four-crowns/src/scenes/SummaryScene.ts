import Phaser from 'phaser';
import { ctx } from '../context';
import { getFaction } from '../data/factions';
import { C, L, textStyle } from '../theme';
import { backdrop, button } from './ui';

export interface SummaryData {
  won: boolean;
  score: number;
  round: number;
  rounds: number;
  crownHp: number;
  kills: number;
  factionId: string;
  factionName: string;
}

export class SummaryScene extends Phaser.Scene {
  constructor() {
    super('Summary');
  }

  create(data: SummaryData): void {
    backdrop(this);
    const cx = L.width / 2;
    const rank = ctx.scores.submit({
      name: data.factionName,
      score: data.score,
      date: new Date().toISOString().slice(0, 10),
      meta: { result: data.won ? 'Victory' : 'Defeat', round: data.round },
    });
    ctx.audio.play(data.won ? 'victory' : 'defeat');

    this.add.image(cx, 130, 'crown').setScale(1.4).setTint(data.won ? 0xffffff : C.islandEdge);
    this.add.text(cx, 220, data.won ? 'VICTORY' : 'THE CROWN HAS FALLEN', textStyle(52, data.won ? C.gold : C.danger, true)).setOrigin(0.5);
    this.add
      .text(
        cx,
        280,
        data.won ? 'The Rift Colossus shatters. Your island holds.' : `Your kingdom fell in round ${data.round} of ${data.rounds}.`,
        textStyle(20, C.textDim),
      )
      .setOrigin(0.5);

    const rows: [string, string][] = [
      ['Score', `${data.score}`],
      ['Rounds cleared', `${data.won ? data.round : data.round - 1} / ${data.rounds}`],
      ['Crown HP left', `${data.crownHp}`],
      ['Shardborn destroyed', `${data.kills}`],
      ['Best score', `${ctx.scores.best()?.score ?? data.score}${rank === 0 ? '  (new best!)' : ''}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 340 + i * 36;
      this.add.text(cx - 200, y, k, textStyle(20, C.textDim));
      this.add.text(cx + 200, y, v, textStyle(20, C.text, true)).setOrigin(1, 0);
    });

    button(this, cx - 120, 590, 200, 52, 'Play again', () => this.again(data.factionId), { fill: getFaction(data.factionId).color });
    button(this, cx + 120, 590, 200, 52, 'Title', () => this.scene.start('Title'));

    ctx.hook.scene = 'Summary';
    ctx.hook.state = { ...ctx.hook.state, result: data.won ? 'won' : 'lost', score: data.score, round: data.round };
    ctx.hook.actions = {
      playAgain: () => this.again(data.factionId),
      toTitle: () => this.scene.start('Title'),
    } as typeof ctx.hook.actions;
    ctx.progress();
  }

  private again(factionId: string): void {
    this.scene.start('Run', { factionId, seed: Date.now() & 0x7fffffff });
  }
}
