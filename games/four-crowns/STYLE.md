# Four Crowns — Style Guide

## Mood in three words
Bright, crisp, dangerous.

## Look
Flat geometric shapes with thick dark outlines, floating island tiles over a deep indigo sky, and soft glows only for magic and fire. This is an original look (no pixel-art pastiche, no imitation of any existing franchise). Everything is procedurally drawn in M1.

## Palette
| Token | Hex | Use |
|---|---|---|
| `sky` | `#141826` | background |
| `sky-2` | `#1d2236` | panels, battlefield lanes (alternate rows `#1a1f31`) |
| `island` | `#3a3f55` | grid tiles |
| `island-edge` | `#5a6080` | tile outline, empty slot |
| `ink` | `#0b0d14` | outlines (3 px at 1x) |
| `text` | `#f2eee3` | primary text |
| `text-dim` | `#a7a9b8` | secondary text |
| `gold` | `#f4c542` | gold resource, rewards |
| `crown` | `#e9e2c8` | Crown Seat |
| `danger` | `#ff4d5e` | Crown damage, low HP |
| `ember` | `#e8573a` | Ember Throne (accent `#ffb347` for burn) |
| `stone` | `#b08a5a` | Stone Court |
| `gale` | `#8fd3e8` | Gale Covenant |
| `tide` | `#3a7fd6` | Tide Circle |
| `shard` | `#9b5de5` | Shardborn enemies (glow `#c9a6ff`) |

Text needs at least 4.5:1 contrast. Never use colour alone to carry meaning.

## Shapes & silhouettes (colour-blind safe: shape carries identity)
| Entity | Shape |
|---|---|
| Ember Throne | flame/triangle motifs; units are upward triangles |
| Stone Court | squares and blocks |
| Gale Covenant | diamonds and arcs |
| Tide Circle | circles and waves |
| Shardborn | jagged, rotated shards (irregular polygons) |
| Unit roles | melee = solid shape · ranged = shape with a hollow centre · heavy = 1.6× size · boss = 3× size plus a glow |

Units are 18–24 px at 1x, buildings fill 80% of a 96 px tile, and the tier is shown as 1–3 pips under each building.

## Typography
System UI stack (`"Segoe UI", system-ui, sans-serif`), so no font files are needed. Title 64 px bold · headings 28 px · body 18 px · numbers on cards 22 px bold. Minimum size is 14 px.

## Layout (1280×720)
- 24 px safe margin.
- Top bar (48 px): round, Crown HP, gold, embers, speed and pause.
- Left: the 3×3 grid (3 × 96 px plus 8 px gaps) at x ≈ 40–350, vertically centred.
- Right: the battlefield, three lanes aligned with the grid rows, x ≈ 380–1256.
- Bottom (150 px): the hand of cards (130×150) during Plan, or decree buttons during Battle.

## Motion
Ease-out for UI (150–250 ms). A placed building lands with a short squash (120 ms). Hits flash white for 60 ms. Screen shake only on Crown damage and boss slams, max 6 px for 200 ms. Burning shows as small orange particles (capped for performance).

## Audio direction
Short synthesised sounds (WebAudio): warm square/triangle waves for UI, noise bursts for hits, a low sweep for fire decrees. SFX at about −12 dB relative to peak, nothing harsh above 4 kHz for long. Respect mute. Every event is listed in GDD §10.

## Screenshot checklist (QA)
- [ ] Palette tokens only (no stray default colours)
- [ ] All text readable at 1x; nothing clipped, overlapping or outside the safe margins
- [ ] Factions and enemies distinguishable in greyscale (by shape)
- [ ] Tier pips visible on every building
- [ ] HUD values match the game state shown in `window.__QW__.state`
