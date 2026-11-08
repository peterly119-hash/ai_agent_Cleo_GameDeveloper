import type { Effect, TierIndex, WaveDef } from '../data/schema';
import type { Run } from './run';

export type Side = 'ally' | 'enemy';

export interface Combatant {
  id: number;
  side: Side;
  defId: string;
  lane: number;
  x: number;
  hp: number;
  maxHp: number;
  damage: number;
  /** Base attacks per second (before timed buffs). */
  attackSpeed: number;
  move: number;
  range: number;
  cooldown: number;
  /** Burn this combatant applies on hit (0 = none). */
  hitBurnDps: number;
  splash: { radius: number; fraction: number } | null;
  selfDps: number;
  deathBurst: { radius: number; burnDps: number } | null;
  burnDps: number;
  burnLeft: number;
  siege: number;
  slam: { interval: number; radius: number; damage: number; timer: number } | null;
  tier: TierIndex;
  boss: boolean;
  alive: boolean;
}

export type BattleEvent =
  | { type: 'spawn'; id: number; side: Side }
  | { type: 'hit'; attacker: number; target: number; ranged: boolean }
  | { type: 'death'; id: number; side: Side; x: number; lane: number }
  | { type: 'siege'; id: number; damage: number }
  | { type: 'cast'; skillId: string; lane: number | null }
  | { type: 'slam'; id: number }
  | { type: 'resource'; amount: number };

export interface BattleResult {
  cleared: boolean;
  crownDamage: number;
  kills: number;
  primary: number;
  time: number;
}

type Template = Omit<Combatant, 'id' | 'x' | 'hp' | 'cooldown' | 'burnDps' | 'burnLeft' | 'alive'>;

interface Producer {
  tile: number;
  timer: number;
  interval: number;
  maxAlive: number;
  template: Template;
  alive: Set<number>;
}

export type CastResult = { ok: true } | { ok: false; reason: string };

/** Lane-based auto-battle on a fixed tick (GDD §4.3). Pure TS, deterministic. */
export class Battle {
  readonly combatants: Combatant[] = [];
  events: BattleEvent[] = [];
  time = 0;
  crownDamage = 0;
  kills = 0;
  primary: number;
  over = false;
  cleared = false;
  readonly cooldowns: Record<string, number> = {};
  private nextId = 1;
  private readonly producers: Producer[] = [];
  private readonly spawnQueue: { time: number; enemyId: string; lane: number }[] = [];
  private readonly fallen: { template: Template; lane: number }[] = [];
  private buffPct = 0;
  private buffLeft = 0;
  private readonly burnKillGain: number;
  private readonly dt: number;
  readonly lanes: number;

  constructor(private readonly run: Run, wave: WaveDef) {
    const b = run.balance;
    this.dt = b.tickMs / 1000;
    this.lanes = b.gridSize;
    this.primary = run.state.primary;
    this.burnKillGain = run.content.faction.passive.effects.reduce(
      (sum, e) => sum + (e.kind === 'resourceOnBurningKill' ? e.amount : 0),
      0,
    );
    for (const id of Object.keys(run.state.skills)) this.cooldowns[id] = 0;
    this.buildProducers();
    this.buildSpawnQueue(wave);
  }

  // ---------- setup ----------

  private buildProducers(): void {
    const { state, content, balance } = this.run;
    state.grid.forEach((inst, tile) => {
      if (!inst) return;
      const bdef = content.building(inst.buildingId);
      if (!bdef.unitGeneration) return;
      const udef = content.unit(bdef.unitGeneration);
      const stats = udef.upgradePaths[inst.tier];

      let burn = 0;
      let asPct = inst.attackSpeedPct;
      let dmg = inst.damageBonus;
      for (const n of this.run.adjacent(tile)) {
        const nb = state.grid[n];
        if (!nb) continue;
        for (const e of content.building(nb.buildingId).upgradePaths[nb.tier].passiveEffects) {
          if (e.kind === 'adjacentAura') {
            burn += e.burnDps ?? 0;
            asPct += e.attackSpeedPct ?? 0;
            dmg += e.damageFlat ?? 0;
          }
        }
      }

      const template: Template = {
        side: 'ally',
        defId: udef.id,
        lane: this.run.laneOf(tile),
        maxHp: stats.health,
        damage: stats.attackDamage + dmg,
        attackSpeed: stats.attackSpeed * (1 + asPct / 100),
        move: stats.movementSpeed,
        range: stats.attackRange,
        hitBurnDps: burn,
        splash: null,
        selfDps: 0,
        deathBurst: null,
        siege: 0,
        slam: null,
        tier: inst.tier,
        boss: false,
      };
      applySpecials(template, udef.specialAbility?.effects ?? []);
      // A building's own non-aura passives apply to the units it produces.
      applySpecials(template, bdef.upgradePaths[inst.tier].passiveEffects);

      this.producers.push({
        tile,
        timer: balance.firstSpawnDelay,
        interval: bdef.productionInterval ?? udef.spawnTime,
        maxAlive: bdef.upgradePaths[inst.tier].maxAlive,
        template,
        alive: new Set(),
      });
    });
  }

