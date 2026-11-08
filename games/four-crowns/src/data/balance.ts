import type { BalanceConfig } from './schema';

/** Global tuning (GDD §3–4). Change numbers here, never in logic. */
export const BALANCE: BalanceConfig = {
  gridSize: 3,
  crownTile: 4,
  crownHp: 20,
  handSize: 4,
  incomePerRound: 6,
  rounds: 5,
  rewardOptions: 3,
  rewardSkipGold: 3,
  laneLength: 860,
  battleTimeCap: 75,
  spawnStagger: 20,
  firstSpawnDelay: 0.5,
  tickMs: 50,
  burnDuration: 3,
  score: { perRound: 100, perCrownHp: 10, perKill: 1 },
};
