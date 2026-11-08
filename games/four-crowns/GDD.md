# Four Crowns — Game Design Document

- **Slug:** four-crowns
- **Status:** Approved (2026-11-08). Open questions in §14 resolved with defaults: Ember Throne first, player-cast decrees, 5-round run
- **Version:** 0.2 (Revised 2026-11-08 from CD feedback: action points, persistent hand, no gold. See DECISIONS D-006/D-007)
- **Owner:** designer · **Approver:** Creative Director
- **Scope of this version:** Milestone 1, the vertical slice. Later milestones are listed in §12 but are not designed in detail yet.

## 1. Overview
The Shattered Reach is a sky of broken floating islands. Four crowns are fighting to pull the shards back together, and a violet crystal swarm, the **Shardborn**, pours through the rifts between them. You rule one island.

- **Genre:** roguelike deckbuilder + lane-based auto-battler + kingdom builder
- **Run length:** 5 rounds (round 5 is a boss), about 8–10 minutes
- **Platform/input:** desktop web, mouse, with keyboard shortcuts. Resolution 1280×720, scaled to fit.

## 2. Pillars
1. **Small board, big decisions.** With 8 tiles and 3 lanes, every placement matters.
2. **Snowball you can see.** Synergies show visibly in battle (burn, splash, buffs).
3. **Every faction plays differently.** Factions differ in resource, passive and build paths, not just in numbers.

## 3. Core loop (one round)
| Phase | What happens | Time |
|---|---|---|
| **Actions** | Gain `actionsPerTurn` (1), plus +1 per War Council (+2 at tier 3), plus any banked bonus. Embers carry over. | instant |
| **Plan** | Your hand carries over between rounds (no redraw). Each card costs 1 action: place or upgrade buildings, cast edicts, learn decrees. Played cards are used up. Unspent actions are lost when you press **Battle**. | player-paced |
| **Battle** | The wave spawns from the right, and each building spawns units into its own row (lane). Fights resolve automatically. You may click decree buttons. | ≤ 75 s (≈ 20–40 s typical) |
| **Resolve** | Enemies that reach the left edge deal their `siege` damage to the Crown. The battle ends when the wave is cleared, or at the 75 s cap, when every remaining enemy deals its siege damage (this prevents soft-locks). | instant |
| **Reward** | Pick 1 of 3 cards to add to your hand (your only new card each round), or skip for +1 action next turn. | player-paced |

Battle speed toggle: ×1 / ×2 / ×4 (the QA bot uses ×4).

## 4. Mechanics
### 4.1 Kingdom grid
- 3×3 grid. Each row is one **lane** of the battlefield to its right.
- The centre tile is the **Crown Seat**, which can't be built on. The Crown has `crownHp` (20). The run is lost at 0.
- **Placing** a building card on an empty tile builds it at tier 1.
- **Upgrading:** playing the same building card on a copy of it raises its tier (max 3). Tier upgrades raise that building's unit stats (§5).
- **Adjacency** means orthogonal neighbours only. The Crown Seat counts as a tile but has no effects.

### 4.2 Cards
Three card types:
- **Building:** placed on a tile (§4.1).
- **Edict:** a one-shot effect. Some target a building.
- **Decree:** a battle skill. Playing it *learns* the decree for the rest of the run. Playing a decree you already know raises its level (max 3).

Each card shows its action cost (1 for every M1 card). There is no deck: you start with 4 cards in hand, and each round's reward pick is added.

### 4.3 Battle simulation (pure TypeScript, deterministic, seeded)
- Fixed timestep of 50 ms ticks, independent of render fps.
- Each building spawns its unit every `spawnTime` seconds, up to `maxAlive` per building. The first spawn happens at 0.5 s.
- Units move along their lane toward the nearest enemy in that lane, stop when it is within `range`, and attack every `1 / attackSpeed` seconds. Each lane is fought separately.
- Enemies walk left. They fight units that block them, and on reaching x = 0 they deal `siege` to the Crown and are removed.
- **Burn:** a damage-per-second status lasting 3 s. A new application refreshes the duration and keeps the *higher* dps, so burns don't stack.
- All numbers come from `src/data/`.

