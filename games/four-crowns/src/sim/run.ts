import { Rng } from '@questwright/lib';
import { BALANCE } from '../data/balance';
import { getFaction } from '../data/factions';
import type { BalanceConfig, TierIndex } from '../data/schema';
import { Battle, type BattleResult } from './battle';
import { Content } from './content';

export interface BuildingInstance {
  buildingId: string;
  tier: TierIndex;
  /** Stoke stacks (for the max-stack check). */
  attackSpeedStacks: number;
  /** Total permanent attack-speed bonus from edicts, in %. */
  attackSpeedPct: number;
  /** Flat damage from Scorched Earth. */
  damageBonus: number;
}

export type Phase = 'plan' | 'battle' | 'reward' | 'won' | 'lost';

export interface RunState {
  factionId: string;
  seed: number;
  round: number;
  phase: Phase;
  crownHp: number;
  gold: number;
  primary: number;
  deck: string[];
  discard: string[];
  hand: string[];
  /** gridSize² tiles; the crown tile is always null. */
  grid: (BuildingInstance | null)[];
  /** Learned skills → level index (0-2). */
  skills: Record<string, TierIndex>;
  kills: number;
  rewardOptions: string[];
  lastBattle: BattleResult | null;
}

export type PlayResult = { ok: true } | { ok: false; reason: string };

/** One roguelike run: rules for planning, rewards and round flow. Pure and deterministic. */
export class Run {
  readonly content: Content;
  readonly rng: Rng;
  readonly state: RunState;

  constructor(factionId: string, seed: number, readonly balance: BalanceConfig = BALANCE) {
    const faction = getFaction(factionId);
    if (!faction.playable) throw new Error(`Faction not playable yet: ${factionId}`);
    this.content = new Content(faction);
    this.rng = new Rng(seed);
    this.state = {
      factionId,
      seed,
      round: 0,
      phase: 'plan',
      crownHp: balance.crownHp,
      gold: faction.startingResources.gold,
      primary: faction.startingResources.primary,
      deck: this.rng.shuffle(faction.startingDeck),
      discard: [],
      hand: [],
      grid: Array.from({ length: balance.gridSize * balance.gridSize }, () => null),
      skills: {},
      kills: 0,
      rewardOptions: [],
      lastBattle: null,
    };
    this.startRound();
  }

  get primaryCap(): number {
    return this.content.faction.primaryResource.cap;
  }

  /** Orthogonal neighbours of a tile. */
  adjacent(tile: number): number[] {
    const n = this.balance.gridSize;
    const r = Math.floor(tile / n);
    const c = tile % n;
    const out: number[] = [];
    if (r > 0) out.push(tile - n);
    if (r < n - 1) out.push(tile + n);
    if (c > 0) out.push(tile - 1);
    if (c < n - 1) out.push(tile + 1);
    return out;
  }

  laneOf(tile: number): number {
    return Math.floor(tile / this.balance.gridSize);
  }

  score(): number {
    const s = this.balance.score;
    const cleared = this.state.phase === 'won' ? this.state.round : Math.max(0, this.state.round - 1);
    return cleared * s.perRound + Math.max(0, this.state.crownHp) * s.perCrownHp + this.state.kills * s.perKill;
  }

  private startRound(): void {
    const s = this.state;
    s.round += 1;
    s.phase = 'plan';
    s.gold += this.balance.incomePerRound;
    s.hand = this.draw(this.balance.handSize);
  }

