import type { BuildingDef, CardDef, EdictDef, FactionDef, SkillDef, UnitDef } from '../../schema';

/** Ember Throne content (GDD §5.1–5.6). Starting tuning; adjusted by the balance pass. */

const buildings: readonly BuildingDef[] = [
  {
    id: 'cinder-barracks',
    name: 'Cinder Barracks',
    description: 'Trains Ashguard, sturdy melee fighters that hold the line.',
    constructionCost: 1,
    unitGeneration: 'ashguard',
    productionInterval: null,
    activeAbilities: [],
    upgradePaths: [
      { maxAlive: 3, passiveEffects: [] },
      { maxAlive: 3, passiveEffects: [] },
      { maxAlive: 4, passiveEffects: [] },
    ],
    synergies: ['Next to a Kiln, Ashguard set enemies on fire.'],
    stage: 'early',
  },
  {
    id: 'pyre-range',
    name: 'Pyre Range',
    description: 'Trains Cinder Archers who loose burning arrows from range.',
    constructionCost: 1,
    unitGeneration: 'cinder-archer',
    productionInterval: null,
    activeAbilities: [],
    // Extra burn on top of the archers' base 1 dps: 1 / 1.5 / 2 total (GDD §5.2).
    upgradePaths: [
      { maxAlive: 3, passiveEffects: [] },
      { maxAlive: 3, passiveEffects: [{ kind: 'applyBurn', dps: 0.5 }] },
      { maxAlive: 4, passiveEffects: [{ kind: 'applyBurn', dps: 1 }] },
    ],
    synergies: ['Next to a Kiln, arrows burn hotter.'],
    stage: 'early',
  },
  {
    id: 'kiln',
    name: 'Kiln',
    description: 'Produces no units. Units from adjacent buildings burn what they hit.',
    constructionCost: 1,
    unitGeneration: null,
    productionInterval: null,
    activeAbilities: [],
    upgradePaths: [
      { maxAlive: 0, passiveEffects: [{ kind: 'adjacentAura', burnDps: 1 }] },
      { maxAlive: 0, passiveEffects: [{ kind: 'adjacentAura', burnDps: 1.5 }] },
      { maxAlive: 0, passiveEffects: [{ kind: 'adjacentAura', burnDps: 2, attackSpeedPct: 10 }] },
    ],
    synergies: ['The heart of the burn build: surround it with producers.'],
    stage: 'mid',
  },
  {
    id: 'war-council',
    name: 'War Council',
    description: 'Produces no units. Your generals plan ahead: +1 action every turn (+2 at tier 3).',
    constructionCost: 1,
    unitGeneration: null,
    productionInterval: null,
    activeAbilities: [],
    upgradePaths: [
      { maxAlive: 0, passiveEffects: [{ kind: 'actionsPerTurn', amount: 1 }] },
      { maxAlive: 0, passiveEffects: [{ kind: 'actionsPerTurn', amount: 1 }, { kind: 'adjacentAura', attackSpeedPct: 15 }] },
      { maxAlive: 0, passiveEffects: [{ kind: 'actionsPerTurn', amount: 2 }, { kind: 'adjacentAura', attackSpeedPct: 15 }] },
    ],
    synergies: ['Costs a tile that could hold fighters. From tier 2, adjacent units attack 15% faster.'],
    stage: 'mid',
  },
  {
    id: 'blaze-forge',
    name: 'Blaze Forge',
    description: 'Forges Furnace Brutes: slow, self-burning giants that smash crowds.',
    constructionCost: 1,
    unitGeneration: 'furnace-brute',
    productionInterval: null,
    activeAbilities: [],
    upgradePaths: [
      { maxAlive: 1, passiveEffects: [] },
      { maxAlive: 1, passiveEffects: [] },
      { maxAlive: 2, passiveEffects: [] },
    ],
    synergies: ['Next to a Kiln, Brute splash spreads fire to every enemy it hits.'],
    stage: 'late',
  },
];