### 4.4 Resources
- **Actions** (all factions): 1 per turn (`BALANCE.actionsPerTurn`). Extra actions come from Rally (+2 this turn), War Council (+1 per turn; +2 at tier 3), Scorched Earth (refunds its action) and skipping a reward (+1 next turn). Gold was removed in v0.2.
- **Faction resource** (one per faction): pays for decrees. For Ember Throne this is **Embers**, capped at 30, and they carry over between rounds.

## 5. Content: Milestone 1 (Ember Throne playable)
All values below are **starting tuning**. They live in `src/data/factions/ember-throne/*.ts` and the bot-balance pass will change them.

### 5.1 Faction: Ember Throne
| Field | Value |
|---|---|
| id | `ember-throne` |
| Description | A court of reckless pyromancers who'd rather burn their island than lose it. |
| Playstyle | Aggressive. Stack burn, trade your own buildings for power, end fights fast. |
| Primary resource | Embers (cap 30) |
| Starting resources | 1 action per turn, 0 embers, Crown 20 HP, 4-card hand |
| Passive: *Kindling* | Every enemy that dies while burning grants +1 Ember. |
| Strengths | High damage, snowballs, strong burst decrees |
| Weaknesses | Fragile units; Furnace Brutes hurt themselves; weak if the burn engine is never built |

### 5.2 Buildings (each has 3 tiers)
| id | Name | Actions | Produces | Passive / ability | Game stage | Synergy |
|---|---|---|---|---|---|---|
| `cinder-barracks` | Cinder Barracks | 1 | Ashguard | — | early | Next to a Kiln, Ashguard burn on hit |
| `pyre-range` | Pyre Range | 1 | Cinder Archer | Archers always apply Burn 1/1.5/2 dps | early–mid | Next to a Kiln, their burn dps is raised |
| `kiln` | Kiln | 1 | — | Units from adjacent buildings apply Burn (+1/+1.5/+2 dps). At T3, adjacent units also get +10% attack speed. | mid | The engine of the burn build |
| `war-council` | War Council | 1 | — | +1 action every turn (+2 at T3). From T2, adjacent units +15% attack speed. | mid | Trades a fighter tile for tempo |
| `blaze-forge` | Blaze Forge | 1 | Furnace Brute | — | late | Brute splash spreads burn when it is next to a Kiln |

### 5.3 Units (stats at T1 / T2 / T3)
| id | Name | Role | HP | Dmg | Atk/s | Move px/s | Range px | Spawn s | Max alive | Special |
|---|---|---|---|---|---|---|---|---|---|---|
| `ashguard` | Ashguard | melee frontline | 30/45/65 | 4/6/9 | 1.0 | 40 | 20 | 4 | 3 | *Smolder:* on death, burns enemies within 30 px (2 dps) |
| `cinder-archer` | Cinder Archer | ranged dps | 14/20/28 | 3/5/7 | 0.8 | 30 | 160 | 5 | 3 | Burning arrows (see Pyre Range) |
| `furnace-brute` | Furnace Brute | heavy splash | 80/120/170 | 10/15/22 | 0.5 | 22 | 24 | 10 | 1/1/2 | *Overheat:* loses 2 HP/s; hits splash 40 px |

### 5.4 Edicts
| id | Name | Actions | Effect |
|---|---|---|---|
| `rally` | Rally | 1 | +2 actions this turn (net +1). Replaces Tithe. |
| `stoke` | Stoke | 1 | Target building's units get +20% attack speed for the rest of the run (stacks up to 3 times) |
| `scorched-earth` | Scorched Earth | 1 | Destroy one of your buildings of tier N. Gain 4×N Embers, **refund this action**, and adjacent buildings' units get +2 damage for the rest of the run. The **sacrifice build**. |

