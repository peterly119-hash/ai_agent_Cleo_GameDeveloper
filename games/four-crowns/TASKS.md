# Tasks — Four Crowns

Local task board (studio D-002: no GitHub remote yet). Status: todo · doing · done · deferred.

## Milestone 1 — Vertical slice (branch `m1-vertical-slice`)
Exit criteria: all 4 quality gates pass; the bot finishes 3 seeds and wins at least 1; the build report has been sent to the CD.

| ID | Task | Owner | Est | Acceptance criteria | Status |
|---|---|---|---|---|---|
| FC-01 | Game package scaffold (Vite, TS strict, Phaser 3, Vitest, Playwright configs) | engineer | 0.5 h | `npm run dev` serves a blank Phaser canvas; typecheck passes | done |
| FC-02 | Data schema (`schema.ts`): faction, building, unit, skill, edict, card, enemy, wave, effect kinds | designer + engineer | 1 h | Every field from the CD class spec is present; typed effect union | done |
| FC-03 | Ember Throne content, Shardborn enemies, waves, balance config; stub data for the other 3 factions | designer | 1.5 h | Matches GDD §5; validation test passes (unique IDs, references resolve, 3 tiers) | done |
| FC-04 | Run state: deck/hand/discard, economy, grid placement, upgrades, edicts, decree learning, rewards, scoring | engineer | 2 h | Unit tests for each rule | done |
| FC-05 | Battle simulation: lanes, spawning, targeting, burn, splash, self-damage, death burst, siege, time cap, boss slam | engineer | 2 h | Deterministic for a seed; unit tests per mechanic | done |
| FC-06 | Decrees in battle (Firestorm, War Drums, Rebirth Pyre) and the Kindling passive | engineer | 1 h | Unit tests for cost, cooldown and effect | done |
| FC-07 | Bot strategy plus a headless balance test over 3 seeds | designer + engineer | 1.5 h | The bot finishes every seed and wins at least 1; numbers are logged | done |
| FC-08 | Scenes: Boot, Title (+ high scores), Faction Select, Run (plan/battle/reward/pause), Summary | engineer | 2 h | Full run is playable by mouse and keyboard | done |
| FC-09 | Procedural textures per STYLE.md (faction shapes, shards, tiles, pips, icons) | artist | 1.5 h | Every entity is drawn; logged in ASSETS.md | done |
| FC-10 | Synth SFX for every GDD §10 event, with mute | audio | 1 h | Recipes registered; logged in ASSETS.md; no audio errors | done |
| FC-11 | `window.__QW__` hook, Playwright bot playthrough, fps/console/load checks, screenshots of every screen | qa + engineer | 1.5 h | `npm run e2e` passes; screenshots saved | done |
| FC-12 | Run gates, review screenshots, write build report, merge to main | qa + producer | 1 h | Report written; `main` updated | done |

## Milestone 1.1 — Action points + persistent hand (branch `m1.1-action-points`, from CD feedback 2026-11-08)
| ID | Task | Owner | Est | Acceptance criteria | Status |
|---|---|---|---|---|---|
| FC-13 | Schema + data: actionCost on cards, gainActions/actionsPerTurn effects, Rally, War Council, Scorched Earth refund, starting hand; remove gold | designer | 1 h | Validation test passes; no gold left in data | done |
| FC-14 | Run rules: actions per turn, persistent hand, reward to hand, skip = +1 action next turn | engineer | 1.5 h | Unit tests per rule | done |
| FC-15 | UI (action HUD, card action cost, skip label, hand count, War Council icon), bot update, rebalance waves with the sweep, re-run all gates | engineer + qa | 2 h | All 4 gates pass; sweep win rate within 40–95% | done |