const units: readonly UnitDef[] = [
  {
    id: 'ashguard',
    name: 'Ashguard',
    unitType: 'melee',
    resourceCost: 0,
    spawnTime: 4,
    specialAbility: {
      name: 'Smolder',
      description: 'On death, sets nearby enemies on fire.',
      effects: [{ kind: 'onDeathBurst', radius: 30, burnDps: 2 }],
    },
    upgradePaths: [
      { health: 30, attackDamage: 4, attackSpeed: 1.0, movementSpeed: 40, attackRange: 20 },
      { health: 45, attackDamage: 6, attackSpeed: 1.0, movementSpeed: 40, attackRange: 20 },
      { health: 65, attackDamage: 9, attackSpeed: 1.0, movementSpeed: 40, attackRange: 20 },
    ],
  },
  {
    id: 'cinder-archer',
    name: 'Cinder Archer',
    unitType: 'ranged',
    resourceCost: 0,
    spawnTime: 5,
    specialAbility: {
      name: 'Burning Arrows',
      description: 'Every arrow applies Burn.',
      effects: [{ kind: 'applyBurn', dps: 1 }],
    },
    upgradePaths: [
      { health: 14, attackDamage: 3, attackSpeed: 0.8, movementSpeed: 30, attackRange: 160 },
      { health: 20, attackDamage: 5, attackSpeed: 0.8, movementSpeed: 30, attackRange: 160 },
      { health: 28, attackDamage: 7, attackSpeed: 0.8, movementSpeed: 30, attackRange: 160 },
    ],
  },
  {
    id: 'furnace-brute',
    name: 'Furnace Brute',
    unitType: 'heavy',
    resourceCost: 0,
    spawnTime: 10,
    specialAbility: {
      name: 'Overheat',
      description: 'Loses 2 HP per second; every hit splashes nearby enemies.',
      effects: [
        { kind: 'selfDamage', hpPerSecond: 2 },
        { kind: 'splash', radius: 40, fraction: 0.5 },
      ],
    },
    upgradePaths: [
      { health: 80, attackDamage: 10, attackSpeed: 0.5, movementSpeed: 22, attackRange: 24 },
      { health: 120, attackDamage: 15, attackSpeed: 0.5, movementSpeed: 22, attackRange: 24 },
      { health: 170, attackDamage: 22, attackSpeed: 0.5, movementSpeed: 22, attackRange: 24 },
    ],
  },
];

const skills: readonly SkillDef[] = [
  {
    id: 'firestorm',
    name: 'Firestorm',
    description: 'Rain fire on one lane: damage every enemy in it and set them burning.',
    resourceCost: 6,
    cooldown: 8,
    duration: 0,
    areaOfEffect: 'lane',
    upgradeLevels: [
      { effects: [{ kind: 'laneDamage', damage: 8, burnDps: 2 }] },
      { effects: [{ kind: 'laneDamage', damage: 12, burnDps: 2 }] },
      { effects: [{ kind: 'laneDamage', damage: 16, burnDps: 2 }] },
    ],
  },
  {
    id: 'war-drums',
    name: 'War Drums',
    description: 'All your units attack faster for a few seconds.',
    resourceCost: 4,
    cooldown: 12,
    duration: 5,
    areaOfEffect: 'all',
    upgradeLevels: [
      { effects: [{ kind: 'globalAttackSpeed', pct: 40 }] },
      { effects: [{ kind: 'globalAttackSpeed', pct: 55 }] },
      { effects: [{ kind: 'globalAttackSpeed', pct: 70 }] },
    ],
  },
  {
    id: 'rebirth-pyre',
    name: 'Rebirth Pyre',
    description: 'Raise your most recently fallen units from the ashes at half health.',
    resourceCost: 12,
    cooldown: 30,
    duration: 0,
    areaOfEffect: 'all',
    upgradeLevels: [
      { effects: [{ kind: 'revive', count: 3, hpFraction: 0.5 }] },
      { effects: [{ kind: 'revive', count: 4, hpFraction: 0.5 }] },
      { effects: [{ kind: 'revive', count: 5, hpFraction: 0.5 }] },
    ],
  },
];