### 5.5 Decrees (battle skills, cast with Embers)
| id | Name | Card actions | Ember cost | Cooldown | Duration | Area | Effect (Lv1 / Lv2 / Lv3) |
|---|---|---|---|---|---|---|---|
| `firestorm` | Firestorm | 1 | 6 | 8 s | instant | one lane (click the lane) | 8/12/16 damage to every enemy in the lane, plus Burn 2 dps |
| `war-drums` | War Drums | 1 | 4 | 12 s | 5 s | all lanes | Your units get +40/55/70% attack speed |
| `rebirth-pyre` | Rebirth Pyre | 1 | 12 | 30 s | instant | all lanes | Revive the last 3/4/5 fallen units at 50% HP |

### 5.6 Hand
- **Starting hand (4):** Cinder Barracks, Pyre Range, Kiln, Rally. The hand persists; there is no deck or redraw.
- **Reward pool:** every faction card, weighted. Everything outside the starting hand arrives only as a reward.
- **Total:** 11 distinct cards (5 buildings, 3 edicts, 3 decrees).

### 5.7 Enemies: the Shardborn (neutral invaders)
| id | Name | HP | Dmg | Atk/s | Move | Range | Siege | Notes |
|---|---|---|---|---|---|---|---|---|
| `shardling` | Shardling | 12 | 2 | 1.0 | 55 | 18 | 1 | fast swarm |
| `shard-slinger` | Shard Slinger | 10 | 3 | 0.7 | 35 | 140 | 1 | ranged |
| `shard-brute` | Shard Brute | 60 | 6 | 0.6 | 25 | 22 | 3 | tank |
| `rift-colossus` | Rift Colossus (boss) | 345 | 12 | 0.5 | 15 | 30 | 15 | every 6 s, *Slam* deals 8 damage to all units within 60 px |

### 5.8 Waves (`src/data/waves.ts`), spawns staggered over the first 20 s
| Round | Composition |
|---|---|
| 1 | 5 Shardlings |
| 2 | 6 Shardlings, 2 Slingers |
| 3 | 7 Shardlings, 3 Slingers, 1 Brute |
| 4 | 8 Shardlings, 4 Slingers, 2 Brutes |
| 5 (boss) | Rift Colossus in the middle lane, plus 5 Shardlings |

v0.2: waves and boss HP were reduced to match the slower action economy (D-007).

### 5.9 The other three factions (designed in later milestones, stub data in M1)
| Faction | Resource | Passive | Build A | Build B | Strong vs | Weak vs |
|---|---|---|---|---|---|---|
| **Stone Court** (Earth) | Stone | *Settled Ground:* each building's units gain +5% HP per round it has stood (max +50%) | Fortress: walls and armour, outlast | Quarry: buildings that grow every round | swarms | ranged chip, burn |
| **Gale Covenant** (Air) | Momentum | *Tailwind:* units move +25% faster, and each unit's first hit strikes twice | Tempo: cheap swarm, extra attacks | Drift: knockback, shifting enemies between lanes | slow tanks | splash |
| **Tide Circle** (Water) | Flow | *Ebb:* 20% of damage your units deal heals the most-injured ally in that lane | Sustain: healing, regeneration | Flow: cards copy or transform adjacent tiles | attrition | burst damage |
| **Ember Throne** (Fire) | Embers | *Kindling* (above) | Burn | Sacrifice | sustain/healing | swarms, splash |

Balance intent: no faction dominates. Each has an early (cheap T1 producers), mid (synergy building) and late (expensive unit or decree) option.

## 6. Progression & difficulty
- **Within a run:** the waves in §5.8. Total enemy HP rises about 1.8× per round. Player power grows through tiers, synergies and decrees.
- **Target win rate:** about 60% for a first-time player and about 90% for a competent burn build. The QA bot plays a fixed "sensible" strategy and **must win at least 1 of 3 seeds** (a balance smoke test).
- **Across runs:** none in M1. Only the high score is saved.

## 7. Win / lose
- **Win:** clear round 5, the boss.
- **Lose:** the Crown reaches 0 HP.
- **Score** = rounds cleared × 100 + Crown HP × 10 + enemies killed. Saved to high scores.

