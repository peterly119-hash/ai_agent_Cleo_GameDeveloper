# Asset Register — Four Crowns

Every asset in the game, with its source and licence. No image or audio API is configured, so M1 uses only procedural assets. There are **no third-party asset files** in the build.

| Asset | Type | Location | Source / author | Licence | Added |
|---|---|---|---|---|---|
| Faction emblems (`emblem:*`) | image (generated) | `src/render/textures.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| Unit sprites (`unit:*`): faction shape; ranged = hollow, heavy = large | image (generated) | `src/render/textures.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| Building icons (`bld:*`) | image (generated) | `src/render/textures.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| Shardborn enemy sprites (`enemy:*`), boss glow | image (generated) | `src/render/textures.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| Crown Seat, gold/ember/heart icons, projectile dot | image (generated) | `src/render/textures.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| Menu backdrop islands | vector (runtime) | `src/scenes/ui.ts` | Questwright (generated) | project-owned | 2026-11-08 |
| 19 SFX recipes (click, place, upgrade, horn, hits, deaths, crown hit, decrees, slam, reward, victory, defeat…) | audio (WebAudio synth) | `src/sfx.ts` via `@questwright/lib` AudioManager | Questwright (generated) | project-owned | 2026-11-08 |
| Font | system UI stack (`Segoe UI`, `system-ui`) | `src/theme.ts` | user's OS | not bundled | 2026-11-08 |
| Engine: Phaser 3.90.0 | library | `node_modules/phaser` | Phaser Studio | MIT | 2026-11-08 |

Rules: procedural assets list the code file that generates them, with source "Questwright (generated)" and licence "project-owned". Third-party assets must be CC0, with the original URL and author recorded.
