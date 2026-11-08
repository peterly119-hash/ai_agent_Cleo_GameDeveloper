import { expect, it } from 'vitest';
import { playHeadless } from '../src/sim/bot';

/** 30-seed sweep: bot win rate must stay in a sane band (GDD §6). Run `npm run balance` to see numbers. */
it('bot win rate over 30 seeds stays between 40% and 95%', () => {
  const rs = Array.from({ length: 30 }, (_, i) => playHeadless('ember-throne', 1000 + i * 7));
  const wins = rs.filter((r) => r.won).length;
  const byRound: Record<number, number> = {};
  for (const r of rs) if (!r.won) byRound[r.round] = (byRound[r.round] ?? 0) + 1;
  const avg = rs.filter((r) => r.won).reduce((a, r) => a + r.crownHp, 0) / Math.max(1, wins);
  console.log('SWEEP wins', wins, '/30; lost at round', JSON.stringify(byRound), 'avg crown on win', avg.toFixed(1));
  console.log('SWEEP battle times', JSON.stringify(rs.slice(0, 5).map((r) => r.battleTimes)));
  expect(wins).toBeGreaterThanOrEqual(12);
  expect(wins).toBeLessThanOrEqual(28);
  console.log('SWEEP seeds 101/202/303', JSON.stringify([101, 202, 303].map((s) => { const r = playHeadless('ember-throne', s); return [r.won, r.round, r.crownHp]; })));
});
