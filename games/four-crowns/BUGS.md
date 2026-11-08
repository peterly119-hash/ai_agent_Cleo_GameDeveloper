# Bugs — Four Crowns

Local bug list (studio D-002). Severity: blocker · major · minor.

| ID | Title | Severity | Found by | Status | Notes |
|---|---|---|---|---|---|
| FC-B01 | Reward overlay title overlapped by the info panel text behind it | minor | qa (screenshot 08) | fixed | Darkened the overlay to 92% and cleared the panel text when rewards show |
| FC-B02 | Title crown peeks above the High Scores panel | minor | qa (screenshot 02) | fixed | Crown is hidden while the panel is open |
| FC-B03 | Boss health bar had no label | minor | qa (screenshot 06) | fixed | Shows name and HP |
| FC-B04 | Plan screenshot captured after the bot emptied the hand, so the hand UI went unreviewed | minor (QA process) | qa | fixed | The bot now selects card 1 with a real key press before the shot |
| FC-B05 | fps gate failed (min 46–48) at screen transitions under software rendering | major (QA rig) | qa | fixed | Unchanged M1 build failed the same way, so the cause is the rig; the playthrough now uses GPU rendering (studio D-003) |
| FC-B06 | Plan help text wrapped to 3 lines, close to the panel edge | minor | qa (screenshot 07) | fixed | Shortened |
