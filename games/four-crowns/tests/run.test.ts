import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { Run } from '../src/sim/run';

const F = 'ember-throne';

/** Put a specific hand and action count in place for deterministic rule tests. */
function withHand(run: Run, hand: string[], actions = 10): Run {
  run.state.hand = [...hand];
  run.state.actions = actions;
  return run;
}

describe('Run setup', () => {
  it('starts round 1 in plan with 1 action and the 4-card starting hand', () => {
    const run = new Run(F, 1);
    expect(run.state.round).toBe(1);
    expect(run.state.phase).toBe('plan');
    expect(run.state.actions).toBe(BALANCE.actionsPerTurn);
    expect(run.state.hand).toEqual(['card-cinder-barracks', 'card-pyre-range', 'card-kiln', 'card-rally']);
    expect(run.state.crownHp).toBe(BALANCE.crownHp);
  });

  it('refuses non-playable factions', () => {
    expect(() => new Run('stone-court', 1)).toThrow();
  });
});

describe('Action points', () => {
  it('playing a card spends an action and consumes the card', () => {
    const run = new Run(F, 1);
    expect(run.playCard(0, 0)).toEqual({ ok: true });
    expect(run.state.grid[0]?.buildingId).toBe('cinder-barracks');
    expect(run.state.actions).toBe(0);
    expect(run.state.hand).not.toContain('card-cinder-barracks');
    expect(run.playCard(0, 1)).toEqual({ ok: false, reason: 'No actions left this turn' });
  });

  it('Rally costs 1 action and grants 2 (net +1)', () => {
    const run = new Run(F, 1);
    expect(run.playCard(3)).toEqual({ ok: true });
    expect(run.state.actions).toBe(2);
    expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.playCard(0, 1).ok).toBe(true);
    expect(run.state.actions).toBe(0);
  });

  it('War Council adds actions each turn (+2 at tier 3)', () => {
    const run = withHand(new Run(F, 1), ['card-war-council', 'card-war-council', 'card-war-council']);
    run.playCard(0, 0);
    expect(run.actionsPerTurn()).toBe(2);
    run.playCard(0, 0);
    run.playCard(0, 0);
    expect(run.actionsPerTurn()).toBe(3);
    const b = run.startBattle();
    run.finishBattle({ ...b.result(), crownDamage: 0 });
    run.chooseReward(0);
    expect(run.state.actions).toBe(3);
  });

  it('Scorched Earth refunds its action and buffs neighbours', () => {
    const run = withHand(new Run(F, 1), ['card-kiln', 'card-kiln', 'card-cinder-barracks', 'card-scorched-earth'], 4);
    run.playCard(0, 0);
    run.playCard(0, 0); // kiln tier 2 at tile 0
    run.playCard(0, 1); // barracks next to it
    expect(run.state.actions).toBe(1);
    run.playCard(0, 0);
    expect(run.state.actions).toBe(1);
    expect(run.state.grid[0]).toBeNull();
    expect(run.state.primary).toBe(8);
    expect(run.state.grid[1]?.damageBonus).toBe(2);
  });

  it('unspent actions are lost when the battle starts', () => {
    const run = withHand(new Run(F, 1), [], 3);
    run.startBattle();
    expect(run.state.actions).toBe(0);
  });
});

describe('Playing cards', () => {
  it('cannot build on the Crown Seat', () => {
    const run = new Run(F, 1);
    expect(run.playCard(0, BALANCE.crownTile).ok).toBe(false);
  });

  it('upgrades a matching building up to tier 3 only', () => {
    const run = withHand(new Run(F, 1), Array(4).fill('card-kiln'));
    expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.state.grid[0]?.tier).toBe(2);
    expect(run.playCard(0, 0)).toEqual({ ok: false, reason: 'Already at max tier' });
  });

  it('rejects a different building on an occupied tile', () => {
    const run = withHand(new Run(F, 1), ['card-kiln', 'card-pyre-range']);
    run.playCard(0, 0);
    expect(run.playCard(0, 0).ok).toBe(false);
  });

  it('Stoke stacks to 3 on a building', () => {
    const run = withHand(new Run(F, 1), ['card-cinder-barracks', ...Array(4).fill('card-stoke')]);
    run.playCard(0, 0);
    for (let i = 0; i < 3; i++) expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.state.grid[0]?.attackSpeedPct).toBe(60);
    expect(run.playCard(0, 0).ok).toBe(false);
  });

  it('learns and levels decrees', () => {
    const run = withHand(new Run(F, 1), ['card-firestorm', 'card-firestorm']);
    run.playCard(0);
    expect(run.state.skills['firestorm']).toBe(0);
    run.playCard(0);
    expect(run.state.skills['firestorm']).toBe(1);
  });
});

describe('Round flow', () => {
  it('the hand persists between rounds and only the reward pick is added', () => {
    const run = new Run(F, 3);
    run.playCard(0, 0); // play barracks: 3 cards left
    const handBefore = [...run.state.hand];
    const battle = run.startBattle();
    expect(run.state.hand).toEqual(handBefore);
    run.finishBattle({ ...battle.result(), crownDamage: 2, kills: 5 });
    expect(run.state.phase).toBe('reward');
    expect(run.state.crownHp).toBe(BALANCE.crownHp - 2);
    expect(run.state.rewardOptions).toHaveLength(BALANCE.rewardOptions);
    expect(new Set(run.state.rewardOptions).size).toBe(BALANCE.rewardOptions);
    const picked = run.state.rewardOptions[1];
    run.chooseReward(1);
    expect(run.state.round).toBe(2);
    expect(run.state.hand).toEqual([...handBefore, picked]);
    expect(run.state.actions).toBe(BALANCE.actionsPerTurn);
  });

  it('skipping the reward banks bonus actions for next turn', () => {
    const run = new Run(F, 3);
    const b = run.startBattle();
    run.finishBattle({ ...b.result(), crownDamage: 0 });
    const handSize = run.state.hand.length;
    run.chooseReward(null);
    expect(run.state.hand).toHaveLength(handSize);
    expect(run.state.actions).toBe(BALANCE.actionsPerTurn + BALANCE.rewardSkipActions);
  });

  it('loses when the Crown falls and wins after the final round', () => {
    const lose = new Run(F, 1);
    const b = lose.startBattle();
    lose.finishBattle({ ...b.result(), crownDamage: 99 });
    expect(lose.state.phase).toBe('lost');

    const win = new Run(F, 1);
    win.state.round = BALANCE.rounds;
    const b2 = win.startBattle();
    win.finishBattle({ ...b2.result(), crownDamage: 0 });
    expect(win.state.phase).toBe('won');
    expect(win.score()).toBe(BALANCE.rounds * 100 + BALANCE.crownHp * 10);
  });
});
