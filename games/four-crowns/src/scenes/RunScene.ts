import Phaser from 'phaser';
import { ctx } from '../context';
import { enemySize } from '../render/textures';
import type { Battle, BattleEvent, Combatant } from '../sim/battle';
import { botBattleTick, botPlan, botReward } from '../sim/bot';
import { Run } from '../sim/run';
import { C, L, colX, hex, rowY, textStyle } from '../theme';
import type { SummaryData } from './SummaryScene';
import { button } from './ui';

const SPEEDS = [1, 2, 4] as const;
const SKILL_KEYS = ['Q', 'W', 'E'] as const;

interface RunInit {
  factionId: string;
  seed: number;
}

/** Plan → Battle → Reward loop for one run. All rules live in sim/; this scene renders and routes input. */
export class RunScene extends Phaser.Scene {
  private run!: Run;
  private battle: Battle | null = null;
  private selected: number | null = null;
  private pendingSkill: string | null = null;
  private acc = 0;
  private paused = false;
  private botAuto = false;
  private ending = false;
  private lastSfx: Record<string, number> = {};
  private hookTimer = 0;

  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private fx!: Phaser.GameObjects.Graphics;
  private tileRects: Phaser.GameObjects.Rectangle[] = [];
  private gridLayer!: Phaser.GameObjects.Container;
  private handLayer!: Phaser.GameObjects.Container;
  private skillLayer!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private info!: Phaser.GameObjects.Text;
  private infoTitle!: Phaser.GameObjects.Text;
  private toastText!: Phaser.GameObjects.Text;
  private hud!: Record<'round' | 'crown' | 'actions' | 'primary' | 'kills' | 'hand', Phaser.GameObjects.Text>;
  private speedBtn!: ReturnType<typeof button>;
  private battleBtn!: ReturnType<typeof button>;
  private crownImg!: Phaser.GameObjects.Image;
  private bossLabel!: Phaser.GameObjects.Text;
  private skillLabels: { id: string; text: Phaser.GameObjects.Text; bg: Phaser.GameObjects.Rectangle }[] = [];

  constructor() {
    super('Run');
  }

  init(data: RunInit): void {
    this.run = new Run(data.factionId, data.seed);
    this.battle = null;
    this.selected = null;
    this.pendingSkill = null;
    this.acc = 0;
    this.paused = false;
    this.botAuto = false;
    this.ending = false;
    this.sprites = new Map();
    this.tileRects = [];
    this.overlay = null;
    this.skillLabels = [];
  }

  private get faction() {
    return this.run.content.faction;
  }

  // ------------------------------------------------------------------ setup

  create(): void {
    this.drawStatic();
    this.buildHud();
    this.gridLayer = this.add.container(0, 0);
    this.handLayer = this.add.container(0, 0);
    this.skillLayer = this.add.container(0, 0);
    this.fx = this.add.graphics().setDepth(5);
    this.bossLabel = this.add.text(L.fieldX + L.fieldW / 2 - 210, L.gridY + 3 * L.tile + 2 * L.gap + 30, '', textStyle(15, C.shardGlow, true)).setDepth(5);
    this.toastText = this.add.text(L.width / 2, L.handY - 22, '', textStyle(18, C.gold, true)).setOrigin(0.5).setDepth(20);

    this.battleBtn = button(this, L.width - L.margin - 90, L.handY + L.cardH / 2 + 4, 170, 64, 'Battle!  [Space]', () => this.startBattle(), {
      fill: this.faction.color,
      size: 18,
    });
    this.battleBtn.text.setColor(hex(C.ink));

    this.bindKeys();
    this.installHook();
    this.enterPlan();
  }

