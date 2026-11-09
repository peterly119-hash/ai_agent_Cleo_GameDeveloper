# Studio Decision Log

Format: see `templates/decision-log.md`. Newest first.

## D-005 — 2026-11-09 — CI reports fps but does not gate on it
- **Context:** The first CI run failed in `npm run gates`. Hosted runners have no GPU, so WebGL renders in software (see D-003).
- **Decision:** CI sets `QW_MIN_FPS=0`, so it still enforces build, tests, crash, soft-lock and console-error checks, but only *reports* fps (as a run annotation). The 50 fps gate remains mandatory in the local QA run on GPU before any build reaches the CD.
- **Decided by:** producer + qa, CD informed.

## D-004 — 2026-11-09 — GitHub remote as the source of truth
- **Context:** The CD wants to work from several devices.
- **Decision:** The repo is pushed to https://github.com/peterly119-hash/ai_agent_Cleo_GameDeveloper (public). Local history was rewritten before the first push so that commits use the GitHub noreply email instead of a personal address. The workflow is pull at session start, push at session end (CLAUDE.md §6). Supersedes D-002's "no remote" context.
- **Decided by:** CD.

## D-003 — 2026-11-08 — Bot playthrough measures fps with GPU rendering
- **Context:** Playwright's default headless Chromium renders WebGL in software. On a busy machine, even the unchanged M1 build dipped to 46 fps for a few frames at screen transitions (all single 33 ms frames), so the fps gate was measuring the rig rather than the game.
- **Decision:** Launch Chromium with GPU flags (`playwright.config.ts`). The report records the GPU used and logs every long frame (> 25 ms) by phase. On this machine (RTX 4060): 60 fps minimum, 0 long frames.
- **Consequences:** CI runners have no GPU and fall back to software rendering. If CI fps gets flaky there, give CI a separate threshold rather than lowering the local one.
- **Decided by:** qa + producer, CD informed.

## D-002 — 2026-11-08 — Local task board until a GitHub remote exists
- **Context:** No GitHub remote and no `gh` CLI on the machine.
- **Decision:** Tasks go in `games/<slug>/TASKS.md`, bugs in `games/<slug>/BUGS.md`, same fields as the Issue templates. Migrate to Issues when the CD adds a remote.
- **Alternatives:** Block until GitHub is set up (rejected: stalls the studio).
- **Decided by:** producer, CD informed.

## D-001 — 2026-11-08 — Studio settings and tech stack
- **Context:** Studio founding.
- **Decision:** Fun/learning, web only, $50/month API cap. Phaser 3 + TS + Vite, Vitest, Playwright, GitHub Actions, npm workspaces. Rules logic is pure TS, separate from Phaser rendering.
- **Alternatives:** Plain canvas (rejected: more boilerplate), Godot (rejected: CD default stack is web).
- **Decided by:** CD.
