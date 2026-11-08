import type { Battle } from './battle';
import { Run } from './run';

/**
 * A simple "sensible player" used for balance tests and the QA bot playthrough.
 * Deliberately not optimal: if it can win, a human can.
 */

interface Option {
  handIndex: number;
  tile: number | undefined;
  priority: number;
}

/** Tuning for the bot lives here, not scattered through logic. */
export const BOT = {
  rewardPriority: [
    'card-war-council',
    'card-rally',
    'card-blaze-forge',
    'card-war-drums',
    'card-kiln',
    'card-pyre-range',
    'card-cinder-barracks',
    'card-rebirth-pyre',
    'card-firestorm',
    'card-stoke',
    'card-scorched-earth',
  ],
  firestormMinEnemies: 3,
  warDrumsMinEnemies: 4,
  rebirthMinFallen: 3,
};

function isProducer(run: Run, buildingId: string): boolean {
  return run.content.building(buildingId).unitGeneration !== null;
}

function isAuraBuilding(run: Run, buildingId: string): boolean {
  return run.content
    .building(buildingId)
    .upgradePaths[0].passiveEffects.some((e) => e.kind === 'adjacentAura');
}

function emptyTiles(run: Run): number[] {
  return run.state.grid.flatMap((b, i) => (b === null && i !== run.balance.crownTile ? [i] : []));
}

function bestTileFor(run: Run, buildingId: string): number | undefined {
  const { grid } = run.state;
  let best: number | undefined;
  let bestScore = -Infinity;
  for (const t of emptyTiles(run)) {
    let score = 0;
    const neighbours = run.adjacent(t).map((n) => grid[n]).filter((b) => b !== null && b !== undefined);
    if (isAuraBuilding(run, buildingId)) {
      score += neighbours.filter((b) => isProducer(run, b.buildingId)).length * 10;
    } else {
      score += neighbours.filter((b) => isAuraBuilding(run, b.buildingId)).length * 10;
      const lane = run.laneOf(t);
      const inLane = grid.filter((b, i) => b && run.laneOf(i) === lane && isProducer(run, b.buildingId)).length;
      score += (2 - inLane) * 6;
    }
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function optionFor(run: Run, handIndex: number): Option | null {
  const cardId = run.state.hand[handIndex];
  if (cardId === undefined) return null;
  const card = run.content.card(cardId);
  const { grid, skills } = run.state;
  let tile: number | undefined;
  let priority = 0;

  if (card.type === 'edict') {
    const edict = run.content.edict(card.ref);
    const onlyActions = edict.effects.every((e) => e.kind === 'gainActions');
    if (onlyActions) priority = run.state.hand.length > 1 ? 100 : 0;
    else if (edict.effects.some((e) => e.kind === 'statModifier')) {
      let bestTier = -1;
      grid.forEach((b, i) => {
        if (b && isProducer(run, b.buildingId) && b.tier > bestTier && run.canPlay(handIndex, i).ok) {
          bestTier = b.tier;
          tile = i;
        }
      });
      priority = tile === undefined ? 0 : 30;
    }
  } else if (card.type === 'skill') {
    priority = skills[card.ref] === undefined ? 90 : 40;
  } else {
    const upgrade = grid.findIndex((b) => b !== null && b.buildingId === card.ref && b.tier < 2);
    const producers = grid.filter((b) => b && isProducer(run, b.buildingId)).length;
    if (upgrade >= 0) {
      tile = upgrade;
      priority = 70;
    } else {
      tile = bestTileFor(run, card.ref);
      if (tile !== undefined) {
        const def = run.content.building(card.ref);
        const givesActions = def.upgradePaths[0].passiveEffects.some((e) => e.kind === 'actionsPerTurn');
        const heavy = def.unitGeneration !== null && run.content.unit(def.unitGeneration).unitType === 'heavy';
        if (givesActions) priority = run.state.round <= 3 ? 80 : 10;
        else if (isAuraBuilding(run, card.ref)) priority = producers >= 2 ? 60 : 20;
        else priority = heavy ? 75 : 65;
      }
    }
  }

  if (priority <= 0 || !run.canPlay(handIndex, tile).ok) return null;
  return { handIndex, tile, priority };
}

/** Plays cards until nothing sensible is affordable. Returns cards played. */
export function botPlan(run: Run): number {
  let played = 0;
  for (let guard = 0; guard < 20; guard++) {
    const options = run.state.hand.map((_, i) => optionFor(run, i)).filter((o): o is Option => o !== null);
    if (options.length === 0) break;
    options.sort((a, b) => b.priority - a.priority);
    const pick = options[0];
    if (!pick || !run.playCard(pick.handIndex, pick.tile).ok) break;
    played++;
  }
  return played;
}

/** Called every tick during battle: casts decrees when worthwhile. */
export function botBattleTick(battle: Battle): void {
  const enemies = battle.enemiesAlive();
  if (enemies.length === 0) return;
  if (battle.canCast('firestorm').ok) {
    let bestLane = -1;
    let bestCount = 0;
    for (let lane = 0; lane < battle.lanes; lane++) {
      const inLane = enemies.filter((e) => e.lane === lane);
      const count = inLane.length + (inLane.some((e) => e.boss) ? 10 : 0);
      if (count > bestCount) {
        bestCount = count;
        bestLane = lane;
      }
    }
    if (bestCount >= BOT.firestormMinEnemies) battle.cast('firestorm', bestLane);
  }
  if (battle.canCast('war-drums').ok && enemies.length >= BOT.warDrumsMinEnemies) battle.cast('war-drums');
  if (battle.canCast('rebirth-pyre').ok && battle.fallenCount() >= BOT.rebirthMinFallen) battle.cast('rebirth-pyre');
}

export function botReward(run: Run): void {
  const opts = run.state.rewardOptions;
  for (const id of BOT.rewardPriority) {
    const i = opts.indexOf(id);
    if (i >= 0) {
      run.chooseReward(i);
      return;
    }
  }
  run.chooseReward(null);
}

export interface HeadlessResult {
  seed: number;
  won: boolean;
  round: number;
  crownHp: number;
  score: number;
  battleTimes: number[];
}

/** Plays a whole run without rendering. */
export function playHeadless(factionId: string, seed: number): HeadlessResult {
  const run = new Run(factionId, seed);
  const battleTimes: number[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const phase = run.state.phase;
    if (phase === 'won' || phase === 'lost') break;
    if (phase === 'plan') {
      botPlan(run);
      const battle = run.startBattle();
      const result = battle.runToEnd(botBattleTick);
      battleTimes.push(Math.round(result.time));
      run.finishBattle(result);
    } else if (phase === 'reward') {
      botReward(run);
    }
  }
  return {
    seed,
    won: run.state.phase === 'won',
    round: run.state.round,
    crownHp: run.state.crownHp,
    score: run.score(),
    battleTimes,
  };
}