  private drawStatic(): void {
    const g = this.add.graphics();
    // Battlefield lanes aligned with grid rows.
    for (let r = 0; r < this.run.balance.gridSize; r++) {
      g.fillStyle(r % 2 === 0 ? C.sky2 : C.laneAlt, 1);
      g.fillRoundedRect(L.fieldX, rowY(r) - L.tile / 2, L.fieldW, L.tile, 8);
      const zone = this.add.zone(L.fieldX + L.fieldW / 2, rowY(r), L.fieldW, L.tile).setInteractive();
      zone.on('pointerdown', () => this.onLaneClick(r));
    }
    // Rift on the right, wall on the left.
    g.fillStyle(C.shard, 0.25);
    g.fillRect(L.fieldX + L.fieldW - 10, L.gridY, 10, 3 * L.tile + 2 * L.gap);
    g.fillStyle(C.crown, 0.35);
    g.fillRect(L.fieldX, L.gridY, 4, 3 * L.tile + 2 * L.gap);

    // Grid tiles.
    for (let t = 0; t < this.run.state.grid.length; t++) {
      const x = colX(t % this.run.balance.gridSize);
      const y = rowY(Math.floor(t / this.run.balance.gridSize));
      const rect = this.add.rectangle(x, y, L.tile, L.tile, C.island).setStrokeStyle(3, C.islandEdge);
      if (t !== this.run.balance.crownTile) {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerdown', (p: Phaser.Input.Pointer) => (p.rightButtonDown() ? this.cancel() : this.onTileClick(t)));
        rect.on('pointerover', () => this.showTileInfo(t));
      }
      this.tileRects.push(rect);
    }
    const crownTile = this.run.balance.crownTile;
    this.crownImg = this.add.image(colX(crownTile % 3), rowY(Math.floor(crownTile / 3)), 'crown');

    // Info panel (plan phase).
    this.add.rectangle(L.fieldX + L.fieldW / 2, L.topBar + 54, L.fieldW, 92, C.sky2, 0.9).setStrokeStyle(2, C.islandEdge);
    this.infoTitle = this.add.text(L.fieldX + 16, L.topBar + 14, '', textStyle(20, C.text, true));
    this.info = this.add.text(L.fieldX + 16, L.topBar + 42, '', { ...textStyle(16, C.textDim), wordWrap: { width: L.fieldW - 32 } });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) this.cancel();
    });
  }

  private buildHud(): void {
    this.add.rectangle(L.width / 2, L.topBar / 2, L.width, L.topBar, C.ink, 0.6);
    const y = L.topBar / 2;
    const item = (x: number, icon: string | null, color: number): Phaser.GameObjects.Text => {
      if (icon) this.add.image(x, y, icon);
      return this.add.text(x + (icon ? 16 : 0), y, '', textStyle(18, color, true)).setOrigin(0, 0.5);
    };
    this.hud = {
      round: item(L.margin, null, C.text),
      crown: item(220, 'icon:heart', C.text),
      actions: item(340, 'icon:action', C.text),
      primary: item(460, 'icon:ember', C.burn),
      kills: item(600, null, C.textDim),
      hand: item(L.margin, null, C.textDim),
    };
    this.hud.hand.setPosition(L.gridX, L.handY + 30).setFontSize(15);
    this.speedBtn = button(this, L.width - 150, y, 70, 34, `x${ctx.settings.speed}`, () => this.cycleSpeed(), { size: 16 });
    button(this, L.width - 60, y, 70, 34, 'Menu', () => this.togglePause(), { size: 16 });
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.ending) return;
      if (e.code === 'Escape') {
        if (this.selected !== null || this.pendingSkill) this.cancel();
        else this.togglePause();
        return;
      }
      if (this.paused) return;
      const phase = this.run.state.phase;
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (digit && phase === 'plan') this.selectCard(Number(digit[1]) - 1);
      else if (digit && phase === 'reward') this.pickReward(Number(digit[1]) - 1);
      else if (e.code === 'KeyS' && phase === 'reward') this.pickReward(null);
      else if (e.code === 'Space' && phase === 'plan') this.startBattle();
      else if (e.code === 'KeyF') this.cycleSpeed();
      else if (e.code === 'KeyM') {
        ctx.settings.muted = ctx.audio.toggleMute();
        ctx.saveSettings();
        this.toast(ctx.settings.muted ? 'Sound off' : 'Sound on');
      } else if (phase === 'battle') {
        const idx = SKILL_KEYS.indexOf(e.key.toUpperCase() as (typeof SKILL_KEYS)[number]);
        const skill = this.learnedSkills()[idx];
        if (idx >= 0 && skill) this.onSkillButton(skill);
      }
    });
  }

  // ------------------------------------------------------------------ plan phase

  private enterPlan(): void {
    this.selected = null;
    this.skillLayer.removeAll(true);
    this.skillLabels = [];
    this.battleBtn.bg.setVisible(true);
    this.battleBtn.text.setVisible(true);
    this.rebuildGrid();
    this.rebuildHand();
    this.showWaveInfo();
    this.refreshHud();
    ctx.hook.scene = 'Run';
    ctx.progress();
  }

  private showWaveInfo(): void {
    const w = this.run.content.wave(this.run.state.round);
    const parts = w.groups.map((g) => `${g.count}× ${this.run.content.enemy(g.enemy).name}`);
    const boss = w.groups.some((g) => this.run.content.enemy(g.enemy).boss);
    this.infoTitle.setText(`Round ${this.run.state.round}: ${boss ? 'BOSS ' : ''}incoming`).setColor(hex(boss ? C.danger : C.text));
    this.info.setText(
      `${parts.join(', ')}.\nEach card costs 1 action (you get ${this.run.actionsPerTurn()} per turn). Click a card, then a tile; same building on itself = upgrade. Your hand carries over.`,
    );
  }

  private rebuildGrid(): void {
    this.gridLayer.removeAll(true);
    const sel = this.selected === null ? undefined : this.run.state.hand[this.selected];
    this.run.state.grid.forEach((b, t) => {
      const rect = this.tileRects[t];
      if (!rect) return;
      const valid = sel !== undefined && this.selected !== null && this.run.canPlay(this.selected, t).ok;
      rect.setStrokeStyle(3, valid ? C.gold : C.islandEdge).setFillStyle(valid ? C.islandEdge : C.island);
      if (!b) return;
      const x = rect.x;
      const y = rect.y;
      this.gridLayer.add(this.add.image(x, y - 8, `bld:${b.buildingId}`));
      for (let i = 0; i <= 2; i++) {
        const filled = i <= b.tier;
        const pip = this.add.circle(x - 14 + i * 14, y + 36, 5, filled ? C.gold : C.ink).setStrokeStyle(2, C.ink);
        this.gridLayer.add(pip);
      }
      if (b.attackSpeedStacks > 0 || b.damageBonus > 0) {
        const tag = `${b.attackSpeedStacks > 0 ? `»${b.attackSpeedStacks}` : ''}${b.damageBonus > 0 ? ` +${b.damageBonus}` : ''}`;
        this.gridLayer.add(this.add.text(x + 44, y - 44, tag.trim(), textStyle(14, C.burn, true)).setOrigin(1, 0));
      }
    });
  }

  private rebuildHand(): void {
    this.handLayer.removeAll(true);
    const { hand, actions } = this.run.state;
    const startX = 420;
    hand.forEach((cardId, i) => {
      const card = this.run.content.card(cardId);
      const x = startX + i * (L.cardW + 14) + L.cardW / 2;
      const y = L.handY + L.cardH / 2 + 4;
      const selected = this.selected === i;
      const typeColor = card.type === 'building' ? this.faction.color : card.type === 'edict' ? C.gold : C.burn;
      const bg = this.add
        .rectangle(x, selected ? y - 12 : y, L.cardW, L.cardH, C.sky2)
        .setStrokeStyle(selected ? 4 : 3, selected ? C.text : typeColor)
        .setInteractive({ useHandCursor: true });
      const cy = bg.y;
      const items: Phaser.GameObjects.GameObject[] = [bg];
      const iconKey = card.type === 'building' ? `bld:${card.ref}` : card.type === 'skill' ? 'icon:ember' : 'icon:edict';
      items.push(this.add.image(x, cy - 22, iconKey).setScale(card.type === 'building' ? 0.7 : 1.6));
      items.push(
        this.add.text(x, cy + 22, this.run.content.cardName(cardId), { ...textStyle(15, C.text, true), align: 'center', wordWrap: { width: L.cardW - 12 } }).setOrigin(0.5),
      );
      const typeLabel = card.type === 'skill' ? 'Decree' : card.type === 'edict' ? 'Edict' : 'Building';
      items.push(this.add.text(x, cy + 48, typeLabel, textStyle(13, C.textDim)).setOrigin(0.5));
      items.push(this.add.image(x + L.cardW / 2 - 30, cy - L.cardH / 2 + 18, 'icon:action'));
      items.push(this.add.text(x + L.cardW / 2 - 12, cy - L.cardH / 2 + 18, `${card.actionCost}`, textStyle(16, C.text, true)).setOrigin(0.5));
      items.push(this.add.text(x - L.cardW / 2 + 8, cy - L.cardH / 2 + 6, `${i + 1}`, textStyle(13, C.textDim)));
      const affordable = card.actionCost <= actions && this.anyValidTarget(i);
      for (const it of items) (it as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(affordable ? 1 : 0.45);
      bg.on('pointerover', () => this.showCardInfo(cardId));
      bg.on('pointerdown', (p: Phaser.Input.Pointer) => (p.rightButtonDown() ? this.cancel() : this.selectCard(i)));
      this.handLayer.add(items);
    });
    const s = this.run.state;
    this.hud.hand.setText(`Hand: ${s.hand.length} card${s.hand.length === 1 ? '' : 's'}`);
  }

  private anyValidTarget(handIndex: number): boolean {
    const cardId = this.run.state.hand[handIndex];
    if (cardId === undefined) return false;
    if (!this.run.needsTarget(cardId)) return this.run.canPlay(handIndex).ok;
    return this.run.state.grid.some((_, t) => this.run.canPlay(handIndex, t).ok);
  }

  private showCardInfo(cardId: string): void {
    const card = this.run.content.card(cardId);
    this.infoTitle.setText(`${this.run.content.cardName(cardId)}  ·  ${card.actionCost} action`).setColor(hex(C.text));
    let extra = '';
    if (card.type === 'building') {
      const b = this.run.content.building(card.ref);
      if (b.unitGeneration) {
        const u = this.run.content.unit(b.unitGeneration);
        const t = u.upgradePaths.map((p) => `${p.health}hp/${p.attackDamage}dmg`).join(' → ');
        extra = `  ${u.name} (${u.unitType}): ${t}. ${u.specialAbility ? `${u.specialAbility.name}: ${u.specialAbility.description}` : ''}`;
      }
      extra += b.synergies.length ? `\nSynergy: ${b.synergies.join(' ')}` : '';
    } else if (card.type === 'skill') {
      const sk = this.run.content.skill(card.ref);
      const lvl = this.run.state.skills[sk.id];
      extra = `  Cast in battle for ${sk.resourceCost} ${this.faction.primaryResource.name}, cooldown ${sk.cooldown}s.${lvl !== undefined ? ` Known: level ${lvl + 1}/3.` : ''}`;
    }
    this.info.setText(`${this.run.content.cardDescription(cardId)}${extra}`);
  }

  private showTileInfo(t: number): void {
    if (this.run.state.phase !== 'plan') return;
    const b = this.run.state.grid[t];
    if (!b) return;
    const def = this.run.content.building(b.buildingId);
    this.infoTitle.setText(`${def.name}  ·  tier ${b.tier + 1}/3`).setColor(hex(C.text));
    const lane = ['top', 'middle', 'bottom'][this.run.laneOf(t)] ?? '';
    this.info.setText(`${def.description} Defends the ${lane} lane.${b.attackSpeedStacks ? ` Stoked ×${b.attackSpeedStacks}.` : ''}${b.damageBonus ? ` +${b.damageBonus} damage.` : ''}`);
  }

  private selectCard(i: number): void {
    if (this.run.state.phase !== 'plan' || this.paused) return;
    const cardId = this.run.state.hand[i];
    if (cardId === undefined) return;
    this.showCardInfo(cardId);
    if (!this.run.needsTarget(cardId)) {
      this.play(i, undefined);
      return;
    }
    if (!this.anyValidTarget(i)) {
      const r = this.run.canPlay(i, 0);
      this.toast(this.run.content.card(cardId).actionCost > this.run.state.actions ? 'No actions left: press Battle' : r.ok ? 'No valid tile' : r.reason);
      ctx.audio.play('invalid');
      return;
    }
    this.selected = this.selected === i ? null : i;
    ctx.audio.play('select');
    this.rebuildGrid();
    this.rebuildHand();
  }

  private onTileClick(t: number): void {
    if (this.run.state.phase !== 'plan' || this.paused) return;
    if (this.selected === null) {
      this.showTileInfo(t);
      return;
    }
    this.play(this.selected, t);
  }

  private play(handIndex: number, tile: number | undefined): boolean {
    const cardId = this.run.state.hand[handIndex];
    const before = tile === undefined ? null : this.run.state.grid[tile]?.tier;
    const r = this.run.playCard(handIndex, tile);
    if (!r.ok) {
      this.toast(r.reason);
      ctx.audio.play('invalid');
      return false;
    }
    const after = tile === undefined ? null : this.run.state.grid[tile]?.tier;
    const card = cardId ? this.run.content.card(cardId) : null;
    if (card?.type === 'building') {
      ctx.audio.play(before !== null && before !== undefined ? 'upgrade' : 'place');
      if (tile !== undefined) this.bounceTile(tile);
      this.toast(before !== null && before !== undefined ? `Upgraded to tier ${(after ?? 0) + 1}` : '');
    } else if (card?.type === 'skill') {
      ctx.audio.play('upgrade');
      this.toast(`Decree learned: ${this.run.content.skill(card.ref).name} (lv ${(this.run.state.skills[card.ref] ?? 0) + 1})`);
    } else {
      ctx.audio.play('reward');
    }
    this.selected = null;
    this.rebuildGrid();
    this.rebuildHand();
    this.refreshHud();
    if (this.run.state.actions === 0) this.toast('Out of actions: press Battle!');
    ctx.progress();
    return true;
  }

  private bounceTile(t: number): void {
    const rect = this.tileRects[t];
    if (!rect) return;
    this.tweens.add({ targets: rect, scaleX: 1.08, scaleY: 0.92, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
  }

  private cancel(): void {
    this.selected = null;
    this.pendingSkill = null;
    if (this.run.state.phase === 'plan') {
      this.rebuildGrid();
      this.rebuildHand();
    }
    this.toast('');
  }

  // ------------------------------------------------------------------ battle phase

  private startBattle(): void {
    if (this.run.state.phase !== 'plan' || this.paused || this.ending) return;
    this.selected = null;
    this.battle = this.run.startBattle();
    this.acc = 0;
    this.handLayer.removeAll(true);
    this.battleBtn.bg.setVisible(false);
    this.battleBtn.text.setVisible(false);
    this.rebuildGrid();
    this.buildSkillBar();
    this.infoTitle.setText(`Round ${this.run.state.round}: battle!`).setColor(hex(C.text));
    const laneSkill = this.learnedSkills().find((id) => this.run.content.skill(id).areaOfEffect === 'lane');
    this.info.setText(
      this.learnedSkills().length
        ? `Cast decrees with the buttons below or Q/W/E.${laneSkill ? ` ${this.run.content.skill(laneSkill).name}: click it, then click a lane.` : ''}`
        : 'Your buildings fight on their own. Learn decrees to join in.',
    );
    ctx.audio.play('horn');
    ctx.progress();
  }

  private learnedSkills(): string[] {
    return Object.keys(this.run.state.skills);
  }

  private buildSkillBar(): void {
    this.skillLayer.removeAll(true);
    this.skillLabels = [];
    this.learnedSkills().forEach((id, i) => {
      const x = 420 + i * 230 + 105;
      const y = L.handY + L.cardH / 2 + 4;
      const bg = this.add.rectangle(x, y, 210, 76, C.sky2).setStrokeStyle(3, C.burn).setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.onSkillButton(id));
      const text = this.add.text(x, y, '', { ...textStyle(16, C.text, true), align: 'center' }).setOrigin(0.5);
      this.skillLayer.add([bg, text]);
      this.skillLabels.push({ id, text, bg });
    });
    if (this.skillLabels.length === 0) {
      this.skillLayer.add(this.add.text(420, L.handY + 50, 'No decrees learned yet.', textStyle(16, C.textDim)));
    }
  }

  private onSkillButton(id: string): void {
    const b = this.battle;
    if (!b || this.paused) return;
    const check = b.canCast(id);
    if (!check.ok) {
      this.toast(check.reason);
      ctx.audio.play('invalid');
      return;
    }
    if (this.run.content.skill(id).areaOfEffect === 'lane') {
      this.pendingSkill = id;
      this.toast('Click a lane to target');
      return;
    }
    this.cast(id, null);
  }

  private onLaneClick(lane: number): void {
    if (!this.pendingSkill || !this.battle) return;
    const id = this.pendingSkill;
    this.pendingSkill = null;
    this.cast(id, lane);
  }

  private cast(id: string, lane: number | null): boolean {
    const b = this.battle;
    if (!b) return false;
    const r = b.cast(id, lane);
    if (!r.ok) {
      this.toast(r.reason);
      return false;
    }
    this.toast('');
    this.processEvents();
    return true;
  }

  private cycleSpeed(): void {
    const i = SPEEDS.indexOf(ctx.settings.speed as (typeof SPEEDS)[number]);
    this.setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  }

  private setSpeed(n: number): void {
    ctx.settings.speed = n;
    ctx.saveSettings();
    this.speedBtn.text.setText(`x${n}`);
  }

  update(_time: number, delta: number): void {
    const b = this.battle;
    if (b && !this.paused) {
      this.acc += Math.min(delta, 100) * ctx.settings.speed;
      const tick = this.run.balance.tickMs;
      let steps = 0;
      while (this.acc >= tick && steps < 40 && !b.over) {
        if (this.botAuto) botBattleTick(b);
        b.step();
        this.processEvents();
        this.acc -= tick;
        steps++;
      }
      this.renderBattle(b);
      this.updateSkillBar(b);
      if (b.over) this.endBattle();
    }
    this.hookTimer += delta;
    if (this.hookTimer > 200) {
      this.hookTimer = 0;
      this.publishState();
    }
  }

  private sfx(name: string, minGapMs: number): void {
    const now = this.time.now;
    if (now - (this.lastSfx[name] ?? -1e9) < minGapMs) return;
    this.lastSfx[name] = now;
    ctx.audio.play(name);
  }

  private processEvents(): void {
    const b = this.battle;
    if (!b) return;
    const byId = (id: number): Combatant | undefined => b.combatants.find((c) => c.id === id);
    for (const e of b.events) this.handleEvent(e, byId);
    b.events = [];
  }

  private handleEvent(e: BattleEvent, byId: (id: number) => Combatant | undefined): void {
    switch (e.type) {
      case 'spawn': {
        const c = byId(e.id);
        if (!c) return;
        const key = c.side === 'ally' ? `unit:${c.defId}` : `enemy:${c.defId}`;
        const img = this.add.image(this.sx(c.x), this.sy(c), key).setDepth(c.boss ? 3 : 2);
        img.setScale(0.4);
        this.tweens.add({ targets: img, scale: 1, duration: 150, ease: 'Back.easeOut' });
        this.sprites.set(c.id, img);
        if (c.side === 'ally') this.sfx('spawn', 120);
        ctx.progress();
        break;
      }
      case 'hit': {
        const a = byId(e.attacker);
        const t = byId(e.target);
        const timg = this.sprites.get(e.target);
        if (timg) {
          timg.setTintFill(0xffffff);
          this.time.delayedCall(60, () => timg.active && timg.clearTint());
        }
        if (e.ranged && a && t && this.children.length < 600) {
          const dot = this.add.image(this.sx(a.x), this.sy(a), 'dot').setTint(a.side === 'ally' ? C.burn : C.shardGlow).setDepth(4);
          this.tweens.add({ targets: dot, x: this.sx(t.x), y: this.sy(t), duration: 120 / ctx.settings.speed, onComplete: () => dot.destroy() });
          this.sfx('arrow', 90);
        } else {
          this.sfx('hit', 70);
        }
        break;
      }
      case 'death': {
        const img = this.sprites.get(e.id);
        this.sprites.delete(e.id);
        if (img) this.tweens.add({ targets: img, alpha: 0, scale: 0.3, duration: 200, onComplete: () => img.destroy() });
        this.sfx(e.side === 'ally' ? 'death' : 'enemyDeath', 60);
        ctx.progress();
        break;
      }
      case 'siege': {
        const img = this.sprites.get(e.id);
        this.sprites.delete(e.id);
        img?.destroy();
        this.cameras.main.shake(200, 0.004);
        this.crownImg.setTint(C.danger);
        this.time.delayedCall(150, () => this.crownImg.clearTint());
        this.sfx('crownHit', 120);
        this.refreshHud();
        ctx.progress();
        break;
      }
      case 'cast': {
        if (e.lane !== null) {
          const flash = this.add.rectangle(L.fieldX + L.fieldW / 2, rowY(e.lane), L.fieldW, L.tile, C.ember, 0.55).setDepth(6);
          this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
        } else {
          const flash = this.add.rectangle(L.fieldX + L.fieldW / 2, rowY(1), L.fieldW, 3 * L.tile + 2 * L.gap, C.burn, 0.25).setDepth(6);
          this.tweens.add({ targets: flash, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
        }
        ctx.audio.play(e.skillId === 'firestorm' ? 'firestorm' : e.skillId === 'war-drums' ? 'drums' : 'rebirth');
        ctx.progress();
        break;
      }
      case 'slam': {
        const c = byId(e.id);
        if (!c) return;
        const ring = this.add.circle(this.sx(c.x), rowY(c.lane), 10).setStrokeStyle(4, C.shardGlow).setDepth(6);
        this.tweens.add({ targets: ring, radius: 70, alpha: 0, duration: 350, onComplete: () => ring.destroy() });
        this.cameras.main.shake(200, 0.005);
        this.sfx('slam', 200);
        break;
      }
      case 'resource':
        this.refreshHud();
        break;
    }
  }

  private sx(x: number): number {
    return L.fieldX + 10 + (x / this.run.balance.laneLength) * (L.fieldW - 20);
  }

  private sy(c: Combatant): number {
    if (c.boss) return rowY(c.lane);
    return rowY(c.lane) + (((c.id * 37) % 56) - 28);
  }

  private renderBattle(b: Battle): void {
    const g = this.fx;
    g.clear();
    let boss: Combatant | null = null;
    for (const c of b.combatants) {
      if (!c.alive) continue;
      const img = this.sprites.get(c.id);
      if (!img) continue;
      const x = this.sx(c.x);
      const y = this.sy(c);
      img.setPosition(x, y);
      if (c.boss) {
        boss = c;
        continue;
      }
      const size = c.side === 'ally' ? img.width : enemySize(c.defId);
      if (c.hp < c.maxHp) {
        const w = Math.max(16, size);
        g.fillStyle(C.ink, 1);
        g.fillRect(x - w / 2, y - size / 2 - 7, w, 4);
        g.fillStyle(c.side === 'ally' ? this.faction.color : C.shardGlow, 1);
        g.fillRect(x - w / 2, y - size / 2 - 7, w * Math.max(0, c.hp / c.maxHp), 4);
      }
      if (c.burnLeft > 0) {
        g.fillStyle(C.burn, 0.9);
        g.fillCircle(x + size / 2 - 2, y - size / 2 + 2, 3);
      }
    }
    this.bossLabel.setText(boss ? `${this.run.content.enemy(boss.defId).name}  ${Math.ceil(Math.max(0, boss.hp))} / ${boss.maxHp}` : '');
    if (boss) {
      const w = 420;
      const x = L.fieldX + L.fieldW / 2 - w / 2;
      const y = L.gridY + 3 * L.tile + 2 * L.gap + 12;
      g.fillStyle(C.ink, 1);
      g.fillRect(x - 2, y - 2, w + 4, 16);
      g.fillStyle(C.shard, 1);
      g.fillRect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 12);
      if (boss.burnLeft > 0) {
        g.fillStyle(C.burn, 1);
        g.fillCircle(x + w + 12, y + 6, 5);
      }
    }
    this.hud.kills.setText(`Time ${Math.floor(b.time)}s / ${this.run.balance.battleTimeCap}s · Enemies ${b.enemiesAlive().length + b.pendingSpawns}`);
    this.hud.primary.setText(`${Math.floor(b.primary)} ${this.faction.primaryResource.name}`);
    this.hud.crown.setText(`${Math.max(0, this.run.state.crownHp - b.crownDamage)}`);
  }

  private updateSkillBar(b: Battle): void {
    SKILL_KEYS.forEach((key, i) => {
      const s = this.skillLabels[i];
      if (!s) return;
      const def = this.run.content.skill(s.id);
      const lvl = (this.run.state.skills[s.id] ?? 0) + 1;
      const cd = b.cooldowns[s.id] ?? 0;
      const ok = b.canCast(s.id).ok;
      s.text.setText(`[${key}] ${def.name} lv${lvl}\n${def.resourceCost} ${this.faction.primaryResource.name}${cd > 0 ? ` · ${cd.toFixed(1)}s` : ''}`);
      s.bg.setAlpha(ok ? 1 : 0.5).setStrokeStyle(3, this.pendingSkill === s.id ? C.text : C.burn);
    });
  }

  private endBattle(): void {
    const b = this.battle;
    if (!b) return;
    this.battle = null;
    this.pendingSkill = null;
    this.run.finishBattle(b.result());
    for (const img of this.sprites.values()) this.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() });
    this.sprites.clear();
    this.fx.clear();
    this.bossLabel.setText('');
    this.skillLayer.removeAll(true);
    this.skillLabels = [];
    this.refreshHud();
    ctx.progress();
    const phase = this.run.state.phase;
    if (phase === 'won' || phase === 'lost') this.finishRun();
    else if (phase === 'reward') this.showReward(b);
  }

  // ------------------------------------------------------------------ reward

  private showReward(b: Battle): void {
    const r = b.result();
    this.infoTitle.setText('');
    this.info.setText('');
    const c = this.add.container(0, 0).setDepth(30);
    c.add(this.add.rectangle(L.width / 2, L.height / 2, L.width, L.height, C.ink, 0.92).setInteractive());
    c.add(this.add.text(L.width / 2, 110, `Round ${this.run.state.round} cleared`, textStyle(36, C.text, true)).setOrigin(0.5));
    c.add(
      this.add
        .text(L.width / 2, 156, `${r.kills} Shardborn destroyed · Crown took ${r.crownDamage} damage · Choose a card to add to your hand`, textStyle(18, C.textDim))
        .setOrigin(0.5),
    );
    this.run.state.rewardOptions.forEach((cardId, i) => {
      const card = this.run.content.card(cardId);
      const x = L.width / 2 + (i - 1) * 260;
      const y = 370;
      const color = card.type === 'building' ? this.faction.color : card.type === 'edict' ? C.gold : C.burn;
      const bg = this.add.rectangle(x, y, 230, 290, C.sky2).setStrokeStyle(3, color).setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setStrokeStyle(4, C.text));
      bg.on('pointerout', () => bg.setStrokeStyle(3, color));
      bg.on('pointerdown', () => this.pickReward(i));
      const iconKey = card.type === 'building' ? `bld:${card.ref}` : card.type === 'skill' ? 'icon:ember' : 'icon:edict';
      c.add([
        bg,
        this.add.image(x, y - 90, iconKey).setScale(card.type === 'building' ? 1 : 2.2),
        this.add.text(x, y - 30, this.run.content.cardName(cardId), textStyle(20, C.text, true)).setOrigin(0.5),
        this.add.text(x, y - 4, `${card.type === 'skill' ? 'Decree' : card.type === 'edict' ? 'Edict' : 'Building'} · ${card.actionCost} action`, textStyle(14, C.textDim)).setOrigin(0.5),
        this.add
          .text(x, y + 14, this.run.content.cardDescription(cardId), { ...textStyle(14, C.textDim), align: 'center', wordWrap: { width: 200 } })
          .setOrigin(0.5, 0),
        this.add.text(x - 104, y - 136, `${i + 1}`, textStyle(14, C.textDim)),
      ]);
    });
    const skip = button(this, L.width / 2, 580, 340, 50, `Skip: +${this.run.balance.rewardSkipActions} action next turn  [S]`, () => this.pickReward(null));
    c.add([skip.bg, skip.text]);
    this.overlay = c;
    ctx.audio.play('reward');
  }

  private pickReward(i: number | null): void {
    if (this.run.state.phase !== 'reward') return;
    if (i !== null && this.run.state.rewardOptions[i] === undefined) return;
    this.run.chooseReward(i);
    this.overlay?.destroy(true);
    this.overlay = null;
    ctx.audio.play('select');
    this.enterPlan();
  }

  // ------------------------------------------------------------------ pause & end

  private togglePause(): void {
    if (this.ending || this.run.state.phase === 'reward') return;
    if (this.paused) {
      this.paused = false;
      this.overlay?.destroy(true);
      this.overlay = null;
      ctx.hook.state['overlay'] = null;
      return;
    }
    this.paused = true;
    const c = this.add.container(0, 0).setDepth(40);
    c.add(this.add.rectangle(L.width / 2, L.height / 2, L.width, L.height, C.ink, 0.88).setInteractive());
    c.add(this.add.text(L.width / 2, 210, 'Paused', textStyle(48, C.text, true)).setOrigin(0.5));
    const items: [string, () => void][] = [
      ['Resume  [Esc]', () => this.togglePause()],
      [`Sound: ${ctx.settings.muted ? 'Off' : 'On'}  [M]`, () => {
        ctx.settings.muted = ctx.audio.toggleMute();
        ctx.saveSettings();
        this.togglePause();
        this.togglePause();
      }],
      [`Speed: x${ctx.settings.speed}  [F]`, () => {
        this.cycleSpeed();
        this.togglePause();
        this.togglePause();
      }],
      ['Abandon run', () => this.scene.start('Title')],
    ];
    items.forEach(([label, fn], i) => {
      const b = button(this, L.width / 2, 300 + i * 66, 300, 52, label, fn);
      c.add([b.bg, b.text]);
    });
    this.overlay = c;
    ctx.hook.state['overlay'] = 'pause';
    ctx.progress();
  }

  private finishRun(): void {
    this.ending = true;
    const s = this.run.state;
    const data: SummaryData = {
      won: s.phase === 'won',
      score: this.run.score(),
      round: s.round,
      rounds: this.run.balance.rounds,
      crownHp: s.crownHp,
      kills: s.kills,
      factionId: this.faction.id,
      factionName: this.faction.name,
    };
    this.publishState();
    this.time.delayedCall(900, () => this.scene.start('Summary', data));
  }

  // ------------------------------------------------------------------ HUD, toast, hook

  private refreshHud(): void {
    const s = this.run.state;
    this.hud.round.setText(`Round ${s.round} / ${this.run.balance.rounds}`);
    this.hud.crown.setText(`${s.crownHp}`);
    this.hud.actions.setText(`${s.actions} action${s.actions === 1 ? '' : 's'}`);
    this.hud.primary.setText(`${Math.floor(s.primary)} ${this.faction.primaryResource.name}`);
    this.hud.kills.setText(`Kills ${s.kills}`);
  }

  private toast(msg: string): void {
    this.toastText.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    if (msg) this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1400, duration: 400 });
  }

  private publishState(): void {
    const s = this.run.state;
    const b = this.battle;
    ctx.hook.state = {
      ...ctx.hook.state,
      phase: s.phase,
      seed: s.seed,
      round: s.round,
      crownHp: b ? s.crownHp - b.crownDamage : s.crownHp,
      actions: s.actions,
      primary: b ? b.primary : s.primary,
      kills: s.kills,
      hand: s.hand.map((id) => this.run.content.cardName(id)),
      grid: s.grid.map((x) => (x ? `${x.buildingId}@${x.tier + 1}` : null)),
      skills: { ...s.skills },
      rewardOptions: [...s.rewardOptions],
      battle: b ? { time: Math.round(b.time), enemies: b.enemiesAlive().length, allies: b.alliesAlive().length, pending: b.pendingSpawns } : null,
      speed: ctx.settings.speed,
      score: this.run.score(),
      overlay: this.paused ? 'pause' : s.phase === 'reward' ? 'reward' : null,
    };
  }

  private installHook(): void {
    ctx.hook.scene = 'Run';
    ctx.hook.actions = {
      botPlan: () => {
        const n = botPlan(this.run);
        this.rebuildGrid();
        this.rebuildHand();
        this.refreshHud();
        ctx.progress();
        return n;
      },
      startBattle: () => this.startBattle(),
      setBotAuto: (on: boolean) => {
        this.botAuto = on;
      },
      setSpeed: (n: number) => this.setSpeed(n),
      botReward: () => {
        if (this.run.state.phase !== 'reward') return false;
        botReward(this.run);
        // botReward already advanced the run; mirror the UI side of pickReward.
        this.overlay?.destroy(true);
        this.overlay = null;
        this.enterPlan();
        return true;
      },
      pickReward: (i: number | null) => this.pickReward(i),
      selectCard: (i: number) => this.selectCard(i),
      clickTile: (t: number) => this.onTileClick(t),
      cast: (id: string, lane: number | null) => this.cast(id, lane),
      togglePause: () => this.togglePause(),
    } as typeof ctx.hook.actions;
    this.publishState();
  }
}