## 8. Screens & flow
`Title → Faction Select → [Plan ⇄ Battle → Reward] × 5 → Run Summary (Victory/Defeat) → Title`
1. **Title:** logo, Play, High Scores, mute toggle.
2. **Faction Select:** 4 faction cards. Ember Throne is selectable; the other three are shown locked as "Coming soon", which shows the data-driven roster.
3. **Plan:** the grid on the left (3×3), an empty battlefield preview on the right, your hand at the bottom, actions/embers/Crown HP/round in the top bar, and a Battle button.
4. **Battle:** grid plus the live battlefield, decree buttons with cooldown rings, and a speed toggle.
5. **Reward:** 3 cards plus Skip (+1 action next turn).
6. **Run Summary:** victory or defeat, score, rounds, best score, Play again.
7. **Overlay:** pause/settings (mute, speed), available from Plan and Battle with Esc.

## 9. Controls & UI
- Mouse: click a card, then click a tile. Right-click or Esc cancels.
- Keys: 1–4 select a card, Space starts the battle, Q/W/E cast decrees, F cycles speed, M mutes, Esc pauses.
- Tooltips on hover for every card, building and unit, with all stats generated from data.

## 10. Audio events
UI click, card select, building placed, building upgraded, battle start horn, unit spawn (soft), melee hit, arrow, burn tick (very soft), unit death, enemy death, Crown damaged, Firestorm, War Drums, Rebirth Pyre, boss slam, reward pick, victory sting, defeat sting. Music is out of scope for M1 (the audio agent may add an ambient drone if time allows).

## 11. Data & extensibility
This follows the CD's class-system spec. The schema covers the full field list; M1 fills it with slice-sized content.
```
src/data/
  schema.ts            FactionDef, BuildingDef, UnitDef, SkillDef (decree), EdictDef, CardDef, EnemyDef, WaveDef
  balance.ts           global tuning: crownHp, handSize, income, battle cap, tick, burn duration...
  waves.ts             round compositions
  enemies.ts           Shardborn
  factions/
    index.ts           registry: FACTIONS = [emberThrone, stoneCourt, galeCovenant, tideCircle]
    ember-throne/      index.ts (one file per faction in M1; split into buildings/units/skills files when content grows)
    stone-court/       faction.ts only (playable: false)
    ...
```
- **Unit/Building/Skill fields** follow the CD spec: id, name, description, cost, spawn/production interval, unit generation, passive effects, active abilities, upgrade tiers (array of 3), synergies; unit HP, damage, attack speed, move speed, range, cost, spawn time, special ability, tiers; skill cost, cooldown, duration, effect, AoE, levels.
- **Effects are data**, not code paths. The engine implements a small set of generic effect *kinds* (`applyBurn`, `statModifier`, `adjacentAura`, `onDeathBurst`, `splash`, `selfDamage`, `gainResource`, `revive`, `laneDamage`, `destroyBuildingFor`). Content combines kinds with parameters. **Adding a faction means adding a data folder and one registry line, with no engine changes**, unless it needs a new effect kind, which is then a reusable engine addition.
- A validation test checks every faction: unique IDs, every reference resolves, 3 tiers per building and unit, positive costs, and that every effect kind is known.

## 12. Milestones
| Milestone | Goal | Exit criteria |
|---|---|---|
| **M1 Vertical slice** | Ember Throne playable through a 5-round run with a boss | All 4 quality gates pass; the bot finishes 3 seeds, winning at least 1; the CD playtests |
| M2 Second faction | Stone Court playable; rival-crown enemy waves | Both factions are within ±15% bot win rate |
| M3 Full roster | All 4 factions toward the full content target (8 buildings, 8 units, 7 skills each, 3 tiers) | Validation and balance sims pass |
| M4 Meta & polish | Unlocks across runs, grid expansion, juice, release candidate | `/release` ready |

## 13. Out of scope (M1)
Other playable factions, meta progression, a grid bigger than 3×3, relics/artifacts, multiplayer, mobile/touch layout, music, save mid-run.

## 14. Open questions for the CD
1. Should Ember Throne be the first playable faction? Its burn is the most visible synergy. Stone Court is the alternative.
2. Should decrees be **cast by the player** during battle (as designed), or fully automatic (a pure auto-battler)?
3. Is a 5-round run about right for the slice? Later runs could be 9 to 12 rounds.
