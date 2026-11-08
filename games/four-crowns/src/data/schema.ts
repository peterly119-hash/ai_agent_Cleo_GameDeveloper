/**
 * Content schema. Field names follow the CD's class-system spec (GDD §11).
 * Content is pure data; the engine only understands the generic Effect kinds below.
 */

export type TierIndex = 0 | 1 | 2;
export type Tiered<T> = readonly [T, T, T];

/** Generic effect kinds. Content composes these; the engine never special-cases content IDs. */
export type Effect =
  /** Unit: hits apply Burn at this dps. */
  | { kind: 'applyBurn'; dps: number }
  /** Building passive: modifies units produced by orthogonally adjacent buildings. */
  | { kind: 'adjacentAura'; burnDps?: number; attackSpeedPct?: number; damageFlat?: number }
  /** Unit: on death, burns enemies within radius. */
  | { kind: 'onDeathBurst'; radius: number; burnDps: number }
  /** Unit: hits also damage other enemies within radius for a fraction of damage (and apply burn). */
  | { kind: 'splash'; radius: number; fraction: number }
  /** Unit: loses HP every second. */
  | { kind: 'selfDamage'; hpPerSecond: number }
  /** Edict: gain a resource ('gold' or the faction's primary resource id). */
  | { kind: 'gainResource'; resource: string; amount: number }
  /** Edict (targets a building): permanent modifier on its units. */
  | { kind: 'statModifier'; attackSpeedPct?: number; damageFlat?: number; maxStacks: number }
  /** Edict (targets a building): destroy it for resources and buff its neighbours. */
  | { kind: 'destroyBuildingFor'; resource: string; amountPerTier: number; adjacentDamageFlat: number }
  /** Skill: damage every enemy in one lane, optionally burning them. */
  | { kind: 'laneDamage'; damage: number; burnDps: number }
  /** Skill: timed attack-speed buff for all friendly units. */
  | { kind: 'globalAttackSpeed'; pct: number }
  /** Skill: revive the most recently fallen units. */
  | { kind: 'revive'; count: number; hpFraction: number }
  /** Faction passive: gain resource when an enemy dies while burning. */
  | { kind: 'resourceOnBurningKill'; resource: string; amount: number }
  /** Enemy: periodic area attack around itself. */
  | { kind: 'slam'; interval: number; radius: number; damage: number };

export type EffectKind = Effect['kind'];

export interface ResourceDef {
  id: string;
  name: string;
  cap: number;
}

export interface FactionDef {
  id: string;
  name: string;
  element: string;
  description: string;
  playstyle: string;
  primaryResource: ResourceDef;
  startingResources: { gold: number; primary: number };
  passive: { name: string; description: string; effects: readonly Effect[] };
  strengths: readonly string[];
  weaknesses: readonly string[];
  /** Hidden behind "Coming soon" when false. */
  playable: boolean;
  /** STYLE.md token hex and shape motif. */
  color: number;
  shape: 'triangle' | 'square' | 'diamond' | 'circle';
  buildings: readonly BuildingDef[];
  units: readonly UnitDef[];
  skills: readonly SkillDef[];
  edicts: readonly EdictDef[];
  cards: readonly CardDef[];
  /** Card ids, duplicates allowed. */
  startingDeck: readonly string[];
}

export interface BuildingTierDef {
  /** Max units of this building alive at once. */
  maxAlive: number;
  passiveEffects: readonly Effect[];
}

export interface BuildingDef {
  id: string;
  name: string;
  description: string;
  /** Gold to build; upgrading costs the same (play the card again). */
  constructionCost: number;
  /** Unit id this building generates, or null for support buildings. */
  unitGeneration: string | null;
  /** Seconds between spawns; null uses the unit's spawnTime. */
  productionInterval: number | null;
  /** Battle-time abilities (none in M1; reserved by the spec). */
  activeAbilities: readonly Effect[];
  upgradePaths: Tiered<BuildingTierDef>;
  /** Human-readable synergy notes for tooltips. */
  synergies: readonly string[];
  stage: 'early' | 'mid' | 'late';
}

export interface UnitTierDef {
  health: number;
  attackDamage: number;
  /** Attacks per second. */
  attackSpeed: number;
  /** px per second. */
  movementSpeed: number;
  /** px. */
  attackRange: number;
}

export interface UnitDef {
  id: string;
  name: string;
  unitType: 'melee' | 'ranged' | 'heavy';
  /** Extra resource cost per spawn (0 in M1: buildings produce units for free). */
  resourceCost: number;
  /** Seconds between spawns from its building. */
  spawnTime: number;
  specialAbility: { name: string; description: string; effects: readonly Effect[] } | null;
  upgradePaths: Tiered<UnitTierDef>;
}

export interface SkillLevelDef {
  effects: readonly Effect[];
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  /** Primary-resource cost to cast. */
  resourceCost: number;
  /** Seconds. */
  cooldown: number;
  /** Seconds; 0 = instant. */
  duration: number;
  areaOfEffect: 'lane' | 'all';
  upgradeLevels: Tiered<SkillLevelDef>;
}

export interface EdictDef {
  id: string;
  name: string;
  description: string;
  /** Whether the edict must target one of the player's buildings. */
  targetsBuilding: boolean;
  effects: readonly Effect[];
}

export type CardType = 'building' | 'edict' | 'skill';

export interface CardDef {
  id: string;
  type: CardType;
  /** Id of the building / edict / skill this card plays. */
  ref: string;
  /** Gold cost to play. */
  cost: number;
  /** Relative chance in reward draws (0 = never offered). */
  rewardWeight: number;
}

export interface EnemyTierless {
  health: number;
  attackDamage: number;
  attackSpeed: number;
  movementSpeed: number;
  attackRange: number;
}

export interface EnemyDef extends EnemyTierless {
  id: string;
  name: string;
  /** Crown damage when it reaches the left edge. */
  siege: number;
  boss: boolean;
  effects: readonly Effect[];
}

export interface WaveGroup {
  enemy: string;
  count: number;
  /** Fixed lane (0-2) or 'random'. */
  lane: number | 'random';
}

export interface WaveDef {
  round: number;
  groups: readonly WaveGroup[];
}

export interface BalanceConfig {
  gridSize: number;
  crownTile: number;
  crownHp: number;
  handSize: number;
  incomePerRound: number;
  rounds: number;
  rewardOptions: number;
  rewardSkipGold: number;
  laneLength: number;
  battleTimeCap: number;
  spawnStagger: number;
  firstSpawnDelay: number;
  tickMs: number;
  burnDuration: number;
  score: { perRound: number; perCrownHp: number; perKill: number };
}
