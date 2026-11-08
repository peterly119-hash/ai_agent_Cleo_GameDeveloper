# Build Report — Four Crowns · M1 Vertical Slice · 2026-11-08

- **Commit:** merge of `m1-vertical-slice` into `main` (QA run on `fcbfb4f`)
- **Version:** 0.1.0

## What changed
- **Playable run:** Title → Faction Select → 5 rounds of Plan / Battle / Reward → Victory or Defeat summary, with high scores saved in the browser.
- **Ember Throne:** 4 buildings and 3 units, each with 3 tiers; 3 edicts; 3 decrees cast in battle with Embers; the *Kindling* passive. Builds: Kiln burn engine, Stoke tempo, Scorched Earth sacrifice, Furnace Brutes late.
- **Enemies:** the Shardborn, 3 types plus the **Rift Colossus** boss (area slam) in round 5.
- **Data-driven content** following your class-system spec (`src/data/`). The other 3 factions exist as data and show as "Coming soon".
- **Rules engine** in pure TypeScript (`src/sim/`), deterministic per seed, separate from the Phaser rendering.
- **Procedural art** that follows STYLE.md, and 19 synthesised sound effects. No third-party assets.
- **Controls:** mouse and keyboard (1–4 cards, Space to battle, Q/W/E decrees, F speed ×1/×2/×4, M mute, Esc pause/cancel).

## How to run
From the repo root (`C:\Users\peter\AI Agents\Cleo - Game dev`):
```bash
npm install
npm run dev -w games/four-crowns
```
Open http://localhost:5173. Quality gates: `npm run gates -w games/four-crowns`.

## Quality gates
| Gate | Result | Evidence |
|---|---|---|
| 1. Build: 0 errors, load < 5 s, no console errors | **Pass**: `tsc` and `vite build` clean; load **201 ms**; **0** console errors | `qa/e2e-report.json` |
| 2. Unit tests pass, every new feature tested | **Pass**: **36/36** game tests and 11/11 lib tests. Covers content validation, run rules, every battle mechanic, all 3 decrees, a 3-seed balance smoke test and a 30-seed balance guard | `tests/` |
| 3. Bot playthrough: no crash/soft-lock, fps ≥ 50 | **Pass**: full run on seed 101 (won, round 5, score 723); 93 fps samples, **min 57 / avg 60**; no soft-lock (15 s watchdog) | `e2e/playthrough.spec.ts`, `qa/e2e-report.json` |
| 4. Screenshots reviewed against the style guide | **Pass after fixes**: 9 screens captured and reviewed. 4 minor issues found and fixed (FC-B01–B04 in `BUGS.md`) | `qa/screenshots/` |

Headless balance (`npm run balance -w games/four-crowns`): the reference bot wins **20/30** seeds (67%) with 8.3 Crown HP left on average; losses happen in rounds 3–5; simulated battles last 25–54 s.

## Screenshot review
| Screen | Notes |
|---|---|
| 01 Title | Palette only, centred, menu readable. OK |
| 02 High Scores | The crown overlapped the panel edge: fixed (crown hidden while open). Empty state reads well |
| 03 Faction Select | Four factions told apart by shape and colour; locked ones dimmed. Text fits. OK |
| 04 Plan | Hand of 4 with costs, unaffordable cards dimmed, valid tiles highlighted in gold, info panel with stats/synergy. OK |
| 05 Battle | Lanes match grid rows; units (triangles) and enemies (shards) distinct in greyscale. OK |
| 06 Boss | Colossus clearly reads as the boss; health bar now labelled. Burn dots visible |
| 07 Pause | Readable, all options visible. OK |
| 08 Reward | Background text showed through the title: fixed |
| 09 Summary | Clear victory state, stats right-aligned. OK |

## Known issues
- Units are small (22 px) and don't collide, so crowded lanes bunch up visually.
- Sound is verified only as "registered, no errors": the headless QA has no speakers, so nobody has listened to it yet.
- The bot never plays **Scorched Earth**, so that card is covered by unit tests only, not the playthrough.
- No mid-run save; refreshing the page abandons the run (out of scope for M1).
- No music (out of scope for M1).
- CI (`.github/workflows/ci.yml`) hasn't run yet because there's no GitHub remote.

## Cost so far
I can't measure API spend from inside the session. Please read it from your Claude usage page and add it to `studio/BUDGET.md`. Image and audio APIs: $0 (none used). Cap: $50/month.

## Questions for you while you play
1. **Can you see the burn synergy?** When a Kiln sits next to a barracks, do you notice the orange burn dots and the extra Embers? Or do units and effects need to be bigger or louder?
2. **Difficulty:** the bot wins 2 out of 3 runs. Did your first run feel fair, and which round got dicey (3, 4 or the boss)?
3. **Decrees:** is click-Firestorm-then-click-a-lane fun, or fiddly? Should decrees stay manual or cast themselves?

Use `templates/feedback-form.md`, or just send notes. `/feedback four-crowns <notes>` turns them into tasks.