  private buildSpawnQueue(wave: WaveDef): void {
    const { balance, rng, content } = this.run;
    const entries: { enemyId: string; lane: number }[] = [];
    for (const g of wave.groups) {
      for (let i = 0; i < g.count; i++) {
        entries.push({ enemyId: g.enemy, lane: g.lane === 'random' ? rng.int(0, this.lanes - 1) : g.lane });
      }
    }
    const ordered = rng.shuffle(entries);
    // Bosses arrive a little after the opening.
    ordered.forEach((e, i) => {
      const boss = content.enemy(e.enemyId).boss;
      const t = boss ? balance.spawnStagger * 0.25 : (balance.spawnStagger * i) / Math.max(1, ordered.length - 1);
      this.spawnQueue.push({ time: balance.firstSpawnDelay + t, ...e });
    });
    this.spawnQueue.sort((a, b) => a.time - b.time);
  }

  // ---------- queries ----------

  get pendingSpawns(): number {
    return this.spawnQueue.length;
  }

  enemiesAlive(): Combatant[] {
    return this.combatants.filter((c) => c.alive && c.side === 'enemy');
  }

  alliesAlive(): Combatant[] {
    return this.combatants.filter((c) => c.alive && c.side === 'ally');
  }

  fallenCount(): number {
    return this.fallen.length;
  }

  skillLevel(skillId: string): TierIndex | undefined {
    return this.run.state.skills[skillId];
  }

  canCast(skillId: string): CastResult {
    if (this.over) return { ok: false, reason: 'Battle over' };
    const level = this.skillLevel(skillId);
    if (level === undefined) return { ok: false, reason: 'Decree not learned' };
    const def = this.run.content.skill(skillId);
    if ((this.cooldowns[skillId] ?? 0) > 0) return { ok: false, reason: 'On cooldown' };
    if (this.primary < def.resourceCost) return { ok: false, reason: `Need ${def.resourceCost} ${this.run.content.faction.primaryResource.name}` };
    return { ok: true };
  }

  // ---------- actions ----------

  cast(skillId: string, lane: number | null = null): CastResult {
    const check = this.canCast(skillId);
    if (!check.ok) return check;
    const def = this.run.content.skill(skillId);
    if (def.areaOfEffect === 'lane' && (lane === null || lane < 0 || lane >= this.lanes)) {
      return { ok: false, reason: 'Pick a lane' };
    }
    const level = this.skillLevel(skillId) as TierIndex;
    this.primary -= def.resourceCost;
    this.cooldowns[skillId] = def.cooldown;
    for (const e of def.upgradeLevels[level].effects) {
      if (e.kind === 'laneDamage') {
        for (const en of this.enemiesAlive()) {
          if (en.lane !== lane) continue;
          this.damage(en, e.damage);
          if (e.burnDps > 0) this.burn(en, e.burnDps);
        }
      } else if (e.kind === 'globalAttackSpeed') {
        this.buffPct = e.pct;
        this.buffLeft = def.duration;
      } else if (e.kind === 'revive') {
        const back = this.fallen.splice(Math.max(0, this.fallen.length - e.count));
        for (const f of back) {
          const c = this.spawn(f.template, f.lane, 0);
          c.hp = Math.max(1, Math.round(c.maxHp * e.hpFraction));
        }
      }
    }
    this.events.push({ type: 'cast', skillId, lane: def.areaOfEffect === 'lane' ? lane : null });
    this.resolveDeaths();
    return { ok: true };
  }

