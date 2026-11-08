import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import { Run } from '../src/sim/run';

const F = 'ember-throne';

/** Put a specific hand in place for deterministic rule tests. */
function withHand(run: Run, hand: string[], gold = 50): Run {
  run.state.hand = [...hand];
  run.state.gold = gold;
  return run;
}

describe('Run setup', () => {
  it('starts round 1 in plan with starting gold + income and a full hand', () => {
    const run = new Run(F, 1);
    expect(run.state.round).toBe(1);
    expect(run.state.phase).toBe('plan');
    expect(run.state.gold).toBe(8 + BALANCE.incomePerRound);
    expect(run.state.hand).toHaveLength(BALANCE.handSize);
    expect(run.state.crownHp).toBe(BALANCE.crownHp);
  });

  it('is deterministic for a seed', () => {
    expect(new Run(F, 7).state.hand).toEqual(new Run(F, 7).state.hand);
  });

  it('refuses non-playable factions', () => {
    expect(() => new Run('stone-court', 1)).toThrow();
  });
});

describe('Playing cards', () => {
  it('places a building, charges gold and discards the card', () => {
    const run = withHand(new Run(F, 1), ['card-cinder-barracks'], 10);
    expect(run.playCard(0, 0)).toEqual({ ok: true });
    expect(run.state.grid[0]?.buildingId).toBe('cinder-barracks');
    expect(run.state.gold).toBe(7);
    expect(run.state.discard).toContain('card-cinder-barracks');
  });

  it('cannot build on the Crown Seat, or without enough gold', () => {
    const run = withHand(new Run(F, 1), ['card-cinder-barracks'], 10);
    expect(run.playCard(0, BALANCE.crownTile).ok).toBe(false);
    run.state.gold = 1;
    expect(run.playCard(0, 0).ok).toBe(false);
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

  it('Tithe grants gold', () => {
    const run = withHand(new Run(F, 1), ['card-tithe'], 0);
    run.playCard(0);
    expect(run.state.gold).toBe(4);
  });

  it('Stoke stacks to 3 on a building', () => {
    const run = withHand(new Run(F, 1), ['card-cinder-barracks', ...Array(4).fill('card-stoke')]);
    run.playCard(0, 0);
    for (let i = 0; i < 3; i++) expect(run.playCard(0, 0).ok).toBe(true);
    expect(run.state.grid[0]?.attackSpeedPct).toBe(60);
    expect(run.playCard(0, 0).ok).toBe(false);
  });

  it('Scorched Earth destroys a building for embers and buffs neighbours', () => {
    const run = withHand(new Run(F, 1), ['card-kiln', 'card-kiln', 'card-cinder-barracks', 'card-scorched-earth']);
    run.playCard(0, 0);
    run.playCard(0, 0); // kiln tier 2 at tile 0
    run.playCard(0, 1); // barracks next to it
    run.playCard(0, 0);
    expect(run.state.grid[0]).toBeNull();
    expect(run.state.primary).toBe(8);
    expect(run.state.grid[1]?.damageBonus).toBe(2);
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
  it('goes plan → battle → reward → plan with income, and unplayed cards are discarded', () => {
    const run = new Run(F, 3);
    const hand = [...run.state.hand];
    const battle = run.startBattle();
    expect(run.state.phase).toBe('battle');
    expect(run.state.discard).toEqual(expect.arrayContaining(hand));
    run.finishBattle({ ...battle.result(), crownDamage: 2, kills: 5 });
    expect(run.state.phase).toBe('reward');
    expect(run.state.crownHp).toBe(BALANCE.crownHp - 2);
    expect(run.state.rewardOptions).toHaveLength(BALANCE.rewardOptions);
    expect(new Set(run.state.rewardOptions).size).toBe(BALANCE.rewardOptions);
    const gold = run.state.gold;
    run.chooseReward(null);
    expect(run.state.round).toBe(2);
    expect(run.state.gold).toBe(gold + BALANCE.rewardSkipGold + BALANCE.incomePerRound);
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
