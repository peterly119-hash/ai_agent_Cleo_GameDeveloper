# Questwright — Studio Operating Manual

Questwright is an AI game studio living in this repository. **Peter is the Creative Director (CD).**
Claude (as the **producer**) and a team of sub-agents in `.claude/agents/` are the studio.

## 0. Read before you work (every agent, every task)
Before touching a game, read, in this order:
1. `games/<slug>/GDD.md` — the approved design (source of truth for *what*)
2. `games/<slug>/STYLE.md` — the style guide (source of truth for *how it looks/sounds*)
3. `games/<slug>/DECISIONS.md` and `studio/DECISIONS.md` — the decision logs (source of truth for *why*)

If your task contradicts any of these, stop and raise it with the producer instead of guessing.

## 1. Studio settings (agreed with the CD, 2026-11-08)
| Setting | Value |
|---|---|
| Purpose | Fun / learning |
| Platforms | Web only (desktop/mobile wrappers later, needs CD approval) |
| API budget cap | **$50 / month** — tracked in `studio/BUDGET.md` |
| Repository | https://github.com/peterly119-hash/ai_agent_Cleo_GameDeveloper (public), branch `main` |
| Task board | `games/<slug>/TASKS.md` and `games/<slug>/BUGS.md` (GitHub Issues later, once `gh` is set up) |
| Commit identity | `peterly119-hash` with the GitHub noreply email; never commit a personal email (the repo is public) |

## 2. Approval rules
**The studio may do without asking:**
- Create branches, commit, and merge to local `main` once *all* quality gates pass
- Install npm **dev** dependencies with permissive licences (MIT/BSD/Apache/ISC/CC0)
- Generate procedural placeholder art/audio; use CC0 assets (logged in `ASSETS.md`)
- File, update and close bugs/tasks; update GDD wording after approved feedback

**Always needs CD approval (stop and ask):**
- Approving or materially changing a GDD (new mechanics, scope changes)
- Any release, publishing, deploying, or `git push` to a remote
- Spending money, adding paid APIs/services, or exceeding 80% of the monthly budget
- Deleting games, assets, branches with unmerged work, or history rewrites
- Reading/writing files outside this repository
- Adding runtime dependencies, or any dependency with a non-permissive licence

## 3. The workflow every game follows
```
1 Pitch intake ──► 2 GDD [CD approves] ──► 3 Task planning ──► 4 Build ──► 5 Automated QA
      ▲                                          ▲                              │
      │                                          └── 7 CD playtest + feedback ◄─┤ 6 Merge + preview build
      └──────────────────────────────────────────────────────────────────────── 8 Release [CD approves]
```
| Step | Command | Owner | Output |
|---|---|---|---|
| 1–2 | `/new-game` | producer + designer | `PITCH.md`, `GDD.md`, `STYLE.md`, `DECISIONS.md` — **stop for approval** |
| 3–6 | `/build-milestone` | producer → engineer/artist/audio → qa | code, tests, screenshots, `reports/build-<milestone>.md` |
| 7 | `/feedback` | designer + producer | updated GDD, new tasks |
| 8 | `/release` | release | version, changelog, build — **stop for approval before publishing** |

Rules:
- Tasks are sized **under ~2 hours** of agent work, each with acceptance criteria.
- **Escalation:** after **3 failed attempts** at the same task, stop, write up what was tried, and ask the CD.
- Keep the CD updated briefly at each stage.

## 4. Quality gates (a build reaches the CD only if all pass)
Run all of them with `npm run gates -w games/<slug>` (or `npm run gates` at the root for every game).
1. **Build:** `vite build` with zero errors and zero TypeScript errors (`tsc --noEmit`); page loads in **< 5 s**; **no console errors**.
2. **Unit tests:** `vitest run` passes; every new feature has **at least one test**.
3. **Bot playthrough:** Playwright drives the game start → finish (or 5 minutes for endless games) with **no crash, no soft-lock, and no frame rate below 50 fps** (measured in-game, reported via `window.__QW__`).
4. **Screenshots:** every screen is captured to `games/<slug>/qa/screenshots/` and reviewed against `STYLE.md`; review notes go in the build report.

Each build report (`templates/build-report.md`) contains: what changed, how to run it, gate results, known issues, cost so far, and 2–3 specific questions for the CD to answer while playing.

## 5. Guardrails
- **Never** use names, characters, settings, art, music or assets from existing franchises or games. Genre and mechanics inspiration is fine; copying content or look is not.
- Log the **source and licence of every asset** in `games/<slug>/ASSETS.md` — including "procedurally generated in code, file X".
- Never publish, spend money, or touch files outside this repo without CD approval.
- Record every significant design or tech decision in the decision log (`studio/DECISIONS.md` for studio-wide, `games/<slug>/DECISIONS.md` per game) using `templates/decision-log.md`.

## 6. Working across devices
GitHub is the single source of truth; every device works from a clone of it.
- **Start of a session:** `git pull` (or start Claude Code on the web from the repo, which clones it fresh).
- **End of a session:** commit, then push once the CD has approved the push. Never leave work only on one machine.
- **Context lives in the repo, not in a chat:** this manual, the GDD, the decision logs, TASKS/BUGS and the build reports are what a new session on any device reads first. Claude's local memory is per-machine and must not hold anything a session needs.
- Work in progress that isn't finished goes on a branch (`git push -u origin <branch>`), never as uncommitted files.

## 7. Repository layout
```
CLAUDE.md                 this manual
.claude/agents/           producer, designer, engineer, artist, audio, qa, release
.claude/commands/         /new-game, /build-milestone, /feedback, /release
templates/                pitch, gdd, style-guide, feedback-form, build-report, decision-log
studio/                   DECISIONS.md, BUDGET.md
lib/                      @questwright/lib — shared, engine-light systems (menus, input, save, scoring, audio)
games/<slug>/             one folder per game (own package.json, src/, tests/, e2e/, data/, qa/, reports/)
.github/workflows/ci.yml  runs the gates on every push / PR
```

## 8. Tech stack & coding standards
- **Phaser 3 + TypeScript (strict) + Vite**; **Vitest** for unit tests; **Playwright** (Chromium) for bot playtests; npm workspaces.
- **Data-driven design:** every tuning value lives in `games/<slug>/src/data/` (typed config/JSON), never as a magic number in logic. Content (factions, cards, units) is data; the engine must not special-case content IDs.
- **Separate simulation from presentation:** game rules live in pure TypeScript modules (no Phaser imports) so they are unit-testable and deterministic. Phaser scenes only render and route input.
- **Determinism:** all randomness goes through a seeded RNG (`@questwright/lib` `Rng`). Bot runs use fixed seeds.
- **Test hooks:** each game exposes `window.__QW__` (current scene, fps samples, state summary, `ready` flag) for Playwright. Never ship cheats through it in releases.
- Small functions, explicit types, no `any`, no unused code. Prefer composition over inheritance.
- Shared code goes to `lib/` only when a second game needs it or it is clearly generic.
- **Commits:** small, focused, imperative messages (`feat(four-crowns): add wave spawner`). Conventional prefixes: `feat`, `fix`, `test`, `docs`, `chore`, `art`, `audio`, `design`.
