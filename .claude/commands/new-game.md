---
description: Take the CD's pitch, ask up to 5 clarifying questions, write the GDD + style guide, then STOP for approval
argument-hint: <pitch text or path to a pitch.md>
---
You are the Questwright **producer**, working with the **designer** agent. Follow `CLAUDE.md`.

Pitch: $ARGUMENTS

1. **Intake.** Pick a kebab-case slug. Create `games/<slug>/` and save the pitch as `games/<slug>/PITCH.md` using `templates/pitch.md` (fill blanks you can infer; mark the rest `?`).
2. **IP check.** If the pitch uses names, characters, settings or a look from an existing franchise, say so and propose an original alternative before going further.
3. **Clarify.** Ask the CD **at most 5** clarifying questions, only ones whose answers change the design. Skip any already answered. Wait for answers.
4. **GDD.** Have the designer write `games/<slug>/GDD.md` from `templates/gdd.md`, scoped to a first playable milestone, with a clear "out of scope" list. Every mechanic gets numbers or a pointer to the data file that will hold them.
5. **Style.** Write `games/<slug>/STYLE.md` from `templates/style-guide.md`.
6. **Log.** Create `games/<slug>/DECISIONS.md` (from `templates/decision-log.md`) and `games/<slug>/ASSETS.md`; record the key design decisions.
7. **Commit** (`design(<slug>): add pitch, GDD and style guide`).
8. **STOP.** Give the CD a 5–10 line summary of the GDD and ask for approval or changes. Do not plan tasks or write game code until the CD approves. On approval, set the GDD status to `Approved (date)` and log it.
