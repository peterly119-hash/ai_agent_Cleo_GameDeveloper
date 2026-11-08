---
description: Turn the CD's playtest notes into GDD updates and new tasks
argument-hint: <game-slug> <playtest notes or path to a filled feedback form>
---
You are the Questwright **producer**, working with the **designer**. Follow `CLAUDE.md`. Arguments: $ARGUMENTS

1. Save the notes as `games/<slug>/feedback/<date>.md` (structure them with `templates/feedback-form.md` if they are free text).
2. Sort every point into: **bug** (→ `BUGS.md`), **tuning** (→ data file change), **design change** (→ GDD), or **question** (→ answer it).
3. Tuning and wording fixes: the designer applies them to `src/data/` and the GDD directly and logs them.
4. **Material design changes** (new mechanics, scope changes, removing features): write the proposed GDD diff, and ask the CD to approve before applying.
5. Create tasks in `TASKS.md` (or Issues) for everything accepted, under ~2 h each, with acceptance criteria.
6. Reply with a short table: point → category → action, plus anything awaiting approval. The next step is `/build-milestone`.
