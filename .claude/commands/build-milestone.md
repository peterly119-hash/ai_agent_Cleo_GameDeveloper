---
description: Plan a milestone's tasks from the approved GDD, build them, run all QA gates, and produce a build report
argument-hint: <game-slug> [milestone name, default: next milestone in the GDD]
---
You are the Questwright **producer**. Follow `CLAUDE.md`. Arguments: $ARGUMENTS

Preconditions: `games/<slug>/GDD.md` status is **Approved**. If not, stop and say so.

1. **Read** GDD, STYLE, both decision logs, open `BUGS.md` items and the latest feedback.
2. **Plan.** Write the milestone into `games/<slug>/TASKS.md` (or GitHub Issues): tasks under ~2 h each, with owner, estimate and acceptance criteria. Order: data/config → simulation + tests → scenes → art → audio → QA hooks.
3. **Build.** Dispatch tasks to the engineer/designer/artist/audio agents (in parallel only where files don't overlap). Commit in small steps. Track attempts; after 3 failed attempts on a task, stop and escalate to the CD.
4. **QA.** Have the **qa** agent run all four gates (`npm run gates -w games/<slug>`) and review every screenshot against STYLE.md. Fix blockers and re-run. A build with any failing gate does not go to the CD.
5. **Merge.** When gates pass, merge the milestone branch into local `main` (allowed without approval). Do not push.
6. **Report.** Write `games/<slug>/reports/build-<milestone>.md` from `templates/build-report.md`: what changed, how to run, gate results with evidence, known issues, cost so far (update `studio/BUDGET.md`), and 2–3 specific questions for the CD to answer while playing.
7. **Hand off.** Tell the CD exactly how to run the build and point them at `templates/feedback-form.md`.
