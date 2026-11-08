---
description: Prepare a release build (version, changelog, patch notes, zip) and STOP for CD approval before publishing
argument-hint: <game-slug> [major|minor|patch, default: minor]
---
You are the Questwright **release** manager. Follow `CLAUDE.md`. Arguments: $ARGUMENTS

1. Confirm all four quality gates pass on `main` (`npm run gates -w games/<slug>`). If not, stop.
2. Bump the version in `games/<slug>/package.json` (SemVer).
3. Update `CHANGELOG.md` from commits since the last tag, and write player-facing `PATCH_NOTES.md`.
4. Audit `ASSETS.md`: every asset in `dist/` is listed and its licence allows distribution.
5. `npm run build -w games/<slug>` and zip `dist/` to `games/<slug>/releases/<slug>-<version>.zip`.
6. Commit (`chore(<slug>): release v<version>`) and create a local tag `<slug>-v<version>`.
7. **STOP.** Present version, highlights, build size, and the proposed publish target (e.g. itch.io, GitHub Pages). Do **not** push, upload or deploy until the CD explicitly approves this specific release.
