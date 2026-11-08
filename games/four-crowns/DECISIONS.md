# Decision Log — Four Crowns

Newest first.

## D-006 — 2026-11-08 — Action points replace gold; the hand persists
- **Context:** CD playtest feedback (`feedback/2026-11-08.md`).
- **Decision:** 1 action per turn (`BALANCE.actionsPerTurn`); every card costs `actionCost` (1). Gold is removed. No redraw: you start with 4 cards and each round's reward pick is added to your hand. Played cards are consumed. Extra actions come from Rally (+2 this turn), War Council (+1 per turn while standing; +2 at tier 3) and Scorched Earth (+1 refund). Skipping a reward gives +1 action next turn.
- **Alternatives:** Keep gold alongside actions (CD rejected: two limits are overkill); allow unspent actions to carry over (CD did not pick).
- **Consequences:** Far fewer plays per run (about 1–2 per round), so waves were re-tuned with the bot sweep (see D-007).
- **Decided by:** CD (mechanics); studio (skip reward, numbers).

## D-005 — 2026-11-08 — M1 starting balance kept as designed
- **Context:** 30-seed headless sweep with the reference bot (`src/sim/bot.ts`).
- **Decision:** Keep the GDD §5 numbers. The bot wins 20/30 (67%) with 8.3 average Crown HP left; losses happen in rounds 3–5; simulated battles last 25–54 s. A guard test keeps the bot win rate between 40% and 95%.
- **Consequences:** A human using Kiln synergy should win more often than the bot. CD playtest will confirm.
- **Decided by:** designer.

## D-004 — 2026-11-08 — Lane-based battles tied to grid rows
- **Context:** The auto-battler needs grid placement to matter, and battles must be deterministic and testable.
- **Decision:** Each grid row feeds one lane, and units fight only within their lane on a fixed 50 ms tick simulation in pure TS.
- **Alternatives:** Free 2D pathing (rejected: harder to read, test and balance at this scale).
- **Consequences:** Placement means choosing which lane to defend. Lane-shifting becomes a distinct Gale Covenant mechanic later.
- **Decided by:** designer (pending CD approval of the GDD).

## D-003 — 2026-11-08 — Ember Throne as the M1 playable faction (proposed)
- **Context:** The slice has one faction. Its synergies must be readable on first play.
- **Decision:** Ember Throne, because burn is a visible, easy-to-grasp synergy.
- **Alternatives:** Stone Court (simpler, but less exciting to watch).
- **Decided by:** designer, open question 1 for the CD.

## D-002 — 2026-11-08 — Content schema follows the CD's class-system spec
- **Context:** The CD supplied a field-level spec for classes, buildings, units and skills.
- **Decision:** Use those fields as the data schema. Effects are composed from a small set of generic effect kinds. M1 fills the schema with slice-sized content; the full 32/32/28 content target comes in M3.
- **Decided by:** CD.

## D-001 — 2026-11-08 — Original setting instead of an existing franchise
- **Context:** The original pitch used an existing animated franchise, which breaks the studio IP guardrail.
- **Decision:** Original setting "the Shattered Reach", with four original elemental factions (Ember Throne, Stone Court, Gale Covenant, Tide Circle) and the Shardborn as enemies.
- **Decided by:** CD.
