import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Quality gates 1, 3 and 4 (CLAUDE.md §4): load time, console errors, a bot playthrough from
 * start to finish with soft-lock + fps checks, and a screenshot of every screen.
 */

const SHOTS = join(process.cwd(), 'qa', 'screenshots');
const SEED = 101;
const SOFTLOCK_MS = 15000;
const MIN_FPS = 50;

type Hook = {
  ready: boolean;
  scene: string;
  fps: number[];
  progress: number;
  state: Record<string, unknown>;
  actions: Record<string, (...args: unknown[]) => unknown>;
};

// window.__QW__ is typed by @questwright/lib; actions are loosened (cast to Hook) for the bot.

const hook = <T>(page: Page, fn: (h: Hook) => T): Promise<T> =>
  page.evaluate((src) => {
    const h = (window as unknown as { __QW__?: Hook }).__QW__;
    if (!h) throw new Error('no __QW__');
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function('h', `return (${src})(h)`)(h) as T;
  }, fn.toString());

async function shot(page: Page, name: string): Promise<void> {
  if (process.env['QW_NO_SHOTS']) return;
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

test('bot plays a full run with all gates satisfied', async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  // Long-frame log (> 25 ms) tagged with the game phase, for diagnosing fps dips.
  await page.addInitScript(() => {
    const w = window as unknown as { __longFrames: { ms: number; at: string }[]; __QW__?: { scene: string; state: Record<string, unknown> } };
    w.__longFrames = [];
    let last = performance.now();
    const loop = (t: number): void => {
      const d = t - last;
      last = t;
      const h = w.__QW__;
      if (d > 25 && h?.scene === 'Run') w.__longFrames.push({ ms: Math.round(d), at: `r${String(h.state['round'])}:${String(h.state['phase'])}` });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  // Gate 1: load time.
  const t0 = Date.now();
  await page.goto('/');
  await page.waitForFunction(() => window.__QW__?.ready === true && window.__QW__.scene === 'Title', null, { timeout: 5000 });
  const loadMs = Date.now() - t0;
  expect(loadMs).toBeLessThan(5000);
  await shot(page, '01-title');

  // High scores overlay via a real click on the menu (viewport == game size, so canvas coords map 1:1).
  await page.mouse.click(640, 406);
  await page.waitForFunction(() => window.__QW__?.state['overlay'] === 'scores');
  await shot(page, '02-high-scores');
  await page.mouse.click(640, 566);
  await page.waitForFunction(() => window.__QW__?.state['overlay'] === null);

  // Real click on Play.
  await page.mouse.click(640, 340);
  await page.waitForFunction(() => window.__QW__?.scene === 'Faction');
  await shot(page, '03-faction-select');

  await page.evaluate((seed) => (window as unknown as { __QW__: Hook }).__QW__.actions['chooseFaction']?.('ember-throne', seed), SEED);
  await page.waitForFunction(() => window.__QW__?.scene === 'Run' && window.__QW__.state['phase'] === 'plan');
  await hook(page, (h) => {
    h.fps.length = 0;
    h.actions['setSpeed']?.(4);
  });

  const seen = new Set<string>();
  let lastProgress = -1;
  let lastProgressAt = Date.now();
  let lastRound = 0;
  const fpsSamples: number[] = [];
  const deadline = Date.now() + 6 * 60 * 1000;

  while (Date.now() < deadline) {
    const snap = await hook(page, (h) => ({ scene: h.scene, progress: h.progress, state: h.state, fps: h.fps.splice(0) }));
    fpsSamples.push(...snap.fps);
    if (snap.scene === 'Summary') break;

    if (snap.progress !== lastProgress) {
      lastProgress = snap.progress;
      lastProgressAt = Date.now();
    }
    expect(Date.now() - lastProgressAt, `soft-lock: no progress for ${SOFTLOCK_MS}ms in ${JSON.stringify(snap.state)}`).toBeLessThan(SOFTLOCK_MS);

    const phase = snap.state['phase'];
    const round = Number(snap.state['round']);
    if (phase === 'plan' && round !== lastRound) {
      lastRound = round;
      if (!seen.has('plan')) {
        seen.add('plan');
        // Real key press selects the first card: the shot shows the hand and highlighted valid tiles.
        await page.keyboard.press('Digit1');
        await shot(page, '04-plan');
        await page.keyboard.press('Escape');
      }
      await hook(page, (h) => h.actions['botPlan']?.());
      if (round === 2 && !seen.has('pause')) {
        seen.add('pause');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__QW__?.state['overlay'] === 'pause');
        await shot(page, '07-pause');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__QW__?.state['overlay'] !== 'pause');
      }
      // Real keyboard input to start the battle.
      await page.keyboard.press('Space');
      await page.waitForFunction(() => window.__QW__?.state['phase'] === 'battle');
      await hook(page, (h) => h.actions['setBotAuto']?.(true));
    } else if (phase === 'battle') {
      const t = Number((snap.state['battle'] as { time?: number } | null)?.time ?? 0);
      if (!seen.has('battle') && t >= 12) {
        seen.add('battle');
        await shot(page, '05-battle');
      }
      if (round === 5 && !seen.has('boss') && t >= 14) {
        seen.add('boss');
        await shot(page, '06-boss');
      }
    } else if (phase === 'reward') {
      if (!seen.has('reward')) {
        seen.add('reward');
        await shot(page, '08-reward');
      }
      await hook(page, (h) => h.actions['botReward']?.());
    }
    await page.waitForTimeout(250);
  }

  await page.waitForFunction(() => window.__QW__?.scene === 'Summary', null, { timeout: 10000 });
  await shot(page, '09-summary');
  const final = await hook(page, (h) => h.state);

  const minFps = fpsSamples.length ? Math.min(...fpsSamples) : 0;
  const avgFps = fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, fpsSamples.length);
  const longFrames = await page.evaluate(() => (window as unknown as { __longFrames: unknown[] }).__longFrames);
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  const report = {
    gpu,
    longFrames,
    seed: SEED,
    loadMs,
    result: final['result'],
    round: final['round'],
    score: final['score'],
    fps: { samples: fpsSamples.length, min: minFps, avg: Math.round(avgFps) },
    consoleErrors: errors,
    screens: [...seen],
  };
  writeFileSync(join(process.cwd(), 'qa', 'e2e-report.json'), JSON.stringify(report, null, 2));
  console.log('E2E REPORT', JSON.stringify(report));

  // Gate 1: no console errors. Gate 3: finished, fps floor.
  expect(errors).toEqual([]);
  expect(['won', 'lost']).toContain(final['result']);
  expect(fpsSamples.length).toBeGreaterThan(20);
  expect(minFps, `fps samples: ${fpsSamples.join(',')}`).toBeGreaterThanOrEqual(MIN_FPS);
  // Gate 4: every screen captured.
  for (const s of ['plan', 'battle', 'reward', 'pause']) expect(seen.has(s), s).toBe(true);
});
