import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/data/balance';
import type { TierIndex, WaveDef } from '../src/data/schema';
import { Battle } from '../src/sim/battle';
import { Run } from '../src/sim/run';

const F = 'ember-throne';

function runWith(tiles: Record<number, { id: string; tier?: TierIndex }>, primary = 0, balance = BALANCE): Run {
  const run = new Run(F, 11, balance);
  for (const [t, b] of Object.entries(tiles)) {
    run.state.grid[Number(t)] = { buildingId: b.id, tier: b.tier ?? 0, attackSpeedStacks: 0, attackSpeedPct: 0, damageBonus: 0 };
  }
  run.state.primary = primary;
  run.state.phase = 'battle';
  return run;
}

const wave = (groups: WaveDef['groups']): WaveDef => ({ round: 1, groups });

function ticks(b: Battle, seconds: number): void {
  const n = Math.round((seconds * 1000) / BALANCE.tickMs);
  for (let i = 0; i < n && !b.over; i++) b.step();
}

describe('Battle', () => {
  it('enemies that reach the crown deal siege damage when undefended', () => {
    const b = new Battle(runWith({}), wave([{ enemy: 'shardling', count: 3, lane: 0 }]));
    const r = b.runToEnd();
    expect(r.crownDamage).toBe(3);
    expect(r.kills).toBe(0);
    expect(r.cleared).toBe(true);
  });

  it('buildings spawn units into their own lane up to maxAlive', () => {
    const b = new Battle(runWith({ 3: { id: 'cinder-barracks' } }), wave([{ enemy: 'shardling', count: 1, lane: 2 }]));
    ticks(b, 14);
    const allies = b.alliesAlive();
    expect(allies.length).toBe(3);
    expect(allies.every((a) => a.lane === 1)).toBe(true);
  });

  it('defenders kill a small wave', () => {
    const b = new Battle(
      runWith({ 0: { id: 'cinder-barracks' }, 1: { id: 'pyre-range' } }),
      wave([{ enemy: 'shardling', count: 3, lane: 0 }]),
    );
    const r = b.runToEnd();
    expect(r.kills).toBe(3);
    expect(r.crownDamage).toBe(0);
  });

  it('is deterministic', () => {
    const make = () =>
      new Battle(runWith({ 0: { id: 'cinder-barracks' }, 6: { id: 'pyre-range' } }), wave([{ enemy: 'shardling', count: 8, lane: 'random' }])).runToEnd();
    expect(make()).toEqual(make());
  });

  it('Kiln makes adjacent units burn on hit; Kindling grants embers for burning kills', () => {
    const b = new Battle(
      runWith({ 0: { id: 'cinder-barracks' }, 1: { id: 'kiln' } }),
      wave([{ enemy: 'shardling', count: 4, lane: 0 }]),
    );
    ticks(b, 1);
    expect(b.alliesAlive()[0]?.hitBurnDps).toBe(1);
    const r = b.runToEnd();
    expect(r.kills).toBe(4);
    expect(r.primary).toBeGreaterThan(0);
  });

  it('Furnace Brutes splash and burn themselves', () => {
    const b = new Battle(runWith({ 0: { id: 'blaze-forge' } }), wave([{ enemy: 'shardling', count: 1, lane: 2 }]));
    ticks(b, 2);
    const brute = b.alliesAlive()[0];
    expect(brute?.splash).not.toBeNull();
    expect(brute && brute.hp < brute.maxHp).toBe(true);
  });

  it('battle ends at the time cap with remaining enemies sieging', () => {
    const run = runWith({});
    run.state.crownHp = 999;
    const b = new Battle(run, wave([{ enemy: 'rift-colossus', count: 1, lane: 1 }]));
    const r = b.runToEnd();
    expect(r.time).toBeLessThanOrEqual(BALANCE.battleTimeCap + 0.1);
    expect(r.crownDamage).toBe(15);
  });

  it('ends immediately when the crown falls', () => {
    const run = runWith({});
    run.state.crownHp = 2;
    const b = new Battle(run, wave([{ enemy: 'shardling', count: 6, lane: 0 }]));
    const r = b.runToEnd();
    expect(r.crownDamage).toBeGreaterThanOrEqual(2);
    expect(b.over).toBe(true);
  });

  it('boss slams nearby units', () => {
    const run = runWith({ 3: { id: 'cinder-barracks', tier: 2 } });
    run.state.crownHp = 999;
    const b = new Battle(run, wave([{ enemy: 'rift-colossus', count: 1, lane: 1 }]));
    let slammed = false;
    for (let i = 0; i < 2000 && !b.over && !slammed; i++) {
      b.step();
      slammed = b.events.some((e) => e.type === 'slam');
      b.events.length = 0;
    }
    expect(slammed).toBe(true);
  });
});

describe('Decrees', () => {
  it('Firestorm costs embers, hits one lane and goes on cooldown', () => {
    // Fast spawns so every enemy is on the field (and far from the crown) when we cast.
    const run = runWith({}, 10, { ...BALANCE, spawnStagger: 1 });
    run.state.skills['firestorm'] = 0;
    const b = new Battle(run, wave([{ enemy: 'shardling', count: 2, lane: 0 }, { enemy: 'shardling', count: 1, lane: 2 }]));
    ticks(b, 2);
    expect(b.pendingSpawns).toBe(0);
    expect(b.cast('firestorm', null).ok).toBe(false);
    expect(b.cast('firestorm', 0)).toEqual({ ok: true });
    expect(b.primary).toBe(4);
    const lane0 = b.combatants.filter((c) => c.side === 'enemy' && c.lane === 0);
    expect(lane0.every((c) => c.hp <= 12 - 8 && c.burnLeft > 0)).toBe(true);
    expect(b.combatants.filter((c) => c.side === 'enemy' && c.lane === 2).every((c) => c.hp === 12)).toBe(true);
    expect(b.cast('firestorm', 0)).toEqual({ ok: false, reason: 'On cooldown' });
  });

  it('cannot cast unlearned decrees or without embers', () => {
    const run = runWith({}, 0);
    run.state.skills['war-drums'] = 0;
    const b = new Battle(run, wave([{ enemy: 'shardling', count: 1, lane: 0 }]));
    expect(b.canCast('firestorm').ok).toBe(false);
    expect(b.canCast('war-drums').ok).toBe(false);
  });

  it('War Drums speeds up attacks; Rebirth Pyre revives fallen units', () => {
    const run = runWith({ 0: { id: 'cinder-barracks' } }, 30);
    run.state.crownHp = 999;
    run.state.skills['war-drums'] = 0;
    run.state.skills['rebirth-pyre'] = 0;
    const b = new Battle(run, wave([{ enemy: 'shard-brute', count: 4, lane: 0 }]));
    expect(b.cast('war-drums').ok).toBe(true);
    while (!b.over && b.fallenCount() < 3) b.step();
    const before = b.alliesAlive().length;
    expect(b.cast('rebirth-pyre').ok).toBe(true);
    expect(b.alliesAlive().length).toBe(before + 3);
  });
});
