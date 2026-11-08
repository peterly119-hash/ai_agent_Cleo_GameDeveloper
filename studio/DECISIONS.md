# Studio Decision Log

Format: see `templates/decision-log.md`. Newest first.

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
