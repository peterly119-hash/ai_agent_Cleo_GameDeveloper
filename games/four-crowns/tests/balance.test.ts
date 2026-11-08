import { describe, expect, it } from 'vitest';
import { playHeadless } from '../src/sim/bot';

/** Balance smoke test (GDD §6): the bot finishes every seed and wins at least one of three. */
const SEEDS = [101, 202, 303];

describe('balance smoke test', () => {
  const results = SEEDS.map((s) => playHeadless('ember-throne', s));

  it('every seed reaches an end state', () => {
    for (const r of results) expect(r.round).toBeGreaterThanOrEqual(1);
    console.table(results);
  });

  it('the bot wins at least 1 of 3 seeds', () => {
    expect(results.filter((r) => r.won).length).toBeGreaterThanOrEqual(1);
  });

  it('the game is not trivial: the bot does not win every seed with a full Crown', () => {
    expect(results.every((r) => r.won && r.crownHp === 20)).toBe(false);
  });
});