const edicts: readonly EdictDef[] = [
  {
    id: 'rally',
    name: 'Rally',
    description: 'Rouse the court: +2 actions this turn.',
    targetsBuilding: false,
    effects: [{ kind: 'gainActions', amount: 2 }],
  },
  {
    id: 'stoke',
    name: 'Stoke',
    description: "Target building's units attack 20% faster for the rest of the run (max 3 times).",
    targetsBuilding: true,
    effects: [{ kind: 'statModifier', attackSpeedPct: 20, maxStacks: 3 }],
  },
  {
    id: 'scorched-earth',
    name: 'Scorched Earth',
    description: 'Destroy one of your buildings: gain 4 Embers per tier and refund this action; adjacent buildings’ units deal +2 damage for the rest of the run.',
    targetsBuilding: true,
    effects: [
      { kind: 'destroyBuildingFor', resource: 'embers', amountPerTier: 4, adjacentDamageFlat: 2 },
      { kind: 'gainActions', amount: 1 },
    ],
  },
];

const cards: readonly CardDef[] = [
  { id: 'card-cinder-barracks', type: 'building', ref: 'cinder-barracks', actionCost: 1, rewardWeight: 3 },
  { id: 'card-pyre-range', type: 'building', ref: 'pyre-range', actionCost: 1, rewardWeight: 3 },
  { id: 'card-kiln', type: 'building', ref: 'kiln', actionCost: 1, rewardWeight: 3 },
  { id: 'card-war-council', type: 'building', ref: 'war-council', actionCost: 1, rewardWeight: 2 },
  { id: 'card-blaze-forge', type: 'building', ref: 'blaze-forge', actionCost: 1, rewardWeight: 2 },
  { id: 'card-rally', type: 'edict', ref: 'rally', actionCost: 1, rewardWeight: 2 },
  { id: 'card-stoke', type: 'edict', ref: 'stoke', actionCost: 1, rewardWeight: 2 },
  { id: 'card-scorched-earth', type: 'edict', ref: 'scorched-earth', actionCost: 1, rewardWeight: 1 },
  { id: 'card-firestorm', type: 'skill', ref: 'firestorm', actionCost: 1, rewardWeight: 2 },
  { id: 'card-war-drums', type: 'skill', ref: 'war-drums', actionCost: 1, rewardWeight: 2 },
  { id: 'card-rebirth-pyre', type: 'skill', ref: 'rebirth-pyre', actionCost: 1, rewardWeight: 1 },
];

export const emberThrone: FactionDef = {
  id: 'ember-throne',
  name: 'Ember Throne',
  element: 'Fire',
  description: 'A court of reckless pyromancers who would rather burn their island than lose it.',
  playstyle: 'Aggressive: stack burn, trade your own buildings for power, end fights fast.',
  primaryResource: { id: 'embers', name: 'Embers', cap: 30 },
  startingResources: { primary: 0 },
  passive: {
    name: 'Kindling',
    description: 'Every enemy that dies while burning grants +1 Ember.',
    effects: [{ kind: 'resourceOnBurningKill', resource: 'embers', amount: 1 }],
  },
  strengths: ['High damage', 'Snowballs with Kilns', 'Strong burst decrees'],
  weaknesses: ['Fragile units', 'Brutes burn themselves', 'Weak without the burn engine'],
  playable: true,
  color: 0xe8573a,
  shape: 'triangle',
  buildings,
  units,
  skills,
  edicts,
  cards,
  startingHand: ['card-cinder-barracks', 'card-pyre-range', 'card-kiln', 'card-rally'],
};