  private draw(n: number): string[] {
    const s = this.state;
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      if (s.deck.length === 0) {
        if (s.discard.length === 0) break;
        s.deck = this.rng.shuffle(s.discard);
        s.discard = [];
      }
      const card = s.deck.pop();
      if (card !== undefined) out.push(card);
    }
    return out;
  }

  /** Validates without changing state. */
  canPlay(handIndex: number, tile?: number): PlayResult {
    return this.apply(handIndex, tile, true);
  }

  playCard(handIndex: number, tile?: number): PlayResult {
    return this.apply(handIndex, tile, false);
  }

  /** Does this card need a tile target? */
  needsTarget(cardId: string): boolean {
    const card = this.content.card(cardId);
    if (card.type === 'building') return true;
    if (card.type === 'edict') return this.content.edict(card.ref).targetsBuilding;
    return false;
  }

  private apply(handIndex: number, tile: number | undefined, dry: boolean): PlayResult {
    const s = this.state;
    if (s.phase !== 'plan') return { ok: false, reason: 'Not in planning phase' };
    const cardId = s.hand[handIndex];
    if (cardId === undefined) return { ok: false, reason: 'No such card' };
    const card = this.content.card(cardId);
    if (card.cost > s.gold) return { ok: false, reason: 'Not enough gold' };

    const commit = (effect: () => void): PlayResult => {
      if (dry) return { ok: true };
      s.gold -= card.cost;
      s.hand.splice(handIndex, 1);
      s.discard.push(cardId);
      effect();
      return { ok: true };
    };

    if (card.type === 'building') {
      if (tile === undefined || tile < 0 || tile >= s.grid.length) return { ok: false, reason: 'Pick a tile' };
      if (tile === this.balance.crownTile) return { ok: false, reason: 'The Crown Seat cannot be built on' };
      const existing = s.grid[tile];
      if (!existing) {
        return commit(() => {
          s.grid[tile] = { buildingId: card.ref, tier: 0, attackSpeedStacks: 0, attackSpeedPct: 0, damageBonus: 0 };
        });
      }
      if (existing.buildingId !== card.ref) return { ok: false, reason: 'Tile holds a different building' };
      if (existing.tier >= 2) return { ok: false, reason: 'Already at max tier' };
      return commit(() => {
        existing.tier = (existing.tier + 1) as TierIndex;
      });
    }

    if (card.type === 'skill') {
      const level = s.skills[card.ref];
      if (level !== undefined && level >= 2) return { ok: false, reason: 'Decree already at max level' };
      return commit(() => {
        s.skills[card.ref] = (level === undefined ? 0 : level + 1) as TierIndex;
      });
    }

    const edict = this.content.edict(card.ref);
    const target = tile === undefined ? null : s.grid[tile] ?? null;
    if (edict.targetsBuilding && (!target || tile === undefined)) return { ok: false, reason: 'Target one of your buildings' };

    for (const e of edict.effects) {
      if (e.kind === 'statModifier' && target && target.attackSpeedStacks >= e.maxStacks) {
        return { ok: false, reason: 'Already fully stoked' };
      }
    }

    return commit(() => {
      for (const e of edict.effects) {
        if (e.kind === 'gainResource') this.gain(e.resource, e.amount);
        else if (e.kind === 'statModifier' && target) {
          target.attackSpeedStacks += 1;
          target.attackSpeedPct += e.attackSpeedPct ?? 0;
          target.damageBonus += e.damageFlat ?? 0;
        } else if (e.kind === 'destroyBuildingFor' && target && tile !== undefined) {
          this.gain(e.resource, e.amountPerTier * (target.tier + 1));
          s.grid[tile] = null;
          for (const n of this.adjacent(tile)) {
            const b = s.grid[n];
            if (b) b.damageBonus += e.adjacentDamageFlat;
          }
        }
      }
    });
  }

  private gain(resource: string, amount: number): void {
    if (resource === 'gold') this.state.gold += amount;
    else if (resource === this.content.faction.primaryResource.id) {
      this.state.primary = Math.min(this.primaryCap, this.state.primary + amount);
    }
  }

  /** Ends planning and creates the battle for this round. */
  startBattle(): Battle {
    const s = this.state;
    if (s.phase !== 'plan') throw new Error('startBattle outside plan phase');
    s.discard.push(...s.hand);
    s.hand = [];
    s.phase = 'battle';
    return new Battle(this, this.content.wave(s.round));
  }

  finishBattle(result: BattleResult): void {
    const s = this.state;
    if (s.phase !== 'battle') throw new Error('finishBattle outside battle phase');
    s.lastBattle = result;
    s.crownHp = Math.max(0, s.crownHp - result.crownDamage);
    s.kills += result.kills;
    s.primary = Math.min(this.primaryCap, result.primary);
    if (s.crownHp <= 0) {
      s.phase = 'lost';
      return;
    }
    if (s.round >= this.balance.rounds) {
      s.phase = 'won';
      return;
    }
    s.phase = 'reward';
    s.rewardOptions = this.rollRewards();
  }

  private rollRewards(): string[] {
    const pool = this.content.faction.cards.filter((c) => c.rewardWeight > 0);
    const out: string[] = [];
    while (out.length < this.balance.rewardOptions && out.length < pool.length) {
      const pick = this.rng.weighted(
        pool.filter((c) => !out.includes(c.id)),
        (c) => c.rewardWeight,
      );
      out.push(pick.id);
    }
    return out;
  }

  /** Take reward `index`, or null to skip for gold. Starts the next round. */
  chooseReward(index: number | null): void {
    const s = this.state;
    if (s.phase !== 'reward') throw new Error('chooseReward outside reward phase');
    const picked = index === null ? undefined : s.rewardOptions[index];
    if (picked !== undefined) s.discard.push(picked);
    else s.gold += this.balance.rewardSkipGold;
    s.rewardOptions = [];
    this.startRound();
  }
}