  /** Advance one fixed tick. */
  step(): void {
    if (this.over) return;
    const dt = this.dt;
    const { balance, content } = this.run;
    this.time += dt;

    while (this.spawnQueue.length > 0 && (this.spawnQueue[0]?.time ?? Infinity) <= this.time) {
      const s = this.spawnQueue.shift();
      if (!s) break;
      const def = content.enemy(s.enemyId);
      const slam = def.effects.find((e): e is Extract<Effect, { kind: 'slam' }> => e.kind === 'slam');
      this.spawn(
        {
          side: 'enemy',
          defId: def.id,
          lane: s.lane,
          maxHp: def.health,
          damage: def.attackDamage,
          attackSpeed: def.attackSpeed,
          move: def.movementSpeed,
          range: def.attackRange,
          hitBurnDps: 0,
          splash: null,
          selfDps: 0,
          deathBurst: null,
          siege: def.siege,
          slam: slam ? { interval: slam.interval, radius: slam.radius, damage: slam.damage, timer: slam.interval } : null,
          tier: 0,
          boss: def.boss,
        },
        s.lane,
        balance.laneLength,
      );
    }

    for (const p of this.producers) {
      p.timer -= dt;
      if (p.timer > 0) continue;
      for (const id of p.alive) if (!this.combatants.find((c) => c.id === id)?.alive) p.alive.delete(id);
      if (p.alive.size < p.maxAlive) p.alive.add(this.spawn(p.template, p.template.lane, 0).id);
      p.timer = p.interval;
    }

    for (const key of Object.keys(this.cooldowns)) this.cooldowns[key] = Math.max(0, (this.cooldowns[key] ?? 0) - dt);
    if (this.buffLeft > 0) {
      this.buffLeft -= dt;
      if (this.buffLeft <= 0) this.buffPct = 0;
    }

    for (const c of this.combatants) {
      if (!c.alive) continue;
      if (c.burnLeft > 0) {
        c.hp -= c.burnDps * dt;
        c.burnLeft -= dt;
        if (c.burnLeft <= 0) c.burnDps = 0;
      }
      if (c.selfDps > 0) c.hp -= c.selfDps * dt;
      if (c.slam) {
        c.slam.timer -= dt;
        if (c.slam.timer <= 0) {
          c.slam.timer = c.slam.interval;
          const radius = c.slam.radius;
          const dmg = c.slam.damage;
          for (const a of this.alliesAlive()) if (a.lane === c.lane && Math.abs(a.x - c.x) <= radius) this.damage(a, dmg);
          this.events.push({ type: 'slam', id: c.id });
        }
      }
    }

    for (const c of this.combatants) {
      if (!c.alive || c.hp <= 0) continue;
      this.act(c, dt);
    }

    this.resolveDeaths();

    for (const e of this.enemiesAlive()) {
      if (e.x <= 0) {
        e.alive = false;
        this.crownDamage += e.siege;
        this.events.push({ type: 'siege', id: e.id, damage: e.siege });
      }
    }

    const crownLeft = this.run.state.crownHp - this.crownDamage;
    if (crownLeft <= 0) {
      this.over = true;
    } else if (this.spawnQueue.length === 0 && this.enemiesAlive().length === 0) {
      this.over = true;
      this.cleared = true;
    } else if (this.time >= balance.battleTimeCap) {
      for (const e of this.enemiesAlive()) {
        e.alive = false;
        this.crownDamage += e.siege;
        this.events.push({ type: 'siege', id: e.id, damage: e.siege });
      }
      this.spawnQueue.length = 0;
      this.over = true;
    }
  }

  /** Run to completion (headless). Optional per-tick hook, e.g. a bot casting decrees. */
  runToEnd(onTick?: (b: Battle) => void, maxTicks = 100000): BattleResult {
    let ticks = 0;
    while (!this.over && ticks++ < maxTicks) {
      onTick?.(this);
      this.step();
      this.events.length = 0;
    }
    return this.result();
  }

  result(): BattleResult {
    return { cleared: this.cleared, crownDamage: this.crownDamage, kills: this.kills, primary: this.primary, time: this.time };
  }

  // ---------- internals ----------

  private spawn(t: Template, lane: number, x: number): Combatant {
    const c: Combatant = {
      ...t,
      splash: t.splash ? { ...t.splash } : null,
      deathBurst: t.deathBurst ? { ...t.deathBurst } : null,
      slam: t.slam ? { ...t.slam } : null,
      id: this.nextId++,
      lane,
      x,
      hp: t.maxHp,
      cooldown: 0,
      burnDps: 0,
      burnLeft: 0,
      alive: true,
    };
    this.combatants.push(c);
    this.events.push({ type: 'spawn', id: c.id, side: c.side });
    return c;
  }

