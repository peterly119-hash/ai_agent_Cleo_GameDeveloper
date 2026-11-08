# Build Report — Four Crowns · M1.1 Action Points · 2026-11-08

- **Branch:** `m1.1-action-points` merged into `main`
- **Source:** CD feedback, 2026-11-08 (`feedback/2026-11-08.md`)

## What changed
- **1 action per turn.** Every card costs 1 action. **Gold is gone.** Unspent actions are lost when you start the battle.
- **The hand persists.** No more drawing 4 each round: you start with 4 cards (Cinder Barracks, Pyre Range, Kiln, Rally), and the **reward pick is your only new card** each round. Played cards are used up.
- **Ways to get more actions:**
  - **Rally** (edict, replaces Tithe): +2 actions this turn, a net +1.
  - **War Council** (new building): +1 action every turn while it stands (+2 at tier 3). From tier 2, adjacent units attack 15% faster.
  - **Scorched Earth** now refunds its action.
  - **Skipping a reward** gives +1 action next turn (studio default, replacing "+3 gold"; easy to change).
- **UI:** the top bar shows actions (star icon), cards show their action cost, the hand count replaces the deck count, and a "press Battle" toast appears when you're out of actions. War Council has a new banner icon and edicts a scroll icon.
- **Rebalanced** for the slower economy: smaller waves and Rift Colossus HP 600 → 345 (D-007).
- **QA rig:** the bot playthrough now uses GPU rendering and logs every long frame (studio D-003).

## How to run
```bash
npm run dev -w games/four-crowns
```
Open http://localhost:5173 (run `npm install` first if you haven't).

## Quality gates
| Gate | Result | Evidence |
|---|---|---|
| 1. Build: 0 errors, load < 5 s, no console errors | **Pass**: clean `tsc` and build; load 433 ms; 0 errors | `qa/e2e-report.json` |
| 2. Unit tests, every new feature tested | **Pass**: **38/38**. New tests cover actions, Rally, War Council tiers, the Scorched Earth refund, lost unspent actions, the persistent hand, reward-to-hand and skip → bonus action | `tests/run.test.ts` |
| 3. Bot playthrough: no crash/soft-lock, fps ≥ 50 | **Pass**: seed 101 won (score 645); **min 60 / avg 60 fps, 0 long frames** on GPU | `qa/e2e-report.json` |
| 4. Screenshots reviewed | **Pass**: all 9 screens re-captured and reviewed; the help text was shortened so it stays on two lines | `qa/screenshots/` |

Balance sweep: the bot wins **20/30** (67%); losses happen in round 4 (2) and at the boss (8).

**About the frame-rate gate:** with the default software-rendered headless browser, the fps gate failed (min 46–48) on a busy machine. I re-ran the **unchanged M1 build** under the same conditions and it measured min 46 too, so the dips came from the test rig, not the new code. With GPU rendering the game holds a flat 60 fps. CI runners have no GPU and may need their own threshold.

## Known issues
- **The boss is a knife edge:** 330 HP → 80% bot wins, 345 → 67%, 355 → 43%. The fight is close to all-or-nothing (D-007).
- **Cards can run out before actions do.** With Rally and War Council, the bot often finished runs with an **empty hand and unused actions**, because you only gain one card per round.
- From M1, still open: small units bunch up in crowded lanes; nobody has listened to the sound yet; no mid-run save.

## Cost so far
Not measurable from inside the session. Please add it from your usage page to `studio/BUDGET.md`.

## Questions for you while you play
1. **Cards vs actions:** once you have a War Council, do you run out of cards with actions to spare? Is that a good tension, or should something hand out extra cards (e.g. War Council tier 3 also adds a card per round, or occasional "pick 2" rewards)?
2. **Skipping a reward** now gives +1 action next turn. Does that feel like a real choice, or would you rather skip give something else (Embers, healing the Crown)?
3. **Pacing:** with 1 action per turn your board is much smaller by the boss (about 4–6 buildings). Does it feel like a kingdom growing, or too sparse? Should runs be longer (7–9 rounds) now that each round adds less?
