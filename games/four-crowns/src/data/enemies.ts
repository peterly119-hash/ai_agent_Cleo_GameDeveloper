import type { EnemyDef, WaveDef } from './schema';

/** The Shardborn: neutral invaders (GDD §5.7). */
export const ENEMIES: readonly EnemyDef[] = [
  { id: 'shardling', name: 'Shardling', health: 12, attackDamage: 2, attackSpeed: 1.0, movementSpeed: 55, attackRange: 18, siege: 1, boss: false, effects: [] },
  { id: 'shard-slinger', name: 'Shard Slinger', health: 10, attackDamage: 3, attackSpeed: 0.7, movementSpeed: 35, attackRange: 140, siege: 1, boss: false, effects: [] },
  { id: 'shard-brute', name: 'Shard Brute', health: 60, attackDamage: 6, attackSpeed: 0.6, movementSpeed: 25, attackRange: 22, siege: 3, boss: false, effects: [] },
  {
    id: 'rift-colossus',
    name: 'Rift Colossus',
    health: 345,
    attackDamage: 12,
    attackSpeed: 0.5,
    movementSpeed: 15,
    attackRange: 30,
    siege: 15,
    boss: true,
    effects: [{ kind: 'slam', interval: 6, radius: 60, damage: 8 }],
  },
];

/** Round compositions (GDD §5.8). */
export const WAVES: readonly WaveDef[] = [
  { round: 1, groups: [{ enemy: 'shardling', count: 5, lane: 'random' }] },
  { round: 2, groups: [{ enemy: 'shardling', count: 6, lane: 'random' }, { enemy: 'shard-slinger', count: 2, lane: 'random' }] },
  {
    round: 3,
    groups: [
      { enemy: 'shardling', count: 7, lane: 'random' },
      { enemy: 'shard-slinger', count: 3, lane: 'random' },
      { enemy: 'shard-brute', count: 1, lane: 'random' },
    ],
  },
  {
    round: 4,
    groups: [
      { enemy: 'shardling', count: 8, lane: 'random' },
      { enemy: 'shard-slinger', count: 4, lane: 'random' },
      { enemy: 'shard-brute', count: 2, lane: 'random' },
    ],
  },
  { round: 5, groups: [{ enemy: 'rift-colossus', count: 1, lane: 1 }, { enemy: 'shardling', count: 5, lane: 'random' }] },
];