  private act(c: Combatant, dt: number): void {
    const target = this.findTarget(c);
    const dir = c.side === 'ally' ? 1 : -1;
    c.cooldown = Math.max(0, c.cooldown - dt);
    if (target && Math.abs(target.x - c.x) <= c.range) {
      if (c.cooldown <= 0) {
        const speed = c.attackSpeed * (c.side === 'ally' ? 1 + this.buffPct / 100 : 1);
        c.cooldown = 1 / speed;
        this.hit(c, target);
      }
      return;
    }
    if (target) {
      c.x += Math.sign(target.x - c.x) * c.move * dt;
    } else if (c.side === 'ally') {
      c.x = Math.min(this.run.balance.laneLength - 20, c.x + dir * c.move * dt);
    } else {
      c.x += dir * c.move * dt;
    }
  }

  private findTarget(c: Combatant): Combatant | null {
    let best: Combatant | null = null;
    let bestDist = Infinity;
    for (const o of this.combatants) {
      if (!o.alive || o.hp <= 0 || o.side === c.side || o.lane !== c.lane) continue;
      // Allies look ahead (right), enemies look ahead (left); small overlap allowed.
      const ahead = c.side === 'ally' ? o.x >= c.x - 10 : o.x <= c.x + 10;
      if (!ahead) continue;
      const d = Math.abs(o.x - c.x);
      if (d < bestDist) {
        bestDist = d;
        best = o;
      }
    }
    return best;
  }

  private hit(attacker: Combatant, target: Combatant): void {
    this.events.push({ type: 'hit', attacker: attacker.id, target: target.id, ranged: attacker.range > 60 });
    this.damage(target, attacker.damage);
    if (attacker.hitBurnDps > 0) this.burn(target, attacker.hitBurnDps);
    if (attacker.splash) {
      for (const o of this.combatants) {
        if (o === target || !o.alive || o.side === attacker.side || o.lane !== target.lane) continue;
        if (Math.abs(o.x - target.x) > attacker.splash.radius) continue;
        this.damage(o, attacker.damage * attacker.splash.fraction);
        if (attacker.hitBurnDps > 0) this.burn(o, attacker.hitBurnDps);
      }
    }
  }

  private damage(c: Combatant, amount: number): void {
    c.hp -= amount;
  }

  /** Burn refreshes duration and keeps the higher dps (GDD §4.3). */
  private burn(c: Combatant, dps: number): void {
    c.burnDps = Math.max(c.burnDps, dps);
    c.burnLeft = this.run.balance.burnDuration;
  }

  private resolveDeaths(): void {
    // Loop because death bursts can't kill directly (burn ticks later), but keep it robust.
    for (const c of this.combatants) {
      if (!c.alive || c.hp > 0) continue;
      c.alive = false;
      this.events.push({ type: 'death', id: c.id, side: c.side, x: c.x, lane: c.lane });
      if (c.side === 'enemy') {
        this.kills += 1;
        if (c.burnLeft > 0 && this.burnKillGain > 0) {
          const before = this.primary;
          this.primary = Math.min(this.run.primaryCap, this.primary + this.burnKillGain);
          if (this.primary > before) this.events.push({ type: 'resource', amount: this.primary - before });
        }
      } else {
        this.fallen.push({ template: toTemplate(c), lane: c.lane });
        if (c.deathBurst) {
          for (const e of this.enemiesAlive()) {
            if (e.lane === c.lane && Math.abs(e.x - c.x) <= c.deathBurst.radius) this.burn(e, c.deathBurst.burnDps);
          }
        }
      }
    }
    // Keep the array small during long battles.
    if (this.combatants.length > 400) {
      const keep = this.combatants.filter((c) => c.alive);
      this.combatants.length = 0;
      this.combatants.push(...keep);
    }
  }
}

function applySpecials(t: Template, effects: readonly Effect[]): void {
  for (const e of effects) {
    if (e.kind === 'applyBurn') t.hitBurnDps += e.dps;
    else if (e.kind === 'splash') t.splash = { radius: e.radius, fraction: e.fraction };
    else if (e.kind === 'selfDamage') t.selfDps += e.hpPerSecond;
    else if (e.kind === 'onDeathBurst') t.deathBurst = { radius: e.radius, burnDps: e.burnDps };
  }
}

function toTemplate(c: Combatant): Template {
  return {
    side: c.side,
    defId: c.defId,
    lane: c.lane,
    maxHp: c.maxHp,
    damage: c.damage,
    attackSpeed: c.attackSpeed,
    move: c.move,
    range: c.range,
    hitBurnDps: c.hitBurnDps,
    splash: c.splash,
    selfDps: c.selfDps,
    deathBurst: c.deathBurst,
    siege: c.siege,
    slam: c.slam,
    tier: c.tier,
    boss: c.boss,
  };
}
